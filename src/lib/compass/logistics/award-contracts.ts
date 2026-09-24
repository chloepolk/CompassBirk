import { CONTRACTS } from "./structured/contracts"
import { SUPPLIERS } from "./structured/suppliers"
import type { SessionContract } from "./session"

const SLA_TEMPLATE = CONTRACTS[0]

function slaFrom(supplierId: string) {
  const existing = CONTRACTS.find((c) => c.supplierId === supplierId) ?? SLA_TEMPLATE
  return {
    noticeDays: existing?.noticeDays ?? 120,
    otdTarget: existing?.otdTarget ?? 0.98,
    acceptanceTarget: existing?.acceptanceTarget ?? 0.97,
    claimsTargetMax: existing?.claimsTargetMax ?? 0.005,
    invoiceAccuracyTarget: existing?.invoiceAccuracyTarget ?? 0.99,
  }
}

/** Dual-award split from the evaluation fixture — copied, not re-keyed. */
export const AWARD_SPLIT = [
  { supplierId: "SUP-004", share: 0.65, valueEur: 3_672_500 },
  { supplierId: "SUP-002", share: 0.35, valueEur: 1_977_500 },
] as const

export function defaultAwardContracts(sourcePackageId = "PKG-RFP-001"): SessionContract[] {
  return AWARD_SPLIT.map(({ supplierId, valueEur }) => {
    const supplier = SUPPLIERS.find((s) => s.supplierId === supplierId)
    const sla = slaFrom(supplierId)
    return {
      contractId: `CON-2027-${supplierId.slice(-3)}`,
      supplierId,
      contractTitle: `European Road Freight Services 2027 — ${supplier?.supplierName ?? supplierId}`,
      startDate: "2027-01-01",
      endDate: "2028-12-31",
      noticeDays: sla.noticeDays,
      contractValueEur: valueEur,
      otdTarget: sla.otdTarget,
      acceptanceTarget: sla.acceptanceTarget,
      claimsTargetMax: sla.claimsTargetMax,
      invoiceAccuracyTarget: sla.invoiceAccuracyTarget,
      status: "Awarded",
      sourcePackageId,
    }
  })
}
