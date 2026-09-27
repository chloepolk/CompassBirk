import { defaultAwardContracts } from "./award-contracts"
import { REQUIREMENTS } from "./requirements"

export const LOGISTICS_SESSION_KEY = "clp-session-v2"

export type SessionContract = {
  contractId: string
  supplierId: string
  contractTitle: string
  startDate: string
  endDate: string
  noticeDays: number
  contractValueEur: number
  otdTarget: number
  acceptanceTarget: number
  claimsTargetMax: number
  invoiceAccuracyTarget: number
  status: string
  sourcePackageId: string
  lanes?: string[]
  rateBasis?: string
  capacityNote?: string
  renewalTerms?: string
  scenarioId?: string
}

export type EmailClass = "confirmed" | "potentially" | "not-relevant"

export type AttachmentMatch = "original" | "revised" | "rejected"

export type SendApproval = {
  emailId: string
  approverName: string
  approvedAt: string
  rfpVersion: string
  checks: string[]
}

/** Persistent demonstration steps. Each step is reached only by a user action. */
export type JourneyStep = "s0" | "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8" | "s9" | "s10"

/**
 * Named statuses shown in place of progress percentages.
 * Legacy aliases remain so older copy keys still resolve.
 */
export type JourneyStatus =
  | "need-identified"
  | "need-rejected"
  | "need-accepted"
  | "requirements-under-review"
  | "requirements-approved"
  | "rfp-draft-generated"
  | "rfp-approved"
  | "invitation-sent"
  | "supplier-evidence-confirmed"
  | "recommendation-ready"
  | "award-approved"
  | "variance-detected"
  | "action-open"
  | "action-completed"
  | "renewal-recorded"
  | "rfp-issued"
  | "responses-validated"
  | "evaluation-complete"
  | "monitoring-active"

export type ResolutionChoice =
  | "use-source-a"
  | "use-source-b"
  | "accept-gap"
  | "request-information"
  | "exclude-scope"

export const RESOLUTION_CHOICES: ResolutionChoice[] = [
  "use-source-a",
  "use-source-b",
  "accept-gap",
  "request-information",
  "exclude-scope",
]

export type RequirementDecision = {
  id: string
  decision: ResolutionChoice
  rationale: string
  at?: string
}

export type ActionRecord = {
  id: string
  status: "open" | "accepted" | "edited" | "dismissed" | "assigned" | "closed"
  owner: string
  dueDate: string
  rationale: string
  notes: string
  closureEvidence?: string
}

export type EvaluationOverride = {
  at: string
  originalScenarioId: string
  scenarioId: string
  rationale: string
}

export type ApprovalTrace = {
  requirementSetVersion: string | null
  evaluationMethodVersion: string | null
  rfpVersion: string | null
  scenarioId: string | null
  bidVersion: string
  approverName: string
  approverRole: string
  approvedAt: string
  comment: string
  overrideReason: string | null
  contractIds: string[]
}

export type LogisticsSession = {
  journeyStep: JourneyStep
  acceptedNeed: boolean
  /** User rejected the sourcing need. No downstream event exists. */
  needRejected: boolean
  sourcingEventId: string | null
  packageLocked: boolean
  evaluationMethodApproved: boolean
  classifiedEmailIds: string[]
  emailClassifications: Record<string, EmailClass>
  attachmentMatches: Record<string, AttachmentMatch>
  sentDraftIds: string[]
  sendApprovals: SendApproval[]
  /** Cited RFP exists. Approval stays blocked until this is true. */
  rfpGenerated: boolean
  /** Cited RFP approved. Invitations stay blocked until this is true. */
  rfpApproved: boolean
  rfpVersion: string | null
  rfpEditNote: string
  bidsReleased: boolean
  awardApproved: boolean
  awardPending: boolean
  caAssigned: boolean
  createdContracts: SessionContract[]
  replayCheckpoint: number
  performanceReleased: boolean
  asOfMonth: string
  requirementSetVersion: string | null
  evaluationMethodVersion: string | null
  requirementDecisions: RequirementDecision[]
  confirmedEvidenceIds: string[]
  selectedScenarioId: string | null
  actionRecords: ActionRecord[]
  renewalEventId: string | null
  renewalDecision: string | null
  correctiveDraftApproved: boolean
  /** Anonymised bidder note. Recording it does not send a message. */
  clarificationNote: string | null
  evaluationOverrides: EvaluationOverride[]
  approvalTrace: ApprovalTrace | null
}

