import { SUPPLIERS, type Suppliers } from "./structured/suppliers"
import { CONTRACTS, type Contracts } from "./structured/contracts"
import { PERFORMANCE, type Performance } from "./structured/performance"
import { INCIDENTS, type Incidents } from "./structured/incidents"
import { BIDS } from "./structured/bids"
import { LANES } from "./structured/lanes"
import { SHIPMENTS } from "./structured/shipments"
import type { SessionContract } from "./session"

export const SCORE_WEIGHTS = {
  operational: 0.4,
  commercial: 0.25,
  sla: 0.2,
  relationship: 0.15,
} as const

export const MIN_EVIDENCE_MONTHS = 12

export function trendLabel(flag: string | null | undefined, locale: "en" | "de"): string {
  if (flag === "Deteriorating") return locale === "de" ? "Verschlechterung" : "Deteriorating"
  if (flag === "Improving") return locale === "de" ? "Verbesserung" : "Improving"
  if (flag === "Stable") return locale === "de" ? "Stabil" : "Stable"
  return flag ?? "—"
}

export type HistoryStatus = "Available" | "No History"

export type VendorScore = {
  operational: number
  commercial: number
  sla: number
  relationship: number
  total: number
  method: string
}

export type VendorProfile = {
  supplier: Suppliers
  historyStatus: HistoryStatus
  contracts: Contracts[]
  months: Performance[]
  /** Complete months on record, including any not yet released into the selected period. */
  evidenceMonths: number
  latest: Performance | null
  score: VendorScore | null
  incidents: Incidents[]
  bid: (typeof BIDS)[number] | null
}

export function asNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function supplierById(id: string): Suppliers | undefined {
  return SUPPLIERS.find((s) => s.supplierId === id)
}

export function supplierIdFromName(name: string): string | undefined {
  const lower = name.toLowerCase()
  return SUPPLIERS.find((s) => (s.supplierName ?? "").toLowerCase().includes(lower.split(" ")[0] ?? ""))?.supplierId ?? undefined
}

function withinPeriod(value: string | null, throughMonth?: string): boolean {
  if (!throughMonth || !value) return true
  return value.slice(0, 7) <= throughMonth
}

export function performanceFor(supplierId: string, throughMonth?: string): Performance[] {
  return PERFORMANCE.filter((row) => row.supplierId === supplierId && row.month && withinPeriod(row.month, throughMonth)).sort((a, b) =>
    (a.month ?? "").localeCompare(b.month ?? ""),
  )
}

export function incidentsFor(supplierId: string, throughMonth?: string): Incidents[] {
  return INCIDENTS.filter((row) => row.supplierId === supplierId && row.incidentId && withinPeriod(row.incidentDate, throughMonth)).sort((a, b) =>
    (b.incidentDate ?? "").localeCompare(a.incidentDate ?? ""),
  )
}

export function contractsFor(supplierId: string, extras: SessionContract[] = []): Contracts[] {
  const seeded = CONTRACTS.filter((c) => c.supplierId === supplierId)
  const created: Contracts[] = extras
    .filter((c) => c.supplierId === supplierId)
    .map((c) => ({
      contractId: c.contractId,
      supplierId: c.supplierId,
      contractTitle: c.contractTitle,
      startDate: c.startDate,
      endDate: c.endDate,
      noticeDays: c.noticeDays,
      contractValueEur: c.contractValueEur,
      otdTarget: c.otdTarget,
      acceptanceTarget: c.acceptanceTarget,
      claimsTargetMax: c.claimsTargetMax,
      invoiceAccuracyTarget: c.invoiceAccuracyTarget,
      status: c.status,
    }))
  return [...seeded, ...created]
}

export function computeScore(latest: Performance | null, monthCount: number): VendorScore | null {
  if (!latest || monthCount < MIN_EVIDENCE_MONTHS) return null
  const operational = latest.operationalScore ?? 0
  const commercial = latest.commercialScore ?? 0
  const sla = latest.slaScore ?? 0
  const relationship = latest.relationshipScore ?? 0
  const weighted =
    operational * SCORE_WEIGHTS.operational +
    commercial * SCORE_WEIGHTS.commercial +
    sla * SCORE_WEIGHTS.sla +
    relationship * SCORE_WEIGHTS.relationship
  // The monthly extract is the published score. Re-rounding the weighted parts
  // drifts by a tenth (EuroSpan August 2026 is 96.2 in v1.2, not 96.1).
  const total = latest.overallScore ?? Math.round(weighted * 10) / 10
  return {
    operational,
    commercial,
    sla,
    relationship,
    total,
    method: "Operational 40% · Commercial 25% · Contract/SLA 20% · Relationship 15%. Calculation v1.2 uses the published monthly total. The selected period is the months through the reporting date.",
  }
}

export function vendorProfile(supplierId: string, extras: SessionContract[] = [], throughMonth?: string): VendorProfile | null {
  const supplier = supplierById(supplierId)
  if (!supplier) return null
  const months = performanceFor(supplierId, throughMonth)
  const onRecord = performanceFor(supplierId).length
  const latest = months[months.length - 1] ?? null
  const historyStatus: HistoryStatus = supplier.historyStatus === "No History" || onRecord === 0 ? "No History" : "Available"
  return {
    supplier,
    historyStatus,
    contracts: contractsFor(supplierId, extras),
    months,
    evidenceMonths: onRecord,
    latest,
    score: historyStatus === "Available" ? computeScore(latest, onRecord) : null,
    incidents: incidentsFor(supplierId, throughMonth),
    bid: BIDS.find((b) => b.eventId === "RFP-2026-001" && b.supplierId === supplierId) ?? null,
  }
}

export function allVendorProfiles(extras: SessionContract[] = [], throughMonth?: string): VendorProfile[] {
  return SUPPLIERS.filter((s) => s.supplierId).map((s) => vendorProfile(s.supplierId!, extras, throughMonth)!).filter(Boolean)
}

export function laneLabel(laneId: string | null): string {
  const lane = LANES.find((l) => l.laneId === laneId)
  if (!lane) return laneId ?? "—"
  return `${lane.originCity} → ${lane.destinationCity}`
}

export const FORECAST_SHIPMENTS = LANES.reduce((sum, lane) => sum + (lane.forecastAnnualShipments ?? 0), 0)

/** Verified execution records. Do not use FORECAST_SHIPMENTS for performance totals. */
export function actualShipmentCount(supplierId?: string, throughMonth?: string): number {
  return SHIPMENTS.filter((row) => {
    if (!row.supplierId) return false
    if (supplierId && row.supplierId !== supplierId) return false
    if (throughMonth && (row.month ?? "").slice(0, 7) > throughMonth) return false
    return true
  }).length
}
