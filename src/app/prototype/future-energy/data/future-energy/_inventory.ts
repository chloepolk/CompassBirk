/* ------------------------------------------------------------------ */
/*  Synthetic inventory for procurement demand validation              */
/*                                                                     */
/*  Source: docs/future-energy/Future_Energy_Synthetic_Inventory_      */
/*  Records.xlsx (25 August 2026). Simulated records for prototype     */
/*  demonstration — not live ERP balances.                             */
/* ------------------------------------------------------------------ */

export const VALIDATION_AS_OF = "2026-08-25T12:00:00Z"
/** Hours a completed search remains valid before ITT issue / award. */
export const VALIDATION_VALIDITY_HOURS = 72

export type MatchClassification =
  | "available-compliant"
  | "partially-available"
  | "potential-substitute"
  | "available-reserved"
  | "available-not-ready"
  | "not-suitable"
  | "no-inventory"

export type Disposition =
  | "use-inventory"
  | "use-partial"
  | "request-validation"
  | "retain-full-quantity"
  | "reject-match"

export type DecisionStatus = "approved" | "validation-pending" | "closed"

export type ValidationState =
  | "check-required"
  | "review-required"
  | "validation-pending"
  | "validated-reduced"
  | "validated-retained"
  | "recheck-required"

export type IttAwardControl =
  | "clear"
  | "blocked-unresolved"
  | "blocked-expired"

export const RETAIN_REASONS = [
  "Committed to another project",
  "Certification incomplete",
  "Required date cannot be met",
  "Technical mismatch",
  "Contingency stock must be retained",
  "Transfer and readiness cost exceeds the purchase alternative",
] as const

export type RetainReason = (typeof RETAIN_REASONS)[number]

export interface ProcurementRequirement {
  id: string
  packageId: string
  packageRef: string
  project: string
  materialNumber: string
  description: string
  uom: string
  requestedQty: number
  requiredAtSite: string
  specificationRef: string
  deliveryLocation: string
  currency: "EUR"
  newPurchaseUnitBaseline: number
  status: "open"
  searchTimestamp: string
}

export interface MaterialMasterRecord {
  materialNumber: string
  description: string
  manufacturer: string
  model: string
  lifecycleStatus: "Active"
  supersededNumber: string | null
  approvedEquivalentTo: string | null
  equivalentStatus: "Approved" | "Validation required" | "Not approved"
  specificationRef: string
  technicalAttributes: string
  uom: string
}

export interface InventoryBalance {
  id: string
  materialNumber: string
  manufacturer: string
  model: string
  storageLocation: string
  lotOrSerial: string
  onHandQty: number
  uom: string
  condition: string
  inventoryStatus: "Available" | "Reserved" | "Quarantined"
  owningProject: string
  transferRestriction: string
  lastUpdated: string
  preservationNote: string
}

export interface InventoryReservation {
  id: string
  inventoryId: string
  materialNumber: string
  reservedQty: number
  uom: string
  owningProject: string
  purpose: string
  reservationStatus: "Firm"
  transferPermitted: "No" | "Conditional"
  reservationEnd: string
  decisionOwner: string
}

export interface ExpectedReceipt {
  id: string
  poOrTransferRef: string
  materialNumber: string
  expectedQty: number
  uom: string
  supplierOrSource: string
  destination: string
  expectedAvailability: string
  status: "Confirmed" | "Forecast"
  owningProject: string
  timingNote: string
}

export interface QualityRecord {
  id: string
  inventoryId: string
  lotOrSerial: string
  certificates: string
  certificateStatus: string
  traceability: string
  inspectionStatus: string
  preservationStatus: string
  lastReview: string
  estimatedReadyDate: string | null
  assessment: string
  outstandingCheck: string
}

export interface CandidateMatch {
  id: string
  requirementId: string
  inventoryId: string
  matchBasis: string
  candidateQty: number
  potentiallyUsableQty: number
  classification: MatchClassification
  disposition: Disposition
  approvedInventoryQty: number
  decisionStatus: DecisionStatus
  actionOwner: string
  decisionTimestamp: string | null
  reason: string
  sourceEvidence: string
}

export interface ValidationAction {
  id: string
  requirementId: string
  matchId: string
  actionType: string
  question: string
  owner: string
  dueDate: string
  status: "Open" | "Complete"
  workflow: "Demand Validation"
  supportingEvidence: string
}

export interface AuditEvent {
  id: string
  requirementId: string
  eventType: string
  actor: string
  timestamp: string
  detail: string
  source: string
}