export const JOURNEY_ORDER: JourneyStep[] = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"]

export function journeyIndex(step: JourneyStep): number {
  return JOURNEY_ORDER.indexOf(step)
}

const INVITE_IDS = ["EML-001", "EML-002"] as const
const BID_EMAIL_IDS = ["EML-007", "EML-008", "EML-009"] as const
export const SEND_CHECKS = ["recipient", "authority", "facts", "dates", "attachment", "confidentiality"] as const

export function invitesSent(session: Pick<LogisticsSession, "sentDraftIds">): boolean {
  return INVITE_IDS.every((id) => session.sentDraftIds.includes(id))
}

/** Status at the moment a journey step is entered. In-step progress uses statusForSession. */
export function statusForStep(step: JourneyStep): JourneyStatus {
  switch (step) {
    case "s0": return "need-identified"
    case "s1": return "need-accepted"
    case "s2": return "requirements-under-review"
    case "s3": return "requirements-approved"
    case "s4": return "invitation-sent"
    case "s5": return "supplier-evidence-confirmed"
    case "s6": return "recommendation-ready"
    case "s7": return "award-approved"
    case "s8": return "variance-detected"
    case "s9": return "action-open"
    case "s10": return "renewal-recorded"
  }
}

/** Current status from persisted facts, including progress inside a step. */
export function statusForSession(session: LogisticsSession): JourneyStatus {
  const n = journeyIndex(session.journeyStep)
  if (session.renewalEventId || n >= 10) return "renewal-recorded"
  if (n >= 9 || session.correctiveDraftApproved) {
    return session.correctiveDraftApproved ? "action-completed" : "action-open"
  }
  if (n >= 8 || session.performanceReleased) return "variance-detected"
  if (n >= 7 || session.awardApproved) return "award-approved"
  if (n >= 6 || session.awardPending) return "recommendation-ready"
  if (n >= 5 || session.bidsReleased) return "supplier-evidence-confirmed"
  if (n >= 4 || invitesSent(session)) return "invitation-sent"
  if (session.rfpApproved) return "rfp-approved"
  if (session.rfpGenerated) return "rfp-draft-generated"
  if (n >= 3 || session.packageLocked) return "requirements-approved"
  if (n >= 2) return "requirements-under-review"
  if (session.acceptedNeed || session.sourcingEventId) return "need-accepted"
  if (session.needRejected) return "need-rejected"
  return "need-identified"
}

const STEP_EMAILS: Record<number, Record<string, EmailClass>> = {
  5: {
    "EML-004": "confirmed",
    "EML-005": "potentially",
    "EML-006": "not-relevant",
    "EML-007": "confirmed",
    "EML-008": "confirmed",
    "EML-009": "confirmed",
    "EML-012": "not-relevant",
  },
}

function emailsAt(step: JourneyStep): Record<string, EmailClass> {
  const n = journeyIndex(step)
  if (n >= 9) {
    return { ...STEP_EMAILS[5], "EML-010": "confirmed", "EML-011": "confirmed" }
  }
  if (n >= 5) return { ...STEP_EMAILS[5] }
  return {}
}

/** Derive eligibility flags from the journey step so downstream screens cannot jump ahead. */
export function flagsForStep(step: JourneyStep): Pick<
  LogisticsSession,
  | "acceptedNeed"
  | "packageLocked"
  | "bidsReleased"
  | "awardApproved"
  | "awardPending"
  | "caAssigned"
  | "performanceReleased"
  | "asOfMonth"
  | "sentDraftIds"
  | "emailClassifications"
  | "classifiedEmailIds"
  | "confirmedEvidenceIds"
  | "correctiveDraftApproved"
> {
  const n = journeyIndex(step)
  const emailClassifications = emailsAt(step)
  return {
    acceptedNeed: n >= 1,
    packageLocked: n >= 3,
    sentDraftIds: n >= 4 ? [...INVITE_IDS] : [],
    bidsReleased: n >= 5,
    awardPending: n === 6,
    awardApproved: n >= 7,
    performanceReleased: n >= 8,
    asOfMonth: "2026-08",
    caAssigned: n >= 9,
    correctiveDraftApproved: n >= 9,
    emailClassifications,
    classifiedEmailIds: Object.keys(emailClassifications),
    confirmedEvidenceIds: n >= 5 ? [...BID_EMAIL_IDS] : [],
  }
}

