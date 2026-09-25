export type AwardScenario = {
  id: string
  title: string
  costEur: number
  service: string
  capacity: string
  concentration: string
  history: string
  transitionRisk: string
  assumptions: string
  exceptions: string
  why: string
  whyNot: string
  suppliers: { supplierId: string; share: number; valueEur: number }[]
}

export const AWARD_SCENARIOS: AwardScenario[] = [
  {
    id: "AWD-01",
    title: "Single award — AlpineLink",
    costEur: 5_820_000,
    service: "SLA met on paper; no execution history",
    capacity: "Full 18-lane cover offered",
    concentration: "100% with one new carrier",
    history: "No History — not scored as zero",
    transitionRisk: "High — full transition from RheinRoute",
    assumptions: "Fuel surcharge follows SRC-005. Forecast volume 2,448 is a decision input, not a commitment.",
    exceptions: "No incumbent continuity.",
    why: "Lowest quoted cost among compliant single-award options.",
    whyNot: "Not preferred: full concentration and no verified history increase transition risk.",
    suppliers: [{ supplierId: "SUP-004", share: 1, valueEur: 5_820_000 }],
  },
  {
    id: "AWD-02",
    title: "Dual award — AlpineLink 65% / NorthBridge 35%",
    costEur: 5_650_000,
    service: "Both pass SLA gates",
    capacity: "Split cover across 18 lanes",
    concentration: "65 / 35",
    history: "Challengers remain No History; incumbent RheinRoute is not in this award",
    transitionRisk: "Moderate — two mobilisation plans",
    assumptions: "Rates are the confirmed current versions. History is not a penalty.",
    exceptions: "Veloce remains excluded pending EUR 5 million cargo insurance.",
    why: "Balances cost, capacity and concentration without treating No History as a zero score.",
    whyNot: "Preferred recommendation.",
    suppliers: [
      { supplierId: "SUP-004", share: 0.65, valueEur: 3_672_500 },
      { supplierId: "SUP-002", share: 0.35, valueEur: 1_977_500 },
    ],
  },
  {
    id: "AWD-03",
    title: "Incumbent retain — RheinRoute",
    costEur: 6_040_000,
    service: "Verified OTD below the 98% target",
    capacity: "Known network, weaker recent execution",
    concentration: "100% incumbent",
    history: "Twelve-month score available and visible",
    transitionRisk: "Low",
    assumptions: "Uses confirmed rate card v2.",
    exceptions: "Performance exception remains open.",
    why: "Lowest transition risk.",
    whyNot: "Not preferred: higher cost and an open performance exception.",
    suppliers: [{ supplierId: "SUP-001", share: 1, valueEur: 6_040_000 }],
  },
]

export function scenarioById(id: string): AwardScenario {
  return AWARD_SCENARIOS.find((s) => s.id === id) ?? AWARD_SCENARIOS[1]
}