export const REQUIREMENTS: ProcurementRequirement[] = [
  {
    id: "REQ-MER-2101",
    packageId: "PKG-2101",
    packageRef: "MER-SCM-2101",
    project: "Meridian Offshore Wind Farm",
    materialNumber: "MAT-CBL-66KV-CU630",
    description: "66 kV subsea array cable, 630 mm² copper, 48-core SM fibre",
    uom: "m",
    requestedQty: 5000,
    requiredAtSite: "2027-01-15",
    specificationRef: "TS-CBL-66KV-001",
    deliveryLocation: "Rotterdam marshalling yard",
    currency: "EUR",
    newPurchaseUnitBaseline: 560,
    status: "open",
    searchTimestamp: "2026-08-25T09:00:00Z",
  },
  {
    id: "REQ-MER-2102",
    packageId: "PKG-2102",
    packageRef: "MER-SCM-2102",
    project: "Meridian Offshore Wind Farm",
    materialNumber: "MAT-TP-S355-7000",
    description: "Monopile transition piece, S355G10+M, project geometry",
    uom: "unit",
    requestedQty: 50,
    requiredAtSite: "2027-04-30",
    specificationRef: "TS-STR-TP-002",
    deliveryLocation: "Eemshaven load-out quay",
    currency: "EUR",
    newPurchaseUnitBaseline: 4_750_000,
    status: "open",
    searchTimestamp: "2026-08-25T09:01:00Z",
  },
  {
    id: "REQ-MER-2103",
    packageId: "PKG-2103",
    packageRef: "MER-SCM-2103",
    project: "Meridian Offshore Wind Farm",
    materialNumber: "MAT-HB-3000T-14S",
    description: "3000 t heavy-lift crane hook block, 14 sheaves",
    uom: "unit",
    requestedQty: 1,
    requiredAtSite: "2026-11-30",
    specificationRef: "TS-HL-CB-003",
    deliveryLocation: "Rotterdam heavy-lift base",
    currency: "EUR",
    newPurchaseUnitBaseline: 4_200_000,
    status: "open",
    searchTimestamp: "2026-08-25T09:02:00Z",
  },
  {
    id: "REQ-MER-2104",
    packageId: "PKG-2104",
    packageRef: "MER-SCM-2104",
    project: "Meridian Offshore Wind Farm",
    materialNumber: "MAT-AN-ALZNIN-225",
    description: "Al-Zn-In sacrificial anode half-bracelet, 225 kg",
    uom: "unit",
    requestedQty: 240,
    requiredAtSite: "2027-02-28",
    specificationRef: "TS-CP-SACP-004",
    deliveryLocation: "Vlissingen fabrication yard",
    currency: "EUR",
    newPurchaseUnitBaseline: 2100,
    status: "open",
    searchTimestamp: "2026-08-25T09:03:00Z",
  },
  {
    id: "REQ-MER-2105",
    packageId: "PKG-2105",
    packageRef: "MER-SCM-2105",
    project: "Meridian Offshore Wind Farm",
    materialNumber: "MAT-JTS-150-375",
    description: "Subsea J-tube seal, cable OD 150 mm / tube ID 375 mm",
    uom: "unit",
    requestedQty: 60,
    requiredAtSite: "2027-02-15",
    specificationRef: "TS-SUB-JTS-005",
    deliveryLocation: "Rotterdam marshalling yard",
    currency: "EUR",
    newPurchaseUnitBaseline: 88_000,
    status: "open",
    searchTimestamp: "2026-08-25T09:04:00Z",
  },
]

