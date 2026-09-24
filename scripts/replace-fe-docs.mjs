import fs from "node:fs"

const file = "src/app/prototype/future-energy/data/future-energy/_documents.ts"
let text = fs.readFileSync(file, "utf8")
const start = text.indexOf("  {\n    id: \"qa-man-2026-epci\"")
const end = text.indexOf("]\n\nexport function documentById")
if (start < 0 || end < 0) {
  console.log("miss docs", start, end)
  process.exit(1)
}

const extras = `  {
    id: "src-002",
    docRef: "SRC-002",
    title: "Carrier Performance and SLA Standard",
    category: "quality",
    revision: "v1.2",
    effectiveDate: "2026-09-01",
    owner: "Category Management — Logistics",
    classification: "Internal",
    fileName: "",
    pages: 1,
    summary: "KPI definitions, thresholds, review and escalation for OTD, tender acceptance, claims and invoice accuracy.",
    fullText: "SRC-002 Carrier Performance and SLA Standard. OTD target 98.0%. Tender acceptance 97.0%. Claims ceiling 0.5%. Invoice accuracy 99.0%.",
  },
  {
    id: "src-004",
    docRef: "SRC-004",
    title: "Standard Logistics Contract Terms",
    category: "legal",
    revision: "v1.2",
    effectiveDate: "2026-09-01",
    owner: "Legal",
    classification: "Internal / Supplier Use",
    fileName: "",
    pages: 1,
    summary: "Insurance, liability, confidentiality, termination and audit terms for road-freight services.",
    fullText: "SRC-004 Standard Logistics Contract Terms. Cargo liability of at least EUR 5 million. English law. Termination on 120-day notice aligned to incumbent frameworks.",
  },
  {
    id: "src-005",
    docRef: "SRC-005",
    title: "Pricing and Fuel Surcharge Rules",
    category: "commercial",
    revision: "v1.2",
    effectiveDate: "2026-09-01",
    owner: "Commercial",
    classification: "Internal / Supplier Use",
    fileName: "",
    pages: 1,
    summary: "EUR rate-card format, disclosed fuel surcharge, accessorials and volume basis (forecast, not a commitment).",
    fullText: "SRC-005 Pricing and Fuel Surcharge Rules. Currency EUR. Fixed lane rates plus a disclosed fuel surcharge. Forecast shipments are a decision input, not a guaranteed volume.",
  },
  {
    id: "src-008",
    docRef: "SRC-008",
    title: "Supplier Qualification Standard",
    category: "template",
    revision: "v1.2",
    effectiveDate: "2026-09-01",
    owner: "Category Management — Logistics",
    classification: "Internal",
    fileName: "",
    pages: 1,
    summary: "Mandatory evidence, qualification gates and No History treatment for new carriers.",
    fullText: "SRC-008 Supplier Qualification Standard. Mandatory cargo insurance, due diligence and data integration. No History is a state, not a low score. Challengers receive no invented vendor-history score.",
  },
`

text = text.slice(0, start) + extras + text.slice(end)
fs.writeFileSync(file, text)
console.log("replaced leftover FE documents")

const tender = "src/app/prototype/future-energy/_i18n/tender.ts"
let t = fs.readFileSync(tender, "utf8")
t = t.replace(
  /export function resolveLocalizedComponent\([\s\S]*?\n\}/,
  `export function resolveLocalizedComponent(prompt: string, _locale: Locale): ComponentSpec | null {
  return resolveComponentFromPrompt(prompt)
}`,
)
fs.writeFileSync(tender, t)
console.log("fixed resolveLocalizedComponent")
