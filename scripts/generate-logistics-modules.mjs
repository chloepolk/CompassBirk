import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const EXTRACTED = path.join(ROOT, "docs", "compass-logistics", "_extracted")
const OUT = path.join(ROOT, "src", "lib", "compass", "logistics")

const PACKAGE_MAP = {
  "Source Documents": { dir: "sources", file: "documents", kind: "authoritative" },
  Suppliers: { dir: "structured", file: "suppliers", kind: "structured" },
  Lanes: { dir: "structured", file: "lanes", kind: "structured" },
  Contracts: { dir: "structured", file: "contracts", kind: "structured" },
  Performance: { dir: "structured", file: "performance", kind: "structured" },
  Sourcing: { dir: "structured", file: "sourcing", kind: "structured" },
  Bids: { dir: "structured", file: "bids", kind: "structured" },
  "Bid Rates": { dir: "structured", file: "bid-rates", kind: "structured" },
  Shipments: { dir: "structured", file: "shipments", kind: "structured", json: true },
  Invoices: { dir: "structured", file: "invoices", kind: "structured", json: true },
  Incidents: { dir: "structured", file: "incidents", kind: "structured" },
  Evaluation: { dir: "expected", file: "evaluation", kind: "expected_generated_outputs" },
  Actions: { dir: "expected", file: "actions", kind: "expected_generated_outputs" },
  Emails: { dir: "expected", file: "emails", kind: "expected_generated_outputs" },
  "Internal Replay": { dir: "internal", file: "replay", kind: "internal_replay" },
}

function toCamel(key) {
  return String(key)
    .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, "")
}

function toTypeName(file) {
  return file
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("")
}

function jsLiteral(value) {
  if (value === null || value === undefined || value === "") return "null"
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "string") {
    const asNum = Number(value)
    if (value.trim() !== "" && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(value.trim())) {
      return value.trim()
    }
    return JSON.stringify(value)
  }
  return JSON.stringify(value)
}

function inferTsType(values) {
  const present = values.filter((v) => v !== null && v !== undefined && v !== "")
  if (present.length === 0) return "string | number | null"
  const numeric = present.filter((v) => typeof v === "number" || /^-?\d+(\.\d+)?$/.test(String(v).trim()))
  if (numeric.length === present.length) return "number | null"
  if (numeric.length > 0) return "string | number | null"
  return "string | null"
}

function normalizeRecord(record, headers) {
  const out = {}
  for (const header of headers) {
    if (!header) continue
    const key = toCamel(header)
    let value = record[header]
    if (value === "" || value === undefined) value = null
    else if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) value = Number(value)
    out[key] = value
  }
  return out
}

function writeModule(sheetName, spec, payload) {
  const dir = path.join(OUT, spec.dir)
  fs.mkdirSync(dir, { recursive: true })
  const typeName = toTypeName(spec.file)
  const headers = (payload.headers ?? []).filter(Boolean)
  const records = (payload.records ?? []).map((row) => normalizeRecord(row, headers))
  const fields = headers.map((header) => {
    const key = toCamel(header)
    const type = inferTsType(records.map((r) => r[key]))
    return `  ${key}: ${type}`
  })

  const banner = `/** ${spec.kind} — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (${sheetName}). Do not import xlsx at runtime. */`

  if (spec.json) {
    const jsonName = `${spec.file}.json`
    const constName = toConstName(spec.file)
    fs.writeFileSync(path.join(dir, jsonName), JSON.stringify(records, null, 2) + "\n")
    fs.writeFileSync(
      path.join(dir, `${spec.file}.ts`),
      `${banner}
import data from "./${jsonName}"

export type ${typeName} = {
${fields.join("\n")}
}

export const ${constName}: ${typeName}[] = data as ${typeName}[]
`,
    )
    return
  }

  const constName = toConstName(spec.file)
  const rows = records
    .map((row) => {
      const body = headers
        .filter(Boolean)
        .map((header) => `    ${toCamel(header)}: ${jsLiteral(row[toCamel(header)])}`)
        .join(",\n")
      return `  {\n${body},\n  }`
    })
    .join(",\n")

  fs.writeFileSync(
    path.join(dir, `${spec.file}.ts`),
    `${banner}

export type ${typeName} = {
${fields.join("\n")}
}

export const ${constName}: ${typeName}[] = [
${rows}
]
`,
  )
}

function toConstName(file) {
  return file.replace(/-/g, "_").toUpperCase()
}

for (const [sheet, spec] of Object.entries(PACKAGE_MAP)) {
  const jsonPath = path.join(EXTRACTED, `${sheet.replace(/ /g, "_")}.json`)
  if (!fs.existsSync(jsonPath)) {
    console.warn("missing", jsonPath)
    continue
  }
  writeModule(sheet, spec, JSON.parse(fs.readFileSync(jsonPath, "utf8")))
}

