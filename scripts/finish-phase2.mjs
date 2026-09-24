import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")

function rewrite(rel, fn) {
  const file = path.join(ROOT, rel)
  const text = fs.readFileSync(file, "utf8")
  const next = fn(text)
  if (next !== text) fs.writeFileSync(file, next)
}

rewrite("src/lib/compass/logistics/index.ts", (text) =>
  text.replace('export * from "./structured/performance"\nexport * from "./structured/sourcing"', 'export * from "./structured/sourcing"'),
)

rewrite("src/app/prototype/future-energy/data/future-energy/_documents.ts", (text) => {
  const start = text.indexOf('  {\n    id: "cable-66kv"')
  const end = text.indexOf("]\n\nexport function componentById")
  if (start > 0 && end > start) {
    text = text.slice(0, start) + text.slice(end)
  }
  text = text.replace(
    `export const STANDARDS_MATRIX: StandardRow[] = [
  { authority: "DNV", ref: "DNV-ST-0126", scope: "Support structures for wind turbines — design, materials, fabrication and quality control of monopiles, transition pieces and jacket foundations." },
  { authority: "DNV", ref: "DNV-OS-H101", scope: "Marine operations (VMO standard) — quality and safety requirements for load-out, transport and offshore installation (lifting) of components." },
  { authority: "NORSOK", ref: "NORSOK M-501", scope: "Surface preparation and protective coating — subsea components and splash-zone structures in saline environments." },
  { authority: "NORSOK", ref: "NORSOK N-004", scope: "Design of steel structures — secondary steel work, boat landings and offshore lifting appliances." },
  { authority: "IMCA", ref: "IMCA M 140 / M 103", scope: "Dynamic positioning operations — QA and FMEA requirements for DP2/DP3 heavy-lift and cable-lay vessels." },
  { authority: "API", ref: "API Spec 17J", scope: "Unbonded flexible pipe — cross-reference standard for dynamic subsea power cables and umbilicals." },
]`,
    `export const STANDARDS_MATRIX: StandardRow[] = [
  { authority: "ISO", ref: "ISO 9001:2015", scope: "Quality management systems — required for approved carriers." },
  { authority: "SRC", ref: "SRC-002", scope: "Carrier performance and SLA — OTD, tender acceptance, claims and invoice accuracy." },
  { authority: "SRC", ref: "SRC-008", scope: "Supplier qualification — mandatory evidence, gates and No History treatment." },
]`,
  )
  text = text.replaceAll("Future Energy", "Compass Logistics Procurement")
  text = text.replaceAll("/future-energy/", "/compass/")
  text = text.replace("Engineering — EPCI Tech Data", "Category Management — Logistics")
  text = text.replace(
    `export const CHARTER = {
  codeName: "SUPPLYTIME 2026",
  vessel: "HeavyLift Installer I (IMO 9876543)",
  vesselType: "DP3 Heavy Lift Crane Vessel (HLCV)",
  owners: "Global Offshore Marine Ltd., Aberdeen",
  charterPeriod: "180 days (firm), plus 30 days (option)",
  deliveryPort: "Rotterdam, The Netherlands",
  hireRate: 110_500,
  mobilisationFee: 250_000,
  law: "English law; arbitration in London (Arbitration Act 1996)",`,
    `export const CHARTER = {
  codeName: "RFP-2026-001",
  vessel: "European road network",
  vesselType: "FTL / LTL road freight",
  owners: "Incumbent carriers and invited challengers",
  charterPeriod: "24 months from 1 January 2027",
  deliveryPort: "European origin–destination lanes",
  hireRate: 5_650_000,
  mobilisationFee: 0,
  law: "English law; arbitration in London (Arbitration Act 1996)",`,
  )
  return text
})

