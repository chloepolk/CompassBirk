/* ------------------------------------------------------------------ */
/*  Agent context builders — Compass Logistics Procurement European road-freight OWF procurement          */
/*                                                                     */
/*  Serializes the tender register, controlled document repository,    */
/*  standards matrix and charter particulars into the payloads each    */
/*  agent receives. Signatures are kept stable for the store.          */
/* ------------------------------------------------------------------ */

import { formatEurFigure, usdToEur } from "@/lib/compass/locale-display"
import type { DrillState, OrchestratorOutput, SpecialistOutput } from "./_types"
import { TENDER_PACKAGES, CLOSED_PACKAGES, PROJECT, TODAY, tenderById } from "../data/_tenders"
import {
  COMPONENT_SPECS,
  DOCUMENTS,
  STANDARDS_MATRIX,
  BASELINE_STANDARDS,
  FAT_TRACEABILITY_CLAUSES,
  PROCUREMENT_CLAUSES,
  CATEGORY_LABELS,
} from "../data/_documents"
import { ALL_BIDS, bidsForPackage, packagesWithBids, type BidInput } from "../data/_bids"
import {
  evaluateBids,
  sortEvaluationForDisplay,
  PRICE_MAX,
  TECH_MAX,
  QA_MAX,
  LEGAL_MAX,
  GATE_LABELS,
  gateLabels,
  STANDARD_WARRANTY_MONTHS,
  WARRANTY_RISK_THRESHOLD_MONTHS,
  FAT_STANDARD_DAYS,
  FAT_DELAY_BLOCK_DAYS,
  FAT_DELAY_PENALTY,
  WARRANTY_SHORTFALL_PENALTY,
  type BidEvaluationResult,
} from "../data/_bid-scoring"
import type { Locale } from "../_i18n"
import { localizedTenderPackages } from "../_i18n/domain"

function eur(n: number): number {
  return Math.round(usdToEur(n))
}

/* ------------------------------------------------------------------ */
/*  Shared serializers                                                 */
/* ------------------------------------------------------------------ */

function serializePipeline() {
  return TENDER_PACKAGES.map(p => ({
    package: p.id,
    ref: p.packageRef,
    title: p.title,
    quantity: p.quantity,
    stage: p.stage,
    budgetEur: eur(p.budget),
    savingsTargetEur: eur(p.targetSavings),
    realisedSavingsEur: p.realisedSavings != null ? eur(p.realisedSavings) : null,
    tenderCostEur: eur(p.tenderCost),
    owner: p.ownerRole,
    bidders: p.bidders,
    submissionDeadline: p.submissionDeadline,
    openedAt: p.openedAt,
    risk: p.risk,
  }))
}

function serializeDocumentRegister() {
  return DOCUMENTS.map(d => ({
    docRef: d.docRef,
    title: d.title,
    category: CATEGORY_LABELS[d.category],
    revision: d.revision,
    effectiveDate: d.effectiveDate,
    summary: d.summary,
  }))
}

function serializeStandards() {
  return {
    offshoreMatrix: STANDARDS_MATRIX,
    baselineCertifications: BASELINE_STANDARDS,
    fatAndTraceability: FAT_TRACEABILITY_CLAUSES,
  }
}

function ledgerSummary() {
  const realised = CLOSED_PACKAGES.reduce((s, c) => s + c.realisedSavings, 0)
  const invested = CLOSED_PACKAGES.reduce((s, c) => s + c.cost, 0)
  return {
    closedPackages: CLOSED_PACKAGES.length,
    realisedSavingsEur: eur(realised),
    tenderCostsEur: eur(invested),
    blendedReturn: invested > 0 ? Math.round((realised / invested) * 10) / 10 : 0,
    entries: CLOSED_PACKAGES,
  }
}

