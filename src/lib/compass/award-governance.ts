/* ------------------------------------------------------------------ */
/*  Award approval governance                                          */
/*                                                                     */
/*  Rule: a proposed award above €200,000 requires recorded approval   */
/*  before the package can move to Approved for Award. Seed amounts    */
/*  stay USD; the check converts with USD_TO_EUR dated 21 August 2026. */
/*  One approval record per package. Submit for approval assigns the   */
/*  Action Centre item, sends the approver email, and writes the audit */
/*  trail in a single transition.                                      */
/* ------------------------------------------------------------------ */

import {
  FX_RATE_DATE,
  USD_TO_EUR,
  type DisplayLocale,
  formatDateDMY,
  formatDateTimeDMY,
  formatEurFigure,
  formatFixed,
  formatUsdAsEur,
  usdToEur,
} from "./locale-display"
import {
  type AwardNoteImpact,
  type AwardTeamNote,
  computeAwardNoteImpact,
  hasCompletedAwardRoundTrip,
  unconfirmedTeamNotes,
} from "./award-notes"

export type { AwardNoteImpact, AwardNoteKind, AwardTeamNote } from "./award-notes"

export const AWARD_APPROVAL_THRESHOLD_EUR = 200_000
export const AWARD_APPROVAL_FX_DATE = FX_RATE_DATE
export const STANDARD_WARRANTY_MONTHS = 24
export const STANDARD_FAT_NOTICE_DAYS = 30

export type AwardGovernanceStatus =
  | "procurement_review"
  | "awaiting_approver"
  | "clarification_requested"
  | "revision_required"
  | "approved_for_award"
  | "awarded"

export type AwardDecision = "approve" | "clarification"

export type RevisionReasonCategory =
  | "price_negotiation"
  | "supplier_reconsider"
  | "technical_deviation"
  | "qa_hseq"
  | "legal_warranty"
  | "budget_funding"
  | "evaluation_incomplete"
  | "approval_route"
  | "other"

export const REVISION_REASON_ORDER: RevisionReasonCategory[] = [
  "price_negotiation",
  "supplier_reconsider",
  "technical_deviation",
  "qa_hseq",
  "legal_warranty",
  "budget_funding",
  "evaluation_incomplete",
  "approval_route",
  "other",
]

export type AwardActor = {
  name: string
  role: string
  email?: string
}

export type AwardSupportingDocument = {
  label: string
  href?: string | null
}

export type AwardComparisonRow = {
  bidId: string
  supplier: string
  totalPriceUsd: number
  rank: number | null
  compositeScore: number | null
  gatingStatus: "Pass" | "Fail"
  priceDeltaUsd: number
}

export type AwardEvalBid = {
  bidId: string
  supplier: string
  pdfPath: string | null
  totalPrice: number
  gatingStatus: "Pass" | "Fail"
  gateFailures: string[]
  compositeScore: number | null
  finalRank: number | null
  highCommercialRisk: boolean
  warrantyMonths: number
  fatNoticeDays: number
  recommendation: string
}

export type AwardApprovalSnapshot = {
  packageId: string
  packageRef: string
  packageTitle: string
  projectName: string
  ittRef: string
  recommendedBidId: string
  recommendedSupplier: string
  proposedAwardUsd: number
  budgetUsd: number
  varianceUsd: number
  rank: number | null
  compositeScore: number | null
  recommendation: string
  otherCompliantBids: AwardComparisonRow[]
  failedGates: string[]
  deviations: string[]
  riskFlags: string[]
  otherFailedBids: { supplier: string; failedGates: string[] }[]
  requiredApproverRole: string
  requiredApproverName: string
  requiredApproverEmail: string
  supportingDocuments: AwardSupportingDocument[]
  sourceReferences: string[]
  requiresDirectorApproval: boolean
}

export type AwardAuditEntry = {
  id: string
  at: string
  actorName: string
  actorRole: string
  action: string
  comments: string
  statusFrom: AwardGovernanceStatus
  statusTo: AwardGovernanceStatus
}

export type AwardNotificationKind =
  | "approval_request"
  | "clarification_to_procurement"
  | "clarification_response"
  | "revision_to_procurement"
  | "resubmit"

export type AwardNotification = {
  id: string
  at: string
  kind: AwardNotificationKind
  toName: string
  toEmail: string
  subject: string
  body: string
}

export type AwardClarification = {
  question: string
  askedByName: string
  askedByRole: string
  askedAt: string
  response: string
  attachments: AwardSupportingDocument[]
  sourceReferences: string[]
  status: "open" | "closed"
  respondedAt: string | null
}

export type AwardRevision = {
  reasonCategory: RevisionReasonCategory
  instructions: string
  supportingReference: string
  dueDate: string | null
  requestedByName: string
  requestedByRole: string
  requestedAt: string
  actionTaken: string
  explanation: string
  attachments: AwardSupportingDocument[]
}

export type AwardApprovalRecord = {
  packageId: string
  approvalId: string | null
  status: AwardGovernanceStatus
  snapshot: AwardApprovalSnapshot | null
  originalSnapshot: AwardApprovalSnapshot | null
  noteToApprover: string
  requestedAt: string | null
  decidedAt: string | null
  comments: string
  clarification: AwardClarification | null
  revision: AwardRevision | null
  notifications: AwardNotification[]
  audit: AwardAuditEntry[]
  assignedToName: string | null
  assignedToRole: string | null
  procurementOwnerName: string | null
  procurementOwnerRole: string | null
  procurementOwnerEmail: string | null
  teamNotes: AwardTeamNote[]
  noteImpact: AwardNoteImpact | null
  notesConfirmedAt: string | null
  notesConfirmedByName: string | null
}

export type AwardEmailCopy = {
  subject: string
  body: string
}

export type AwardComparisonField = {
  field: string
  original: string
  revised: string
  change: string
}

export function requiresAwardApproval(proposedAwardUsd: number): boolean {
  return usdToEur(proposedAwardUsd) > AWARD_APPROVAL_THRESHOLD_EUR
}

export function emptyAwardRecord(packageId: string): AwardApprovalRecord {
  return {
    packageId,
    approvalId: null,
    status: "procurement_review",
    snapshot: null,
    originalSnapshot: null,
    noteToApprover: "",
    requestedAt: null,
    decidedAt: null,
    comments: "",
    clarification: null,
    revision: null,
    notifications: [],
    audit: [],
    assignedToName: null,
    assignedToRole: null,
    procurementOwnerName: null,
    procurementOwnerRole: null,
    procurementOwnerEmail: null,
    teamNotes: [],
    noteImpact: null,
    notesConfirmedAt: null,
    notesConfirmedByName: null,
  }
}

export function awardGovernanceStatusFor(
  stage: string | null | undefined,
  record: AwardApprovalRecord | undefined,
): AwardGovernanceStatus | null {
  if (stage === "outcome_roi") return "awarded"
  if (record) return record.status
  if (stage === "execute") return "procurement_review"
  return null
}

export function canEnterApprovedForAward(record: AwardApprovalRecord | undefined): boolean {
  return record?.status === "approved_for_award"
}

