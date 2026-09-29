import { inboxMessages } from "./inbox-model"
import {
  BID_EMAIL_IDS,
  awardBlock,
  communicationsBlock,
  evaluateOutboundChecks,
  invitesSent,
  journeyIndex,
  materialExceptionProgress,
  performanceBlock,
  rfpLifecycle,
  type JourneyStep,
  type LogisticsSession,
} from "./session"

export type GuideCopy = { en: string; de: string }

export type WorkflowPage = "tender-studio" | "inbox" | "bid-evaluation" | "award" | "performance"

export type GuideDestination =
  | { page: "operating-loop" }
  | { page: "tender-studio"; packageId: string | null }
  | { page: "inbox"; emailId: string | null }
  | { page: "bid-evaluation"; packageId: string }
  | { page: "award" }
  | { page: "performance"; supplierId: string }

export type GuideAction = {
  label: GuideCopy
  destination: GuideDestination
  advance: JourneyStep | null
}

export type PageGuide = {
  mode: "progress" | "handoff"
  done: GuideCopy | null
  title: GuideCopy
  detail: GuideCopy | null
  progress: { done: number; total: number } | null
  primary: GuideAction | null
  /** Element to scroll into view. A handoff with no anchor stays where the user is. */
  anchor: string | null
}

export type GuideFollowApi = {
  advanceJourney: (step: JourneyStep) => void
  openActionCentre: () => void
  openTenderStudio: (packageId: string | null) => void
  openInbox: (emailId?: string | null) => void
  openBidEvaluation: (packageId: string | null) => void
  openAward: () => void
  openPerformance: (supplierId?: string | null) => void
}

const PKG = "PKG-RFP-001"
const RENEWAL = "PKG-REN-001"
const SUP = "SUP-001"
const INVITES = ["EML-001", "EML-002"] as const

function copy(en: string, de: string): GuideCopy {
  return { en, de }
}

function action(label: GuideCopy, destination: GuideDestination, advance: JourneyStep | null = null): GuideAction {
  return { label, destination, advance }
}

type Obligation = {
  centre: GuideAction
  done: GuideCopy | null
  workPage: WorkflowPage
  onPage: PageGuide
  /** Communications keeps its own progress while Performance is the Action Centre step. */
  inbox?: PageGuide
  /** Popup anchor when this step is shown on a page whose own work is already finished. */
  handoffAnchor?: Partial<Record<WorkflowPage, string>>
}

function progress(
  title: GuideCopy,
  detail: GuideCopy | null,
  count: { done: number; total: number } | null,
  anchor: string | null,
  primary: GuideAction | null = null,
  done: GuideCopy | null = null,
): PageGuide {
  return { mode: "progress", done, title, detail, progress: count, primary, anchor }
}

function handoff(done: GuideCopy | null, next: GuideAction, anchor: string | null = null): PageGuide {
  return {
    mode: "handoff",
    done,
    title: next.label,
    detail: null,
    progress: null,
    primary: next,
    anchor,
  }
}

function studio(packageId: string | null): GuideDestination {
  return { page: "tender-studio", packageId }
}

function requirements(session: LogisticsSession): Obligation {
  const label = copy("Review requirements", "Anforderungen prüfen")
  const centre = action(label, studio(PKG), session.journeyStep === "s1" ? "s2" : null)
  return {
    centre,
    done: null,
    workPage: "tender-studio",
    onPage: progress(
      label,
      copy(
        "Resolve each material exception and approve the evaluation method.",
        "Lösen Sie jede wesentliche Ausnahme und geben Sie die Bewertungsmethode frei.",
      ),
      materialExceptionProgress(session.requirementDecisions),
      "requirements",
    ),
  }
}

function generateRfp(): Obligation {
  const label = copy("Generate RFP", "Ausschreibung erzeugen")
  return {
    centre: action(label, studio(PKG)),
    done: copy("Requirements approved.", "Anforderungen freigegeben."),
    workPage: "tender-studio",
    onPage: progress(
      label,
      copy(
        "The requirement set is approved. Generate the cited draft here.",
        "Der Anforderungssatz ist freigegeben. Erzeugen Sie den zitierten Entwurf hier.",
      ),
      null,
      "generate-rfp",
      null,
      copy("Requirements approved.", "Anforderungen freigegeben."),
    ),
  }
}

function reviewRfp(): Obligation {
  const label = copy("Review RFP", "Ausschreibung prüfen")
  return {
    centre: action(label, studio(PKG)),
    done: copy("Cited draft generated.", "Zitierter Entwurf erzeugt."),
    workPage: "tender-studio",
    onPage: progress(
      label,
      copy(
        "Approve the cited RFP before supplier invitations can be prepared.",
        "Geben Sie die zitierte Ausschreibung frei, bevor Lieferanteneinladungen vorbereitet werden können.",
      ),
      null,
      "approve-rfp",
      null,
      copy("Cited draft generated.", "Zitierter Entwurf erzeugt."),
    ),
  }
}

