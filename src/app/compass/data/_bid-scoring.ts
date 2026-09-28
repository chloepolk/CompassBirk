/* ------------------------------------------------------------------ */
/*  Bid evaluation scoring — EVAL-LOG-v1 (0–100)                       */
/*                                                                     */
/*  Cost 35 · Service 20 · Capacity 15 · Implementation 10             */
/*  Sustainability 5 · Verified history 15                             */
/*  Hard gates run first. No History rescales the other weights.       */
/* ------------------------------------------------------------------ */

import type { BidInput } from "./_bids"
import type { Locale } from "../_i18n"
import { BIDS } from "@/lib/compass/logistics/structured/bids"
import { vendorProfile } from "@/lib/compass/logistics/vendor-model"

/** EVAL-LOG-v1 weights. Qualification gates are not part of the weighted score. */
export const PRICE_MAX = 35
export const TECH_MAX = 20
export const QA_MAX = 15
export const LEGAL_MAX = 10
export const SUSTAINABILITY_MAX = 5
export const HISTORY_MAX = 15
/** Non-history weights. A No History bid rescales these from 85 to 100. */
export const NON_HISTORY_SHARE = PRICE_MAX + TECH_MAX + QA_MAX + LEGAL_MAX + SUSTAINABILITY_MAX
export const CHALLENGER_SCALE = 100 / NON_HISTORY_SHARE

export const SUPPLIER_BY_BID: Record<string, string> = {
  "bid-rheinroute": "SUP-001",
  "bid-northbridge": "SUP-002",
  "bid-alpinelink": "SUP-004",
  "bid-veloce": "SUP-005",
}

export interface EvalCriterion {
  id: "cost" | "service" | "capacity" | "implementation" | "sustainability" | "history"
  weight: number
  nameEn: string
  nameDe: string
  noteEn: string
  noteDe: string
}

/** Same table on the method panel and the bid cards. */
export const EVAL_LOG_V1: EvalCriterion[] = [
  {
    id: "cost",
    weight: PRICE_MAX,
    nameEn: "Normalised cost",
    nameDe: "Normalisierte Kosten",
    noteEn: "Lowest compliant annual cost scores 100. Other compliant bids are indexed to it.",
    noteDe: "Die niedrigsten konformen Jahreskosten erhalten 100. Andere konforme Angebote werden dazu indexiert.",
  },
  {
    id: "service",
    weight: TECH_MAX,
    nameEn: "Service / SLA",
    nameDe: "Service / SLA",
    noteEn: "Bid service commitment, scored out of 100.",
    noteDe: "Servicezusage des Angebots, bewertet von 100.",
  },
  {
    id: "capacity",
    weight: QA_MAX,
    nameEn: "Capacity / coverage",
    nameDe: "Kapazität / Abdeckung",
    noteEn: "Bid capacity commitment, scored out of 100.",
    noteDe: "Kapazitätszusage des Angebots, bewertet von 100.",
  },
  {
    id: "implementation",
    weight: LEGAL_MAX,
    nameEn: "Implementation / visibility",
    nameDe: "Umsetzung / Sichtbarkeit",
    noteEn: "Bid implementation commitment, scored out of 100.",
    noteDe: "Umsetzungszusage des Angebots, bewertet von 100.",
  },
  {
    id: "sustainability",
    weight: SUSTAINABILITY_MAX,
    nameEn: "Sustainability",
    nameDe: "Nachhaltigkeit",
    noteEn: "Bid sustainability commitment, scored out of 100.",
    noteDe: "Nachhaltigkeitszusage des Angebots, bewertet von 100.",
  },
  {
    id: "history",
    weight: HISTORY_MAX,
    nameEn: "Verified vendor history",
    nameDe: "Geprüfte Lieferantenhistorie",
    noteEn: "Vendor 360 monthly score for incumbents only. No History is not zero: the other weights, which sum to 85, are rescaled to 100.",
    noteDe: "Vendor-360-Monatsscore nur für Incumbents. No History ist nicht null: die übrigen Gewichte, die 85 ergeben, werden auf 100 umbasiert.",
  },
]

export interface AppliedWeights {
  cost: number
  service: number
  capacity: number
  implementation: number
  sustainability: number
  history: number | null
}

export const STANDARD_WARRANTY_MONTHS = 24
/** Warranty below this after a >25% cut from standard → high commercial risk. */
export const WARRANTY_RISK_THRESHOLD_MONTHS = STANDARD_WARRANTY_MONTHS * 0.75 // 18

export const FAT_STANDARD_DAYS = 30
export const FAT_DELAY_BLOCK_DAYS = 15
export const FAT_DELAY_PENALTY = 5

export const ISO_TRACEABILITY_MAX = 10
export const FAT_ALIGNMENT_MAX = 10
export const KFK_LEGAL_PTS = 10
export const WARRANTY_LEGAL_PTS = 10
export const WARRANTY_SHORTFALL_PENALTY = 15

export type GateId = "iso9001" | "knockForKnock" | "ddpRotterdam"