fs.writeFileSync(
  path.join(OUT, "types.ts"),
  `/** Package split for the Compass Logistics Procurement synthetic dataset v1.2. */

export type LogisticsPackageKind =
  | "authoritative"
  | "structured"
  | "scenario_inputs"
  | "expected_generated_outputs"
  | "internal_replay"

export const LOGISTICS_PACKAGE_POLICY = {
  authoritative: "Customer-visible source register (SRC-001–010).",
  structured: "Customer-visible operating data: suppliers, lanes, contracts, performance, sourcing, bids, rates, shipments, invoices, incidents.",
  scenario_inputs: "Gated — load only when a named scenario is opened. No scenario_inputs sheet in v1.2.",
  expected_generated_outputs: "Test / evaluation fixtures. Do not treat as live customer-authored records.",
  internal_replay: "Never render in customer UI.",
} as const
`,
)

fs.writeFileSync(
  path.join(OUT, "index.ts"),
  `export * from "./types"
export * from "./sources/documents"
export * from "./structured/suppliers"
export * from "./structured/lanes"
export * from "./structured/contracts"
export * from "./structured/performance"
export * from "./structured/sourcing"
export * from "./structured/bids"
export * from "./structured/bid-rates"
export * from "./structured/performance"
export { SHIPMENTS } from "./structured/shipments"
export type { Shipments as Shipment } from "./structured/shipments"
export { INVOICES } from "./structured/invoices"
export type { Invoices as Invoice } from "./structured/invoices"
export * from "./structured/incidents"
export * from "./expected/evaluation"
export * from "./expected/actions"
export * from "./expected/emails"
export { INTERNAL_REPLAY } from "./internal/replay"
export type { Replay as InternalReplay } from "./internal/replay"
`,
)

console.log("wrote logistics modules")
process.exit(0)
const enPath = path.join(ROOT, "src", "app", "prototype", "future-energy", "_i18n", "en.ts")
const dePath = path.join(ROOT, "src", "app", "prototype", "future-energy", "_i18n", "de.ts")
let en = fs.readFileSync(enPath, "utf8")
en = en.replace(/\bconst en =/, "const de =")
en = en.replace(/export default en/, "export default de")
en = en
  .replace('actionCentre: "Action Centre"', 'actionCentre: "Aktionszentrum"')
  .replace('tenderStudio: "Tender Management"', 'tenderStudio: "Ausschreibungsmanagement"')
  .replace('bidEvaluation: "Bid Evaluation"', 'bidEvaluation: "Angebotsbewertung"')
  .replace('intelligencePanel: "Intelligence Panel"', 'intelligencePanel: "Intelligence Panel"')
  .replace('language: "Language"', 'language: "Sprache"')
  .replace('signIn: "Sign In"', 'signIn: "Anmelden"')
  .replace('email: "Email"', 'email: "E-Mail"')
  .replace('password: "Password"', 'password: "Passwort"')
  .replace('close: "Close"', 'close: "Schließen"')
  .replace('send: "Send"', 'send: "Senden"')
  .replace('sending: "Sending…"', 'sending: "Senden…"')
  .replace('sent: "Sent"', 'sent: "Gesendet"')
  .replace('cancel: "Cancel"', 'cancel: "Abbrechen"')
  .replace('vesselCharter: "Vessel charter"', 'vesselCharter: "Sourcing-Ereignis"')
  .replace('vessel: "Vessel"', 'vessel: "Netz"')
  .replace('hireRate: "Hire rate"', 'hireRate: "Schätzwert"')
  .replace('perDay: "/day"', 'perDay: ""')
  .replace(
    'charterFlowdown: "Knock-for-knock liability flows down to every supplier working over the vessel side."',
    'charterFlowdown: "Qualifikationsregeln und No History gelten für alle Bieter."',
  )
  .replace(
    "High commercial risk: warranty cut exceeds 25% of the Future Energy standard. Flag before award.",
    "Hohes kommerzielles Risiko: Versicherungsnachweis unter der Pflichtschwelle von 5 Mio. €. Vor der Zuschlagsempfehlung kennzeichnen.",
  )
  .replace('gateKfk: "Mutual knock-for-knock"', 'gateKfk: "Sorgfaltsprüfung"')
  .replace('gateDdp: "DDP Rotterdam"', 'gateDdp: "Datenintegration"')
  .replace('footer: "Compass Logistics Procurement"', 'footer: "Compass Logistics Procurement"')
fs.writeFileSync(dePath, en)
console.log("wrote logistics modules and de.ts")