export function canConfirmSupplierAward(record: AwardApprovalRecord | undefined): boolean {
  return record?.status === "approved_for_award"
}

export function awardNotificationHeld(record: AwardApprovalRecord | undefined, stage: string): boolean {
  if (stage === "outcome_roi" || record?.status === "awarded") return false
  return record?.status !== "approved_for_award"
}

function teamNotesOf(record: AwardApprovalRecord): AwardTeamNote[] {
  return record.teamNotes ?? []
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `awd-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function appendTeamNote(
  record: AwardApprovalRecord,
  actor: AwardActor,
  kind: AwardTeamNote["kind"],
  body: string,
  at: string,
): AwardApprovalRecord {
  const text = body.trim()
  if (!text) return record
  return {
    ...record,
    teamNotes: [
      ...teamNotesOf(record),
      {
        id: newId(),
        at,
        actorName: actor.name,
        actorRole: actor.role,
        kind,
        body: text,
        confirmedAt: null,
        confirmedByName: null,
      },
    ],
    notesConfirmedAt: null,
    notesConfirmedByName: null,
  }
}

let approvalSeq = 147

export function mintApprovalId(at = new Date().toISOString()): string {
  const year = new Date(at).getFullYear()
  const n = String(approvalSeq++).padStart(4, "0")
  return `APR-${year}-${n}`
}

function appendAudit(
  record: AwardApprovalRecord,
  actor: AwardActor,
  action: string,
  comments: string,
  statusTo: AwardGovernanceStatus,
  at: string,
): AwardApprovalRecord {
  return {
    ...record,
    status: statusTo,
    audit: [
      ...record.audit,
      {
        id: newId(),
        at,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        comments,
        statusFrom: record.status,
        statusTo,
      },
    ],
  }
}

function appendNotification(
  record: AwardApprovalRecord,
  kind: AwardNotificationKind,
  toName: string,
  toEmail: string,
  copy: AwardEmailCopy,
  at: string,
): AwardApprovalRecord {
  return {
    ...record,
    notifications: [
      ...record.notifications,
      {
        id: newId(),
        at,
        kind,
        toName,
        toEmail,
        subject: copy.subject,
        body: copy.body,
      },
    ],
  }
}

export function buildAwardSnapshot(args: {
  packageId: string
  packageRef: string
  packageTitle: string
  projectName: string
  ittRef: string
  budgetUsd: number
  evidence: string[]
  selected: AwardEvalBid
  allResults: AwardEvalBid[]
  gateLabel: (id: string) => string
  approver: { name: string; role: string; email: string }
}): AwardApprovalSnapshot {
  const { selected, allResults, gateLabel, budgetUsd } = args
  const failedGates = selected.gateFailures.map(gateLabel)
  const deviations: string[] = []
  if (selected.warrantyMonths !== STANDARD_WARRANTY_MONTHS) {
    deviations.push(
      `Warranty offered ${selected.warrantyMonths} months vs the ${STANDARD_WARRANTY_MONTHS}-month standard.`,
    )
  }
  if (selected.fatNoticeDays !== STANDARD_FAT_NOTICE_DAYS) {
    deviations.push(
      `FAT notice offered ${selected.fatNoticeDays} days vs the ${STANDARD_FAT_NOTICE_DAYS}-day standard.`,
    )
  }

  const riskFlags: string[] = []
  if (selected.highCommercialRisk) {
    riskFlags.push(
      `Warranty offered ${selected.warrantyMonths} months vs the ${STANDARD_WARRANTY_MONTHS}-month standard (cut exceeds 25%).`,
    )
  }
  if (selected.gatingStatus === "Fail") {
    riskFlags.push(
      failedGates.length > 0
        ? `Recommended return failed hard gates: ${failedGates.join("; ")}.`
        : "Recommended return failed one or more hard gates.",
    )
  }

  const otherCompliantBids: AwardComparisonRow[] = allResults
    .filter((r) => r.bidId !== selected.bidId && r.gatingStatus === "Pass")
    .map((r) => ({
      bidId: r.bidId,
      supplier: r.supplier,
      totalPriceUsd: r.totalPrice,
      rank: r.finalRank,
      compositeScore: r.compositeScore,
      gatingStatus: r.gatingStatus,
      priceDeltaUsd: r.totalPrice - selected.totalPrice,
    }))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

  const otherFailedBids = allResults
    .filter((r) => r.bidId !== selected.bidId && r.gatingStatus === "Fail")
    .map((r) => ({
      supplier: r.supplier,
      failedGates: r.gateFailures.map(gateLabel),
    }))

  const supportingDocuments: AwardSupportingDocument[] = []
  if (selected.pdfPath) {
    supportingDocuments.push({
      label: `${selected.supplier} response PDF`,
      href: selected.pdfPath,
    })
  }

  return {
    packageId: args.packageId,
    packageRef: args.packageRef,
    packageTitle: args.packageTitle,
    projectName: args.projectName,
    ittRef: args.ittRef,
    recommendedBidId: selected.bidId,
    recommendedSupplier: selected.supplier,
    proposedAwardUsd: selected.totalPrice,
    budgetUsd,
    varianceUsd: selected.totalPrice - budgetUsd,
    rank: selected.finalRank,
    compositeScore: selected.compositeScore,
    recommendation: selected.recommendation,
    otherCompliantBids,
    failedGates,
    deviations,
    riskFlags,
    otherFailedBids,
    requiredApproverRole: args.approver.role,
    requiredApproverName: args.approver.name,
    requiredApproverEmail: args.approver.email,
    supportingDocuments,
    sourceReferences: args.evidence,
    requiresDirectorApproval: requiresAwardApproval(selected.totalPrice),
  }
}

export function withProposedAwardUsd(
  snapshot: AwardApprovalSnapshot,
  proposedAwardUsd: number,
): AwardApprovalSnapshot {
  return {
    ...snapshot,
    proposedAwardUsd,
    varianceUsd: proposedAwardUsd - snapshot.budgetUsd,
    requiresDirectorApproval: requiresAwardApproval(proposedAwardUsd),
    otherCompliantBids: snapshot.otherCompliantBids.map((row) => ({
      ...row,
      priceDeltaUsd: row.totalPriceUsd - proposedAwardUsd,
    })),
  }
}

export function applyRecommendedRow(
  snapshot: AwardApprovalSnapshot,
  row: AwardComparisonRow,
  proposedAwardUsd = row.totalPriceUsd,
): AwardApprovalSnapshot {
  const currentAsRow: AwardComparisonRow = {
    bidId: snapshot.recommendedBidId,
    supplier: snapshot.recommendedSupplier,
    totalPriceUsd: snapshot.proposedAwardUsd,
    rank: snapshot.rank,
    compositeScore: snapshot.compositeScore,
    gatingStatus: "Pass",
    priceDeltaUsd: snapshot.proposedAwardUsd - proposedAwardUsd,
  }
  const others = [
    currentAsRow,
    ...snapshot.otherCompliantBids.filter((r) => r.bidId !== row.bidId),
  ].map((r) => ({ ...r, priceDeltaUsd: r.totalPriceUsd - proposedAwardUsd }))
  return {
    ...snapshot,
    recommendedBidId: row.bidId,
    recommendedSupplier: row.supplier,
    proposedAwardUsd,
    varianceUsd: proposedAwardUsd - snapshot.budgetUsd,
    rank: row.rank,
    compositeScore: row.compositeScore,
    requiresDirectorApproval: requiresAwardApproval(proposedAwardUsd),
    otherCompliantBids: others.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  }
}

export function eligibleSupplierRows(snapshot: AwardApprovalSnapshot): AwardComparisonRow[] {
  return [
    {
      bidId: snapshot.recommendedBidId,
      supplier: snapshot.recommendedSupplier,
      totalPriceUsd: snapshot.proposedAwardUsd,
      rank: snapshot.rank,
      compositeScore: snapshot.compositeScore,
      gatingStatus: "Pass",
      priceDeltaUsd: 0,
    },
    ...snapshot.otherCompliantBids,
  ]
}

export function compassLinkForPackage(snapshot: AwardApprovalSnapshot, approvalId: string | null): string {
  const id = approvalId ? `${approvalId} · ` : ""
  return `Open in Compass: Action Centre → ${id}${snapshot.packageRef} / ${snapshot.ittRef}`
}

export function submitAwardRecommendation(
  prev: AwardApprovalRecord | undefined,
  snapshot: AwardApprovalSnapshot,
  actor: AwardActor,
  noteToApprover = "",
  at = new Date().toISOString(),
  locale: DisplayLocale = "en",
): AwardApprovalRecord {
  const base = prev ?? emptyAwardRecord(snapshot.packageId)
  if (base.status === "awarded" || base.status === "approved_for_award") return base
  if (
    base.status === "awaiting_approver" ||
    base.status === "clarification_requested" ||
    base.status === "revision_required"
  ) {
    return base
  }

  const note = noteToApprover.trim()
  const thresholdComment = snapshot.requiresDirectorApproval
    ? `Proposed award ${formatUsdAsEur(snapshot.proposedAwardUsd, locale)} exceeds the ${formatEurFigure(AWARD_APPROVAL_THRESHOLD_EUR, locale)} threshold.`
    : `Proposed award ${formatUsdAsEur(snapshot.proposedAwardUsd, locale)} is at or below the ${formatEurFigure(AWARD_APPROVAL_THRESHOLD_EUR, locale)} threshold, so the award remains within procurement authority.`

  const seeded: AwardApprovalRecord = {
    ...base,
    snapshot,
    originalSnapshot: base.originalSnapshot ?? snapshot,
    noteToApprover: note,
    comments: note ? `${thresholdComment} Note to approver: ${note}` : thresholdComment,
    procurementOwnerName: actor.name,
    procurementOwnerRole: actor.role,
    procurementOwnerEmail: actor.email ?? null,
    teamNotes: base.teamNotes ?? [],
    noteImpact: base.noteImpact ?? null,
    notesConfirmedAt: null,
    notesConfirmedByName: null,
  }
  const withNote = note ? appendTeamNote(seeded, actor, "instruction", note, at) : seeded

  if (!snapshot.requiresDirectorApproval) {
    return {
      ...appendAudit(
        {
          ...withNote,
          requestedAt: at,
          decidedAt: at,
          assignedToName: actor.name,
          assignedToRole: actor.role,
        },
        actor,
        "Recommended supplier selected — within procurement authority",
        thresholdComment,
        "approved_for_award",
        at,
      ),
    }
  }

  const approvalId = withNote.approvalId ?? mintApprovalId(at)
  const withId: AwardApprovalRecord = {
    ...withNote,
    approvalId,
    requestedAt: at,
    decidedAt: null,
    assignedToName: snapshot.requiredApproverName,
    assignedToRole: snapshot.requiredApproverRole,
    clarification: null,
  }
  const email = buildAwardApprovalEmail(snapshot, locale, {
    approvalId,
    note,
  })
  const notified = appendNotification(
    withId,
    "approval_request",
    snapshot.requiredApproverName,
    snapshot.requiredApproverEmail,
    email,
    at,
  )
  return appendAudit(
    notified,
    actor,
    "Approval request submitted",
    `Request assigned to ${snapshot.requiredApproverName}, ${snapshot.requiredApproverRole}. ${thresholdComment}`,
    "awaiting_approver",
    at,
  )
}

export function approveAwardRecommendation(
  prev: AwardApprovalRecord,
  comments: string,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  if (prev.status !== "awaiting_approver") return prev
  if (needsNoteConfirmation(prev, actor.name)) return prev
  const text = comments.trim()
  const noted = text ? appendTeamNote(prev, actor, "approver_comment", text, at) : prev
  return {
    ...appendAudit(noted, actor, "Award recommendation approved", text, "approved_for_award", at),
    decidedAt: at,
    comments: text,
    assignedToName: prev.procurementOwnerName,
    assignedToRole: prev.procurementOwnerRole,
  }
}

export function requestAwardClarification(
  prev: AwardApprovalRecord,
  question: string,
  actor: AwardActor,
  at = new Date().toISOString(),
  locale: DisplayLocale = "en",
): AwardApprovalRecord {
  if (prev.status !== "awaiting_approver") return prev
  const snapshot = prev.snapshot
  if (!snapshot) return prev
  const text = question.trim()
  if (!text) return prev

  const clarification: AwardClarification = {
    question: text,
    askedByName: actor.name,
    askedByRole: actor.role,
    askedAt: at,
    response: "",
    attachments: [],
    sourceReferences: [],
    status: "open",
    respondedAt: null,
  }
  const withQ: AwardApprovalRecord = appendTeamNote(
    {
      ...prev,
      clarification,
      decidedAt: null,
      comments: text,
      assignedToName: prev.procurementOwnerName,
      assignedToRole: prev.procurementOwnerRole,
    },
    actor,
    "instruction",
    text,
    at,
  )
  const toName = prev.procurementOwnerName ?? "Procurement"
  const toEmail = prev.procurementOwnerEmail ?? ""
  const email = buildClarificationEmail(prev, text, locale)
  const notified = appendNotification(
    withQ,
    "clarification_to_procurement",
    toName,
    toEmail,
    email,
    at,
  )
  return appendAudit(notified, actor, "Clarification requested", text, "clarification_requested", at)
}

export function submitClarificationResponse(
  prev: AwardApprovalRecord,
  args: {
    response: string
    attachments: AwardSupportingDocument[]
    sourceReferences: string[]
    snapshot?: AwardApprovalSnapshot
  },
  actor: AwardActor,
  at = new Date().toISOString(),
  locale: DisplayLocale = "en",
): AwardApprovalRecord {
  if (prev.status !== "clarification_requested") return prev
  const snapshot = args.snapshot ?? prev.snapshot
  const open = prev.clarification
  if (!snapshot || !open || open.status !== "open") return prev
  const response = args.response.trim()
  if (!response) return prev

  const original = prev.originalSnapshot ?? snapshot
  const combinedNotes = [...teamNotesOf(prev).map((n) => n.body), response]
  const noteImpact = computeAwardNoteImpact(original, combinedNotes, locale)
  const nextSnapshot =
    args.snapshot ??
    (noteImpact.foundNumericChange ? withProposedAwardUsd(snapshot, noteImpact.revisedAwardUsd) : snapshot)

  const closed: AwardClarification = {
    ...open,
    response,
    attachments: args.attachments,
    sourceReferences: args.sourceReferences,
    status: "closed",
    respondedAt: at,
  }
  const withResponse: AwardApprovalRecord = appendTeamNote(
    {
      ...prev,
      snapshot: nextSnapshot,
      clarification: closed,
      noteImpact,
      assignedToName: nextSnapshot.requiredApproverName,
      assignedToRole: nextSnapshot.requiredApproverRole,
    },
    actor,
    "response",
    response,
    at,
  )
  const email = buildClarificationResponseEmail(prev, closed, locale)
  const notified = appendNotification(
    withResponse,
    "clarification_response",
    nextSnapshot.requiredApproverName,
    nextSnapshot.requiredApproverEmail,
    email,
    at,
  )
  const comments = `Question: ${open.question} Response: ${response}`
  return appendAudit(notified, actor, "Approval resubmitted", comments, "awaiting_approver", at)
}

export function returnAwardForRevision(
  prev: AwardApprovalRecord,
  args: {
    reasonCategory: RevisionReasonCategory
    instructions: string
    supportingReference?: string
    dueDate?: string | null
  },
  actor: AwardActor,
  at = new Date().toISOString(),
  locale: DisplayLocale = "en",
): AwardApprovalRecord {
  if (prev.status !== "awaiting_approver") return prev
  const snapshot = prev.snapshot
  if (!snapshot) return prev
  const instructions = args.instructions.trim()
  if (!instructions) return prev

  const revision: AwardRevision = {
    reasonCategory: args.reasonCategory,
    instructions,
    supportingReference: args.supportingReference?.trim() ?? "",
    dueDate: args.dueDate ?? null,
    requestedByName: actor.name,
    requestedByRole: actor.role,
    requestedAt: at,
    actionTaken: "",
    explanation: "",
    attachments: [],
  }
  const withRev: AwardApprovalRecord = appendTeamNote(
    {
      ...prev,
      revision,
      decidedAt: null,
      comments: instructions,
      assignedToName: prev.procurementOwnerName,
      assignedToRole: prev.procurementOwnerRole,
    },
    actor,
    "instruction",
    instructions,
    at,
  )
  const email = buildRevisionEmail(prev, revision, locale)
  const notified = appendNotification(
    withRev,
    "revision_to_procurement",
    prev.procurementOwnerName ?? "Procurement",
    prev.procurementOwnerEmail ?? "",
    email,
    at,
  )
  const reason = revisionReasonLabel(args.reasonCategory, locale)
  return appendAudit(
    notified,
    actor,
    "Returned for revision",
    `Reason: ${reason}. ${instructions}`,
    "revision_required",
    at,
  )
}

export function resubmitAwardApproval(
  prev: AwardApprovalRecord,
  args: {
    snapshot: AwardApprovalSnapshot
    actionTaken: string
    explanation: string
    attachments: AwardSupportingDocument[]
  },
  actor: AwardActor,
  at = new Date().toISOString(),
  locale: DisplayLocale = "en",
): AwardApprovalRecord {
  if (prev.status !== "revision_required") return prev
  const original = prev.originalSnapshot ?? prev.snapshot
  if (!original) return prev
  const actionTaken = args.actionTaken.trim()
  const explanation = args.explanation.trim()
  const combinedNotes = [...teamNotesOf(prev).map((n) => n.body), actionTaken, explanation]
  const noteImpact = computeAwardNoteImpact(original, combinedNotes, locale)
  let nextSnapshot = args.snapshot
  if (recommendationUnchanged(original, nextSnapshot) && noteImpact.foundNumericChange) {
    nextSnapshot = withProposedAwardUsd(nextSnapshot, noteImpact.revisedAwardUsd)
  }
  const unchanged = recommendationUnchanged(original, nextSnapshot)
  if (unchanged && !explanation) return prev
  const revision: AwardRevision = {
    ...(prev.revision ?? {
      reasonCategory: "other" as RevisionReasonCategory,
      instructions: "",
      supportingReference: "",
      dueDate: null,
      requestedByName: "",
      requestedByRole: "",
      requestedAt: at,
      actionTaken: "",
      explanation: "",
      attachments: [],
    }),
    actionTaken,
    explanation,
    attachments: args.attachments,
  }
  const withSnap: AwardApprovalRecord = appendTeamNote(
    {
      ...prev,
      snapshot: nextSnapshot,
      revision,
      noteImpact,
      assignedToName: nextSnapshot.requiredApproverName,
      assignedToRole: nextSnapshot.requiredApproverRole,
    },
    actor,
    "response",
    [actionTaken, explanation].filter(Boolean).join(" "),
    at,
  )
  const comparison = buildResubmitComparison(original, nextSnapshot, locale)
  const email = buildResubmitEmail(prev, nextSnapshot, comparison, locale)
  const notified = appendNotification(
    withSnap,
    "resubmit",
    nextSnapshot.requiredApproverName,
    nextSnapshot.requiredApproverEmail,
    email,
    at,
  )
  const comments = [
    actionTaken ? `Action taken: ${actionTaken}.` : "",
    explanation ? `What changed: ${explanation}.` : "",
    comparison.map((row) => `${row.field}: ${row.original} → ${row.revised}${row.change !== "—" ? ` (${row.change})` : ""}`).join("; "),
  ]
    .filter(Boolean)
    .join(" ")
  return appendAudit(notified, actor, "Approval resubmitted", comments, "awaiting_approver", at)
}

export function confirmSupplierAward(
  prev: AwardApprovalRecord,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  if (prev.status !== "approved_for_award") return prev
  const supplier = prev.snapshot?.recommendedSupplier ?? "the recommended supplier"
  return {
    ...appendAudit(
      prev,
      actor,
      "Supplier award completed",
      `Award recorded for ${supplier}.`,
      "awarded",
      at,
    ),
    decidedAt: prev.decidedAt ?? at,
  }
}

export function needsNoteConfirmation(record: AwardApprovalRecord, viewerName: string): boolean {
  if (record.status !== "awaiting_approver") return false
  if (!hasCompletedAwardRoundTrip(record.audit.map((e) => e.action))) return false
  return unconfirmedTeamNotes(record.teamNotes, viewerName).length > 0
}

export function confirmAwardNotes(
  prev: AwardApprovalRecord,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  if (prev.status !== "awaiting_approver") return prev
  const pending = unconfirmedTeamNotes(prev.teamNotes, actor.name)
  if (pending.length === 0) return prev
  const pendingIds = new Set(pending.map((n) => n.id))
  const teamNotes = teamNotesOf(prev).map((n) =>
    pendingIds.has(n.id) ? { ...n, confirmedAt: at, confirmedByName: actor.name } : n,
  )
  return appendAudit(
    {
      ...prev,
      teamNotes,
      notesConfirmedAt: at,
      notesConfirmedByName: actor.name,
    },
    actor,
    "Team notes confirmed",
    `Confirmed ${pending.length} note${pending.length === 1 ? "" : "s"} from other team members.`,
    "awaiting_approver",
    at,
  )
}

export type AwardGovTone = "neutral" | "warning" | "positive" | "critical"

export function awardGovTone(status: AwardGovernanceStatus): AwardGovTone {
  switch (status) {
    case "approved_for_award":
    case "awarded":
      return "positive"
    case "awaiting_approver":
    case "clarification_requested":
    case "revision_required":
      return "warning"
    default:
      return "neutral"
  }
}

export function formatBudgetVariance(varianceUsd: number, locale: DisplayLocale = "en"): string {
  const abs = formatUsdAsEur(Math.abs(varianceUsd), locale)
  if (varianceUsd < 0) return locale === "de" ? `${abs} unter Budget` : `${abs} under`
  if (varianceUsd > 0) return locale === "de" ? `${abs} über Budget` : `${abs} over`
  return locale === "de" ? "entspricht dem Budget" : "equals budget"
}

export function formatScoreAndRank(
  rank: number | null,
  score: number | null,
  locale: DisplayLocale = "en",
): string {
  const rankPart =
    rank != null
      ? locale === "de"
        ? `Rang ${rank}`
        : `Rank #${rank}`
      : locale === "de"
        ? "ohne Rang"
        : "Unranked"
  const scorePart =
    score != null
      ? locale === "de"
        ? `Gesamtscore ${formatFixed(score, locale)} von 100`
        : `composite ${formatFixed(score, locale)}`
      : locale === "de"
        ? "Score nicht berechnet"
        : "score not calculated"
  return `${rankPart} · ${scorePart}`
}

