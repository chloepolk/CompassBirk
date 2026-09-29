import type { MissionHealth, MissionHorizon, MissionObjective } from "../_diamond/types"

/** Illustrative open actions. They fill the Action Centre baseline and do not
 *  advance the RFP-2026-001 journey. Amounts are USD seeds, same as the register. */
export type OpenExample = {
  id: string
  titleEn: string
  titleDe: string
  narrativeEn: string
  narrativeDe: string
  riskEn: string
  riskDe: string
  evidenceEn: string[]
  evidenceDe: string[]
  ownerRole: string
  due: string
  horizon: MissionHorizon
  health: MissionHealth
  flightStepId: string
  valueType: MissionObjective
  projectedValue: number
  cost: number
  confidence: number
}

export const OPEN_EXAMPLES: OpenExample[] = [
  {
    id: "EX-IBERIA-001",
    titleEn: "Iberia weekend capacity — peak cover",
    titleDe: "Iberien Wochenendkapazität — Spitzenabdeckung",
    narrativeEn: "Weekend peak cover on six Iberian lanes. Separate from RFP-2026-001.",
    narrativeDe: "Wochenendspitze auf sechs iberischen Relationen. Getrennt von RFP-2026-001.",
    riskEn: "October weekend peaks stay uncovered if this mini-tender slips past 16 October.",
    riskDe: "Die Oktober-Wochenendspitze bleibt ungedeckt, wenn diese Mini-Ausschreibung über den 16. Oktober rutscht.",
    evidenceEn: [
      "Six Iberian lanes with a weekend peak above the standing cover.",
    ],
    evidenceDe: [
      "Sechs iberische Relationen mit einer Wochenendspitze über der bestehenden Abdeckung.",
    ],
    ownerRole: "Senior Project SCM Manager",
    due: "2026-10-16",
    horizon: "near",
    health: "on_track",
    flightStepId: "requirements-under-review",
    valueType: "creation",
    projectedValue: 89_000,
    cost: 12_000,
    confidence: 0.81,
  },
  {
    id: "EX-FUEL-001",
    titleEn: "Fuel-surcharge baseline — SRC-005 review",
    titleDe: "Kraftstoffzuschlag-Basis — Prüfung SRC-005",
    narrativeEn: "Confirm the SRC-005 fuel-surcharge baseline month before October invoices. Separate from RFP-2026-001.",
    narrativeDe: "SRC-005-Basismonat für den Kraftstoffzuschlag vor den Oktober-Rechnungen bestätigen. Getrennt von RFP-2026-001.",
    riskEn: "An unconfirmed baseline month leaves the October surcharge open to dispute.",
    riskDe: "Ein unbestätigter Basismonat lässt den Oktober-Zuschlag streitig.",
    evidenceEn: [
      "SRC-005 fuel-surcharge formula. Baseline month is the open question.",
    ],
    evidenceDe: [
      "SRC-005 Kraftstoffzuschlag-Formel. Der Basismonat ist die offene Frage.",
    ],
    ownerRole: "Commercial Manager",
    due: "2026-09-29",
    horizon: "shock",
    health: "at_risk",
    flightStepId: "need-identified",
    valueType: "protection",
    projectedValue: 39_000,
    cost: 4_500,
    confidence: 0.74,
  },
  {
    id: "EX-INV-001",
    titleEn: "NorthBridge invoice-accuracy exception",
    titleDe: "NorthBridge Rechnungsgenauigkeit — Ausnahme",
    narrativeEn: "NorthBridge invoice accuracy against the 99% contractual target. Separate from RFP-2026-001.",
    narrativeDe: "Rechnungsgenauigkeit von NorthBridge gegen das vertragliche Ziel von 99 %. Getrennt von RFP-2026-001.",
    riskEn: "Repeat exceptions on the same carrier become evaluation evidence if they stay unresolved.",
    riskDe: "Wiederholte Ausnahmen beim selben Carrier werden Bewertungsevidenz, wenn sie offen bleiben.",
    evidenceEn: [
      "Invoice-accuracy target 99% on CON-2024-02.",
    ],
    evidenceDe: [
      "Ziel Rechnungsgenauigkeit 99 % auf CON-2024-02.",
    ],
    ownerRole: "Cost & Estimating Analyst",
    due: "2026-10-09",
    horizon: "near",
    health: "on_track",
    flightStepId: "requirements-approved",
    valueType: "protection",
    projectedValue: 24_000,
    cost: 3_200,
    confidence: 0.86,
  },
  {
    id: "EX-BNX-001",
    titleEn: "Benelux cross-dock overflow — Q4 mini-tender",
    titleDe: "Benelux Cross-Dock-Überlauf — Mini-Ausschreibung Q4",
    narrativeEn: "Q4 cross-dock overflow in the Benelux. Separate from RFP-2026-001.",
    narrativeDe: "Cross-Dock-Überlauf im vierten Quartal in den Benelux-Ländern. Getrennt von RFP-2026-001.",
    riskEn: "Peak volume in November needs a named carrier before the standing lanes saturate.",
    riskDe: "Das Spitzenvolumen im November braucht einen benannten Carrier, bevor die bestehenden Relationen sättigen.",
    evidenceEn: [
      "Benelux cross-dock overflow above the standing lane plan for Q4.",
    ],
    evidenceDe: [
      "Benelux-Cross-Dock-Überlauf über dem bestehenden Relationenplan für das vierte Quartal.",
    ],
    ownerRole: "Package Manager — Structures",
    due: "2026-11-20",
    horizon: "long",
    health: "on_track",
    flightStepId: "need-accepted",
    valueType: "creation",
    projectedValue: 70_000,
    cost: 9_600,
    confidence: 0.83,
  },
]