const MATERIAL_IDS = REQUIREMENTS.filter((row) => row.state !== "clear").map((row) => row.id)

/** Free text such as "ignore this" is not a structured decision. */
export function isDismissalRationale(text: string): boolean {
  return /^(ignore this|ignore|dismiss|skip|n\/a|na)\b/i.test(text.trim())
}

export function materialExceptionsResolved(decisions: RequirementDecision[]): boolean {
  const ids = new Set(
    decisions
      .filter((d) =>
        RESOLUTION_CHOICES.includes(d.decision)
        && d.rationale.trim().length >= 8
        && !isDismissalRationale(d.rationale),
      )
      .map((d) => d.id),
  )
  return MATERIAL_IDS.every((id) => ids.has(id))
}

export function nextVersion(current: string | null, stem: string): string {
  const match = current?.match(/-v(\d+)$/)
  const n = match ? Number(match[1]) + 1 : 1
  return `${stem}-v${n}`
}

/** A change after lock writes a new requirement-set version and withdraws the RFP. */
export function recordRequirementDecision(session: LogisticsSession, decision: RequirementDecision): LogisticsSession {
  const stamped: RequirementDecision = { ...decision, at: decision.at ?? new Date().toISOString() }
  const requirementDecisions = [
    ...session.requirementDecisions.filter((d) => d.id !== decision.id),
    stamped,
  ]
  const locked = session.packageLocked || session.journeyStep === "s3"
  if (!locked) return { ...session, requirementDecisions }
  return {
    ...session,
    requirementDecisions,
    requirementSetVersion: nextVersion(session.requirementSetVersion, "REQ-2026-001"),
    rfpApproved: false,
    rfpGenerated: false,
    rfpVersion: null,
  }
}

/** One step at a time, and only after the prerequisite user action. */
export function canAdvance(session: LogisticsSession, step: JourneyStep): boolean {
  if (journeyIndex(step) !== journeyIndex(session.journeyStep) + 1) return false
  switch (step) {
    case "s1":
      return true
    case "s2":
      return session.acceptedNeed && Boolean(session.sourcingEventId)
    case "s3":
      return session.evaluationMethodApproved && materialExceptionsResolved(session.requirementDecisions)
    case "s4":
      return session.packageLocked && session.rfpGenerated && session.rfpApproved && invitesSent(session)
    case "s5":
      return BID_EMAIL_IDS.every((id) => session.emailClassifications[id] === "confirmed")
        && session.attachmentMatches["EML-008"] === "revised"
    case "s6":
      return Boolean(session.selectedScenarioId)
    case "s7":
      return Boolean(session.selectedScenarioId)
    case "s8":
      return session.awardApproved && session.createdContracts.length > 0
    case "s9":
      return session.performanceReleased && session.correctiveDraftApproved
    case "s10":
      return session.correctiveDraftApproved
    default:
      return false
  }
}

export function emptySession(): LogisticsSession {
  return {
    journeyStep: "s0",
    acceptedNeed: false,
    needRejected: false,
    sourcingEventId: null,
    packageLocked: false,
    evaluationMethodApproved: false,
    classifiedEmailIds: [],
    emailClassifications: {},
    attachmentMatches: {},
    sentDraftIds: [],
    sendApprovals: [],
    rfpGenerated: false,
    rfpApproved: false,
    rfpVersion: null,
    rfpEditNote: "",
    bidsReleased: false,
    awardApproved: false,
    awardPending: false,
    caAssigned: false,
    createdContracts: [],
    replayCheckpoint: 0,
    performanceReleased: false,
    asOfMonth: "2026-08",
    requirementSetVersion: null,
    evaluationMethodVersion: null,
    requirementDecisions: [],
    confirmedEvidenceIds: [],
    selectedScenarioId: null,
    actionRecords: [],
    renewalEventId: null,
    renewalDecision: null,
    correctiveDraftApproved: false,
    clarificationNote: null,
    evaluationOverrides: [],
    approvalTrace: null,
  }
}

export const DEFAULT_SESSION: LogisticsSession = emptySession()