export function recommendationUnchanged(
  original: AwardApprovalSnapshot,
  revised: AwardApprovalSnapshot,
): boolean {
  return (
    original.recommendedSupplier === revised.recommendedSupplier &&
    original.proposedAwardUsd === revised.proposedAwardUsd &&
    original.varianceUsd === revised.varianceUsd &&
    original.compositeScore === revised.compositeScore
  )
}

export function buildResubmitComparison(
  original: AwardApprovalSnapshot,
  revised: AwardApprovalSnapshot,
  locale: DisplayLocale = "en",
): AwardComparisonField[] {
  const copy = awardGovCopy(locale)
  const priceDelta = revised.proposedAwardUsd - original.proposedAwardUsd
  let change = "—"
  if (original.recommendedSupplier !== revised.recommendedSupplier && priceDelta !== 0) {
    change =
      locale === "de"
        ? `Anbieter ${original.recommendedSupplier} → ${revised.recommendedSupplier}; Preis ${priceDelta < 0 ? "gesenkt" : "erhöht"} um ${formatUsdAsEur(Math.abs(priceDelta), locale)}`
        : `Supplier ${original.recommendedSupplier} → ${revised.recommendedSupplier}; price ${priceDelta < 0 ? "reduced" : "increased"} by ${formatUsdAsEur(Math.abs(priceDelta), locale)}`
  } else if (original.recommendedSupplier !== revised.recommendedSupplier) {
    change =
      locale === "de"
        ? `Anbieter ${original.recommendedSupplier} → ${revised.recommendedSupplier}`
        : `Supplier ${original.recommendedSupplier} → ${revised.recommendedSupplier}`
  } else if (priceDelta < 0) {
    change =
      locale === "de"
        ? `Preis um ${formatUsdAsEur(Math.abs(priceDelta), locale)} gesenkt`
        : `Price reduced by ${formatUsdAsEur(Math.abs(priceDelta), locale)}`
  } else if (priceDelta > 0) {
    change =
      locale === "de"
        ? `Preis um ${formatUsdAsEur(priceDelta, locale)} erhöht`
        : `Price increased by ${formatUsdAsEur(priceDelta, locale)}`
  } else if (original.compositeScore !== revised.compositeScore) {
    const from = original.compositeScore != null ? formatFixed(original.compositeScore, locale) : "—"
    const to = revised.compositeScore != null ? formatFixed(revised.compositeScore, locale) : "—"
    change = locale === "de" ? `Score ${from} → ${to}` : `Score ${from} → ${to}`
  }

  return [
    {
      field: copy.recommendedSupplier,
      original: original.recommendedSupplier,
      revised: revised.recommendedSupplier,
      change: original.recommendedSupplier === revised.recommendedSupplier ? "—" : change,
    },
    {
      field: copy.proposedAwardValue,
      original: formatUsdAsEur(original.proposedAwardUsd, locale),
      revised: formatUsdAsEur(revised.proposedAwardUsd, locale),
      change: priceDelta === 0 ? "—" : change,
    },
    {
      field: copy.budgetVariance,
      original: formatBudgetVariance(original.varianceUsd, locale),
      revised: formatBudgetVariance(revised.varianceUsd, locale),
      change:
        original.varianceUsd === revised.varianceUsd
          ? "—"
          : locale === "de"
            ? `Abweichung ${formatBudgetVariance(original.varianceUsd, locale)} → ${formatBudgetVariance(revised.varianceUsd, locale)}`
            : `Variance ${formatBudgetVariance(original.varianceUsd, locale)} → ${formatBudgetVariance(revised.varianceUsd, locale)}`,
    },
    {
      field: copy.compositeScore,
      original: original.compositeScore != null ? formatFixed(original.compositeScore, locale) : "—",
      revised: revised.compositeScore != null ? formatFixed(revised.compositeScore, locale) : "—",
      change: original.compositeScore === revised.compositeScore ? "—" : change,
    },
  ]
}

