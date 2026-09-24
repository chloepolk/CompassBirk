/* ------------------------------------------------------------------ */
/*  Compass Logistics Procurement — European road-freight register     */
/* ------------------------------------------------------------------ */

import type { MissionStage } from "../_diamond/stages"
import { SOURCING } from "@/lib/compass/logistics/structured/sourcing"
import { SUPPLIERS } from "@/lib/compass/logistics/structured/suppliers"
import { LANES } from "@/lib/compass/logistics/structured/lanes"
import { CONTRACTS } from "@/lib/compass/logistics/structured/contracts"
import { PERFORMANCE } from "@/lib/compass/logistics/structured/performance"

export { SOURCING, SUPPLIERS, LANES, CONTRACTS, PERFORMANCE }

export const PROJECT = {
  name: "European Road Freight Services 2027",
  shortName: "EU Road Freight",
  scope: "18-lane European road-freight programme — FTL and LTL",
  client: "Compass Logistics Procurement",
  mobilisationPort: "European road network",
} as const

export const TODAY = "2026-09-23"

export interface TenderPackage {
  id: string
  packageRef: string
  title: string
  componentId: string | null
  quantity: string
  stage: MissionStage
  budget: number
  targetSavings: number
  realisedSavings?: number
  tenderCost: number
  ownerRole: string
  sponsorRole: string
  confidence: number
  submissionDeadline: string
  openedAt: string
  bidders: number
  narrative: string
  risk: string
  evidence: string[]
  valueType: "protection" | "creation"
}

