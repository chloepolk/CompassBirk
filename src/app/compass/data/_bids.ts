import type { Locale } from "../_i18n"
import { BIDS as LOGISTICS_BIDS } from "@/lib/compass/logistics/structured/bids"
import { BID_RATES } from "@/lib/compass/logistics/structured/bid-rates"

export { LOGISTICS_BIDS, BID_RATES }

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
    totalPrice: 2_065_914,
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
    totalPrice: 2_190_531,
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
      "Higher annual cost; strongest incumbent service score (94) and vendor-history score (90). Offers 15 of 18 lanes.",
  },
  {
    id: "bid-alpinelink",
    supplier: "AlpineLink Cargo AG",
    packageId: "PKG-RFP-001",
    ittRef: "RFP-2026-001",
    totalPrice: 1_920_496,
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
      "Lowest compliant annual cost and rank 1. Challenger with No History — no invented score and no automatic penalty.",
  },
  {
    id: "bid-veloce",
    supplier: "Veloce Transit S.r.l.",
    packageId: "PKG-RFP-001",
    ittRef: "RFP-2026-001",
    totalPrice: 1_994_320,
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

export function localizedBids(_locale: Locale): BidInput[] {
  return ALL_BIDS
}

export function bidsForPackage(packageId: string, locale: Locale = "en"): BidInput[] {
  return localizedBids(locale).filter((b) => b.packageId === packageId)
}

export function packagesWithBids(): string[] {
  return [...new Set(ALL_BIDS.map((b) => b.packageId))]
}