/** Scoring methodology constants exposed to agents (must match _bid-scoring.ts). */
export function scoringModelSummary() {
  return {
    compositeMax: 100,
    weights: { price: PRICE_MAX, tech: TECH_MAX, qaHseq: QA_MAX, legal: LEGAL_MAX },
    hardGates: [
      "Cargo insurance of at least EUR 5 million",
      "Financial due diligence complete",
      "Data integration (API, EDI or agreed daily file)",
    ],
    priceFormula: `${PRICE_MAX} × (P_min / P_bid) among gate-passing bids only`,
    techRule: `Full compliance = ${TECH_MAX}; partial / unapproved material substitutions = 0–20`,
    qaRule: `ISO/materials traceability up to 10 + FAT/ITP notice alignment up to 10 (standard ${FAT_STANDARD_DAYS} days; −${FAT_DELAY_PENALTY} per each additional ${FAT_DELAY_BLOCK_DAYS} days)`,
    legalRule: `SRC-004 liability and insurance acceptance 10 + SRC-002 SLA acceptance 10; shortfall below the published SLA → −${WARRANTY_SHORTFALL_PENALTY} (floored at 0)`,
    commercialRiskFlag: `High commercial risk if warranty < ${WARRANTY_RISK_THRESHOLD_MONTHS} months (>25% cut from ${STANDARD_WARRANTY_MONTHS}-month standard) — flag only, not an extra point deduction`,
    deferred: "Operational deviation penalty P not applied in v1",
  }
}

function explainBidCalculation(bid: BidInput, result: BidEvaluationResult, pMin: number | null): string {
  if (result.gatingStatus === "Fail") {
    const fails = result.gateFailures.map((g) => GATE_LABELS[g]).join("; ")
    return `Disqualified — failed hard gate(s): ${fails}. No composite score.`
  }
  if (pMin == null || result.priceScore == null) return result.recommendation
  const priceStep = `Price ${result.priceScore} = ${PRICE_MAX} × (${eur(pMin).toLocaleString("en-GB")} / ${eur(bid.totalPrice).toLocaleString("en-GB")})`
  const techStep = `Tech ${result.techScore} (conformity input ${bid.techCompliancePts})`
  const qaStep = `QA/HSEQ ${result.qaScore} (traceability ${bid.isoTraceabilityPts}/10; FAT notice ${bid.fatNoticeDays} days vs ${FAT_STANDARD_DAYS}-day standard)`
  const legalStep = `Legal ${result.legalScore} (warranty ${bid.warrantyMonths} months vs ${STANDARD_WARRANTY_MONTHS}-month standard${bid.warrantyMonths < STANDARD_WARRANTY_MONTHS ? `; −${WARRANTY_SHORTFALL_PENALTY} shortfall applied` : ""})`
  const risk = result.highCommercialRisk ? "; HIGH COMMERCIAL RISK flag on warranty cut" : ""
  return `${priceStep}; ${techStep}; ${qaStep}; ${legalStep}; Composite ${result.compositeScore}; Rank #${result.finalRank}${risk}. ${result.recommendation}`
}

