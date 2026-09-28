import { BID_RATES } from "./structured/bid-rates"

export type AwardScenario = {
  id: string
  title: string
  costEur: number
  service: string
  capacity: string
  concentration: string
  history: string
  transitionRisk: string
  sustainability: string
  assumptions: string
  exceptions: string
  why: string
  whyNot: string
  suppliers: { supplierId: string; share: number; valueEur: number; laneIds: string[] }[]
  de: {
    title: string
    service: string
    capacity: string
    concentration: string
    history: string
    transitionRisk: string
    sustainability: string
    assumptions: string
    exceptions: string
    why: string
    whyNot: string
  }
}

const ALL_LANES = Array.from({ length: 18 }, (_, i) => `LN-${String(i + 1).padStart(3, "0")}`)

/** Lanes whose own confirmed annual costs split 65% AlpineLink / 35% NorthBridge. */
const DUAL_ALPINE = ["LN-001", "LN-003", "LN-005", "LN-006", "LN-010", "LN-011", "LN-012", "LN-013", "LN-014", "LN-015", "LN-017", "LN-018"]
const DUAL_NORTH = ["LN-002", "LN-004", "LN-007", "LN-008", "LN-009", "LN-016"]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function laneSum(supplierId: string, laneIds: string[]): number {
  const wanted = new Set(laneIds)
  return round2(
    BID_RATES
      .filter((row) => row.supplierId === supplierId && row.laneId && wanted.has(row.laneId) && row.annualForecastCostEur != null)
      .reduce((sum, row) => sum + (row.annualForecastCostEur ?? 0), 0),
  )
}

const alpineSingle = laneSum("SUP-004", ALL_LANES)
const rheinSingle = laneSum("SUP-001", ALL_LANES)
const alpineDual = laneSum("SUP-004", DUAL_ALPINE)
const northDual = laneSum("SUP-002", DUAL_NORTH)
const dualTotal = round2(alpineDual + northDual)