export function formatDisplayDate(iso: string | null | undefined, _locale: DisplayLocale = "en"): string {
  if (!iso) return ""
  const formatted = formatDateDMY(iso)
  return formatted || iso
}

export const AWARD_GOV_COPY = {
  en: {
    status: {
      procurement_review: "Procurement review",
      awaiting_approver: "Awaiting approver",
      clarification_requested: "Clarification requested",
      revision_required: "Revision required",
      approved_for_award: "Approval for award",
      awarded: "Awarded",
    } satisfies Record<AwardGovernanceStatus, string>,
    definition: {
      procurement_review: "Evaluation is still being completed.",
      awaiting_approver: "Request has been assigned.",
      clarification_requested: "Approver requires additional information.",
      revision_required: "Approver returned this recommendation for revision.",
      approved_for_award: "Required authority has approved.",
      awarded: "Supplier award has been completed.",
    } satisfies Record<AwardGovernanceStatus, string>,
    revisionReasons: {
      price_negotiation: "Further price negotiation required",
      supplier_reconsider: "Supplier recommendation should be reconsidered",
      technical_deviation: "Technical deviation unresolved",
      qa_hseq: "QA/HSEQ issue unresolved",
      legal_warranty: "Legal or warranty issue unresolved",
      budget_funding: "Budget or funding issue",
      evaluation_incomplete: "Evaluation evidence incomplete",
      approval_route: "Approval route incorrect",
      other: "Other",
    } satisfies Record<RevisionReasonCategory, string>,
    recommendForAward: "Recommend for award",
    recommended: "Recommended",
    submitForApproval: "Submit for approval",
    confirmRecommendation: "Confirm recommendation",
    reviewApproval: "Review approval",
    confirmAward: "Confirm award",
    evaluateBids: "Evaluate bids",
    withinAuthority: "Proposed award is €200,000 or less, so it remains within procurement authority.",
    exceedsThreshold: "Proposed award is above €200,000, so director approval is required.",
    gateBlocked: "This bid package cannot move to Approved for Award until the required approval is recorded.",
    thresholdTriggered: "Approval threshold triggered",
    thresholdYes: "Yes — above €200,000",
    thresholdNo: "No — within procurement authority",
    optionalNote: "Note to the approver",
    optionalNoteHint: "Optional. Recorded on the approval and included in the notification.",
    title: "Award approval",
    recommendTitle: "Award recommendation",
    projectBidRef: "Project and bid reference",
    recommendedSupplier: "Recommended supplier",
    proposedAwardValue: "Proposed award value",
    budgetVariance: "Budget variance",
    rankingScore: "Score and rank",
    compositeScore: "Composite score",
    requiredApprover: "Approver",
    supportingDocs: "Supporting documents",
    sourceReferences: "Source references",
    approve: "Approve",
    requestClarification: "Request clarification",
    returnForRevision: "Return for revision",
    clarificationQuestion: "Clarification question",
    clarificationQuestionHint: "The procurement owner will see this question on the Action Centre card.",
    clarificationFrom: "Clarification from",
    clarificationResponse: "Response",
    submitClarificationResponse: "Submit clarification response",
    attachDocuments: "Supporting documents",
    addAttachment: "Add",
    attachmentHint: "Add a document label (prototype — no file upload).",
    returnToProcurement: "Return to procurement",
    reasonCategory: "Reason category",
    revisionInstructions: "Revision instructions",
    revisionInstructionsHint: "What must be changed or resolved before this award recommendation can be resubmitted?",
    supportingReference: "Supporting reference",
    requiredCompletionDate: "Required completion date",
    actionTaken: "Action taken",
    explainWhatChanged: "What changed",
    explainRequired: "Nothing in the recommendation changed. Explain why before resubmitting.",
    resubmitForApproval: "Resubmit for approval",
    resubmitSummary: "Resubmission summary",
    field: "Field",
    original: "Original",
    revised: "Revised",
    change: "Change",
    notificationSent: "Notification sent to",
    comments: "Comments",
    instructionsFrom: "Instructions from",
    reason: "Reason",
    due: "Due",
    auditField: "Award governance",
    teamNotes: "Team notes",
    confirmNotes: "Confirm notes",
    notesConfirmed: "Notes confirmed",
    confirmNotesHint: "Confirm the notes from the other team members before approving.",
    bluePilotImpact: "Compass impact",
    teamNotesExpand: "Team notes & comments",
    impactActionOverview: "Action overview",
    applyToProposal: "Apply to proposal",
    originalProposal: "Original proposal",
    currentProposal: "Current proposal",
    approveDisabledUntilConfirm: "Confirm team notes before approving.",
    ruleNote:
      "Awards of €200,000 or less remain within procurement authority. Awards above €200,000 generate an approval request inside this procurement action.",
    notifyHeld: "Award notification is held until the required approval is recorded.",
    none: "None recorded.",
  },
  de: {
    status: {
      procurement_review: "Einkaufsprüfung",
      awaiting_approver: "Wartet auf Freigebende",
      clarification_requested: "Klärung angefordert",
      revision_required: "Überarbeitung erforderlich",
      approved_for_award: "Freigabe zum Zuschlag",
      awarded: "Zuschlag erteilt",
    } satisfies Record<AwardGovernanceStatus, string>,
    definition: {
      procurement_review: "Die Bewertung wird noch abgeschlossen.",
      awaiting_approver: "Die Anfrage ist zugewiesen.",
      clarification_requested: "Die freigebende Person benötigt zusätzliche Informationen.",
      revision_required: "Die Empfehlung wurde zur Überarbeitung zurückgegeben.",
      approved_for_award: "Die erforderliche Stelle hat freigegeben.",
      awarded: "Der Zuschlag an den Anbieter ist erfasst.",
    } satisfies Record<AwardGovernanceStatus, string>,
    revisionReasons: {
      price_negotiation: "Weitere Preisverhandlung erforderlich",
      supplier_reconsider: "Anbieterempfehlung sollte überprüft werden",
      technical_deviation: "Technische Abweichung ungelöst",
      qa_hseq: "QA/HSEQ-Thema ungelöst",
      legal_warranty: "Rechts- oder Gewährleistungsthema ungelöst",
      budget_funding: "Budget- oder Finanzierungsthema",
      evaluation_incomplete: "Bewertungsevidenz unvollständig",
      approval_route: "Freigabeweg falsch",
      other: "Sonstiges",
    } satisfies Record<RevisionReasonCategory, string>,
    recommendForAward: "Zum Zuschlag empfehlen",
    recommended: "Empfohlen",
    submitForApproval: "Zur Freigabe einreichen",
    confirmRecommendation: "Empfehlung bestätigen",
    reviewApproval: "Freigabe prüfen",
    confirmAward: "Zuschlag bestätigen",
    evaluateBids: "Angebote bewerten",
    withinAuthority: "Der vorgeschlagene Zuschlag liegt bei 200.000 € oder darunter und bleibt in der Einkaufskompetenz.",
    exceedsThreshold: "Der vorgeschlagene Zuschlag liegt über 200.000 €, daher ist eine Direktorenfreigabe erforderlich.",
    gateBlocked: "Dieses Angebotslos kann nicht auf Freigabe zum Zuschlag wechseln, bis die erforderliche Freigabe erfasst ist.",
    thresholdTriggered: "Freigabeschwelle ausgelöst",
    thresholdYes: "Ja — über 200.000 €",
    thresholdNo: "Nein — in der Einkaufskompetenz",
    optionalNote: "Hinweis an die freigebende Person",
    optionalNoteHint: "Optional. Wird auf der Freigabe erfasst und in die Mitteilung aufgenommen.",
    title: "Zuschlagsfreigabe",
    recommendTitle: "Zuschlagsempfehlung",
    projectBidRef: "Projekt- und Angebotsreferenz",
    recommendedSupplier: "Empfohlener Anbieter",
    proposedAwardValue: "Vorgeschlagener Zuschlagswert",
    budgetVariance: "Budgetabweichung",
    rankingScore: "Score und Rang",
    compositeScore: "Gesamtscore",
    requiredApprover: "Freigebende Person",
    supportingDocs: "Belege",
    sourceReferences: "Quellenangaben",
    approve: "Freigeben",
    requestClarification: "Klärung anfordern",
    returnForRevision: "Zur Überarbeitung zurückgeben",
    clarificationQuestion: "Klärungsfrage",
    clarificationQuestionHint: "Die einkaufsverantwortliche Person sieht diese Frage auf der Aktionskarte.",
    clarificationFrom: "Klärung von",
    clarificationResponse: "Antwort",
    submitClarificationResponse: "Klärungsantwort senden",
    attachDocuments: "Belege",
    addAttachment: "Hinzufügen",
    attachmentHint: "Dokumentbezeichnung hinzufügen (Prototyp — kein Datei-Upload).",
    returnToProcurement: "An den Einkauf zurückgeben",
    reasonCategory: "Grundkategorie",
    revisionInstructions: "Überarbeitungsanweisung",
    revisionInstructionsHint: "Was muss geändert oder geklärt werden, bevor diese Empfehlung erneut eingereicht werden kann?",
    supportingReference: "Belegreferenz",
    requiredCompletionDate: "Erforderliches Abschlussdatum",
    actionTaken: "Durchgeführte Aktion",
    explainWhatChanged: "Was sich geändert hat",
    explainRequired: "An der Empfehlung hat sich nichts geändert. Erklären Sie warum, bevor Sie erneut einreichen.",
    resubmitForApproval: "Erneut zur Freigabe einreichen",
    resubmitSummary: "Zusammenfassung der Wiedervorlage",
    field: "Feld",
    original: "Original",
    revised: "Geändert",
    change: "Änderung",
    notificationSent: "Mitteilung gesendet an",
    comments: "Kommentare",
    instructionsFrom: "Anweisung von",
    reason: "Grund",
    due: "Fällig",
    auditField: "Zuschlagsgovernance",
    teamNotes: "Teamhinweise",
    confirmNotes: "Hinweise bestätigen",
    notesConfirmed: "Hinweise bestätigt",
    confirmNotesHint: "Bestätigen Sie die Hinweise der anderen Teammitglieder, bevor Sie freigeben.",
    bluePilotImpact: "Compass-Wirkung",
    teamNotesExpand: "Teamhinweise und Kommentare",
    impactActionOverview: "Aktionsüberblick",
    applyToProposal: "Auf Vorschlag anwenden",
    originalProposal: "Ursprünglicher Vorschlag",
    currentProposal: "Aktueller Vorschlag",
    approveDisabledUntilConfirm: "Teamhinweise vor der Freigabe bestätigen.",
    ruleNote:
      "Zuschläge von 200.000 € oder weniger bleiben in der Einkaufskompetenz. Zuschläge über 200.000 € erzeugen eine Freigabeanfrage in dieser Beschaffungsaktion.",
    notifyHeld: "Die Zuschlagsmitteilung wird gehalten, bis die erforderliche Freigabe erfasst ist.",
    none: "Keine erfasst.",
  },
} as const

