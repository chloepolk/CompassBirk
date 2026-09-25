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

/** Persistent demonstration steps. Each step is reached only by a user action. */
export type JourneyStep = "s0" | "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8" | "s9" | "s10"

/** Named statuses shown in place of progress percentages. */
export type JourneyStatus =
  | "need-identified"
  | "requirements-approved"
  | "rfp-issued"
  | "responses-validated"
  | "evaluation-complete"
  | "award-approved"
  | "monitoring-active"

export type RequirementDecision = {
  id: string
  decision: "accepted" | "resolved" | "deferred"
  rationale: string
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
  packageLocked: boolean
  classifiedEmailIds: string[]
  emailClassifications: Record<string, EmailClass>
  sentDraftIds: string[]
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
  correctiveDraftApproved: boolean
  /** Cited RFP approved. Invitations stay blocked until this is true. */
  rfpApproved: boolean
  rfpVersion: string | null
  evaluationOverrides: EvaluationOverride[]
  approvalTrace: ApprovalTrace | null
}

export const JOURNEY_ORDER: JourneyStep[] = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"]

export function journeyIndex(step: JourneyStep): number {
  return JOURNEY_ORDER.indexOf(step)
}

export function statusForStep(step: JourneyStep): JourneyStatus {
  const n = journeyIndex(step)
  if (n >= 8) return "monitoring-active"
  if (n >= 7) return "award-approved"
  if (n >= 6) return "evaluation-complete"
  if (n >= 5) return "responses-validated"
  if (n >= 4) return "rfp-issued"
  if (n >= 3) return "requirements-approved"
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
    sentDraftIds: n >= 4 ? ["EML-001", "EML-002"] : [],
    bidsReleased: n >= 5,
    awardPending: n === 6,
    awardApproved: n >= 7,
    performanceReleased: n >= 8,
    asOfMonth: n >= 8 ? "2026-09" : "2026-08",
    caAssigned: n >= 9,
    correctiveDraftApproved: n >= 9,
    emailClassifications,
    classifiedEmailIds: Object.keys(emailClassifications),
    confirmedEvidenceIds: n >= 5 ? ["EML-007", "EML-008", "EML-009"] : [],
  }
}

const MATERIAL_IDS = REQUIREMENTS.filter((row) => row.state !== "clear").map((row) => row.id)

export function materialExceptionsResolved(decisions: RequirementDecision[]): boolean {
  const ids = new Set(decisions.filter((d) => d.rationale.trim().length >= 8).map((d) => d.id))
  return MATERIAL_IDS.every((id) => ids.has(id))
}

export function nextVersion(current: string | null, stem: string): string {
  const match = current?.match(/-v(\d+)$/)
  const n = match ? Number(match[1]) + 1 : 1
  return `${stem}-v${n}`
}

