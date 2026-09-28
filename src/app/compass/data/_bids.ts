import type { Locale } from "../_i18n"
import { BIDS as LOGISTICS_BIDS } from "@/lib/compass/logistics/structured/bids"
import { BID_RATES } from "@/lib/compass/logistics/structured/bid-rates"

export { LOGISTICS_BIDS, BID_RATES }

function annualBid(supplierId: string): number {
  const row = LOGISTICS_BIDS.find((bid) => bid.eventId === "RFP-2026-001" && bid.supplierId === supplierId)
  return typeof row?.annualBidValueEur === "number" ? row.annualBidValueEur : 0
}

export interface BidInput {
  id: string
  supplier: string
  packageId: string
  ittRef: string
  totalPrice: number
  hasValidIso9001: boolean
  acceptsKfk: boolean
  acceptsDdpRotterdam: boolean
  techCompliancePts: number
  isoTraceabilityPts: number
  fatNoticeDays: number
  warrantyMonths: number
  acceptsStandardWarranty: boolean
  pdfPath: string | null
  insight: string
}

export const EVAL_PACKAGE_ID = "PKG-RFP-001"
export const ITT_REF = "RFP-2026-001"

export const BIDS_RFP_2026_001: BidInput[] = [
  {
    id: "bid-rheinroute",
    supplier: "RheinRoute Logistics GmbH",
    packageId: "PKG-RFP-001",
    ittRef: "RFP-2026-001",
    totalPrice: annualBid("SUP-001"),
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 22,
    isoTraceabilityPts: 9,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Incumbent; full 18-lane coverage; revised rate card accepted as version 2. History uses the August 2026 Vendor 360 score, not a copied bid value.",
  },
  {
    id: "bid-northbridge",
    supplier: "NorthBridge Freight Ltd",
    packageId: "PKG-RFP-001",
    ittRef: "RFP-2026-001",
    totalPrice: annualBid("SUP-002"),
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 24,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Higher annual cost; strongest incumbent service commitment (94). Offers 15 of 18 lanes. Verified history is the Vendor 360 monthly score through August 2026.",
  },
  {
    id: "bid-alpinelink",
    supplier: "AlpineLink Cargo AG",
    packageId: "PKG-RFP-001",
    ittRef: "RFP-2026-001",
    totalPrice: annualBid("SUP-004"),
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 23,
    isoTraceabilityPts: 9,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Lowest compliant annual cost. Challenger with No History. The five non-history weights are rescaled from 85% to 100%.",
  },
  {
    id: "bid-veloce",
    supplier: "Veloce Transit S.r.l.",
    packageId: "PKG-RFP-001",
    ittRef: "RFP-2026-001",
    totalPrice: annualBid("SUP-005"),
    hasValidIso9001: false,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 21,
    isoTraceabilityPts: 8,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Disqualified: cargo insurance is below the mandatory EUR 5 million. Not ranked and not scored as zero. Challenger remains No History.",
  },
]

export const ALL_BIDS: BidInput[] = [...BIDS_RFP_2026_001]

const INSIGHT_DE: Record<string, string> = {
  "bid-rheinroute":
    "Bisheriger Carrier; volle Abdeckung von 18 Relationen; überarbeitete Ratekarte als Version 2 angenommen. Die Historie nutzt den Vendor-360-Score vom August 2026, nicht einen kopierten Angebotswert.",
  "bid-northbridge":
    "Höhere Jahreskosten; stärkste Servicezusage eines bisherigen Carriers (94). Bietet 15 von 18 Relationen. Die geprüfte Historie ist der monatliche Vendor-360-Score bis August 2026.",
  "bid-alpinelink":
    "Niedrigste konforme Jahreskosten. Challenger mit No History. Die fünf Gewichte ohne Historie werden von 85 % auf 100 % umbasiert.",
  "bid-veloce":
    "Disqualifiziert: die Frachtversicherung liegt unter der Pflicht von 5 Mio. €. Nicht gerankt und nicht als Null gewertet. Der Challenger bleibt No History.",
}

export function localizedBids(locale: Locale): BidInput[] {
  if (locale !== "de") return ALL_BIDS
  return ALL_BIDS.map((bid) => ({ ...bid, insight: INSIGHT_DE[bid.id] ?? bid.insight }))
}

export function bidsForPackage(packageId: string, locale: Locale = "en"): BidInput[] {
  return localizedBids(locale).filter((b) => b.packageId === packageId)
}

export function packagesWithBids(): string[] {
  return [...new Set(ALL_BIDS.map((b) => b.packageId))]
}