const replacements = [
  ["src/app/prototype/future-energy/agents/_prompts.ts", "Future Energy", "Compass Logistics Procurement"],
  ["src/app/prototype/future-energy/agents/_prompts.ts", "Meridian OWF", "European road-freight"],
  ["src/app/prototype/future-energy/agents/_prompts.ts", "Meridian Offshore Wind Farm programme", "European road-freight programme"],
  ["src/app/prototype/future-energy/agents/_tender-prompts.ts", "Future Energy", "Compass Logistics Procurement"],
  ["src/app/prototype/future-energy/agents/_context.ts", "Future Energy", "Compass Logistics Procurement"],
  ["src/app/prototype/future-energy/agents/_context.ts", "Meridian", "European road-freight"],
  ["src/app/prototype/future-energy/_diamond/adapter.ts", "Promotes Meridian OWF procurement packages", "Promotes logistics sourcing packages"],
  ["src/app/prototype/future-energy/_components/reasoning-helpers.ts", "Meridian tender register", "logistics tender register"],
  ["src/app/prototype/future-energy/_components/reasoning-helpers.ts", "registre d’AO Meridian", "Logistik-Ausschreibungsregister"],
  ["src/lib/compass/data-grounded-language.ts", "Future Energy, Prosera Compass", "Compass Logistics Procurement"],
  ["src/lib/compass/data-grounded-language.ts", "Action Center, Prosera Compass", "Action Centre, Compass Logistics Procurement"],
]

for (const [rel, from, to] of replacements) {
  rewrite(rel, (text) => text.replaceAll(from, to))
}

// Slim expansion stub so field-services datasets can be deleted.
fs.writeFileSync(
  path.join(ROOT, "src/app/prototype/future-energy/data/_expansion.ts"),
  `export type ExpansionStrategy = "expand" | "defend" | "harvest"

export type StrategyScorecard = Record<string, number>

export type MarketSignal = { source: string; metric: string; value: string }

export interface ExpansionAction {
  action: string
  lever: "M&A" | "Sales" | "Pricing" | "Operations"
  rationale: string
  expectedImpact: string
  math?: string
  sources: ("BLS" | "Census" | "EIA" | "Internal")[]
  confidence: "high" | "medium" | "low"
}

export interface ExpansionPrescription {
  region: string
  regionName: string
  strategy: ExpansionStrategy
  strategyRationale: string
  compositeScore: number
  scorecard: StrategyScorecard
  currentFootprint: {
    customers: number
    jobs: number
    margin: number
    revenue: number
    tier: string
  }
  marketSignals: MarketSignal[]
  actions: ExpansionAction[]
}
`,
)

const drop = [
  "src/app/prototype/future-energy/data/_weather_demand.ts",
  "src/app/prototype/future-energy/data/_weather.ts",
  "src/app/prototype/future-energy/data/_validate.ts",
  "src/app/prototype/future-energy/data/_transform.ts",
  "src/app/prototype/future-energy/data/_temporal.ts",
  "src/app/prototype/future-energy/data/_tam.ts",
  "src/app/prototype/future-energy/data/_scorecard.ts",
  "src/app/prototype/future-energy/data/_rootcause.ts",
  "src/app/prototype/future-energy/data/_regions.ts",
  "src/app/prototype/future-energy/data/_refrigerant.ts",
  "src/app/prototype/future-energy/data/_raw_quotes.ts",
  "src/app/prototype/future-energy/data/_raw.ts",
  "src/app/prototype/future-energy/data/_materials.ts",
  "src/app/prototype/future-energy/data/_labor.ts",
  "src/app/prototype/future-energy/data/_fuel.ts",
  "src/app/prototype/future-energy/data/_energy.ts",
  "src/app/prototype/future-energy/data/_eia.ts",
  "src/app/prototype/future-energy/data/_dispatch.ts",
  "src/app/prototype/future-energy/data/_degree_days.ts",
  "src/app/prototype/future-energy/data/_costs.ts",
  "src/app/prototype/future-energy/data/_construction.ts",
  "src/app/prototype/future-energy/data/_benchmarks.ts",
  "src/app/prototype/future-energy/data/_atob.ts",
  "src/app/prototype/future-energy/data/_ar.ts",
  "src/app/prototype/future-energy/_components/hub/demand-validation-card.tsx",
  "src/app/prototype/future-energy/_components/hub/record-disposition-modal.tsx",
  "src/app/prototype/future-energy/_i18n/fr.ts",
  "public/future-energy/logo-light.svg",
  "public/future-energy/logo-dark.svg",
]

for (const rel of drop) {
  const file = path.join(ROOT, rel)
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
    console.log("deleted", rel)
  }
}

console.log("finish-phase2 done")
