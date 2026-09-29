import type { IttDocument } from "@/app/compass/agents/_tender-types"
import { defaultAwardContracts } from "./award-contracts"
import { REQUIREMENTS } from "./requirements"
import { LANES } from "./structured/lanes"
import { SUPPLIERS } from "./structured/suppliers"
import { FORECAST_SHIPMENTS } from "./vendor-model"

export type LaneRateTemplateRow = {
  laneId: string
  origin: string
  destination: string
  forecastShipments: number
  currency: "EUR"
  rate: ""
  fuelSurcharge: "SRC-005"
  accessorials: "Bidder schedule"
}

/** Exact approved package. Communications may attach only this version. */
export type ApprovedRfp = {
  version: string
  requirementSetVersion: string
  evaluationMethodVersion: string
  english: IttDocument
  german: IttDocument
  laneRateTemplate: LaneRateTemplateRow[]
  reviewNote: string
  attachments: { name: string; version: string }[]
}

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
  sender: string
  approverName: string
  recipients: string[]
  approvedAt: string
  message: string
  attachments: { name: string; version: string }[]
  rfpVersion: string
  delivery: "delivered"
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
  /** Locked English RFP, German translation and lane-rate template. */
  approvedRfp: ApprovedRfp | null
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
export const BID_EMAIL_IDS = ["EML-007", "EML-008", "EML-009", "EML-013"] as const
/** Recipient, sending authority, facts and dates together, attachment version, confidentiality, language. */
export const SEND_CHECKS = ["recipient", "authority", "factsDates", "attachment", "confidentiality", "language"] as const

export type OutboundCheckKey = (typeof SEND_CHECKS)[number]

export type OutboundDraftFacts = {
  id: string
  from: string
  to: string
  language: "EN" | "DE"
  bodyEn: string
  bodyDe: string
  attachments?: { name: string; version: string }[]
}

export type OutboundCheck = {
  key: OutboundCheckKey
  pass: boolean
  /** Why this check fails, in plain language. */
  reason: { en: string; de: string }
}

const SOURCING_MAILBOX = "sourcing@compass-demo.example"
const SUPPLIER_MANAGEMENT_MAILBOX = "supplier.management@compass-demo.example"

function draftText(draft: OutboundDraftFacts): string {
  return `${draft.bodyEn}\n${draft.bodyDe}`
}

function mentionsForecast(text: string): boolean {
  const plain = String(FORECAST_SHIPMENTS)
  return text.includes(plain)
    || text.includes(FORECAST_SHIPMENTS.toLocaleString("en-GB"))
    || text.includes(FORECAST_SHIPMENTS.toLocaleString("de-DE"))
}

function mentionsLanes(text: string): boolean {
  const lanes = LANES.filter((lane) => lane.laneId).length
  return text.includes(String(lanes)) || /eighteen|achtzehn/i.test(text)
}

function mentionsDeadline(text: string): boolean {
  return /23 October 2026|23\. Oktober 2026/i.test(text)
}

function supplierContacts(): Set<string> {
  return new Set(
    SUPPLIERS.map((row) => row.contactEmail?.toLowerCase()).filter((email): email is string => Boolean(email)),
  )
}

function check(key: OutboundCheckKey, pass: boolean, en: string, de: string): OutboundCheck {
  return { key, pass, reason: { en, de } }
}

/** Corrective requests are not invitations. They send from supplier management, in German, to the carrier on the action. */
function correctiveChecks(draft: OutboundDraftFacts): OutboundCheck[] {
  const text = draftText(draft)
  const files = draft.attachments ?? []
  const germanFile = files.some((file) => /corrective_action_request_de\.docx/i.test(file.name))
  const namesAnotherCarrier = /\b(northbridge|alpinelink|veloce|eurospan)\b/i.test(text)
  return [
    check(
      "recipient",
      supplierContacts().has(draft.to.toLowerCase()),
      "The recipient is not a known supplier contact.",
      "Der Empfänger ist kein bekannter Lieferantenkontakt.",
    ),
    check(
      "authority",
      draft.from.toLowerCase() === SUPPLIER_MANAGEMENT_MAILBOX,
      "A corrective request sends from supplier.management@compass-demo.example, not the sourcing mailbox.",
      "Eine Korrekturaufforderung geht von supplier.management@compass-demo.example, nicht vom Beschaffungs-Postfach.",
    ),
    check(
      "factsDates",
      /seven days|sieben Tagen/i.test(text) && (/\bfive\b|fünf/i.test(text)),
      "The request must name the seven-day deadline and the five late lanes.",
      "Die Aufforderung muss die Frist von sieben Tagen und die fünf verspäteten Relationen nennen.",
    ),
    check(
      "attachment",
      germanFile,
      "The German file Corrective_Action_Request_DE.docx is not attached.",
      "Die deutsche Datei Corrective_Action_Request_DE.docx fehlt im Anhang.",
    ),
    check(
      "confidentiality",
      !namesAnotherCarrier,
      "The note names another carrier. A corrective request goes only to the supplier on the action.",
      "Die Notiz nennt einen anderen Träger. Eine Korrekturaufforderung geht nur an den Lieferanten der Maßnahme.",
    ),
    check(
      "language",
      draft.language === "DE" && draft.bodyDe.trim().length > 0 && germanFile,
      "This request has to go out in German, with the German file attached.",
      "Diese Aufforderung muss auf Deutsch hinausgehen, mit der deutschen Datei im Anhang.",
    ),
  ]
}

