import { defaultAwardContracts } from "./award-contracts"

export const LOGISTICS_SESSION_KEY = "clp-session-v1"

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
}

export type EmailClass = "confirmed" | "potentially" | "not-relevant"

export type LogisticsSession = {
  acceptedNeed: boolean
  packageLocked: boolean
  classifiedEmailIds: string[]
  emailClassifications: Record<string, EmailClass>
  sentDraftIds: string[]
  bidsReleased: boolean
  awardApproved: boolean
  caAssigned: boolean
  createdContracts: SessionContract[]
  replayCheckpoint: number
  performanceReleased: boolean
  asOfMonth: string
}

export const DEFAULT_SESSION: LogisticsSession = {
  acceptedNeed: false,
  packageLocked: false,
  classifiedEmailIds: [],
  emailClassifications: {},
  sentDraftIds: [],
  bidsReleased: false,
  awardApproved: false,
  caAssigned: false,
  createdContracts: [],
  replayCheckpoint: 0,
  performanceReleased: false,
  asOfMonth: "2026-09",
}

export function loadSession(): LogisticsSession {
  if (typeof window === "undefined") return { ...DEFAULT_SESSION }
  try {
    const raw = localStorage.getItem(LOGISTICS_SESSION_KEY)
    if (!raw) return { ...DEFAULT_SESSION }
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) }
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

export function applyReplayCheckpoint(checkpoint: number): Partial<LogisticsSession> {
  const emailClassifications: Record<string, EmailClass> =
    checkpoint >= 4
      ? {
          "EML-004": "confirmed",
          "EML-005": "potentially",
          "EML-006": "not-relevant",
          "EML-012": "not-relevant",
          ...(checkpoint >= 5
            ? { "EML-007": "confirmed", "EML-008": "confirmed", "EML-009": "confirmed" }
            : {}),
          ...(checkpoint >= 8 ? { "EML-010": "confirmed" } : {}),
        }
      : {}
  return {
    replayCheckpoint: checkpoint,
    acceptedNeed: checkpoint >= 2,
    packageLocked: checkpoint >= 2,
    classifiedEmailIds: Object.keys(emailClassifications),
    emailClassifications,
    sentDraftIds: checkpoint >= 3 ? ["EML-001", "EML-002"] : [],
    bidsReleased: checkpoint >= 5,
    awardApproved: checkpoint >= 6,
    caAssigned: checkpoint >= 8,
    createdContracts: checkpoint >= 6 ? defaultAwardContracts() : [],
    performanceReleased: checkpoint >= 7,
    asOfMonth: checkpoint >= 7 ? "2026-10" : "2026-09",
  }
}