/** Full bid-evaluation payload for chat / specialists / orchestrator. */
export function buildBidEvaluationContext(locale: Locale = "en"): Record<string, unknown> {
  const model = scoringModelSummary()
  const localizedPackages = localizedTenderPackages(locale)
  const labels = gateLabels(locale)
  const packages = packagesWithBids().map((packageId) => {
    const pkg = localizedPackages.find((p) => p.id === packageId) ?? tenderById(packageId)
    const bids = bidsForPackage(packageId, locale)
    const results = sortEvaluationForDisplay(evaluateBids(bids, locale))
    const eligible = results.filter((r) => r.gatingStatus === "Pass")
    const pMin = eligible.length > 0 ? Math.min(...eligible.map((r) => r.totalPrice)) : null
    return {
      packageId,
      packageRef: pkg?.packageRef ?? null,
      title: pkg?.title ?? null,
      ittRef: bids[0]?.ittRef ?? null,
      stage: pkg?.stage ?? null,
      budgetEur: pkg?.budget != null ? eur(pkg.budget) : null,
      returnCount: bids.length,
      lowestEligiblePriceEur: pMin != null ? eur(pMin) : null,
      evaluations: results.map((r) => {
        const bid = bids.find((b) => b.id === r.bidId)!
        return {
          supplier: r.supplier,
          ittRef: bid.ittRef,
          totalPriceEur: eur(r.totalPrice),
          gatingStatus: r.gatingStatus,
          gateFailures: r.gateFailures.map((g) => labels[g]),
          priceScore: r.priceScore,
          techScore: r.techScore,
          qaScore: r.qaScore,
          legalScore: r.legalScore,
          compositeScore: r.compositeScore,
          finalRank: r.finalRank,
          highCommercialRisk: r.highCommercialRisk,
          warrantyMonths: r.warrantyMonths,
          fatNoticeDays: r.fatNoticeDays,
          hasResponsePdf: Boolean(r.pdfPath),
          calculation: explainBidCalculation(bid, r, pMin),
          insight: r.insight,
          recommendation: r.recommendation,
        }
      }),
    }
  })

  const packagesWithoutReturns = localizedPackages
    .filter((p) => p.stage !== "outcome_roi" && !packagesWithBids().includes(p.id))
    .map((p) => ({
      packageId: p.id,
      packageRef: p.packageRef,
      title: p.title,
      stage: p.stage,
      status:
        p.stage === "execute"
          ? (locale === "de" ? "ITT ausgegeben — tabellierte Rückläufe ausstehend" : "ITT issued — awaiting tabulated returns")
          : (locale === "de" ? "Noch nicht ausgegeben — keine Bewertung verfügbar" : "Not yet issued — no bid evaluation available"),
    }))

  return {
    workspaceTab: locale === "de" ? "Angebotsbewertung" : "Bid Evaluation",
    scoringModel: model,
    packagesWithScoredReturns: packages,
    packagesWithoutReturns,
    totalReturnsTabulated: ALL_BIDS.length,
  }
}

function formatBidEvaluationBriefing(): string {
  const model = scoringModelSummary()
  const ctx = buildBidEvaluationContext()
  const packages = ctx.packagesWithScoredReturns as Array<{
    packageId: string
    packageRef: string | null
    title: string | null
    ittRef: string | null
    lowestEligiblePriceEur: number | null
    evaluations: Array<{
      supplier: string
      totalPriceEur: number
      gatingStatus: string
      gateFailures: string[]
      priceScore: number | null
      techScore: number | null
      qaScore: number | null
      legalScore: number | null
      compositeScore: number | null
      finalRank: number | null
      highCommercialRisk: boolean
      calculation: string
    }>
  }>

  const blocks = packages.map((p) => {
    const lines = p.evaluations.map((e) => {
      if (e.gatingStatus === "Fail") {
        return `  - ${e.supplier}: DISQUALIFIED (${e.gateFailures.join("; ")}); bid ${formatEurFigure(e.totalPriceEur)}. ${e.calculation}`
      }
      return `  - ${e.supplier}: Rank #${e.finalRank}, composite ${e.compositeScore}/100 (Price ${e.priceScore}/${PRICE_MAX}, Tech ${e.techScore}/${TECH_MAX}, QA ${e.qaScore}/${QA_MAX}, Legal ${e.legalScore}/${LEGAL_MAX}); bid ${formatEurFigure(e.totalPriceEur)}${e.highCommercialRisk ? "; HIGH COMMERCIAL RISK" : ""}. Calculation: ${e.calculation}`
    })
    return `${p.packageId} ${p.title} (${p.ittRef}): P_min eligible ${formatEurFigure(p.lowestEligiblePriceEur ?? 0)}\n${lines.join("\n")}`
  })

  const pending = (ctx.packagesWithoutReturns as Array<{ packageId: string; title: string; status: string }>)
    .map((p) => `- ${p.packageId} ${p.title}: ${p.status}`)
    .join("\n")

  return `BID EVALUATION SCORING MODEL (0–100):
- Hard gates before scoring: ${model.hardGates.join("; ")}. Fail any → disqualified, no composite.
- Weights: Price ${model.weights.price}, Tech ${model.weights.tech}, QA/HSEQ ${model.weights.qaHseq}, Legal ${model.weights.legal}.
- Price: ${model.priceFormula}.
- Tech: ${model.techRule}.
- QA/HSEQ: ${model.qaRule}.
- Legal: ${model.legalRule}.
- Risk flag: ${model.commercialRiskFlag}.
- ${model.deferred}.

SCORED RETURNS (${ctx.totalReturnsTabulated} tabulated across ${packages.length} ITTs):
${blocks.join("\n\n")}

PACKAGES WITHOUT TABULATED RETURNS:
${pending}`
}