function hydrateDecisions(value: unknown): RequirementDecision[] {
  if (!Array.isArray(value)) return []
  const out: RequirementDecision[] = []
  for (const row of value) {
    if (!row || typeof row !== "object") continue
    const decision = (row as { decision?: string }).decision
    if (!decision || !RESOLUTION_CHOICES.includes(decision as ResolutionChoice)) continue
    const id = String((row as { id?: string }).id ?? "")
    if (!id) continue
    const at = (row as { at?: string }).at
    out.push({
      id,
      decision: decision as ResolutionChoice,
      rationale: String((row as { rationale?: string }).rationale ?? ""),
      at: typeof at === "string" ? at : undefined,
    })
  }
  return out
}

/** Restore a saved session without inventing in-step progress from the step number. */
export function normalizeSession(parsed: Partial<LogisticsSession>): LogisticsSession {
  const step = JOURNEY_ORDER.includes(parsed.journeyStep as JourneyStep)
    ? (parsed.journeyStep as JourneyStep)
    : "s0"
  const n = journeyIndex(step)
  const emailClassifications = { ...(parsed.emailClassifications ?? {}) }
  const sentDraftIds = Array.isArray(parsed.sentDraftIds) ? [...parsed.sentDraftIds] : []
  const locked = Boolean(parsed.packageLocked) || n >= 3
  const methodApproved = Boolean(parsed.evaluationMethodApproved) || n >= 3
  const generated = Boolean(parsed.rfpGenerated) || n >= 4
  const approved = n >= 4 ? true : Boolean(parsed.rfpApproved)
  return {
    ...emptySession(),
    ...parsed,
    journeyStep: step,
    acceptedNeed: Boolean(parsed.acceptedNeed) || n >= 1,
    needRejected: Boolean(parsed.needRejected) && n < 1 && !parsed.acceptedNeed,
    sourcingEventId: parsed.sourcingEventId ?? ((parsed.acceptedNeed || n >= 1) ? "RFP-2026-001" : null),
    packageLocked: locked,
    evaluationMethodApproved: methodApproved,
    emailClassifications,
    classifiedEmailIds: Array.isArray(parsed.classifiedEmailIds) ? parsed.classifiedEmailIds : Object.keys(emailClassifications),
    attachmentMatches: { ...(parsed.attachmentMatches ?? {}) },
    sentDraftIds,
    sendApprovals: parsed.sendApprovals ?? [],
    rfpGenerated: generated,
    rfpApproved: approved,
    rfpVersion: (approved || generated) ? (parsed.rfpVersion ?? "RFP-2026-001-v1") : null,
    rfpEditNote: parsed.rfpEditNote ?? "",
    bidsReleased: Boolean(parsed.bidsReleased) || n >= 5,
    awardPending: parsed.awardPending === true || n === 6,
    awardApproved: Boolean(parsed.awardApproved) || n >= 7,
    performanceReleased: Boolean(parsed.performanceReleased) || n >= 8,
    asOfMonth: "2026-08",
    caAssigned: Boolean(parsed.caAssigned) || n >= 9,
    correctiveDraftApproved: Boolean(parsed.correctiveDraftApproved) || n >= 9,
    clarificationNote: typeof parsed.clarificationNote === "string" ? parsed.clarificationNote : null,
    createdContracts: n >= 7
      ? (parsed.createdContracts?.length ? parsed.createdContracts : defaultAwardContracts())
      : (parsed.createdContracts ?? []),
    requirementDecisions: hydrateDecisions(parsed.requirementDecisions),
    actionRecords: parsed.actionRecords ?? [],
    evaluationOverrides: parsed.evaluationOverrides ?? [],
    approvalTrace: parsed.approvalTrace ?? null,
    confirmedEvidenceIds: parsed.confirmedEvidenceIds ?? (n >= 5 ? [...BID_EMAIL_IDS] : []),
    selectedScenarioId: parsed.selectedScenarioId ?? (n >= 6 ? "AWD-02" : null),
    renewalEventId: parsed.renewalEventId ?? null,
    renewalDecision: parsed.renewalDecision ?? null,
    requirementSetVersion: locked ? (parsed.requirementSetVersion ?? "REQ-2026-001-v1") : null,
    evaluationMethodVersion: methodApproved ? (parsed.evaluationMethodVersion ?? "EVAL-LOG-v1") : null,
    replayCheckpoint: parsed.replayCheckpoint ?? n,
  }
}