function invitations(session: LogisticsSession): Obligation {
  const sent = INVITES.filter((id) => session.sentDraftIds.includes(id)).length
  const nextId = INVITES.find((id) => !session.sentDraftIds.includes(id)) ?? INVITES[0]
  const label = copy("Review supplier invitations", "Lieferanteneinladungen prüfen")
  return {
    centre: action(label, { page: "inbox", emailId: nextId }),
    done: copy("RFP approved.", "Ausschreibung freigegeben."),
    workPage: "inbox",
    onPage: progress(
      label,
      copy(
        "Send both invitations. Nothing goes out until you approve each one.",
        "Senden Sie beide Einladungen. Es geht nichts hinaus, bevor Sie jede freigeben.",
      ),
      { done: sent, total: INVITES.length },
      "inbox-action",
      action(copy("Open the next invitation", "Nächste Einladung öffnen"), { page: "inbox", emailId: nextId }),
    ),
    handoffAnchor: { "tender-studio": "approve-rfp" },
  }
}

function evidence(session: LogisticsSession): Obligation {
  const confirmed = BID_EMAIL_IDS.filter((id) => session.emailClassifications[id] === "confirmed").length
  const revised = session.attachmentMatches["EML-008"] === "revised"
  const nextId = BID_EMAIL_IDS.find((id) => session.emailClassifications[id] !== "confirmed") ?? "EML-008"
  const label = copy("Review supplier evidence", "Lieferantennachweis prüfen")
  const detail = confirmed === BID_EMAIL_IDS.length && !revised
    ? copy(
        "All four bid messages are confirmed. Use the revised RheinRoute rate card on EML-008.",
        "Alle vier Angebotsnachrichten sind bestätigt. Verwenden Sie die überarbeitete RheinRoute-Preistabelle in EML-008.",
      )
    : copy(
        "Confirm the four bid messages. Unconfirmed attachments stay out of scoring.",
        "Bestätigen Sie die vier Angebotsnachrichten. Unbestätigte Anhänge bleiben außerhalb der Bewertung.",
      )
  return {
    centre: action(label, { page: "inbox", emailId: nextId }),
    done: copy("Invitations sent.", "Einladungen gesendet."),
    workPage: "inbox",
    onPage: progress(
      label,
      detail,
      { done: confirmed, total: BID_EMAIL_IDS.length },
      "inbox-action",
      action(copy("Open the next message", "Nächste Nachricht öffnen"), { page: "inbox", emailId: nextId }),
    ),
  }
}

function bids(): Obligation {
  const label = copy("Review bids", "Angebote prüfen")
  return {
    centre: action(label, { page: "bid-evaluation", packageId: PKG }),
    done: copy("Supplier evidence confirmed.", "Lieferantennachweis bestätigt."),
    workPage: "bid-evaluation",
    onPage: progress(
      label,
      copy(
        "Choose an award scenario and submit it for approval.",
        "Wählen Sie ein Zuschlagsszenario und reichen Sie es zur Freigabe ein.",
      ),
      null,
      "bid-scenario",
    ),
  }
}

function approval(): Obligation {
  const label = copy("Submit for approval", "Zur Freigabe einreichen")
  return {
    centre: action(label, { page: "award" }),
    done: copy("Recommendation recorded.", "Empfehlung erfasst."),
    workPage: "award",
    onPage: progress(
      label,
      copy(
        "The named approver records the award on this page. A recommendation is not an award.",
        "Die benannte Person erfasst den Zuschlag auf dieser Seite. Eine Empfehlung ist kein Zuschlag.",
      ),
      null,
      "award-decision",
    ),
  }
}

function toExecution(): Obligation {
  const label = copy("Advance to execution", "Zur Ausführung wechseln")
  const next = action(label, { page: "performance", supplierId: SUP }, "s8")
  return {
    centre: next,
    done: copy("Award authorised.", "Zuschlag freigegeben."),
    workPage: "award",
    onPage: handoff(copy("Award authorised.", "Zuschlag freigegeben."), next, "award-decision"),
  }
}

function correctiveDraftNote(session: LogisticsSession): { title: GuideCopy; detail: GuideCopy } {
  const message = inboxMessages().find((row) => row.id === "EML-011")
  const ready = {
    title: copy("Approve and send the German draft", "Deutschen Entwurf freigeben und senden"),
    detail: copy(
      "The checks pass. This request is from supplier management, in German, and asks RheinRoute for a recovery plan within seven days. Approve and send is ready.",
      "Die Prüfungen sind bestanden. Die Aufforderung kommt vom Lieferantenmanagement, ist auf Deutsch und bittet RheinRoute um einen Maßnahmenplan innerhalb von sieben Tagen. Freigeben und senden ist bereit.",
    ),
  }
  if (!message) return ready
  const failed = evaluateOutboundChecks(session, {
    id: message.id,
    from: message.from,
    to: message.to,
    language: message.language,
    bodyEn: message.bodyEn,
    bodyDe: message.bodyDe,
    attachments: message.attachments,
  }).filter((row) => !row.pass)
  if (failed.length === 0) return ready
  return {
    title: copy("Approve and send is blocked", "Freigeben und senden ist gesperrt"),
    detail: copy(
      `Approve and send stays off. ${failed.map((row) => row.reason.en).join(" ")}`,
      `Freigeben und senden bleibt aus. ${failed.map((row) => row.reason.de).join(" ")}`,
    ),
  }
}