/* ------------------------------------------------------------------ */
/*  Specialist contexts                                                */
/* ------------------------------------------------------------------ */

/** Procurement portfolio specialist: the pipeline itself — stages, deadlines, owners. */
export function buildPortfolioContext(drill: DrillState): Record<string, unknown> {
  return {
    programme: PROJECT,
    asOf: TODAY,
    view: drill.page,
    workspaceSurfaces: [
      "Action Centre — live tender pipeline and savings ledger",
      "Tender Management — ITT drafting from controlled documents",
      "Bid Evaluation — multi-ITT gated scoring of supplier returns",
    ],
    tenderPipeline: serializePipeline(),
    bidEvaluation: buildBidEvaluationContext(),
    savingsLedger: ledgerSummary(),
    processRules: {
      tenderWindowDays: 21,
      clarificationCutoffDays: 7,
      submissionChannel: "Compass Logistics Procurement SCM Portal — late submissions are not evaluated",
      approvalAuthority: "SCM Director approval required before ITT issue; deviations from SRC-004 need written SCM Director agreement",
    },
  }
}

/** Commercial specialist: budgets, savings economics, terms exposure. */
export function buildPricingContext(drill: DrillState): Record<string, unknown> {
  return {
    programme: PROJECT.name,
    asOf: TODAY,
    view: drill.page,
    packages: TENDER_PACKAGES.map(p => ({
      package: p.id,
      title: p.title,
      budgetEur: eur(p.budget),
      savingsTargetEur: eur(p.targetSavings),
      savingsTargetPct: Math.round((p.targetSavings / p.budget) * 1000) / 10,
      bidders: p.bidders,
      valueType: p.valueType,
      stage: p.stage,
    })),
    commercialTerms: PROCUREMENT_CLAUSES.filter(c => ["4.1", "6.2", "7.1", "7.2"].includes(c.ref)),
    awardEconomics: {
      event: "RFP-2026-001",
      estimatedValueEur: 5_650_000,
      term: "24 months from 1 January 2027",
      currency: "EUR",
    },
    savingsLedger: ledgerSummary(),
    bidEvaluation: buildBidEvaluationContext(),
  }
}

/** Supply market specialist: documents, standards and supplier-facing obligations. */
export function buildMarketContext(drill: DrillState): Record<string, unknown> {
  return {
    programme: PROJECT.name,
    asOf: TODAY,
    view: drill.page,
    documentRegister: serializeDocumentRegister(),
    standards: serializeStandards(),
    componentClasses: COMPONENT_SPECS.map(s => ({
      component: s.name,
      docRef: s.docRef,
      applicableStandards: s.applicableStandards,
    })),
    bidEvaluation: buildBidEvaluationContext(),
    supplierConstraints: [
      "RheinRoute is the incumbent with twelve months of verified execution (SUP-001).",
      "NorthBridge and EuroSpan bid as established challengers; AlpineLink and Veloce remain No History (SRC-008).",
      "Fuel surcharge is disclosed under SRC-005; lane rates stay in EUR.",
      "Lane capacity and OTD sit on the SLA path for the 2027 award.",
    ],
  }
}

/* ------------------------------------------------------------------ */
/*  Orchestrator context                                               */
/* ------------------------------------------------------------------ */