export function loadSession(): LogisticsSession {
  if (typeof window === "undefined") return emptySession()
  try {
    const raw = localStorage.getItem(LOGISTICS_SESSION_KEY)
    if (!raw) return emptySession()
    return normalizeSession(JSON.parse(raw) as Partial<LogisticsSession>)
  } catch {
    return emptySession()
  }
}

export function persistSession(session: LogisticsSession) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOGISTICS_SESSION_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

function withStepBoundary(session: LogisticsSession, step: JourneyStep): LogisticsSession {
  const flags = flagsForStep(step)
  const n = journeyIndex(step)
  return {
    ...session,
    ...flags,
    journeyStep: step,
    needRejected: false,
    sourcingEventId: n >= 1 ? (session.sourcingEventId ?? "RFP-2026-001") : null,
    evaluationMethodApproved: n >= 3 ? true : session.evaluationMethodApproved,
    requirementSetVersion: n >= 3 ? (session.requirementSetVersion ?? "REQ-2026-001-v1") : null,
    evaluationMethodVersion: n >= 3 ? (session.evaluationMethodVersion ?? "EVAL-LOG-v1") : null,
    rfpGenerated: n >= 4 ? true : n === 3 ? session.rfpGenerated : false,
    rfpApproved: n >= 4 ? true : n === 3 ? session.rfpApproved : false,
    rfpVersion: n >= 4 ? (session.rfpVersion ?? "RFP-2026-001-v1") : n === 3 ? session.rfpVersion : null,
    sentDraftIds: n >= 4 ? Array.from(new Set([...INVITE_IDS, ...session.sentDraftIds])) : [],
    attachmentMatches: n >= 5 ? { "EML-008": "revised", ...session.attachmentMatches } : (n >= 4 ? session.attachmentMatches : {}),
    selectedScenarioId: n >= 6 ? (session.selectedScenarioId ?? "AWD-02") : null,
    createdContracts: n >= 7
      ? (session.createdContracts.length > 0 ? session.createdContracts : defaultAwardContracts(undefined, session.selectedScenarioId ?? "AWD-02"))
      : [],
    approvalTrace: n >= 7 ? session.approvalTrace : null,
    replayCheckpoint: Math.max(session.replayCheckpoint, n),
  }
}

export function retreatTo(session: LogisticsSession, step: JourneyStep): LogisticsSession {
  return withStepBoundary(session, step)
}

export function advanceTo(session: LogisticsSession, step: JourneyStep): LogisticsSession {
  if (!canAdvance(session, step)) return session
  return withStepBoundary(session, step)
}

/** Operator-only. Customer screens must not call this. */
export function applyReplayCheckpoint(checkpoint: number): Partial<LogisticsSession> {
  const step: JourneyStep =
    checkpoint >= 8 ? "s9"
      : checkpoint >= 7 ? "s8"
        : checkpoint >= 6 ? "s7"
          : checkpoint >= 5 ? "s6"
            : checkpoint >= 4 ? "s5"
              : checkpoint >= 3 ? "s4"
                : checkpoint >= 2 ? "s3"
                  : checkpoint >= 1 ? "s1"
                    : "s0"
  const n = journeyIndex(step)
  return {
    ...flagsForStep(step),
    ...withStepBoundary(emptySession(), step),
    journeyStep: step,
    replayCheckpoint: checkpoint,
    createdContracts: checkpoint >= 6 ? defaultAwardContracts() : [],
    selectedScenarioId: checkpoint >= 5 ? "AWD-02" : null,
    renewalEventId: null,
    renewalDecision: null,
    requirementSetVersion: n >= 3 ? "REQ-2026-001-v1" : null,
    evaluationMethodVersion: n >= 3 ? "EVAL-LOG-v1" : null,
    evaluationMethodApproved: n >= 3,
    rfpGenerated: n >= 4,
    rfpApproved: n >= 4,
    rfpVersion: n >= 4 ? "RFP-2026-001-v1" : null,
    rfpEditNote: "",
    sourcingEventId: n >= 1 ? "RFP-2026-001" : null,
    needRejected: false,
    sendApprovals: [],
    evaluationOverrides: [],
    approvalTrace: null,
    requirementDecisions: [],
  }
}

export type GateCopy = { en: string; de: string }

