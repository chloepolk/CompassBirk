/** Package split for the Compass Logistics Procurement synthetic dataset v1.2. */

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