export function buildOrchestratorContext(
  _specialistOutputs: SpecialistOutput[],
  drill: DrillState,
  pageContext: string,
): Record<string, unknown> {
  return {
    programme: PROJECT,
    asOf: TODAY,
    view: { page: drill.page, description: pageContext },
    knowledgeBase: {
      procurementProcess: {
        gates: "Scoped → Specified → Approved → Issued → Awarded",
        tenderWindowDays: 21,
        clarificationCutoffDays: 7,
        approvalAuthority: "SCM Director approves ITT issue; deviations from SRC-004 need written agreement",
      },
      governingTerms: PROCUREMENT_CLAUSES.map(c => `§${c.ref} ${c.heading}: ${c.text}`),
      standardsMatrix: STANDARDS_MATRIX.map(s => `${s.authority} ${s.ref} — ${s.scope}`),
    },
    tenderPipeline: serializePipeline(),
    bidEvaluation: buildBidEvaluationContext(),
    savingsLedger: ledgerSummary(),
  }
}

/* ------------------------------------------------------------------ */
/*  Verifier context                                                   */
/* ------------------------------------------------------------------ */

export function buildVerifierContext(
  _orchestratorOutput: OrchestratorOutput,
  drill: DrillState,
): { sourceData: Record<string, unknown>; verifiableBenchmarks: Record<string, unknown> } {
  return {
    sourceData: {
      view: drill.page,
      asOf: TODAY,
      tenderPipeline: serializePipeline(),
      documentRegister: serializeDocumentRegister(),
      savingsLedger: ledgerSummary(),
      bidEvaluation: buildBidEvaluationContext(),
    },
    verifiableBenchmarks: {
      standardsMatrix: STANDARDS_MATRIX,
      baselineCertifications: BASELINE_STANDARDS,
      governingTerms: PROCUREMENT_CLAUSES,
      bidScoringModel: scoringModelSummary(),
      processRules: {
        tenderWindowDays: 21,
        clarificationCutoffDays: 7,
        submissionChannel: "SCM Portal",
      },
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Chat briefing                                                      */
/* ------------------------------------------------------------------ */

export function buildChatBriefing(): string {
  const pipeline = TENDER_PACKAGES.map(p =>
    `- ${p.id} ${p.title} (${p.quantity}): stage ${p.stage}, budget ${formatEurFigure(eur(p.budget))}, savings target ${formatEurFigure(eur(p.targetSavings))}, ${p.bidders} bidders, submissions close ${p.submissionDeadline}, owner ${p.ownerRole}.`,
  ).join("\n")

  const docs = DOCUMENTS.map(d => `- ${d.docRef} — ${d.title} (${d.revision})`).join("\n")

  const ledger = ledgerSummary()
  const bidEval = formatBidEvaluationBriefing()

  return `PROGRAMME: ${PROJECT.name} — ${PROJECT.scope}. Mobilisation port: ${PROJECT.mobilisationPort}. As of ${TODAY}.

WORKSPACE SURFACES:
- Action Centre: live tender pipeline, 5-gate flight path, owners, deadlines, savings ledger.
- Tender Management: draft ITTs from controlled documents (SRC-001 to SRC-008) with multi-agent assemble/audit.
- Bid Evaluation: multi-ITT portfolio of tabulated returns with hard gates + 100-point composite scoring (see BID EVALUATION below).

TENDER PIPELINE:
${pipeline}

SAVINGS LEDGER: ${ledger.closedPackages} packages awarded to date, ${formatEurFigure(ledger.realisedSavingsEur)} realised savings against ${formatEurFigure(ledger.tenderCostsEur)} of tender costs (${ledger.blendedReturn}× blended return).

CONTROLLED DOCUMENT REGISTER:
${docs}

SOURCE REGISTER: ${STANDARDS_MATRIX.map(s => `${s.ref} (${s.scope.split("—")[0].trim()})`).join("; ")}.

GOVERNING TERMS (SRC-004 / SRC-005): EUR lane rates; disclosed fuel surcharge; cargo liability of at least EUR 5 million; 60-day payment; English law with LCIA arbitration.

${bidEval}`
}