export function awardGovCopy(locale: DisplayLocale = "en") {
  return locale === "de" ? AWARD_GOV_COPY.de : AWARD_GOV_COPY.en
}

export function revisionReasonLabel(category: RevisionReasonCategory, locale: DisplayLocale = "en"): string {
  return awardGovCopy(locale).revisionReasons[category]
}

function signedDelta(usd: number, locale: DisplayLocale): string {
  const abs = formatUsdAsEur(Math.abs(usd), locale)
  if (usd > 0) return locale === "de" ? `${abs} über dem empfohlenen Angebot` : `${abs} above the recommended bid`
  if (usd < 0) return locale === "de" ? `${abs} unter dem empfohlenen Angebot` : `${abs} below the recommended bid`
  return locale === "de" ? "gleicher Preis wie das empfohlene Angebot" : "same price as the recommended bid"
}

function awardAndVarianceSentences(snapshot: AwardApprovalSnapshot, locale: DisplayLocale) {
  const awardEur = formatUsdAsEur(snapshot.proposedAwardUsd, locale)
  const budgetEur = formatUsdAsEur(snapshot.budgetUsd, locale)
  const varianceAbs = formatUsdAsEur(Math.abs(snapshot.varianceUsd), locale)
  const threshold = formatEurFigure(AWARD_APPROVAL_THRESHOLD_EUR, locale)
  const overBy = formatEurFigure(Math.max(0, usdToEur(snapshot.proposedAwardUsd) - AWARD_APPROVAL_THRESHOLD_EUR), locale)

  const awardSentence = snapshot.requiresDirectorApproval
    ? locale === "de"
      ? `Der vorgeschlagene Zuschlag beträgt ${awardEur} (Quellbetrag ${snapshot.proposedAwardUsd.toLocaleString("de-DE")} USD × ${USD_TO_EUR}, ${FX_RATE_DATE}). Er überschreitet die Freigabeschwelle von ${threshold} um ${overBy}.`
      : `Proposed award value is ${awardEur} (USD seed ${snapshot.proposedAwardUsd.toLocaleString("en-GB")} × ${USD_TO_EUR}, ${FX_RATE_DATE}). This exceeds the ${threshold} approval threshold by ${overBy}.`
    : locale === "de"
      ? `Der vorgeschlagene Zuschlag beträgt ${awardEur} (Quellbetrag ${snapshot.proposedAwardUsd.toLocaleString("de-DE")} USD × ${USD_TO_EUR}, ${FX_RATE_DATE}). Er liegt bei oder unter der Schwelle von ${threshold} und bleibt in der Einkaufskompetenz.`
      : `Proposed award value is ${awardEur} (USD seed ${snapshot.proposedAwardUsd.toLocaleString("en-GB")} × ${USD_TO_EUR}, ${FX_RATE_DATE}). This is at or below the ${threshold} threshold and remains within procurement authority.`

  const varianceSentence =
    snapshot.varianceUsd < 0
      ? locale === "de"
        ? `Das Losbudget beträgt ${budgetEur}. Der vorgeschlagene Zuschlag liegt ${varianceAbs} unter Budget.`
        : `Package budget is ${budgetEur}. Proposed award is ${varianceAbs} under budget.`
      : snapshot.varianceUsd > 0
        ? locale === "de"
          ? `Das Losbudget beträgt ${budgetEur}. Der vorgeschlagene Zuschlag überschreitet das Budget um ${varianceAbs}.`
          : `Package budget is ${budgetEur}. Proposed award is ${varianceAbs} over budget.`
        : locale === "de"
          ? `Das Losbudget beträgt ${budgetEur}. Der vorgeschlagene Zuschlag entspricht dem Budget.`
          : `Package budget is ${budgetEur}. Proposed award equals the budget.`

  return { awardSentence, varianceSentence }
}