function execution(session: LogisticsSession): Obligation {
  const centreLabel = copy("Review performance", "Leistung prüfen")
  const draftLabel = copy("Review the German corrective draft", "Deutschen Entwurf prüfen")
  const draft = action(draftLabel, { page: "inbox", emailId: "EML-011" })
  const note = correctiveDraftNote(session)
  return {
    centre: action(centreLabel, { page: "performance", supplierId: SUP }),
    done: copy("Execution evidence is released.", "Ausführungsnachweise sind freigegeben."),
    workPage: "performance",
    onPage: handoff(copy("On-time delivery is below the awarded target.", "Die Pünktlichkeit liegt unter dem zugesagten Ziel."), draft, "performance-draft"),
    inbox: progress(
      note.title,
      note.detail,
      null,
      "inbox-action",
      action(copy("Open the German draft", "Deutschen Entwurf öffnen"), { page: "inbox", emailId: "EML-011" }),
    ),
  }
}

function renewal(): Obligation {
  const label = copy("Review renewal", "Verlängerung prüfen")
  return {
    centre: action(label, { page: "performance", supplierId: SUP }),
    done: copy("Corrective draft sent.", "Korrekturentwurf gesendet."),
    workPage: "performance",
    onPage: progress(
      label,
      copy(
        "Close the corrective action, then record the re-tender on this page.",
        "Schließen Sie die Korrekturmaßnahme und erfassen Sie dann die Neuausschreibung auf dieser Seite.",
      ),
      null,
      "performance-renewal",
    ),
  }
}

function nextCycle(): Obligation {
  const label = copy("Start next cycle", "Nächsten Zyklus starten")
  const next = action(label, studio(RENEWAL))
  return {
    centre: next,
    done: copy("Renewal recorded.", "Verlängerung erfasst."),
    workPage: "tender-studio",
    onPage: {
      mode: "progress",
      done: copy("Renewal recorded.", "Verlängerung erfasst."),
      title: copy(
        "The next cycle is prepopulated in this workspace.",
        "Der nächste Zyklus ist in diesem Arbeitsbereich vorbefüllt.",
      ),
      detail: null,
      progress: null,
      primary: null,
      anchor: "renewal-prefill",
    },
  }
}

function obligation(session: LogisticsSession): Obligation | null {
  const n = journeyIndex(session.journeyStep)
  if (n < 1 && !session.acceptedNeed) return null
  if (n >= 10) return nextCycle()
  if (n >= 9) return renewal()
  if (n >= 8) return execution(session)
  if (n >= 7) return toExecution()
  if (n >= 6) return approval()
  if (n >= 5) return bids()
  if (n >= 4 || invitesSent(session)) return evidence(session)
  if (session.rfpApproved && session.rfpGenerated) return invitations(session)
  if (session.rfpGenerated) return reviewRfp()
  if (n >= 3 || session.packageLocked) return generateRfp()
  if (n >= 1 || session.acceptedNeed) return requirements(session)
  return null
}

function isHeld(session: LogisticsSession, here: WorkflowPage): boolean {
  if (here === "inbox") return communicationsBlock(session) != null
  if (here === "bid-evaluation") return rfpLifecycle(session).phase !== "bids-ready"
  if (here === "award") return awardBlock(session) != null
  if (here === "performance") return performanceBlock(session) != null
  return false
}

/** The Action Centre button for the live RFP. */
export function actionCentreStep(session: LogisticsSession): GuideAction | null {
  return obligation(session)?.centre ?? null
}

/** What the current page should say about the step just finished or still open. */
export function pageGuide(session: LogisticsSession, here: WorkflowPage): PageGuide | null {
  if (isHeld(session, here)) return null
  const step = obligation(session)
  if (!step) return null
  if (here === "inbox" && step.inbox) return step.inbox
  if (here === step.workPage) return step.onPage
  return handoff(step.done, step.centre, step.handoffAnchor?.[here] ?? null)
}

export function followGuide(guideAction: GuideAction, api: GuideFollowApi) {
  if (guideAction.advance) api.advanceJourney(guideAction.advance)
  const destination = guideAction.destination
  switch (destination.page) {
    case "operating-loop":
      api.openActionCentre()
      return
    case "tender-studio":
      api.openTenderStudio(destination.packageId)
      return
    case "inbox":
      api.openInbox(destination.emailId)
      return
    case "bid-evaluation":
      api.openBidEvaluation(destination.packageId)
      return
    case "award":
      api.openAward()
      return
    case "performance":
      api.openPerformance(destination.supplierId)
      return
  }
}