export const TENDER_PACKAGES: TenderPackage[] = [
  {
    id: "PKG-RFP-001",
    packageRef: "RFP-2026-001",
    title: "European Road Freight Services 2027",
    componentId: "road-freight",
    quantity: "18 lanes · 2,448 forecast shipments",
    stage: "understand",
    budget: 5_650_000,
    targetSavings: 452_000,
    tenderCost: 48_000,
    ownerRole: "Senior Project SCM Manager",
    sponsorRole: "SCM Director",
    confidence: 0.86,
    submissionDeadline: "2026-10-23",
    openedAt: "2026-09-28",
    bidders: 0,
    narrative: "Sourcing need: European Road Freight Services 2027 must succeed the frameworks that expire on 31 December 2026. Draft the bilingual RFP against 18 lanes, 2,448 forecast shipments and the SRC-002 SLA before invitations go out. Carrier responses are not yet on file.",
    risk: "The RheinRoute and NorthBridge frameworks expire 31 December 2026 with 120-day notice. A late award compresses transition into the January 2027 service start.",
    evidence: [
      "SRC-001: FTL/LTL capacity across 18 European lanes; visibility by API, EDI or daily file.",
      "SRC-002: OTD target 98.0%; tender acceptance 97.0%; claims ceiling 0.5%.",
      "SRC-008: New carriers remain No History; incumbent scores are an approved evidence source, not an automatic preference.",
      "Estimated annual value €5.65m. Service start 1 January 2027.",
    ],
    valueType: "creation",
  },
  {
    id: "PKG-CON-001",
    packageRef: "CON-2024-01",
    title: "RheinRoute framework — core-lane expiry",
    componentId: "road-freight",
    quantity: "Core European lanes",
    stage: "understand",
    budget: 4_750_000,
    targetSavings: 190_000,
    tenderCost: 22_000,
    ownerRole: "Senior Project SCM Manager",
    sponsorRole: "SCM Director",
    confidence: 0.9,
    submissionDeadline: "2026-12-31",
    openedAt: "2024-10-01",
    bidders: 1,
    narrative: "CON-2024-01 with RheinRoute Logistics GmbH ends 31 December 2026 (120-day notice). Verified OTD has sat below the 98% contractual target for three months. The expiry is the trigger for RFP-2026-001, not a separate award.",
    risk: "Continuing without a successor leaves core-lane coverage uncontracted from 1 January 2027.",
    evidence: [
      "Contract value €4.75m; OTD target 98%; invoice-accuracy target 99%.",
      "Performance alert ACT-006: OTD below target for three months on five lanes.",
      "Incumbent history is available and labelled as verified, not imputed.",
    ],
    valueType: "protection",
  },
  {
    id: "PKG-CON-002",
    packageRef: "CON-2024-02",
    title: "NorthBridge framework — UK and Northern Europe expiry",
    componentId: "road-freight",
    quantity: "UK / Northern Europe lanes",
    stage: "understand",
    budget: 3_080_000,
    targetSavings: 92_000,
    tenderCost: 18_000,
    ownerRole: "Package Manager — Structures",
    sponsorRole: "SCM Director",
    confidence: 0.88,
    submissionDeadline: "2026-12-31",
    openedAt: "2024-10-01",
    bidders: 1,
    narrative: "CON-2024-02 with NorthBridge Freight Ltd also ends 31 December 2026. NorthBridge is the strongest incumbent on service score and is a candidate in the dual-award scenario (35%) alongside AlpineLink.",
    risk: "Notice window is the same as CON-2024-01 — treat as one governed event, not two isolated tenders.",
    evidence: [
      "Contract value €3.08m; OTD target 97.5%.",
      "Evaluation rank 3; include in dual-award scenario AWD-02.",
    ],
    valueType: "protection",
  },
  {
    id: "PKG-PERF-001",
    packageRef: "ACT-006",
    title: "Performance exception — RheinRoute OTD below contractual target",
    componentId: "road-freight",
    quantity: "Five late-delivery lanes",
    stage: "understand",
    budget: 2_380_000,
    targetSavings: 0,
    tenderCost: 8_500,
    ownerRole: "Vessel & Marine Assurance Lead",
    sponsorRole: "SCM Director",
    confidence: 0.84,
    submissionDeadline: "2026-09-25",
    openedAt: "2026-09-01",
    bidders: 1,
    narrative: "Post-award monitoring on the current RheinRoute framework: on-time delivery is below the 98% target for three consecutive months. Create a performance review and a German corrective-action request. This is monitoring evidence, not a realised saving.",
    risk: "Five lanes account for most late deliveries. Unresolved, the deterioration becomes award-evaluation evidence and a renewal driver.",
    evidence: [
      "ACT-006 performance alert; ACT-007 corrective-action draft.",
      "Operational score uses OTD, tender acceptance and claims (40% of the vendor score).",
      "Synthetic execution records are labelled as synthetic.",
    ],
    valueType: "protection",
  },
  {
    id: "PKG-CA-001",
    packageRef: "ACT-007",
    title: "Corrective action — RheinRoute terminal recovery plan",
    componentId: "road-freight",
    quantity: "Five late-delivery lanes",
    stage: "understand",
    budget: 0,
    targetSavings: 0,
    tenderCost: 4_200,
    ownerRole: "Supplier Manager",
    sponsorRole: "SCM Director",
    confidence: 0.8,
    submissionDeadline: "2026-10-02",
    openedAt: "2026-09-23",
    bidders: 0,
    narrative: "Corrective action: request a German-language terminal recovery plan from RheinRoute. Five lanes account for most late deliveries. This is a monitoring obligation, not a realised saving.",
    risk: "Without an assigned owner and deadline the deterioration becomes evaluation evidence and a renewal driver.",
    evidence: [
      "ACT-007 corrective-action draft; CAP-001.",
      "Linked to ACT-006 performance alert and twelve-month OTD series.",
    ],
    valueType: "protection",
  },
  {
    id: "PKG-REN-001",
    packageRef: "REN-2027-001",
    title: "Renewal / re-tender — reuse verified history only",
    componentId: "road-freight",
    quantity: "18 lanes · awarded 2027 baseline",
    stage: "understand",
    budget: 5_650_000,
    targetSavings: 226_000,
    tenderCost: 28_000,
    ownerRole: "Senior Project SCM Manager",
    sponsorRole: "SCM Director",
    confidence: 0.82,
    submissionDeadline: "2026-12-15",
    openedAt: "2026-09-23",
    bidders: 0,
    narrative: "After the 2027 award, the next renewal or re-tender may reuse only verified execution history. Challengers remain No History. Do not invent scores or copy unverified claims into the next event.",
    risk: "Re-using unverified or post-award rumour as history would bias the next evaluation.",
    evidence: [
      "Awarded contract baseline copied from the 2027 dual award without re-keying SLA targets.",
      "Incumbent scores require twelve complete months of verified execution.",
    ],
    valueType: "creation",
  },
]

export function tenderById(id: string): TenderPackage | undefined {
  return TENDER_PACKAGES.find(t => t.id === id)
}

export interface ClosedPackage {
  id: string
  name: string
  cost: number
  realisedSavings: number
  completionDate: string
  decisionMaker: string
}

export const CLOSED_PACKAGES: ClosedPackage[] = [
  { id: "PKG-2087", name: "Western Europe overflow — 2025 mini-tender", cost: 41_000, realisedSavings: 186_000, completionDate: "2026-02-19", decisionMaker: "SCM Director" },
  { id: "PKG-2090", name: "Seasonal peak capacity — Q1 2026", cost: 22_000, realisedSavings: 74_000, completionDate: "2026-03-12", decisionMaker: "SCM Director" },
  { id: "PKG-2095", name: "Temperature-controlled overflow — Netherlands", cost: 19_400, realisedSavings: 61_000, completionDate: "2026-05-07", decisionMaker: "Senior Project SCM Manager" },
]
