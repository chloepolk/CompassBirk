/** structured — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (Suppliers). Do not import xlsx at runtime. */

export type Suppliers = {
  supplierId: string | null
  supplierName: string | null
  country: string | null
  status: string | null
  relationshipStart: string | null
  services: string | null
  approved: string | null
  annualSpendEur: number | null
  historyStatus: string | null
  contactName: string | null
  contactEmail: string | null
}

export const SUPPLIERS: Suppliers[] = [
  {
    supplierId: "SUP-001",
    supplierName: "RheinRoute Logistics GmbH",
    country: "Germany",
    status: "Incumbent",
    relationshipStart: "2021-10-01",
    services: "FTL; LTL; cross-border road freight",
    approved: "Yes",
    annualSpendEur: 2380000,
    historyStatus: "Available",
    contactName: "Lena Vogt",
    contactEmail: "lena.vogt@rheinroute.example",
  },
  {
    supplierId: "SUP-002",
    supplierName: "NorthBridge Freight Ltd",
    country: "United Kingdom",
    status: "Incumbent",
    relationshipStart: "2022-04-01",
    services: "FTL; LTL; UK/EU road freight",
    approved: "Yes",
    annualSpendEur: 1540000,
    historyStatus: "Available",
    contactName: "Daniel Foster",
    contactEmail: "daniel.foster@northbridge.example",
  },
  {
    supplierId: "SUP-003",
    supplierName: "EuroSpan Transport SAS",
    country: "France",
    status: "Incumbent",
    relationshipStart: "2023-01-01",
    services: "FTL; LTL; Western Europe",
    approved: "Yes",
    annualSpendEur: 970000,
    historyStatus: "Available",
    contactName: "Camille Laurent",
    contactEmail: "camille.laurent@eurospan.example",
  },
  {
    supplierId: "SUP-004",
    supplierName: "AlpineLink Cargo AG",
    country: "Switzerland",
    status: "Challenger",
    relationshipStart: null,
    services: "FTL; LTL; Central Europe",
    approved: "Conditional",
    annualSpendEur: 0,
    historyStatus: "No History",
    contactName: "Sofia Keller",
    contactEmail: "sofia.keller@alpinelink.example",
  },
  {
    supplierId: "SUP-005",
    supplierName: "Veloce Transit S.r.l.",
    country: "Italy",
    status: "Challenger",
    relationshipStart: null,
    services: "FTL; LTL; Southern Europe",
    approved: "Due diligence",
    annualSpendEur: 0,
    historyStatus: "No History",
    contactName: "Marco Bianchi",
    contactEmail: "marco.bianchi@veloce.example",
  }
]