export const MATERIAL_MASTER: MaterialMasterRecord[] = [
  { materialNumber: "MAT-CBL-66KV-CU630", description: "66 kV subsea array cable — Cu 630 mm²", manufacturer: "NordCable Marine", model: "NCM-66-CU630-48", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Approved", specificationRef: "TS-CBL-66KV-001", technicalAttributes: "36/66 kV; Um 72.5 kV; copper water-blocked; 630 mm²; XLPE; galvanized single-wire armour; 48-core SM; dynamic bend radius 3.5 m; 25-year life", uom: "m" },
  { materialNumber: "MAT-CBL-66KV-AL630", description: "66 kV subsea array cable — Al 630 mm²", manufacturer: "NordCable Marine", model: "NCM-66-AL630-48", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: "MAT-CBL-66KV-CU630", equivalentStatus: "Validation required", specificationRef: "TS-CBL-66KV-001", technicalAttributes: "36/66 kV; Um 72.5 kV; aluminium water-blocked; 630 mm²; XLPE; 48-core SM; 25-year life", uom: "m" },
  { materialNumber: "MAT-CBL-33KV-CU630", description: "33 kV subsea array cable — Cu 630 mm²", manufacturer: "Atlantic Cable Works", model: "ACW-33-CU630", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Not approved", specificationRef: "TS-CBL-66KV-001", technicalAttributes: "18/33 kV; copper; 630 mm²; 24-core SM", uom: "m" },
  { materialNumber: "MAT-TP-S355-7000", description: "Monopile transition piece — Meridian geometry", manufacturer: "NorthSea Fabrication", model: "NSF-TP-MER-01", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Approved", specificationRef: "TS-STR-TP-002", technicalAttributes: "S355G10+M; 6.5 m/4.5 m OD; 23 m; 420 t; NORSOK M-501 System 7; DNV-ST-0126", uom: "unit" },
  { materialNumber: "MAT-TP-S460-6900", description: "Monopile transition piece — alternate geometry", manufacturer: "Baltic Steel Structures", model: "BSS-TP-6900", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: "MAT-TP-S355-7000", equivalentStatus: "Validation required", specificationRef: "TS-STR-TP-002", technicalAttributes: "S460G2+M; 6.4 m/4.5 m OD; 22 m; 405 t; NORSOK M-501 System 7; DNV-ST-0126", uom: "unit" },
  { materialNumber: "MAT-HB-3000T-14S", description: "3000 t hook block — 14 sheaves", manufacturer: "OceanLift Systems", model: "OLS-HB3000-14", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Approved", specificationRef: "TS-HL-CB-003", technicalAttributes: "SWL 3000 t; test 3300 t; ramshorn DIN 15402; 14 sheaves; 68 mm rope; EN 10204 3.2; −20 °C/+45 °C; DNV-OS-H101/API 2C", uom: "unit" },
  { materialNumber: "MAT-HB-2500T-12S", description: "2500 t hook block — 12 sheaves", manufacturer: "OceanLift Systems", model: "OLS-HB2500-12", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Not approved", specificationRef: "TS-HL-CB-003", technicalAttributes: "SWL 2500 t; test 2750 t; 12 sheaves; 64 mm rope; EN 10204 3.2", uom: "unit" },
  { materialNumber: "MAT-AN-ALZNIN-225", description: "Al-Zn-In anode half-bracelet — 225 kg", manufacturer: "Cathodic Marine BV", model: "CM-AN225", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Approved", specificationRef: "TS-CP-SACP-004", technicalAttributes: "Al-Zn-In; 225 kg; 2550 Ah/kg; −1.06 V; utilization 0.80; carbon steel insert; DNV-RP-B401", uom: "unit" },
  { materialNumber: "MAT-AN-ALZNIN-200", description: "Al-Zn-In anode half-bracelet — 200 kg", manufacturer: "Cathodic Marine BV", model: "CM-AN200", lifecycleStatus: "Active", supersededNumber: "MAT-AN-ALZNIN-190", approvedEquivalentTo: "MAT-AN-ALZNIN-225", equivalentStatus: "Validation required", specificationRef: "TS-CP-SACP-004", technicalAttributes: "Al-Zn-In; 200 kg; 2520 Ah/kg; −1.05 V; utilization 0.80; DNV-RP-B401", uom: "unit" },
  { materialNumber: "MAT-AN-ALZNIN-150", description: "Al-Zn-In anode half-bracelet — 150 kg", manufacturer: "Nordic CP AS", model: "NCP-AN150", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Not approved", specificationRef: "TS-CP-SACP-004", technicalAttributes: "Al-Zn-In; 150 kg; 2300 Ah/kg; utilization 0.75", uom: "unit" },
  { materialNumber: "MAT-JTS-150-375", description: "Subsea J-tube seal — 150/375 mm", manufacturer: "SubseaSeal Technologies", model: "SST-JTS-150-375", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Approved", specificationRef: "TS-SUB-JTS-005", technicalAttributes: "Cable OD 150 mm; tube ID 375 mm; 3.0 bar; hydrolysis-resistant PU; super duplex; diverless ROV; 25-year life; hyperbaric test", uom: "unit" },
  { materialNumber: "MAT-JTS-150-400", description: "Subsea J-tube seal — 150/400 mm", manufacturer: "SubseaSeal Technologies", model: "SST-JTS-150-400", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: "MAT-JTS-150-375", equivalentStatus: "Validation required", specificationRef: "TS-SUB-JTS-005", technicalAttributes: "Cable OD 150 mm; tube ID 400 mm; 3.0 bar; hydrolysis-resistant PU; super duplex; diverless ROV; 25-year life", uom: "unit" },
  { materialNumber: "MAT-JTS-190-450", description: "Subsea J-tube seal — 190/450 mm", manufacturer: "Marine Entry Systems", model: "MES-JTS-190-450", lifecycleStatus: "Active", supersededNumber: null, approvedEquivalentTo: null, equivalentStatus: "Not approved", specificationRef: "TS-SUB-JTS-005", technicalAttributes: "Cable OD 190 mm; tube ID 450 mm; 2.5 bar; EPDM; diver-assisted", uom: "unit" },
]

export const INVENTORY_BALANCES: InventoryBalance[] = [
  { id: "INV-0001", materialNumber: "MAT-CBL-66KV-CU630", manufacturer: "NordCable Marine", model: "NCM-66-CU630-48", storageLocation: "Rotterdam Cable Yard", lotOrSerial: "LOT-CBL-2407-A", onHandQty: 600, uom: "m", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Meridian OWF", transferRestriction: "No restriction", lastUpdated: "2026-08-24", preservationNote: "Indoor powered carousel; ends sealed" },
  { id: "INV-0002", materialNumber: "MAT-CBL-66KV-CU630", manufacturer: "NordCable Marine", model: "NCM-66-CU630-48", storageLocation: "Eemshaven Cable Yard", lotOrSerial: "LOT-CBL-2403-C", onHandQty: 800, uom: "m", condition: "New / preserved", inventoryStatus: "Reserved", owningProject: "NorthBank OWF", transferRestriction: "Project release required", lastUpdated: "2026-08-24", preservationNote: "Reserved for repair contingency" },
  { id: "INV-0003", materialNumber: "MAT-CBL-66KV-AL630", manufacturer: "NordCable Marine", model: "NCM-66-AL630-48", storageLocation: "Rotterdam Cable Yard", lotOrSerial: "LOT-CBL-2501-B", onHandQty: 450, uom: "m", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Central inventory", transferRestriction: "Engineering approval required", lastUpdated: "2026-08-23", preservationNote: "Aluminium conductor substitute" },
  { id: "INV-0004", materialNumber: "MAT-CBL-33KV-CU630", manufacturer: "Atlantic Cable Works", model: "ACW-33-CU630", storageLocation: "Vlissingen Store", lotOrSerial: "LOT-CBL-2211", onHandQty: 900, uom: "m", condition: "New / damaged end", inventoryStatus: "Quarantined", owningProject: "Legacy Delta Project", transferRestriction: "No transfer until NCR closure", lastUpdated: "2026-08-20", preservationNote: "Voltage mismatch and damaged end" },
  { id: "INV-0005", materialNumber: "MAT-TP-S355-7000", manufacturer: "NorthSea Fabrication", model: "NSF-TP-MER-01", storageLocation: "Eemshaven Quayside", lotOrSerial: "TP-MER-017", onHandQty: 1, uom: "unit", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Meridian OWF", transferRestriction: "Inspection release required", lastUpdated: "2026-08-24", preservationNote: "Flange protection installed" },
  { id: "INV-0006", materialNumber: "MAT-TP-S460-6900", manufacturer: "Baltic Steel Structures", model: "BSS-TP-6900", storageLocation: "Cuxhaven Quayside", lotOrSerial: "TP-BSS-044", onHandQty: 1, uom: "unit", condition: "New / preserved", inventoryStatus: "Reserved", owningProject: "Baltic Alpha OWF", transferRestriction: "Executive project-transfer approval", lastUpdated: "2026-08-22", preservationNote: "Geometry approval required" },
  { id: "INV-0007", materialNumber: "MAT-HB-3000T-14S", manufacturer: "OceanLift Systems", model: "OLS-HB3000-14", storageLocation: "Rotterdam Heavy Lift Base", lotOrSerial: "SER-HB-3000-009", onHandQty: 1, uom: "unit", condition: "Used / preserved", inventoryStatus: "Available", owningProject: "Vessel Assets", transferRestriction: "Inspection and recertification required", lastUpdated: "2026-08-24", preservationNote: "Stored after 2025 campaign" },
  { id: "INV-0008", materialNumber: "MAT-HB-2500T-12S", manufacturer: "OceanLift Systems", model: "OLS-HB2500-12", storageLocation: "Aberdeen Marine Base", lotOrSerial: "SER-HB-2500-004", onHandQty: 1, uom: "unit", condition: "Used / serviceable", inventoryStatus: "Available", owningProject: "Vessel Assets", transferRestriction: "None", lastUpdated: "2026-08-19", preservationNote: "SWL below requirement" },
  { id: "INV-0009", materialNumber: "MAT-AN-ALZNIN-225", manufacturer: "Cathodic Marine BV", model: "CM-AN225", storageLocation: "Vlissingen Fabrication Yard", lotOrSerial: "LOT-AN-2502", onHandQty: 80, uom: "unit", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Central inventory", transferRestriction: "Quality dossier review required", lastUpdated: "2026-08-25", preservationNote: "Palletized; inserts protected" },
  { id: "INV-0010", materialNumber: "MAT-AN-ALZNIN-225", manufacturer: "Cathodic Marine BV", model: "CM-AN225", storageLocation: "Esbjerg Store", lotOrSerial: "LOT-AN-2410", onHandQty: 40, uom: "unit", condition: "New / preserved", inventoryStatus: "Reserved", owningProject: "Skagen OWF", transferRestriction: "Project release required", lastUpdated: "2026-08-23", preservationNote: "Reserved quantity" },
  { id: "INV-0011", materialNumber: "MAT-AN-ALZNIN-200", manufacturer: "Cathodic Marine BV", model: "CM-AN200", storageLocation: "Rotterdam Fabrication Store", lotOrSerial: "LOT-AN-2308", onHandQty: 60, uom: "unit", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Central inventory", transferRestriction: "CP engineering approval required", lastUpdated: "2026-08-21", preservationNote: "Lower net weight; design review required" },
  { id: "INV-0012", materialNumber: "MAT-AN-ALZNIN-150", manufacturer: "Nordic CP AS", model: "NCP-AN150", storageLocation: "Vlissingen Fabrication Yard", lotOrSerial: "LOT-AN-2019", onHandQty: 100, uom: "unit", condition: "New / weathered", inventoryStatus: "Available", owningProject: "Legacy Delta Project", transferRestriction: "None", lastUpdated: "2026-08-20", preservationNote: "Capacity and utilization below requirement" },
  { id: "INV-0013", materialNumber: "MAT-JTS-150-375", manufacturer: "SubseaSeal Technologies", model: "SST-JTS-150-375", storageLocation: "Rotterdam Warehouse", lotOrSerial: "LOT-JTS-2409-A", onHandQty: 18, uom: "unit", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Central inventory", transferRestriction: "Certificate and preservation review required", lastUpdated: "2026-08-25", preservationNote: "Exact dimensional match" },
  { id: "INV-0014", materialNumber: "MAT-JTS-150-400", manufacturer: "SubseaSeal Technologies", model: "SST-JTS-150-400", storageLocation: "Aberdeen Marine Base", lotOrSerial: "LOT-JTS-2310-C", onHandQty: 12, uom: "unit", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Central inventory", transferRestriction: "Engineering approval required", lastUpdated: "2026-08-22", preservationNote: "Tube interface adaptor may be required" },
  { id: "INV-0015", materialNumber: "MAT-JTS-150-375", manufacturer: "SubseaSeal Technologies", model: "SST-JTS-150-375", storageLocation: "Esbjerg Store", lotOrSerial: "LOT-JTS-2501-B", onHandQty: 8, uom: "unit", condition: "New / preserved", inventoryStatus: "Reserved", owningProject: "Skagen OWF", transferRestriction: "Project release required", lastUpdated: "2026-08-24", preservationNote: "Exact match but reserved" },
  { id: "INV-0016", materialNumber: "MAT-JTS-190-450", manufacturer: "Marine Entry Systems", model: "MES-JTS-190-450", storageLocation: "Rotterdam Warehouse", lotOrSerial: "LOT-JTS-2204", onHandQty: 10, uom: "unit", condition: "New / preserved", inventoryStatus: "Available", owningProject: "Central inventory", transferRestriction: "None", lastUpdated: "2026-08-18", preservationNote: "Cable OD and pressure rating do not meet requirement" },
]

export const RESERVATIONS: InventoryReservation[] = [
  { id: "RES-0001", inventoryId: "INV-0002", materialNumber: "MAT-CBL-66KV-CU630", reservedQty: 800, uom: "m", owningProject: "NorthBank OWF", purpose: "Contingency cable", reservationStatus: "Firm", transferPermitted: "No", reservationEnd: "2027-06-30", decisionOwner: "NorthBank Project Director" },
  { id: "RES-0002", inventoryId: "INV-0006", materialNumber: "MAT-TP-S460-6900", reservedQty: 1, uom: "unit", owningProject: "Baltic Alpha OWF", purpose: "Installation spare", reservationStatus: "Firm", transferPermitted: "No", reservationEnd: "2027-08-31", decisionOwner: "Baltic Alpha Project Director" },
  { id: "RES-0003", inventoryId: "INV-0010", materialNumber: "MAT-AN-ALZNIN-225", reservedQty: 40, uom: "unit", owningProject: "Skagen OWF", purpose: "Fabrication allocation", reservationStatus: "Firm", transferPermitted: "Conditional", reservationEnd: "2027-03-31", decisionOwner: "Skagen Package Manager" },
  { id: "RES-0004", inventoryId: "INV-0015", materialNumber: "MAT-JTS-150-375", reservedQty: 8, uom: "unit", owningProject: "Skagen OWF", purpose: "Cable entry package", reservationStatus: "Firm", transferPermitted: "Conditional", reservationEnd: "2027-04-30", decisionOwner: "Skagen Package Manager" },
]

export const EXPECTED_RECEIPTS: ExpectedReceipt[] = [
  { id: "REC-0001", poOrTransferRef: "PO-FE-45821", materialNumber: "MAT-CBL-66KV-CU630", expectedQty: 1000, uom: "m", supplierOrSource: "NordCable Marine", destination: "Rotterdam Cable Yard", expectedAvailability: "2026-12-18", status: "Confirmed", owningProject: "Meridian OWF", timingNote: "Open PO; include only if timing policy permits" },
  { id: "REC-0002", poOrTransferRef: "TR-FE-0097", materialNumber: "MAT-TP-S355-7000", expectedQty: 1, uom: "unit", supplierOrSource: "NorthSea Fabrication", destination: "Eemshaven Quayside", expectedAvailability: "2027-03-15", status: "Forecast", owningProject: "Meridian OWF", timingNote: "Release from cancelled demonstrator project pending" },
  { id: "REC-0003", poOrTransferRef: "PO-FE-46207", materialNumber: "MAT-AN-ALZNIN-225", expectedQty: 60, uom: "unit", supplierOrSource: "Cathodic Marine BV", destination: "Vlissingen Fabrication Yard", expectedAvailability: "2027-02-10", status: "Confirmed", owningProject: "Meridian OWF", timingNote: "Existing PO receipt before required date" },
  { id: "REC-0004", poOrTransferRef: "TR-FE-0101", materialNumber: "MAT-JTS-150-375", expectedQty: 6, uom: "unit", supplierOrSource: "SubseaSeal Technologies", destination: "Rotterdam Warehouse", expectedAvailability: "2027-02-25", status: "Forecast", owningProject: "Central inventory", timingNote: "Expected after requirement date" },
]

export const QUALITY_RECORDS: QualityRecord[] = [
  { id: "QR-0001", inventoryId: "INV-0001", lotOrSerial: "LOT-CBL-2407-A", certificates: "Material certificate; FAT; fibre OTDR", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-24", estimatedReadyDate: "2027-01-15", assessment: "Available", outstandingCheck: "Exact spec attributes verified" },
  { id: "QR-0002", inventoryId: "INV-0002", lotOrSerial: "LOT-CBL-2403-C", certificates: "Material certificate; FAT; fibre OTDR", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-20", estimatedReadyDate: "2027-01-15", assessment: "Available", outstandingCheck: "Technical fit confirmed; allocation unresolved" },
  { id: "QR-0003", inventoryId: "INV-0003", lotOrSerial: "LOT-CBL-2501-B", certificates: "Material certificate; FAT", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-23", estimatedReadyDate: "2027-01-15", assessment: "Engineering review", outstandingCheck: "Aluminium conductor needs project approval" },
  { id: "QR-0004", inventoryId: "INV-0004", lotOrSerial: "LOT-CBL-2211", certificates: "Legacy certificate pack", certificateStatus: "Incomplete", traceability: "Partial", inspectionStatus: "Failed", preservationStatus: "Expired", lastReview: "2026-08-20", estimatedReadyDate: null, assessment: "Quarantined", outstandingCheck: "33 kV rating fails requirement" },
  { id: "QR-0005", inventoryId: "INV-0005", lotOrSerial: "TP-MER-017", certificates: "EN 10204 3.2; coating dossier; dimensional report", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Pending", preservationStatus: "Valid", lastReview: "2026-08-24", estimatedReadyDate: "2027-04-20", assessment: "Inspection pending", outstandingCheck: "Final flange survey required" },
  { id: "QR-0006", inventoryId: "INV-0006", lotOrSerial: "TP-BSS-044", certificates: "EN 10204 3.2; coating dossier", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-22", estimatedReadyDate: "2027-04-10", assessment: "Engineering review", outstandingCheck: "Bottom OD differs by 0.1 m" },
  { id: "QR-0007", inventoryId: "INV-0007", lotOrSerial: "SER-HB-3000-009", certificates: "EN 10204 3.2; load test certificate", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Expired", preservationStatus: "Preservation current", lastReview: "2026-08-24", estimatedReadyDate: "2026-11-15", assessment: "Recertification pending", outstandingCheck: "Load test expired 31 May 2026" },
  { id: "QR-0008", inventoryId: "INV-0008", lotOrSerial: "SER-HB-2500-004", certificates: "EN 10204 3.2", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-19", estimatedReadyDate: "2026-10-30", assessment: "Not suitable", outstandingCheck: "SWL 2500 t below 3000 t" },
  { id: "QR-0009", inventoryId: "INV-0009", lotOrSerial: "LOT-AN-2502", certificates: "EN 10204 3.1; chemical analysis", certificateStatus: "Present", traceability: "Verified", inspectionStatus: "Pending", preservationStatus: "Valid", lastReview: "2026-08-25", estimatedReadyDate: "2027-02-15", assessment: "Quality review", outstandingCheck: "Batch release signature missing" },
  { id: "QR-0010", inventoryId: "INV-0010", lotOrSerial: "LOT-AN-2410", certificates: "EN 10204 3.1; chemical analysis", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-23", estimatedReadyDate: "2027-02-15", assessment: "Available", outstandingCheck: "Allocation unresolved" },
  { id: "QR-0011", inventoryId: "INV-0011", lotOrSerial: "LOT-AN-2308", certificates: "EN 10204 3.1; chemical analysis", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-21", estimatedReadyDate: "2027-02-15", assessment: "Engineering review", outstandingCheck: "225 kg design basis versus 200 kg candidate" },
  { id: "QR-0012", inventoryId: "INV-0012", lotOrSerial: "LOT-AN-2019", certificates: "Partial certificate pack", certificateStatus: "Incomplete", traceability: "Partial", inspectionStatus: "Failed", preservationStatus: "Expired", lastReview: "2026-08-20", estimatedReadyDate: null, assessment: "Not suitable", outstandingCheck: "2300 Ah/kg below 2500 minimum; utilization 0.75 below 0.80" },
  { id: "QR-0013", inventoryId: "INV-0013", lotOrSerial: "LOT-JTS-2409-A", certificates: "Material certificate; hyperbaric test", certificateStatus: "Present", traceability: "Verified", inspectionStatus: "Pending", preservationStatus: "Review due", lastReview: "2026-08-25", estimatedReadyDate: "2027-02-05", assessment: "Quality review", outstandingCheck: "Preservation record unsigned" },
  { id: "QR-0014", inventoryId: "INV-0014", lotOrSerial: "LOT-JTS-2310-C", certificates: "Material certificate; hyperbaric test", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-22", estimatedReadyDate: "2027-02-05", assessment: "Engineering review", outstandingCheck: "375 mm required versus 400 mm candidate" },
  { id: "QR-0015", inventoryId: "INV-0015", lotOrSerial: "LOT-JTS-2501-B", certificates: "Material certificate; hyperbaric test", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Complete", preservationStatus: "Valid", lastReview: "2026-08-24", estimatedReadyDate: "2027-02-05", assessment: "Available", outstandingCheck: "Allocation unresolved" },
  { id: "QR-0016", inventoryId: "INV-0016", lotOrSerial: "LOT-JTS-2204", certificates: "Material certificate", certificateStatus: "Complete", traceability: "Verified", inspectionStatus: "Failed", preservationStatus: "Valid", lastReview: "2026-08-18", estimatedReadyDate: null, assessment: "Not suitable", outstandingCheck: "190 mm cable OD outside required interface; pressure 2.5 bar below 3.0" },
]

export const CANDIDATE_MATCHES: CandidateMatch[] = [
  { id: "MATCH-0001", requirementId: "REQ-MER-2101", inventoryId: "INV-0001", matchBasis: "Exact material, voltage, conductor, cross-section and fibre count", candidateQty: 600, potentiallyUsableQty: 600, classification: "available-compliant", disposition: "use-inventory", approvedInventoryQty: 600, decisionStatus: "approved", actionOwner: "Senior Project SCM Manager", decisionTimestamp: "2026-08-25T10:00:00Z", reason: "Technical and quality evidence complete", sourceEvidence: "Inventory Balances INV-0001; Quality QR-0001" },
  { id: "MATCH-0002", requirementId: "REQ-MER-2101", inventoryId: "INV-0002", matchBasis: "Exact material and specification; firm reservation", candidateQty: 800, potentiallyUsableQty: 0, classification: "available-reserved", disposition: "retain-full-quantity", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "NorthBank Project Director", decisionTimestamp: "2026-08-25T10:05:00Z", reason: "Reserved as repair contingency", sourceEvidence: "Reservation RES-0001; Quality QR-0002" },
  { id: "MATCH-0003", requirementId: "REQ-MER-2101", inventoryId: "INV-0003", matchBasis: "Same voltage and dimensions; aluminium instead of requested copper", candidateQty: 450, potentiallyUsableQty: 450, classification: "potential-substitute", disposition: "request-validation", approvedInventoryQty: 0, decisionStatus: "validation-pending", actionOwner: "Cable Engineering Lead", decisionTimestamp: "2026-08-25T10:06:00Z", reason: "Confirm electrical-loss and termination compatibility", sourceEvidence: "Material Master; Quality QR-0003" },
  { id: "MATCH-0004", requirementId: "REQ-MER-2101", inventoryId: "INV-0004", matchBasis: "Similar description but voltage, fibre count and condition fail", candidateQty: 900, potentiallyUsableQty: 0, classification: "not-suitable", disposition: "reject-match", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Senior Project SCM Manager", decisionTimestamp: "2026-08-25T10:07:00Z", reason: "33 kV is below 66 kV requirement; damaged cable end", sourceEvidence: "Quality QR-0004" },
  { id: "MATCH-0005", requirementId: "REQ-MER-2102", inventoryId: "INV-0005", matchBasis: "Exact project material and geometry; final inspection pending", candidateQty: 1, potentiallyUsableQty: 1, classification: "available-not-ready", disposition: "retain-full-quantity", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Structural QA Lead", decisionTimestamp: "2026-08-25T10:10:00Z", reason: "Certification incomplete", sourceEvidence: "Quality QR-0005" },
  { id: "MATCH-0006", requirementId: "REQ-MER-2102", inventoryId: "INV-0006", matchBasis: "Approved steel grade and standard; geometry differs and stock is reserved", candidateQty: 1, potentiallyUsableQty: 0, classification: "potential-substitute", disposition: "retain-full-quantity", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Structural Engineering Lead", decisionTimestamp: "2026-08-25T10:11:00Z", reason: "Committed to another project", sourceEvidence: "Reservation RES-0002; Quality QR-0006" },
  { id: "MATCH-0007", requirementId: "REQ-MER-2103", inventoryId: "INV-0007", matchBasis: "Exact SWL, hook, sheave and standards; load test expired", candidateQty: 1, potentiallyUsableQty: 1, classification: "available-not-ready", disposition: "request-validation", approvedInventoryQty: 0, decisionStatus: "validation-pending", actionOwner: "Vessel & Marine Assurance Lead", decisionTimestamp: "2026-08-25T10:15:00Z", reason: "Recertification readiness forecast 15 November 2026", sourceEvidence: "Quality QR-0007" },
  { id: "MATCH-0008", requirementId: "REQ-MER-2103", inventoryId: "INV-0008", matchBasis: "Hook block family match but SWL below requirement", candidateQty: 1, potentiallyUsableQty: 0, classification: "not-suitable", disposition: "reject-match", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Senior Project SCM Manager", decisionTimestamp: "2026-08-25T10:16:00Z", reason: "2500 t SWL fails 3000 t requirement", sourceEvidence: "Quality QR-0008" },
  { id: "MATCH-0009", requirementId: "REQ-MER-2104", inventoryId: "INV-0009", matchBasis: "Exact material, weight, capacity and standard; release evidence incomplete", candidateQty: 80, potentiallyUsableQty: 80, classification: "available-not-ready", disposition: "retain-full-quantity", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Cathodic Protection QA Lead", decisionTimestamp: "2026-08-25T10:20:00Z", reason: "Certification incomplete", sourceEvidence: "Quality QR-0009" },
  { id: "MATCH-0010", requirementId: "REQ-MER-2104", inventoryId: "INV-0010", matchBasis: "Exact technical match but allocated to another project", candidateQty: 40, potentiallyUsableQty: 0, classification: "available-reserved", disposition: "request-validation", approvedInventoryQty: 0, decisionStatus: "validation-pending", actionOwner: "Skagen Package Manager", decisionTimestamp: "2026-08-25T10:21:00Z", reason: "Confirm whether 40 units can transfer", sourceEvidence: "Reservation RES-0003; Quality QR-0010" },
  { id: "MATCH-0011", requirementId: "REQ-MER-2104", inventoryId: "INV-0011", matchBasis: "Same alloy and standard; 200 kg rather than 225 kg design basis", candidateQty: 60, potentiallyUsableQty: 60, classification: "potential-substitute", disposition: "reject-match", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Cathodic Protection Engineer", decisionTimestamp: "2026-08-25T10:22:00Z", reason: "Technical mismatch", sourceEvidence: "Quality QR-0011" },
  { id: "MATCH-0012", requirementId: "REQ-MER-2104", inventoryId: "INV-0012", matchBasis: "Material family match; electrochemical capacity and utilization fail", candidateQty: 100, potentiallyUsableQty: 0, classification: "not-suitable", disposition: "reject-match", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Senior Project SCM Manager", decisionTimestamp: "2026-08-25T10:23:00Z", reason: "2300 Ah/kg and 0.75 fail specification", sourceEvidence: "Quality QR-0012" },
  { id: "MATCH-0013", requirementId: "REQ-MER-2105", inventoryId: "INV-0013", matchBasis: "Exact dimensions, materials, pressure and installation method", candidateQty: 18, potentiallyUsableQty: 18, classification: "available-not-ready", disposition: "retain-full-quantity", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Subsea Quality Lead", decisionTimestamp: "2026-08-25T10:30:00Z", reason: "Certification incomplete", sourceEvidence: "Quality QR-0013" },
  { id: "MATCH-0014", requirementId: "REQ-MER-2105", inventoryId: "INV-0014", matchBasis: "Cable interface matches; J-tube ID differs by 25 mm", candidateQty: 12, potentiallyUsableQty: 12, classification: "potential-substitute", disposition: "reject-match", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Subsea Engineering Lead", decisionTimestamp: "2026-08-25T10:31:00Z", reason: "Technical mismatch", sourceEvidence: "Quality QR-0014" },
  { id: "MATCH-0015", requirementId: "REQ-MER-2105", inventoryId: "INV-0015", matchBasis: "Exact technical match but allocated to another project", candidateQty: 8, potentiallyUsableQty: 0, classification: "available-reserved", disposition: "retain-full-quantity", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Skagen Package Manager", decisionTimestamp: "2026-08-25T10:32:00Z", reason: "Committed to another project", sourceEvidence: "Reservation RES-0004; Quality QR-0015" },
  { id: "MATCH-0016", requirementId: "REQ-MER-2105", inventoryId: "INV-0016", matchBasis: "Seal family match; cable OD and pressure rating fail", candidateQty: 10, potentiallyUsableQty: 0, classification: "not-suitable", disposition: "reject-match", approvedInventoryQty: 0, decisionStatus: "closed", actionOwner: "Senior Project SCM Manager", decisionTimestamp: "2026-08-25T10:33:00Z", reason: "190 mm OD and 2.5 bar fail requirement", sourceEvidence: "Quality QR-0016" },
]

/** Open Action Centre cards for the demo: ACT-0001 (PKG-2101), ACT-0004 (PKG-2103), ACT-0006 (PKG-2104). */
export const VALIDATION_ACTIONS: ValidationAction[] = [
  { id: "ACT-0001", requirementId: "REQ-MER-2101", matchId: "MATCH-0003", actionType: "Potential substitute", question: "Confirm electrical-loss and termination compatibility", owner: "Cable Engineering Lead", dueDate: "2026-08-28", status: "Open", workflow: "Demand Validation", supportingEvidence: "Material Master; Quality QR-0003" },
  { id: "ACT-0002", requirementId: "REQ-MER-2102", matchId: "MATCH-0005", actionType: "Available but not ready", question: "Complete flange survey by 20 April 2027", owner: "Structural QA Lead", dueDate: "2026-08-29", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Quality QR-0005" },
  { id: "ACT-0003", requirementId: "REQ-MER-2102", matchId: "MATCH-0006", actionType: "Potential substitute", question: "Geometry and project-transfer decisions required", owner: "Structural Engineering Lead", dueDate: "2026-08-29", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Reservation RES-0002; Quality QR-0006" },
  { id: "ACT-0004", requirementId: "REQ-MER-2103", matchId: "MATCH-0007", actionType: "Available but not ready", question: "Recertification readiness forecast 15 November 2026", owner: "Vessel & Marine Assurance Lead", dueDate: "2026-08-27", status: "Open", workflow: "Demand Validation", supportingEvidence: "Quality QR-0007" },
  { id: "ACT-0005", requirementId: "REQ-MER-2104", matchId: "MATCH-0009", actionType: "Available but not ready", question: "Obtain signed batch release", owner: "Cathodic Protection QA Lead", dueDate: "2026-08-28", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Quality QR-0009" },
  { id: "ACT-0006", requirementId: "REQ-MER-2104", matchId: "MATCH-0010", actionType: "Available but reserved", question: "Confirm whether 40 units can transfer", owner: "Skagen Package Manager", dueDate: "2026-08-28", status: "Open", workflow: "Demand Validation", supportingEvidence: "Reservation RES-0003; Quality QR-0010" },
  { id: "ACT-0007", requirementId: "REQ-MER-2104", matchId: "MATCH-0011", actionType: "Potential substitute", question: "Recalculate CP design life and quantity", owner: "Cathodic Protection Engineer", dueDate: "2026-08-27", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Quality QR-0011" },
  { id: "ACT-0008", requirementId: "REQ-MER-2105", matchId: "MATCH-0013", actionType: "Available but not ready", question: "Review certificates and preservation records", owner: "Subsea Quality Lead", dueDate: "2026-08-28", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Quality QR-0013" },
  { id: "ACT-0009", requirementId: "REQ-MER-2105", matchId: "MATCH-0014", actionType: "Potential substitute", question: "Confirm adaptor and centralizer compatibility", owner: "Subsea Engineering Lead", dueDate: "2026-08-28", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Quality QR-0014" },
  { id: "ACT-0010", requirementId: "REQ-MER-2105", matchId: "MATCH-0015", actionType: "Available but reserved", question: "Confirm project release", owner: "Skagen Package Manager", dueDate: "2026-08-27", status: "Complete", workflow: "Demand Validation", supportingEvidence: "Reservation RES-0004; Quality QR-0015" },
]

export const SEED_AUDIT_EVENTS: AuditEvent[] = [
  { id: "EVT-0001", requirementId: "REQ-MER-2101", eventType: "Requirement created", actor: "Daniel Hoffmann", timestamp: "2026-08-25T09:00:00Z", detail: "Requested quantity 5,000 m", source: "Requirement import" },
  { id: "EVT-0002", requirementId: "REQ-MER-2101", eventType: "Inventory search completed", actor: "Compass", timestamp: "2026-08-25T09:00:00Z", detail: "4 candidates returned", source: "Inventory, material master, reservations, receipts and quality records" },
  { id: "EVT-0003", requirementId: "REQ-MER-2101", eventType: "Inventory use approved", actor: "Daniel Hoffmann", timestamp: "2026-08-25T10:00:00Z", detail: "600 m from INV-0001; proposed residual 4,400 m", source: "MATCH-0001" },
  { id: "EVT-0004", requirementId: "REQ-MER-2105", eventType: "Requirement created", actor: "Daniel Hoffmann", timestamp: "2026-08-25T09:04:00Z", detail: "Requested quantity 60 units", source: "Requirement import" },
  { id: "EVT-0005", requirementId: "REQ-MER-2105", eventType: "Inventory search completed", actor: "Compass", timestamp: "2026-08-25T09:04:00Z", detail: "4 candidates returned", source: "Inventory, material master, reservations, receipts and quality records" },
  { id: "EVT-0006", requirementId: "REQ-MER-2105", eventType: "Quality validation requested", actor: "Daniel Hoffmann", timestamp: "2026-08-25T10:30:00Z", detail: "18 exact units require certificate and preservation review", source: "MATCH-0013 / ACT-0008" },
]

export function requirementById(id: string): ProcurementRequirement | undefined {
  return REQUIREMENTS.find(r => r.id === id)
}

export function requirementByPackageId(packageId: string): ProcurementRequirement | undefined {
  return REQUIREMENTS.find(r => r.packageId === packageId)
}

export function inventoryById(id: string): InventoryBalance | undefined {
  return INVENTORY_BALANCES.find(r => r.id === id)
}

export function qualityByInventoryId(inventoryId: string): QualityRecord | undefined {
  return QUALITY_RECORDS.find(r => r.inventoryId === inventoryId)
}

export function reservationByInventoryId(inventoryId: string): InventoryReservation | undefined {
  return RESERVATIONS.find(r => r.inventoryId === inventoryId)
}

export function materialByNumber(materialNumber: string): MaterialMasterRecord | undefined {
  return MATERIAL_MASTER.find(r => r.materialNumber === materialNumber)
}
