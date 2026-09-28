import { CONTRACTS } from "./structured/contracts"
import { SUPPLIERS } from "./structured/suppliers"
import { BID_RATES } from "./structured/bid-rates"
import type { SessionContract } from "./session"
import { scenarioById, type AwardScenario } from "./award-scenarios"

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

/** Dual-award split copied from the confirmed lane rates on AWD-02. */
export function awardSplit(scenario: AwardScenario = scenarioById("AWD-02")) {
  return scenario.suppliers.map(({ supplierId, share, valueEur }) => ({ supplierId, share, valueEur }))
}

export function defaultAwardContracts(sourcePackageId = "PKG-RFP-001", scenarioId = "AWD-02"): SessionContract[] {
  const scenario = scenarioById(scenarioId)
  return scenario.suppliers.map(({ supplierId, valueEur, laneIds }) => {
    const supplier = SUPPLIERS.find((s) => s.supplierId === supplierId)
    const sla = slaFrom(supplierId)
    const awarded = new Set(laneIds)
    const rates = BID_RATES.filter((row) => row.supplierId === supplierId && row.laneId && awarded.has(row.laneId) && row.rateEurPerShipment != null)
    const rateBasis = rates.length
      ? `${rates.length} winning lane rates copied from ${rates[0]?.bidVersion ?? "the confirmed bid"}: ${rates.slice(0, 4).map((row) => `${row.laneId} EUR ${row.rateEurPerShipment}`).join(", ")}`
      : "No lane rates on the winning bid"
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
      lanes: rates.map((row) => row.laneId!).filter(Boolean),
      rateBasis,
      capacityNote: scenario.capacity,
      renewalTerms: "120-day notice; renewal uses verified execution only",
      scenarioId: scenario.id,
      sourcePackageId,
    }
  })
}