/** A change after lock writes a new requirement-set version and withdraws RFP approval. */
export function recordRequirementDecision(session: LogisticsSession, decision: RequirementDecision): LogisticsSession {
  const requirementDecisions = [
    ...session.requirementDecisions.filter((d) => d.id !== decision.id),
    decision,
  ]
  const locked = session.journeyStep === "s3"
  if (!locked) return { ...session, requirementDecisions }
  return {
    ...session,
    requirementDecisions,
    requirementSetVersion: nextVersion(session.requirementSetVersion, "REQ-2026-001"),
    rfpApproved: false,
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
      return session.acceptedNeed
    case "s3":
      return materialExceptionsResolved(session.requirementDecisions)
    case "s4":
      return session.packageLocked && session.rfpApproved && ["EML-001", "EML-002"].every((id) => session.sentDraftIds.includes(id))
    case "s5":
      return ["EML-007", "EML-008", "EML-009"].every((id) => session.emailClassifications[id] === "confirmed")
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

export const DEFAULT_SESSION: LogisticsSession = {
  journeyStep: "s0",
  acceptedNeed: false,
  packageLocked: false,
  classifiedEmailIds: [],
  emailClassifications: {},
  sentDraftIds: [],
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
  correctiveDraftApproved: false,
  rfpApproved: false,
  rfpVersion: null,
  evaluationOverrides: [],
  approvalTrace: null,
}

export function loadSession(): LogisticsSession {
  if (typeof window === "undefined") return { ...DEFAULT_SESSION }
  try {
    const raw = localStorage.getItem(LOGISTICS_SESSION_KEY)
    if (!raw) return { ...DEFAULT_SESSION }
    const parsed = JSON.parse(raw) as Partial<LogisticsSession>
    const step = JOURNEY_ORDER.includes(parsed.journeyStep as JourneyStep)
      ? (parsed.journeyStep as JourneyStep)
      : "s0"
    const n = journeyIndex(step)
    return {
      ...DEFAULT_SESSION,
      ...parsed,
      journeyStep: step,
      ...flagsForStep(step),
      requirementDecisions: parsed.requirementDecisions ?? [],
      actionRecords: parsed.actionRecords ?? [],
      evaluationOverrides: parsed.evaluationOverrides ?? [],
      approvalTrace: parsed.approvalTrace ?? null,
      selectedScenarioId: parsed.selectedScenarioId ?? (n >= 6 ? "AWD-02" : null),
      createdContracts: n >= 7 ? (parsed.createdContracts?.length ? parsed.createdContracts : defaultAwardContracts()) : [],
      renewalEventId: parsed.renewalEventId ?? null,
      requirementSetVersion: n >= 3 ? (parsed.requirementSetVersion ?? "REQ-2026-001-v1") : null,
      evaluationMethodVersion: n >= 3 ? (parsed.evaluationMethodVersion ?? "EVAL-LOG-v1") : null,
      rfpApproved: n >= 4 ? true : n === 3 ? Boolean(parsed.rfpApproved) : false,
      rfpVersion: n >= 4 ? (parsed.rfpVersion ?? "RFP-2026-001-v1") : n === 3 && parsed.rfpApproved ? (parsed.rfpVersion ?? "RFP-2026-001-v1") : null,
    }
  } catch {
    return { ...DEFAULT_SESSION }
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

export function retreatTo(session: LogisticsSession, step: JourneyStep): LogisticsSession {
  const flags = flagsForStep(step)
  const n = journeyIndex(step)
  return {
    ...session,
    ...flags,
    journeyStep: step,
    awardApproved: false,
    awardPending: step === "s6",
    createdContracts: n >= 7 ? session.createdContracts : [],
    selectedScenarioId: n >= 6 ? session.selectedScenarioId : null,
    requirementSetVersion: n >= 3 ? (session.requirementSetVersion ?? "REQ-2026-001-v1") : null,
    evaluationMethodVersion: n >= 3 ? (session.evaluationMethodVersion ?? "EVAL-LOG-v1") : null,
    rfpApproved: n >= 4 ? true : n === 3 ? session.rfpApproved : false,
    rfpVersion: n >= 4 ? (session.rfpVersion ?? "RFP-2026-001-v1") : n === 3 ? session.rfpVersion : null,
    approvalTrace: n >= 7 ? session.approvalTrace : null,
  }
}

export function advanceTo(session: LogisticsSession, step: JourneyStep): LogisticsSession {
  if (!canAdvance(session, step)) return session
  const flags = flagsForStep(step)
  const n = journeyIndex(step)
  return {
    ...session,
    ...flags,
    journeyStep: step,
    requirementSetVersion: n >= 3 ? (session.requirementSetVersion ?? "REQ-2026-001-v1") : null,
    evaluationMethodVersion: n >= 3 ? (session.evaluationMethodVersion ?? "EVAL-LOG-v1") : null,
    rfpApproved: n >= 4 ? true : session.rfpApproved,
    rfpVersion: n >= 4 ? (session.rfpVersion ?? "RFP-2026-001-v1") : session.rfpVersion,
    selectedScenarioId: n >= 6 ? (session.selectedScenarioId ?? "AWD-02") : session.selectedScenarioId,
    createdContracts: n >= 7
      ? (session.createdContracts.length > 0 ? session.createdContracts : defaultAwardContracts(undefined, session.selectedScenarioId ?? "AWD-02"))
      : session.createdContracts,
    replayCheckpoint: Math.max(session.replayCheckpoint, n),
  }
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
    journeyStep: step,
    replayCheckpoint: checkpoint,
    createdContracts: checkpoint >= 6 ? defaultAwardContracts() : [],
    selectedScenarioId: checkpoint >= 5 ? "AWD-02" : null,
    renewalEventId: null,
    requirementSetVersion: n >= 3 ? "REQ-2026-001-v1" : null,
    evaluationMethodVersion: n >= 3 ? "EVAL-LOG-v1" : null,
    rfpApproved: n >= 4,
    rfpVersion: n >= 4 ? "RFP-2026-001-v1" : null,
    evaluationOverrides: [],
    approvalTrace: null,
  }
}
