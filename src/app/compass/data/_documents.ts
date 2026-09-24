/* ------------------------------------------------------------------ */
/*  Compass Logistics Procurement document register                    */
/*                                                                     */
/*  Controlled-document register for European road-freight sourcing:   */
/*  service specification, SLA, qualification, contract terms.         */
/* ------------------------------------------------------------------ */

export type DocumentCategory = "technical" | "quality" | "legal" | "commercial" | "template"

export interface S7Document {
  id: string
  docRef: string
  title: string
  category: DocumentCategory
  revision: string
  effectiveDate: string
  owner: string
  classification: string
  /** PDF served from /compass/ in public. */
  fileName: string
  pages: number
  summary: string
  /** Cleaned full text used for agent retrieval and citation. */
  fullText: string
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  technical: "Logistics specifications",
  quality: "Performance & SLA",
  legal: "Legal & qualification",
  commercial: "Commercial & pricing",
  template: "Controlled templates",
}

/* ------------------------------------------------------------------ */
/*  Standards matrix (QA-MAN-2026-EPCI §3)                             */
/* ------------------------------------------------------------------ */

export interface StandardRow {
  authority: string
  ref: string
  scope: string
}

export const STANDARDS_MATRIX: StandardRow[] = [
  { authority: "ISO", ref: "ISO 9001:2015", scope: "Quality management systems — required for approved carriers." },
  { authority: "SRC", ref: "SRC-002", scope: "Carrier performance and SLA — OTD, tender acceptance, claims and invoice accuracy." },
  { authority: "SRC", ref: "SRC-008", scope: "Supplier qualification — mandatory evidence, gates and No History treatment." },
]

export const BASELINE_STANDARDS: StandardRow[] = [
  { authority: "ISO", ref: "ISO 9001:2015", scope: "Quality management systems — required for all structural suppliers." },
  { authority: "ISO", ref: "ISO/TS 29001", scope: "Sector-specific QMS for petroleum, petrochemical and natural gas industries — applicable to subsea tooling." },
  { authority: "ISO", ref: "ISO 14001:2015", scope: "Environmental management systems." },
  { authority: "ISO", ref: "ISO 45001:2018", scope: "Occupational health and safety management systems." },
]

export const FAT_TRACEABILITY_CLAUSES = [
  "Carriers shall submit qualification evidence (insurance, due diligence and data-integration method) at least 30 days before the intended service start.",
  "Complete material traceability (EN 10204 Type 3.1 or 3.2 certificates) is required for all primary steel and load-bearing components; uncertified materials will be rejected at the mobilisation port.",
  "Welding and fabrication quality shall be verified via NDT (radiographic, ultrasonic, magnetic particle or dye penetrant) in accordance with DNV-CG-0051; all NDT operators certified to ISO 9712 Level II minimum.",
]

/* ------------------------------------------------------------------ */
/*  Component specification register (the 5 engineering specs)         */
/* ------------------------------------------------------------------ */

export interface SpecParameter {
  parameter: string
  requirement: string
}

export interface ComponentSpec {
  id: string
  docId: string
  docRef: string
  name: string
  shortName: string
  overview: string
  parameters: SpecParameter[]
  /** Prompt-resolution keywords (lowercase). */
  keywords: string[]
  /** Standard refs pulled from the QA matrix for this component. */
  applicableStandards: string[]
  unit: string
  defaultQuantity: string
}

export const COMPONENT_SPECS: ComponentSpec[] = [
  {
    id: "road-freight",
    docId: "src-001",
    docRef: "SRC-001",
    name: "European road-freight services",
    shortName: "Road freight",
    overview: "FTL and LTL road-freight capacity across 18 European lanes, with visibility, SLA and EUR rate-card requirements.",
    parameters: [
      { parameter: "Lanes", requirement: "18 European origin–destination pairs" },
      { parameter: "Forecast volume", requirement: "2,448 shipments per year (decision input, not a guaranteed commitment)" },
      { parameter: "Equipment", requirement: "Curtainsider / box trailer; selected lanes temperature-controlled" },
      { parameter: "OTD target", requirement: "98.0% on-time delivery" },
      { parameter: "Tender acceptance", requirement: "97.0%" },
      { parameter: "Claims ceiling", requirement: "0.5% of shipments" },
      { parameter: "Invoice accuracy", requirement: "99.0%" },
      { parameter: "Currency", requirement: "EUR, fixed lane rates plus disclosed fuel surcharge" },
      { parameter: "Visibility", requirement: "API, EDI or agreed daily file" },
      { parameter: "Insurance", requirement: "Cargo liability of at least EUR 5 million" },
    ],
    keywords: ["road", "freight", "lane", "ftl", "ltl", "carrier", "logistics", "european"],
    applicableStandards: ["ISO 9001:2015", "SRC-002", "SRC-008"],
    unit: "lanes",
    defaultQuantity: "18 lanes",
  },
]

export function componentById(id: string): ComponentSpec | undefined {
  return COMPONENT_SPECS.find(c => c.id === id)
}