export function buildAwardApprovalEmail(
  snapshot: AwardApprovalSnapshot,
  locale: DisplayLocale = "en",
  extras?: { approvalId?: string | null; note?: string },
): AwardEmailCopy {
  const { awardSentence, varianceSentence } = awardAndVarianceSentences(snapshot, locale)
  const rankScore = formatScoreAndRank(snapshot.rank, snapshot.compositeScore, locale)
  const approvalId = extras?.approvalId
  const link = compassLinkForPackage(snapshot, approvalId ?? null)
  const note = extras?.note?.trim()

  const otherBids =
    snapshot.otherCompliantBids.length === 0
      ? locale === "de"
        ? "Keine weiteren konformen Angebote."
        : "No other compliant bids."
      : snapshot.otherCompliantBids
          .map((row) => {
            const r = row.rank != null ? (locale === "de" ? `Rang ${row.rank}` : `Rank #${row.rank}`) : "—"
            const c =
              row.compositeScore != null
                ? locale === "de"
                  ? `composite ${formatFixed(row.compositeScore, locale)}`
                  : `composite ${formatFixed(row.compositeScore, locale)}`
                : "—"
            return locale === "de"
              ? `${row.supplier} — ${r}, ${c}, Angebot ${formatUsdAsEur(row.totalPriceUsd, locale)}, ${signedDelta(row.priceDeltaUsd, locale)}.`
              : `${row.supplier} — ${r}, ${c}, bid ${formatUsdAsEur(row.totalPriceUsd, locale)}, ${signedDelta(row.priceDeltaUsd, locale)}.`
          })
          .join("\n")

  const idBit = approvalId ? `${approvalId} — ` : ""
  const subject =
    locale === "de"
      ? `Zuschlagsfreigabe erforderlich — ${idBit}${snapshot.packageRef} / ${snapshot.ittRef}`
      : `Award approval required — ${idBit}${snapshot.packageRef} / ${snapshot.ittRef}`

  const noteBlock = note
    ? locale === "de"
      ? `\nHinweis an die freigebende Person\n${note}\n`
      : `\nNote to the approver\n${note}\n`
    : ""

  const body =
    locale === "de"
      ? `Projekt- und Angebotsreferenz
${snapshot.projectName} · ${snapshot.packageRef} · ${snapshot.ittRef} — ${snapshot.packageTitle}

Empfohlener Anbieter
${snapshot.recommendedSupplier}

Vorgeschlagener Zuschlagswert
${awardSentence}

Budget und Abweichung
${varianceSentence}

Rang und Gesamtscore
${rankScore}.
${noteBlock}
Weitere konforme Angebote
${otherBids}

Erforderliche freigebende Person
${snapshot.requiredApproverName}, ${snapshot.requiredApproverRole} (${snapshot.requiredApproverEmail})

${link}

Aktionen: Freigeben · Klärung anfordern · Zur Überarbeitung zurückgeben`
      : `Project and bid reference
${snapshot.projectName} · ${snapshot.packageRef} · ${snapshot.ittRef} — ${snapshot.packageTitle}

Recommended supplier
${snapshot.recommendedSupplier}

Proposed award value
${awardSentence}

Budget and variance
${varianceSentence}

Evaluation ranking and composite score
${rankScore}.
${noteBlock}
Other compliant bids
${otherBids}

Required approver
${snapshot.requiredApproverName}, ${snapshot.requiredApproverRole} (${snapshot.requiredApproverEmail})

${link}

Actions: Approve · Request clarification · Return for revision`

  return { subject, body }
}

