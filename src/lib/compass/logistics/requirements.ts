export type RequirementRow = {
  id: string
  requirement: string
  category: string
  mandatory: boolean
  source: string
  sourceVersion: string
  section: string
  confidence: string
  state: "clear" | "gap" | "conflict"
  passage: string
}

export const REQUIREMENTS: RequirementRow[] = [
  {
    id: "REQ-01",
    requirement: "Cover 18 European origin–destination lanes.",
    category: "Scope",
    mandatory: true,
    source: "SRC-001",
    sourceVersion: "v1.2",
    section: "2.1",
    confidence: "High",
    state: "clear",
    passage: "The service covers eighteen European origin–destination pairs.",
  },
  {
    id: "REQ-02",
    requirement: "Forecast volume of 2,448 shipments is a decision input, not a volume commitment.",
    category: "Commercial",
    mandatory: true,
    source: "SRC-005",
    sourceVersion: "v1.2",
    section: "3.2",
    confidence: "High",
    state: "conflict",
    passage: "Annual forecast 2,448 shipments. Do not treat the forecast as a take-or-pay commitment.",
  },
  {
    id: "REQ-03",
    requirement: "On-time delivery target 98.0%.",
    category: "SLA",
    mandatory: true,
    source: "SRC-002",
    sourceVersion: "v1.2",
    section: "4.1",
    confidence: "High",
    state: "clear",
    passage: "OTD target is 98.0 percent of shipments.",
  },
  {
    id: "REQ-04",
    requirement: "Cargo liability insurance of at least EUR 5 million.",
    category: "Qualification",
    mandatory: true,
    source: "SRC-008",
    sourceVersion: "v1.2",
    section: "5.2",
    confidence: "High",
    state: "clear",
    passage: "Minimum cargo liability is EUR 5 million.",
  },
  {
    id: "REQ-05",
    requirement: "Visibility by API, EDI or an agreed daily file.",
    category: "Technology",
    mandatory: true,
    source: "SRC-006",
    sourceVersion: "v1.2",
    section: "2.0",
    confidence: "Medium",
    state: "gap",
    passage: "SRC-006 requires a connectivity method. The lane file does not name the method per lane.",
  },
  {
    id: "REQ-06",
    requirement: "Emissions reporting and an improvement plan.",
    category: "Sustainability",
    mandatory: false,
    source: "SRC-007",
    sourceVersion: "v1.2",
    section: "1.3",
    confidence: "Medium",
    state: "clear",
    passage: "Carriers report emissions and submit an improvement plan.",
  },
]

export const ANALYSIS_STEPS = [
  { id: "read", label: "Documents read", count: "10 sources" },
  { id: "lanes", label: "Structured lane records linked", count: "18 lanes" },
  { id: "extract", label: "Candidate requirements extracted", count: "6" },
  { id: "gaps", label: "Gaps and conflicts found", count: "2" },
  { id: "citations", label: "Citations checked", count: "6 of 6" },
  { id: "draft", label: "Draft created", count: "RFP v1" },
  { id: "review", label: "Quality review completed", count: "Citation coverage, conflicts, terminology" },
] as const

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