export const AWARD_SCENARIOS: AwardScenario[] = [
  {
    id: "AWD-01",
    title: "Single award — AlpineLink",
    costEur: alpineSingle,
    service: "SLA met on paper; no execution history",
    capacity: "Full 18-lane cover offered",
    concentration: "100% with one new carrier",
    history: "No History — not scored as zero",
    transitionRisk: "High — full transition from RheinRoute",
    sustainability: "Bid sustainability score 91",
    assumptions: "Fuel surcharge follows SRC-005. Forecast volume 2,448 is a decision input, not a commitment. Cost is the confirmed AlpineLink lane-rate total.",
    exceptions: "No incumbent continuity.",
    why: "Lowest quoted cost among compliant single-award options.",
    whyNot: "Not preferred: full concentration and no verified history increase transition risk.",
    suppliers: [{ supplierId: "SUP-004", share: 1, valueEur: alpineSingle, laneIds: ALL_LANES }],
    de: {
      title: "Alleinvergabe — AlpineLink",
      service: "SLA auf dem Papier erfüllt; keine Ausführungshistorie",
      capacity: "Volle Abdeckung von 18 Relationen angeboten",
      concentration: "100 % bei einem neuen Carrier",
      history: "No History — nicht als Null gewertet",
      transitionRisk: "Hoch — vollständiger Übergang von RheinRoute",
      sustainability: "Nachhaltigkeitsscore des Angebots 91",
      assumptions: "Der Kraftstoffzuschlag folgt SRC-005. Die Prognose von 2.448 Sendungen ist eine Entscheidungsgröße, keine Abnahmeverpflichtung. Die Kosten sind die bestätigte AlpineLink-Relationensumme.",
      exceptions: "Keine Kontinuität beim bisherigen Carrier.",
      why: "Niedrigste angebotene Kosten unter den konformen Alleinvergaben.",
      whyNot: "Nicht bevorzugt: volle Konzentration und fehlende geprüfte Historie erhöhen das Übergangsrisiko.",
    },
  },
  {
    id: "AWD-02",
    title: "Dual award — AlpineLink 65% / NorthBridge 35%",
    costEur: dualTotal,
    service: "Both pass SLA gates",
    capacity: "12 lanes AlpineLink, 6 lanes NorthBridge",
    concentration: "65 / 35 by confirmed annual lane cost",
    history: "AlpineLink remains No History. NorthBridge uses the August 2026 Vendor 360 score. Neither is a zero.",
    transitionRisk: "Moderate — two mobilisation plans",
    sustainability: "AlpineLink 91 on 12 lanes; NorthBridge 83 on 6 lanes",
    assumptions: "Each awarded lane keeps that carrier's confirmed annual forecast cost. History is not a penalty.",
    exceptions: "Veloce remains excluded pending EUR 5 million cargo insurance.",
    why: "Balances cost, capacity and concentration without treating No History as a zero score.",
    whyNot: "Preferred recommendation.",
    suppliers: [
      { supplierId: "SUP-004", share: 0.65, valueEur: alpineDual, laneIds: DUAL_ALPINE },
      { supplierId: "SUP-002", share: 0.35, valueEur: northDual, laneIds: DUAL_NORTH },
    ],
    de: {
      title: "Geteilte Vergabe — AlpineLink 65 % / NorthBridge 35 %",
      service: "Beide bestehen die SLA-Tore",
      capacity: "12 Relationen AlpineLink, 6 Relationen NorthBridge",
      concentration: "65 / 35 nach bestätigten Jahreskosten der Relationen",
      history: "AlpineLink bleibt No History. NorthBridge nutzt den Vendor-360-Score vom August 2026. Keiner ist eine Null.",
      transitionRisk: "Mittel — zwei Mobilisierungspläne",
      sustainability: "AlpineLink 91 auf 12 Relationen; NorthBridge 83 auf 6 Relationen",
      assumptions: "Jede vergebene Relation behält die bestätigten Jahresprognosekosten dieses Carriers. Historie ist kein Abzug.",
      exceptions: "Veloce bleibt ausgeschlossen, bis eine Frachtversicherung von 5 Mio. € vorliegt.",
      why: "Gleicht Kosten, Kapazität und Konzentration aus, ohne No History als Null zu werten.",
      whyNot: "Bevorzugte Empfehlung.",
    },
  },
  {
    id: "AWD-03",
    title: "Incumbent retain — RheinRoute",
    costEur: rheinSingle,
    service: "Verified OTD below the 98% target",
    capacity: "Known network, weaker recent execution",
    concentration: "100% incumbent",
    history: "August 2026 Vendor 360 score available and visible",
    transitionRisk: "Low",
    sustainability: "Bid sustainability score 78",
    assumptions: "Uses confirmed rate card version 2. Cost is the confirmed RheinRoute lane-rate total.",
    exceptions: "Performance exception remains open.",
    why: "Lowest transition risk.",
    whyNot: "Not preferred: higher cost than AlpineLink and an open performance exception.",
    suppliers: [{ supplierId: "SUP-001", share: 1, valueEur: rheinSingle, laneIds: ALL_LANES }],
    de: {
      title: "Verbleib beim bisherigen Carrier — RheinRoute",
      service: "Geprüfte Pünktlichkeit unter dem Ziel von 98 %",
      capacity: "Bekanntes Netz, schwächere jüngere Ausführung",
      concentration: "100 % beim bisherigen Carrier",
      history: "Vendor-360-Score vom August 2026 verfügbar und sichtbar",
      transitionRisk: "Niedrig",
      sustainability: "Nachhaltigkeitsscore des Angebots 78",
      assumptions: "Verwendet die bestätigte Ratekarte Version 2. Die Kosten sind die bestätigte RheinRoute-Relationensumme.",
      exceptions: "Die Leistungsabweichung bleibt offen.",
      why: "Geringstes Übergangsrisiko.",
      whyNot: "Nicht bevorzugt: höhere Kosten als AlpineLink und eine offene Leistungsabweichung.",
    },
  },
]

export function scenarioById(id: string): AwardScenario {
  return AWARD_SCENARIOS.find((s) => s.id === id) ?? AWARD_SCENARIOS[1]
}

export function scenarioText(scenario: AwardScenario, locale: "en" | "de") {
  if (locale === "en") {
    return {
      title: scenario.title,
      service: scenario.service,
      capacity: scenario.capacity,
      concentration: scenario.concentration,
      history: scenario.history,
      transitionRisk: scenario.transitionRisk,
      sustainability: scenario.sustainability,
      assumptions: scenario.assumptions,
      exceptions: scenario.exceptions,
      why: scenario.why,
      whyNot: scenario.whyNot,
    }
  }
  return scenario.de
}