function buildClarificationEmail(
  record: AwardApprovalRecord,
  question: string,
  locale: DisplayLocale,
): AwardEmailCopy {
  const snapshot = record.snapshot!
  const id = record.approvalId ?? snapshot.packageRef
  const link = compassLinkForPackage(snapshot, record.approvalId)
  const subject =
    locale === "de"
      ? `Klärung angefordert — ${id} / ${snapshot.packageRef}`
      : `Clarification requested — ${id} / ${snapshot.packageRef}`
  const body =
    locale === "de"
      ? `Die freigebende Person ${snapshot.requiredApproverName} fordert eine Klärung zu ${snapshot.packageRef} an.

Frage
${question}

${link}`
      : `Approver ${snapshot.requiredApproverName} requested clarification on ${snapshot.packageRef}.

Question
${question}

${link}`
  return { subject, body }
}

function buildClarificationResponseEmail(
  record: AwardApprovalRecord,
  clarification: AwardClarification,
  locale: DisplayLocale,
): AwardEmailCopy {
  const snapshot = record.snapshot!
  const id = record.approvalId ?? snapshot.packageRef
  const link = compassLinkForPackage(snapshot, record.approvalId)
  const docs =
    clarification.attachments.length > 0
      ? clarification.attachments.map((d) => `• ${d.label}`).join("\n")
      : locale === "de"
        ? "Keine Anhänge."
        : "No attachments."
  const subject =
    locale === "de" ? `Klärungsantwort — ${id}` : `Clarification response — ${id}`
  const body =
    locale === "de"
      ? `Frage
${clarification.question}

Antwort
${clarification.response}

Anhänge
${docs}

Status: Freigabe erneut eingereicht.

${link}`
      : `Question
${clarification.question}

Response
${clarification.response}

Attachments
${docs}

Status: approval resubmitted.

${link}`
  return { subject, body }
}

