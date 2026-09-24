export type ExpansionStrategy = "expand" | "defend" | "harvest"

export type StrategyScorecard = Record<string, number>

export type MarketSignal = { source: string; metric: string; value: string }

export interface ExpansionAction {
  action: string
  lever: "M&A" | "Sales" | "Pricing" | "Operations"
  rationale: string
  expectedImpact: string
  math?: string
  sources: ("BLS" | "Census" | "EIA" | "Internal")[]
  confidence: "high" | "medium" | "low"
}

export interface ExpansionPrescription {
  region: string
  regionName: string
  strategy: ExpansionStrategy
  strategyRationale: string
  compositeScore: number
  scorecard: StrategyScorecard
  currentFootprint: {
    customers: number
    jobs: number
    margin: number
    revenue: number
    tier: string
  }
  marketSignals: MarketSignal[]
  actions: ExpansionAction[]
}