export function communicationsBlock(session: LogisticsSession): GateCopy | null {
  if ((session.rfpApproved && session.rfpGenerated) || journeyIndex(session.journeyStep) >= 4) return null
  if (!session.acceptedNeed) {
    return {
      en: "Validate the sourcing need in the Action Centre before any invitation can be prepared.",
      de: "Bestätigen Sie den Beschaffungsbedarf im Aktionszentrum, bevor eine Einladung vorbereitet werden kann.",
    }
  }
  if (!session.packageLocked) {
    return {
      en: "Invitations stay unavailable until the requirement set and evaluation method are approved in the Sourcing Workspace.",
      de: "Einladungen bleiben gesperrt, bis der Anforderungssatz und die Bewertungsmethode im Beschaffungsarbeitsbereich freigegeben sind.",
    }
  }
  if (!session.rfpGenerated) {
    return {
      en: "Generate the cited RFP in the Sourcing Workspace before invitations can be prepared.",
      de: "Erzeugen Sie die zitierte Ausschreibung im Beschaffungsarbeitsbereich, bevor Einladungen vorbereitet werden.",
    }
  }
  return {
    en: "Review and approve the cited RFP before Communications can attach it. An approved requirement set is not an RFP, and an approved draft is not a sent invitation.",
    de: "Prüfen und geben Sie die zitierte Ausschreibung frei, bevor die Kommunikation sie anhängen kann. Ein freigegebener Anforderungssatz ist keine Ausschreibung, und ein freigegebener Entwurf ist keine gesendete Einladung.",
  }
}

export function evaluationBlock(session: LogisticsSession): GateCopy | null {
  if (session.bidsReleased || journeyIndex(session.journeyStep) >= 5) return null
  if (!session.rfpGenerated) {
    return {
      en: "No bids yet. Generate the cited RFP from the approved requirement set first.",
      de: "Noch keine Angebote. Erzeugen Sie zuerst die zitierte Ausschreibung aus dem freigegebenen Anforderungssatz.",
    }
  }
  if (!session.rfpApproved) {
    return {
      en: "No bids yet. Review and approve the cited RFP before invitations can be sent.",
      de: "Noch keine Angebote. Prüfen und geben Sie die zitierte Ausschreibung frei, bevor Einladungen gesendet werden.",
    }
  }
  if (!invitesSent(session)) {
    return {
      en: "No bids yet. Review supplier invitations and approve the send. Responses stay held until the invitation is sent.",
      de: "Noch keine Angebote. Prüfen Sie die Lieferanteneinladungen und geben Sie den Versand frei. Antworten bleiben gesperrt, bis die Einladung gesendet ist.",
    }
  }
  return {
    en: "Responses are awaiting validation. Confirm email classification and the attachment match before the four bids become eligible.",
    de: "Antworten warten auf Prüfung. Bestätigen Sie die E-Mail-Klassifikation und die Anhangszuordnung, bevor die vier Angebote bewertbar werden.",
  }
}

export function awardBlock(session: LogisticsSession): GateCopy | null {
  if (session.awardPending || session.awardApproved || journeyIndex(session.journeyStep) >= 6) return null
  if (!session.bidsReleased) {
    return {
      en: "A named award stays unavailable until supplier evidence is confirmed and the bids are eligible.",
      de: "Eine benannte Zuschlagsfreigabe bleibt gesperrt, bis der Lieferantennachweis bestätigt und die Angebote bewertbar sind.",
    }
  }
  return {
    en: "Choose an award scenario in Bid Evaluation and submit it for approval. A recommendation is not an authorised award.",
    de: "Wählen Sie ein Zuschlagsszenario in der Angebotsbewertung und reichen Sie es zur Freigabe ein. Eine Empfehlung ist kein genehmigter Zuschlag.",
  }
}

export function performanceBlock(session: LogisticsSession): GateCopy | null {
  if (session.performanceReleased || journeyIndex(session.journeyStep) >= 8) return null
  if (!session.awardApproved) {
    return {
      en: "Execution evidence stays held until a named approver authorises the award and the contract baseline exists.",
      de: "Ausführungsnachweise bleiben gesperrt, bis eine benannte Person den Zuschlag freigibt und die Vertragsbaseline vorliegt.",
    }
  }
  return {
    en: "Advance to execution from the Action Centre to release the labelled operating period. Award approval is not realised value.",
    de: "Wechseln Sie über das Aktionszentrum zur Ausführung, um den gekennzeichneten Betriebszeitraum freizugeben. Die Zuschlagsfreigabe ist kein realisierter Wert.",
  }
}