function buildRevisionEmail(
  record: AwardApprovalRecord,
  revision: AwardRevision,
  locale: DisplayLocale,
): AwardEmailCopy {
  const snapshot = record.snapshot!
  const id = record.approvalId ?? snapshot.packageRef
  const link = compassLinkForPackage(snapshot, record.approvalId)
  const reason = revisionReasonLabel(revision.reasonCategory, locale)
  const due = revision.dueDate ? formatDisplayDate(revision.dueDate, locale) : ""
  const subject = locale === "de" ? `Überarbeitung erforderlich — ${id}` : `Revision required — ${id}`
  const body =
    locale === "de"
      ? `Überarbeitung erforderlich — ${id}
Grund: ${reason}
Anweisung von ${revision.requestedByName}: ${revision.instructions}
${due ? `Fällig: ${due}` : ""}

${link}`
      : `Revision required — ${id}
Reason: ${reason}
Instructions from ${revision.requestedByName}: ${revision.instructions}
${due ? `Due: ${due}` : ""}

${link}`
  return { subject, body }
}

function buildResubmitEmail(
  record: AwardApprovalRecord,
  snapshot: AwardApprovalSnapshot,
  comparison: AwardComparisonField[],
  locale: DisplayLocale,
): AwardEmailCopy {
  const id = record.approvalId ?? snapshot.packageRef
  const link = compassLinkForPackage(snapshot, record.approvalId)
  const table = comparison
    .map((row) => `${row.field}: ${row.original} → ${row.revised}${row.change !== "—" ? ` (${row.change})` : ""}`)
    .join("\n")
  const subject =
    locale === "de" ? `Zuschlagsempfehlung erneut eingereicht — ${id}` : `Award recommendation resubmitted — ${id}`
  const body =
    locale === "de"
      ? `Die Empfehlung zu ${snapshot.packageRef} wurde erneut eingereicht.

${table}

${link}`
      : `The recommendation for ${snapshot.packageRef} has been resubmitted.

${table}

${link}`
  return { subject, body }
}

export function awardSnapshotLines(snapshot: AwardApprovalSnapshot, locale: DisplayLocale = "en") {
  return buildAwardApprovalEmail(snapshot, locale)
}

export function formatAwardAuditLine(entry: AwardAuditEntry, locale: DisplayLocale = "en"): string {
  const copy = awardGovCopy(locale)
  const from = copy.status[entry.statusFrom]
  const to = copy.status[entry.statusTo]
  const when = formatDateTimeDMY(entry.at)
  const comments = entry.comments ? ` ${entry.comments}` : ""
  return `${when} — ${entry.actorName} (${entry.actorRole}): ${entry.action}. ${from} → ${to}.${comments}`
}

export function latestNotification(record: AwardApprovalRecord | undefined): AwardNotification | null {
  if (!record || record.notifications.length === 0) return null
  return record.notifications[record.notifications.length - 1] ?? null
}