/** Resolve a free-text prompt to a component spec by keyword match. */
export function resolveComponentFromPrompt(prompt: string): ComponentSpec | null {
  const lower = prompt.toLowerCase()
  let best: { spec: ComponentSpec; hits: number } | null = null
  for (const spec of COMPONENT_SPECS) {
    const hits = spec.keywords.filter(k => lower.includes(k)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { spec, hits }
  }
  return best?.spec ?? null
}

/** Extract a quantity like "5,000 metres" / "24 units" from a prompt, else the spec default. */
export function resolveQuantityFromPrompt(prompt: string, spec: ComponentSpec): string {
  const m = prompt.match(/([\d,]+(?:\.\d+)?)\s*(metres|meters|m\b|units?|lanes?|shipments?|off\b|sets?|pcs)/i)
  if (m) {
    const qty = m[1]
    const rawUnit = m[2].toLowerCase()
    const unit = rawUnit.startsWith("lane")
      ? "lanes"
      : rawUnit.startsWith("ship")
        ? "shipments"
        : rawUnit.startsWith("met") || rawUnit === "m"
          ? "metres"
          : "units"
    return `${qty} ${unit}`
  }
  return spec.defaultQuantity
}

/* ------------------------------------------------------------------ */
/*  Procurement terms (SRC-004) — clause register                      */
/* ------------------------------------------------------------------ */

export interface TermsClause {
  ref: string
  heading: string
  text: string
}

export const PROCUREMENT_CLAUSES: TermsClause[] = [
  { ref: "3.1", heading: "HSEQ Compliance", text: "The Supplier warrants that all Services will adhere to ISO 9001 (Quality Management), ISO 14001 (Environmental Management) and applicable road-transport safety requirements." },
  { ref: "3.3", heading: "Audit Rights", text: "The Company reserves the right to audit the Supplier's operations and quality-assurance documentation with 48 hours' prior written notice." },
  { ref: "4.1", heading: "Performance of Services", text: "Unless otherwise specified in the Purchase Order, Services shall be performed on the agreed origin–destination lanes using the nominated equipment." },
  { ref: "4.2", heading: "Title & Risk", text: "Risk in the goods remains with the Supplier while they are in the Supplier's care, custody or control, until delivery against the agreed POD." },
  { ref: "4.3", heading: "Visibility & Evidence", text: "The Supplier must provide agreed visibility (API, EDI or daily file) and supporting POD evidence no later than the interval set in SRC-002." },
  { ref: "5.1–5.3", heading: "Liability & Insurance", text: "The Supplier shall maintain cargo liability of at least EUR 5 million and remain responsible for loss of or damage to goods in its care." },
  { ref: "6.2", heading: "Performance Warranty", text: "Service performance follows the SLA in SRC-002 for the contract term. Failures are escalated under the review cadence in that standard." },
  { ref: "7.1", heading: "Fixed Pricing", text: "Lane rates are fixed and firm in EUR. A disclosed fuel surcharge under SRC-005 is the only permitted variable element unless an index is agreed in writing." },
  { ref: "7.2", heading: "Payment Terms", text: "Payment shall be made sixty (60) days from the end of the month in which a correct and fully documented invoice is received." },
  { ref: "9.1–9.2", heading: "Governing Law & Disputes", text: "This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any dispute shall be finally resolved by arbitration under the LCIA Rules; the seat of arbitration shall be London, England." },
]

/* ------------------------------------------------------------------ */
/*  Document register                                                   */
/* ------------------------------------------------------------------ */

function specText(spec: ComponentSpec): string {
  return [
    `TECHNICAL SPECIFICATION — ${spec.name.toUpperCase()}`,
    `Doc Ref: ${spec.docRef}`,
    `Overview: ${spec.overview}`,
    "Technical Parameters:",
    ...spec.parameters.map(p => `${p.parameter}: ${p.requirement}`),
  ].join("\n")
}

export const DOCUMENTS: S7Document[] = [
  ...COMPONENT_SPECS.map((spec): S7Document => ({
    id: spec.docId,
    docRef: spec.docRef,
    title: spec.name,
    category: "technical",
    revision: "Rev 2.1",
    effectiveDate: "2026-06-18",
    owner: "Category Management — Logistics",
    classification: "Confidential — Internal",
    fileName: `/compass/${spec.docId}.pdf`,
    pages: 1,
    summary: spec.overview,
    fullText: specText(spec),
  })),
  {
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
]

export function documentById(id: string): S7Document | undefined {
  return DOCUMENTS.find(d => d.id === id)
}

export function documentsByCategory(category: DocumentCategory): S7Document[] {
  return DOCUMENTS.filter(d => d.category === category)
}

/** Compact register listing for agent context. */
export function documentRegisterSummary(): string {
  return DOCUMENTS.map(d => `${d.docRef} — ${d.title} (${CATEGORY_LABELS[d.category]}, ${d.revision})`).join("\n")
}
