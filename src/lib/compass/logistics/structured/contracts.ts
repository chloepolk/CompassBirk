/** structured — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (Contracts). Do not import xlsx at runtime. */

export type Contracts = {
  contractId: string | null
  supplierId: string | null
  contractTitle: string | null
  startDate: string | null
  endDate: string | null
  noticeDays: number | null
  contractValueEur: number | null
  otdTarget: number | null
  acceptanceTarget: number | null
  claimsTargetMax: number | null
  invoiceAccuracyTarget: number | null
  status: string | null
}

export const CONTRACTS: Contracts[] = [
  {
    contractId: "CON-2024-01",
    supplierId: "SUP-001",
    contractTitle: "European Road Freight Framework - Core Lanes",
    startDate: "2024-10-01",
    endDate: "2026-12-31",
    noticeDays: 120,
    contractValueEur: 4750000,
    otdTarget: 0.98,
    acceptanceTarget: 0.97,
    claimsTargetMax: 0.005,
    invoiceAccuracyTarget: 0.99,
    status: "Active",
  },
  {
    contractId: "CON-2024-02",
    supplierId: "SUP-002",
    contractTitle: "UK and Northern Europe Road Freight",
    startDate: "2024-10-01",
    endDate: "2026-12-31",
    noticeDays: 120,
    contractValueEur: 3080000,
    otdTarget: 0.975,
    acceptanceTarget: 0.965,
    claimsTargetMax: 0.006,
    invoiceAccuracyTarget: 0.99,
    status: "Active",
  },
  {
    contractId: "CON-2025-03",
    supplierId: "SUP-003",
    contractTitle: "Western Europe Overflow Freight",
    startDate: "2025-01-01",
    endDate: "2026-12-31",
    noticeDays: 90,
    contractValueEur: 1940000,
    otdTarget: 0.97,
    acceptanceTarget: 0.96,
    claimsTargetMax: 0.007,
    invoiceAccuracyTarget: 0.985,
    status: "Active",
  }
]
