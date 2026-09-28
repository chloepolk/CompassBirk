import { LANES } from "./structured/lanes"
import { SOURCE_DOCUMENTS } from "./sources/documents"

export type RequirementRow = {
  id: string
  requirement: string
  requirementDe: string
  category: string
  categoryDe: string
  mandatory: boolean
  source: string
  sourceVersion: string
  section: string
  confidence: string
  state: "clear" | "gap" | "conflict"
  passage: string
}

/** Eight proposed RFP requirements. Forecast volume is event data, not a row. */
export const REQUIREMENTS: RequirementRow[] = [
  {
    id: "REQ-001",
    requirement: "Provide FTL and LTL capacity for all 18 offered lanes.",
    requirementDe: "FTL- und LTL-Kapazität für alle 18 angebotenen Relationen bereitstellen.",
    category: "Network capacity",
    categoryDe: "Netzkapazität",
    mandatory: true,
    source: "SRC-001",
    sourceVersion: "v1.2",
    section: "§2.1",
    confidence: "High",
    state: "clear",
    passage: "The service covers eighteen European origin–destination lanes and includes FTL and LTL capacity.",
  },
  {
    id: "REQ-002",
    requirement: "Minimum 98.0% on-time delivery.",
    requirementDe: "Mindestens 98,0 % pünktliche Zustellung.",
    category: "On-time delivery",
    categoryDe: "Pünktliche Zustellung",
    mandatory: true,
    source: "SRC-001, SRC-002, SRC-009",
    sourceVersion: "v1.2",
    section: "§4.1",
    confidence: "High",
    state: "clear",
    passage: "On-time delivery target is 98.0 percent of shipments.",
  },
  {
    id: "REQ-003",
    requirement: "Accept at least 97.0% of shipments offered for execution.",
    requirementDe: "Mindestens 97,0 % der zur Ausführung angebotenen Sendungen annehmen.",
    category: "Shipment acceptance",
    categoryDe: "Sendungsannahme",
    mandatory: true,
    source: "SRC-001, SRC-002, SRC-009",
    sourceVersion: "v1.2",
    section: "§4.2",
    confidence: "High",
    state: "clear",
    passage: "Shipment acceptance rate is at least 97.0 percent of shipments offered for execution.",
  },
  {
    id: "REQ-004",
    requirement: "At least EUR 5 million cargo liability insurance.",
    requirementDe: "Frachtversicherung von mindestens 5 Mio. EUR.",
    category: "Insurance",
    categoryDe: "Versicherung",
    mandatory: true,
    source: "SRC-004, SRC-008",
    sourceVersion: "v1.2",
    section: "§5.2",
    confidence: "High",
    state: "clear",
    passage: "Minimum cargo liability insurance is EUR 5 million.",
  },
  {
    id: "REQ-005",
    requirement: "API, EDI or an agreed daily structured file; the selected method is tested before go-live.",
    requirementDe: "API, EDI oder eine vereinbarte tägliche strukturierte Datei; die gewählte Methode wird vor dem Betriebsstart getestet.",
    category: "Connectivity",
    categoryDe: "Anbindung",
    mandatory: true,
    source: "SRC-001, SRC-006",
    sourceVersion: "v1.2",
    section: "§2.4",
    confidence: "High",
    state: "clear",
    passage: "The approved source permits API, EDI or an agreed daily structured file. The bidder states supported methods, the implementation plan, the testing timetable and the cost. The selected method is tested before go-live.",
  },
  {
    id: "REQ-006",
    requirement: "Fixed EUR lane rates, a fuel-surcharge formula and an accessorial schedule.",
    requirementDe: "Feste EUR-Relationenraten, eine Kraftstoffzuschlagsformel und ein Nebenkostenverzeichnis.",
    category: "Commercial",
    categoryDe: "Kaufmännisch",
    mandatory: true,
    source: "SRC-005",
    sourceVersion: "v1.2",
    section: "§3.1",
    confidence: "High",
    state: "clear",
    passage: "Lane rates are fixed in EUR, with a disclosed fuel-surcharge formula and an accessorial schedule.",
  },
  {
    id: "REQ-007",
    requirement: "Shipment CO2e reporting and reduction initiatives.",
    requirementDe: "CO2e-Bericht je Sendung und Minderungsinitiativen.",
    category: "Sustainability",
    categoryDe: "Nachhaltigkeit",
    mandatory: true,
    source: "SRC-007",
    sourceVersion: "v1.2",
    section: "§1.3",
    confidence: "High",
    state: "clear",
    passage: "Carriers report shipment CO2e and describe reduction initiatives.",
  },
  {
    id: "REQ-008",
    requirement: "Verified incumbent history may inform evaluation; challengers remain No History.",
    requirementDe: "Geprüfte Incumbent-Historie darf in die Bewertung einfließen; Challenger bleiben No History.",
    category: "Vendor history",
    categoryDe: "Lieferantenhistorie",
    mandatory: true,
    source: "SRC-008, SRC-010",
    sourceVersion: "v1.2",
    section: "§6.1",
    confidence: "High",
    state: "clear",
    passage: "Verified incumbent history may inform evaluation. Challengers remain No History.",
  },
]

/** Counts come from the registers. Do not hard-code them in the workspace. */
export function analysisSteps(): {
  id: string
  label: string
  labelDe: string
  count: string
  countDe: string
}[] {
  const documents = SOURCE_DOCUMENTS.filter((row) => row.documentId).length
  const lanes = LANES.filter((row) => row.laneId).length
  const proposed = REQUIREMENTS.length
  const cited = REQUIREMENTS.filter((row) => row.source.trim().length > 0).length
  const clear = REQUIREMENTS.filter((row) => row.state === "clear").length
  const unresolved = REQUIREMENTS.filter((row) => row.state !== "clear").length
  return [
    { id: "read", label: "Documents read", labelDe: "Dokumente gelesen", count: `${documents} sources`, countDe: `${documents} Quellen` },
    { id: "lanes", label: "Structured lane records linked", labelDe: "Strukturierte Relationen verknüpft", count: `${lanes} lanes`, countDe: `${lanes} Relationen` },
    { id: "extract", label: "Proposed RFP requirements", labelDe: "Vorgeschlagene Ausschreibungsanforderungen", count: String(proposed), countDe: String(proposed) },
    { id: "cited", label: "Source-cited", labelDe: "Quellenbelegt", count: String(cited), countDe: String(cited) },
    { id: "clear", label: "Clear", labelDe: "Klar", count: String(clear), countDe: String(clear) },
    { id: "gaps", label: "Unresolved material exceptions", labelDe: "Offene wesentliche Ausnahmen", count: String(unresolved), countDe: String(unresolved) },
    { id: "draft", label: "Draft created", labelDe: "Entwurf erstellt", count: "RFP v1", countDe: "RFP v1" },
    { id: "review", label: "Quality review completed", labelDe: "Qualitätsprüfung abgeschlossen", count: "Citation coverage, terminology", countDe: "Zitatabdeckung, Terminologie" },
  ]
}

export const SOURCE_CLASSES = [
  "Logistics specification (SRC-001)",
  "SLA (SRC-002)",
  "Policy (SRC-003)",
  "Contract terms (SRC-004)",
  "Pricing (SRC-005)",
  "Technology and data (SRC-006)",
  "Sustainability (SRC-007)",
  "Qualification (SRC-008)",
  "Contract extract (SRC-009)",
  "Historical service review (SRC-010)",
]
