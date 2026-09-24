/** Inventory demand-validation removed for logistics services. Stubs keep the store compiling. */

export type Disposition =
  | "use-inventory"
  | "use-partial"
  | "request-validation"
  | "retain-full"
  | "reject-match"

export type AuditEvent = {
  id: string
  requirementId: string
  eventType: string
  actor: string
  timestamp: string
  detail: string
  source: string
}

export type CandidateMatch = {
  id: string
  requirementId: string
}

export const CANDIDATE_MATCHES: CandidateMatch[] = []
export const SEED_AUDIT_EVENTS: AuditEvent[] = []

export function requirementById(_id: string) {
  return undefined
}