/** Six outbound checks. Approve and send stays disabled until every one passes. */
export function evaluateOutboundChecks(
  session: Pick<LogisticsSession, "approvedRfp" | "rfpVersion">,
  draft: OutboundDraftFacts,
): OutboundCheck[] {
  if (draft.id === "EML-011") return correctiveChecks(draft)
  const text = draftText(draft)
  const files = issuedInvitationAttachments(session, draft.id)
  const version = session.rfpVersion
  const names = new Set(files.map((file) => file.name))
  const versionsMatch = Boolean(version) && files.length > 0 && files.every((file) => file.version === version)
  const englishPack = names.has("RFP_EN.docx") && !names.has("RFP_DE.docx") && names.has("Lane_Rate_Template.csv")
  const germanPack = names.has("RFP_DE.docx") && !names.has("RFP_EN.docx") && names.has("Lane_Rate_Template.csv")
  const namesAnotherBidder = /\b(rheinroute|northbridge|alpinelink|veloce|eurospan)\b/i.test(text)
  const confidential = /confidential to the named recipient|für den genannten Empfänger vertraulich/i.test(text)
  const languagePass = draft.id === "EML-001"
    ? draft.language === "EN" && englishPack
    : draft.id === "EML-002"
      ? draft.language === "DE" && germanPack
      : false

  return [
    check(
      "recipient",
      supplierContacts().has(draft.to.toLowerCase()),
      "The recipient is not a known supplier contact.",
      "Der Empfänger ist kein bekannter Lieferantenkontakt.",
    ),
    check(
      "authority",
      draft.from.toLowerCase() === SOURCING_MAILBOX,
      "Invitations send from sourcing@compass-demo.example.",
      "Einladungen gehen von sourcing@compass-demo.example.",
    ),
    check(
      "factsDates",
      text.includes("RFP-2026-001") && mentionsLanes(text) && mentionsForecast(text) && mentionsDeadline(text),
      "The draft must name RFP-2026-001, the lane count, the forecast, and the 23 October 2026 deadline.",
      "Der Entwurf muss RFP-2026-001, die Zahl der Relationen, die Prognose und die Frist 23. Oktober 2026 nennen.",
    ),
    check(
      "attachment",
      Boolean(session.approvedRfp) && versionsMatch && (draft.id === "EML-001" ? englishPack : germanPack),
      "The attachment pack must be the approved RFP version for this language.",
      "Das Anhangspaket muss die freigegebene Ausschreibungsversion für diese Sprache sein.",
    ),
    check(
      "confidentiality",
      confidential && !namesAnotherBidder,
      "The invitation must stay confidential to the named recipient and must not name another bidder.",
      "Die Einladung muss für den genannten Empfänger vertraulich bleiben und darf keinen anderen Bieter nennen.",
    ),
    check(
      "language",
      languagePass,
      "The English invitation carries the English pack. The German invitation carries the German pack.",
      "Die englische Einladung trägt das englische Paket. Die deutsche Einladung trägt das deutsche Paket.",
    ),
  ]
}

export function issuedInvitationAttachments(
  session: Pick<LogisticsSession, "approvedRfp">,
  emailId: string,
): { name: string; version: string }[] {
  const all = session.approvedRfp?.attachments ?? []
  if (emailId === "EML-001") return all.filter((row) => row.name !== "RFP_DE.docx")
  if (emailId === "EML-002") return all.filter((row) => row.name !== "RFP_EN.docx")
  return all
}

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
    "EML-013": "confirmed",
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