export const GATE_LABELS: Record<GateId, string> = {
  iso9001: "Cargo insurance ≥ €5m",
  knockForKnock: "Financial due diligence",
  ddpRotterdam: "Data integration commitment",
}

const DE_GATE_LABELS: Record<GateId, string> = {
  iso9001: "Frachtversicherung ≥ 5 Mio. €",
  knockForKnock: "Finanzielle Due Diligence",
  ddpRotterdam: "Datenanbindung zugesagt",
}

export function gateLabels(locale: Locale): Record<GateId, string> {
  return locale === "de" ? DE_GATE_LABELS : GATE_LABELS
}

export type GatingStatus = "Pass" | "Fail" | "Evidence missing"

export interface BidEvaluationResult {
  bidId: string
  supplier: string
  pdfPath: string | null
  totalPrice: number
  gatingStatus: GatingStatus
  gateFailures: GateId[]
  priceScore: number | null
  techScore: number | null
  qaScore: number | null
  legalScore: number | null
  sustainabilityScore: number | null
  historyScore: number | null
  compositeScore: number | null
  finalRank: number | null
  highCommercialRisk: boolean
  historyLabel: "No History" | "Available"
  /** 1 for incumbents. 100/85 when No History rescales the other weights. */
  weightScale: number
  applied: AppliedWeights
  warrantyMonths: number
  fatNoticeDays: number
  insight: string
  recommendation: string
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function evaluateGates(bid: BidInput): GateId[] {
  const failures: GateId[] = []
  if (!bid.hasValidIso9001) failures.push("iso9001")
  if (!bid.acceptsKfk) failures.push("knockForKnock")
  if (!bid.acceptsDdpRotterdam) failures.push("ddpRotterdam")
  return failures
}

function asScore(value: string | number | null | undefined): number {
  return typeof value === "number" ? value : 0
}

function commitmentScores(bidId: string) {
  const supplierId = SUPPLIER_BY_BID[bidId]
  const row = BIDS.find((b) => b.eventId === "RFP-2026-001" && b.supplierId === supplierId)
  return {
    service: asScore(row?.serviceScore),
    capacity: asScore(row?.capacityScore),
    implementation: row?.implementationScore ?? 0,
    sustainability: row?.sustainabilityScore ?? 0,
  }
}

function historyFor(bidId: string, throughMonth: string): { label: "No History" | "Available"; index: number | null } {
  const supplierId = SUPPLIER_BY_BID[bidId]
  if (!supplierId) return { label: "No History", index: null }
  const profile = vendorProfile(supplierId, [], throughMonth)
  if (!profile || profile.historyStatus !== "Available" || profile.score?.total == null) {
    return { label: "No History", index: null }
  }
  return { label: "Available", index: profile.score.total }
}

function appliedMax(weight: number, scale: number): number {
  return round1(weight * scale)
}

function pointsFromIndex(index: number, max: number): number {
  return round1((max * index) / 100)
}

function buildRecommendation(
  bid: BidInput,
  result: Pick<
    BidEvaluationResult,
    "gatingStatus" | "gateFailures" | "compositeScore" | "finalRank" | "highCommercialRisk" | "priceScore"
  >,
  locale: Locale,
): string {
  const labelsForLocale = gateLabels(locale)
  if (result.gatingStatus === "Evidence missing") {
    if (locale === "de") return `Nachweis fehlt — nicht gerankt und nicht als bestandenes Angebot gewertet. ${bid.insight}`
    return `Evidence missing — not ranked and not treated as a compliant bid. ${bid.insight}`
  }
  if (result.gatingStatus === "Fail") {
    const labels = result.gateFailures.map((g) => labelsForLocale[g]).join("; ")
    if (locale === "de") {
      return `Disqualifiziert — Qualifikationstore nicht erfüllt: ${labels}. Nicht zur Zuschlagsempfehlung weiterleiten.`
    }
    return `Disqualified — failed hard gate(s): ${labels}. Do not progress to commercial award recommendation.`
  }
  if (result.highCommercialRisk) {
    if (locale === "de") {
      return `Rang ${result.finalRank}, Gesamtscore ${result.compositeScore}. Hohes kommerzielles Risiko: Gewährleistung um mehr als 25 % unter der Compass-Norm von 24 Monaten gekürzt. Einen besser platzierten konformen Bieter bevorzugen, sofern das Risiko nicht förmlich akzeptiert wird.`
    }
    return `Rank #${result.finalRank} with composite ${result.compositeScore}. High commercial risk: warranty reduced more than 25% below the 24-month Compass standard. Prefer a higher-ranked compliant bidder unless risk is formally accepted.`
  }
  if (result.finalRank === 1) {
    if (locale === "de") {
      return `Empfohlener Zuschlagskandidat — Rang 1, Gesamtwert ${result.compositeScore}. ${bid.insight}`
    }
    return `Recommended award candidate — Rank #1, composite ${result.compositeScore}. ${bid.insight}`
  }
  if (locale === "de") {
    return `Rang ${result.finalRank}, Gesamtwert ${result.compositeScore}. ${bid.insight}`
  }
  return `Rank #${result.finalRank}, composite ${result.compositeScore}. ${bid.insight}`
}

const NOMINAL_APPLIED: AppliedWeights = {
  cost: PRICE_MAX,
  service: TECH_MAX,
  capacity: QA_MAX,
  implementation: LEGAL_MAX,
  sustainability: SUSTAINABILITY_MAX,
  history: HISTORY_MAX,
}

/**
 * Evaluate a set of bids. Cost uses the lowest compliant annual price.
 * Verified history uses the Vendor 360 monthly score through `throughMonth`.
 * A No History bid is not scored as zero: the other weights are rescaled from 85 to 100.
 * Disqualified bids keep null scores and no rank.
 */
export function evaluateBids(
  bids: BidInput[],
  locale: Locale = "en",
  throughMonth = "2026-08",
): BidEvaluationResult[] {
  const gated = bids.map((bid) => {
    const gateFailures = evaluateGates(bid)
    const history = historyFor(bid.id, throughMonth)
    return { bid, gateFailures, history, pass: gateFailures.length === 0 }
  })

  const eligible = gated.filter((g) => g.pass)
  const pMin = eligible.length > 0 ? Math.min(...eligible.map((g) => g.bid.totalPrice)) : 0

  const scored = gated.map(({ bid, gateFailures, history, pass }) => {
    const blank: BidEvaluationResult = {
      bidId: bid.id,
      supplier: bid.supplier,
      pdfPath: bid.pdfPath,
      totalPrice: bid.totalPrice,
      gatingStatus: "Fail",
      gateFailures,
      priceScore: null,
      techScore: null,
      qaScore: null,
      legalScore: null,
      sustainabilityScore: null,
      historyScore: null,
      compositeScore: null,
      finalRank: null,
      highCommercialRisk: gateFailures.includes("iso9001"),
      historyLabel: history.label,
      weightScale: 1,
      applied: { ...NOMINAL_APPLIED, history: history.label === "Available" ? HISTORY_MAX : null },
      warrantyMonths: bid.warrantyMonths,
      fatNoticeDays: bid.fatNoticeDays,
      insight: bid.insight,
      recommendation: "",
    }
    if (!pass) {
      blank.recommendation = buildRecommendation(bid, blank, locale)
      return blank
    }

    const scale = history.index == null ? CHALLENGER_SCALE : 1
    const applied: AppliedWeights = {
      cost: appliedMax(PRICE_MAX, scale),
      service: appliedMax(TECH_MAX, scale),
      capacity: appliedMax(QA_MAX, scale),
      implementation: appliedMax(LEGAL_MAX, scale),
      sustainability: appliedMax(SUSTAINABILITY_MAX, scale),
      history: history.index == null ? null : HISTORY_MAX,
    }
    const commitments = commitmentScores(bid.id)
    const costIndex = pMin > 0 ? (100 * pMin) / bid.totalPrice : 0
    const priceScore = pointsFromIndex(costIndex, applied.cost)
    const techScore = pointsFromIndex(commitments.service, applied.service)
    const qaScore = pointsFromIndex(commitments.capacity, applied.capacity)
    const legalScore = pointsFromIndex(commitments.implementation, applied.implementation)
    const sustainabilityScore = pointsFromIndex(commitments.sustainability, applied.sustainability)
    const historyScore = history.index == null || applied.history == null
      ? null
      : pointsFromIndex(history.index, applied.history)
    const parts = [priceScore, techScore, qaScore, legalScore, sustainabilityScore]
    if (historyScore != null) parts.push(historyScore)
    const compositeScore = round1(parts.reduce((sum, part) => sum + part, 0))

    return {
      ...blank,
      gatingStatus: "Pass" as const,
      priceScore,
      techScore,
      qaScore,
      legalScore,
      sustainabilityScore,
      historyScore,
      compositeScore,
      highCommercialRisk: false,
      weightScale: scale,
      applied,
      recommendation: "",
    }
  })

  const ranked = scored
    .filter((r) => r.gatingStatus === "Pass" && r.compositeScore != null)
    .sort((a, b) => {
      const cs = (b.compositeScore ?? 0) - (a.compositeScore ?? 0)
      if (cs !== 0) return cs
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice
      return a.supplier.localeCompare(b.supplier)
    })

  ranked.forEach((r, i) => {
    r.finalRank = i + 1
  })

  return scored.map((r) => {
    const bid = bids.find((b) => b.id === r.bidId)!
    return {
      ...r,
      recommendation: buildRecommendation(bid, r, locale),
    }
  })
}

/** Stable display order: ranked eligible first, then disqualified by supplier name. */
export function sortEvaluationForDisplay(results: BidEvaluationResult[]): BidEvaluationResult[] {
  return [...results].sort((a, b) => {
    if (a.finalRank != null && b.finalRank != null) return a.finalRank - b.finalRank
    if (a.finalRank != null) return -1
    if (b.finalRank != null) return 1
    return a.supplier.localeCompare(b.supplier)
  })
}

/*
 * Ranks are computed from the composite. They are not preset.
 * Veloce fails cargo insurance and stays unranked.
 * AlpineLink and Veloce stay No History; their other weights rescale from 85 to 100.
 */