export function materialExceptionProgress(decisions: RequirementDecision[]): { done: number; total: number } {
  const ids = new Set(
    decisions
      .filter((d) =>
        RESOLUTION_CHOICES.includes(d.decision)
        && d.rationale.trim().length >= 8
        && !isDismissalRationale(d.rationale),
      )
      .map((d) => d.id),
  )
  return { done: MATERIAL_IDS.filter((id) => ids.has(id)).length, total: MATERIAL_IDS.length }
}

export function materialExceptionsResolved(decisions: RequirementDecision[]): boolean {
  const progress = materialExceptionProgress(decisions)
  return progress.done === progress.total
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
    approvedRfp: null,
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
    approvedRfp: null,
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

function hydrateApprovedRfp(value: unknown): ApprovedRfp | null {
  if (!value || typeof value !== "object") return null
  const row = value as ApprovedRfp
  if (!row.version || !row.english?.ittRef || !row.german?.ittRef || !Array.isArray(row.laneRateTemplate)) return null
  return row
}

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

function hydrateSendApprovals(raw: unknown): SendApproval[] {
  if (!Array.isArray(raw)) return []
  const out: SendApproval[] = []
  for (const row of raw) {
    if (!row || typeof row !== "object") continue
    const item = row as Partial<SendApproval>
    if (!item.emailId || !item.approverName || !item.approvedAt) continue
    const attachments = Array.isArray(item.attachments)
      ? item.attachments.flatMap((file) => {
          if (!file || typeof file !== "object") return []
          const name = String((file as { name?: string }).name ?? "")
          if (!name) return []
          return [{ name, version: String((file as { version?: string }).version ?? "") }]
        })
      : []
    out.push({
      emailId: item.emailId,
      sender: item.sender ?? "",
      approverName: item.approverName,
      recipients: Array.isArray(item.recipients) ? item.recipients.filter((value): value is string => typeof value === "string") : [],
      approvedAt: item.approvedAt,
      message: item.message ?? "",
      attachments,
      rfpVersion: item.rfpVersion ?? "",
      delivery: "delivered",
      checks: Array.isArray(item.checks) ? item.checks.filter((value): value is string => typeof value === "string") : [],
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
    sendApprovals: hydrateSendApprovals(parsed.sendApprovals),
    rfpGenerated: generated,
    rfpApproved: approved,
    rfpVersion: (approved || generated) ? (parsed.rfpVersion ?? "RFP-2026-001-v1") : null,
    rfpEditNote: parsed.rfpEditNote ?? "",
    approvedRfp: generated ? hydrateApprovedRfp(parsed.approvedRfp) : null,
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
    approvedRfp: n >= 4 || (n === 3 && session.rfpGenerated) ? session.approvedRfp : null,
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

export type LifecycleActionId = "return-workspace" | "review-invitations" | "review-evidence" | "review-bids"

export type RfpLifecyclePhase =
  | "not-issued"
  | "awaiting-approved-rfp"
  | "approved-not-issued"
  | "awaiting-confirmation"
  | "bids-ready"

export type RfpLifecycle = {
  phase: RfpLifecyclePhase
  /** Short status. Every module shows this phrase for the same phase. */
  status: GateCopy
  /** Bid Evaluation explanation for this phase. */
  detail: GateCopy | null
  /** Communications block. Present only until the RFP is approved. */
  communications: GateCopy | null
  action: { id: LifecycleActionId; label: GateCopy } | null
  /** Reserved RFP ID before generation; document id afterwards. */
  identifier: GateCopy
  /** Present only after both invitations have been sent. */
  issueLine: GateCopy | null
}

const RETURN_TO_WORKSPACE: GateCopy = {
  en: "Return to Sourcing Workspace",
  de: "Zum Beschaffungsarbeitsbereich",
}

const AWAITING_APPROVED_RFP: GateCopy = {
  en: "Awaiting approved RFP. Supplier invitations cannot be prepared until the requirements baseline and evaluation method are approved, the RFP is generated, and the generated RFP is approved.",
  de: "Freigegebene Ausschreibung ausstehend. Lieferanteneinladungen können erst vorbereitet werden, wenn die Anforderungsbaseline und die Bewertungsmethode freigegeben, die Ausschreibung erzeugt und die erzeugte Ausschreibung freigegeben sind.",
}

/** One phase for the RFP demonstration. Screens must read this instead of inventing status copy. */
export function rfpLifecycle(session: LogisticsSession): RfpLifecycle {
  const sent = invitesSent(session)
  const generated = session.rfpGenerated
  const approved = session.rfpApproved && generated
  const version = session.rfpVersion ?? "RFP-2026-001"
  const identifier: GateCopy = generated
    ? { en: `Document ${version}`, de: `Dokument ${version}` }
    : { en: "Reserved RFP ID: RFP-2026-001", de: "Reservierte Ausschreibungs-ID: RFP-2026-001" }
  const issueLine: GateCopy | null = sent
    ? {
        en: `Issued against ${session.requirementSetVersion ?? "REQ-2026-001"} and ${session.evaluationMethodVersion ?? "EVAL-LOG-v1"}. Document ${version}.`,
        de: `Ausgegeben gegen ${session.requirementSetVersion ?? "REQ-2026-001"} und ${session.evaluationMethodVersion ?? "EVAL-LOG-v1"}. Dokument ${version}.`,
      }
    : null

  if (session.bidsReleased || journeyIndex(session.journeyStep) >= 5) {
    return {
      phase: "bids-ready",
      status: { en: "Bids ready", de: "Angebote bereit" },
      detail: null,
      communications: null,
      action: { id: "review-bids", label: { en: "Review bids", de: "Angebote prüfen" } },
      identifier,
      issueLine,
    }
  }
  if (sent) {
    return {
      phase: "awaiting-confirmation",
      status: { en: "Responses awaiting confirmation", de: "Antworten warten auf Bestätigung" },
      detail: {
        en: "Responses awaiting confirmation. Confirm classification and the attachment version before bids can be reviewed.",
        de: "Antworten warten auf Bestätigung. Bestätigen Sie die Klassifikation und die Anhangsversion, bevor Angebote geprüft werden können.",
      },
      communications: null,
      action: { id: "review-evidence", label: { en: "Review supplier evidence", de: "Lieferantennachweis prüfen" } },
      identifier,
      issueLine,
    }
  }
  if (approved) {
    return {
      phase: "approved-not-issued",
      status: { en: "Approved but not issued", de: "Freigegeben, noch nicht ausgegeben" },
      detail: {
        en: "Approved but not issued. Review supplier invitations. Nothing has been sent.",
        de: "Freigegeben, noch nicht ausgegeben. Prüfen Sie die Lieferanteneinladungen. Es wurde noch nichts gesendet.",
      },
      communications: null,
      action: { id: "review-invitations", label: { en: "Review supplier invitations", de: "Lieferanteneinladungen prüfen" } },
      identifier,
      issueLine,
    }
  }
  if (generated) {
    return {
      phase: "awaiting-approved-rfp",
      status: { en: "Awaiting approved RFP", de: "Freigegebene Ausschreibung ausstehend" },
      detail: {
        en: "The cited draft exists. Approve it in the Sourcing Workspace before invitations can be prepared.",
        de: "Der zitierte Entwurf liegt vor. Geben Sie ihn im Beschaffungsarbeitsbereich frei, bevor Einladungen vorbereitet werden können.",
      },
      communications: AWAITING_APPROVED_RFP,
      action: { id: "return-workspace", label: RETURN_TO_WORKSPACE },
      identifier,
      issueLine,
    }
  }
  return {
    phase: "not-issued",
    status: { en: "RFP not yet issued", de: "Ausschreibung noch nicht ausgegeben" },
    detail: {
      en: "Bid Evaluation cannot generate the RFP. Return to the Sourcing Workspace to approve the requirements and create the cited draft.",
      de: "Die Angebotsbewertung kann die Ausschreibung nicht erzeugen. Kehren Sie zum Beschaffungsarbeitsbereich zurück, um die Anforderungen freizugeben und den zitierten Entwurf zu erstellen.",
    },
    communications: AWAITING_APPROVED_RFP,
    action: { id: "return-workspace", label: RETURN_TO_WORKSPACE },
    identifier,
    issueLine,
  }
}

export function communicationsBlock(session: LogisticsSession): GateCopy | null {
  return rfpLifecycle(session).communications
}

export function evaluationBlock(session: LogisticsSession): GateCopy | null {
  const life = rfpLifecycle(session)
  if (life.phase === "bids-ready") return null
  return life.detail
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
