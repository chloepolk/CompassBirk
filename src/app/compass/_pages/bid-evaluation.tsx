"use client"

import { formatDateDMY } from "@/lib/compass/locale-display"
import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { localeTag, type Locale } from "../_i18n"
import { formatFixed } from "../_i18n/currency"
import { formatEurFigure } from "@/lib/compass/locale-display"
import { vendorProfile } from "@/lib/compass/logistics/vendor-model"
import { localizedTenderPackages } from "../_i18n/domain"
import { localizeQuantity } from "../_i18n/tender"
import { enterMotion, listItemMotion, pcmCard } from "../_components/motion"
import { WorkflowGuideBar } from "../_components/workflow-guide-bar"
import { type MissionStage } from "../_diamond/stages"
import { EVAL_PACKAGE_ID, bidsForPackage } from "../data/_bids"
import {
  evaluateBids,
  sortEvaluationForDisplay,
  PRICE_MAX,
  SUSTAINABILITY_MAX,
  TECH_MAX,
  QA_MAX,
  LEGAL_MAX,
  HISTORY_MAX,
  SUPPLIER_BY_BID,
  gateLabels,
  type BidEvaluationResult,
  type GateId,
} from "../data/_bid-scoring"
import {
  tenderById,
  PROJECT,
  type TenderPackage,
} from "../data/_tenders"
import { BidderNotifyModal } from "../_components/hub/bidder-notify-modal"
import { personForRole } from "../_diamond/org"
import { emailForPerson } from "../_components/hub/hub-types"
import { ACTIVE_USER } from "../_components/hub/active-user"
import { displayPackageQuantity } from "../data/_demand-validation"
import {
  awardGovernanceStatusFor,
  awardGovCopy,
  buildAwardSnapshot,
  type AwardApprovalSnapshot,
} from "@/lib/compass/award-governance"
import { AwardGovernanceChip, AwardRecommendPanel, AwardNotificationToast } from "@/lib/compass/award-approval-modal"
import { LaneSlaPanel, RateNormalisationPanel } from "../_components/lane-sla-panel"
import { LogisticsEvaluationPanel } from "./logistics-evaluation"
import { quarantinedBidEvidence } from "@/lib/compass/logistics/inbox-model"
import { invitesSent, rfpLifecycle } from "@/lib/compass/logistics/session"

type EvalStatus = "ready" | "awaiting_returns" | "not_issued" | "awarded"

const STATUS_KEYS: Record<EvalStatus, "bidEval.ready" | "bidEval.awaitingReturns" | "bidEval.notIssued" | "bidEval.awarded"> = {
  ready: "bidEval.ready",
  awaiting_returns: "bidEval.awaitingReturns",
  not_issued: "bidEval.notIssued",
  awarded: "bidEval.awarded",
}

const GATE_KEYS: Record<GateId, "bidEval.gateIso" | "bidEval.gateKfk" | "bidEval.gateDdp"> = {
  iso9001: "bidEval.gateIso",
  knockForKnock: "bidEval.gateKfk",
  ddpRotterdam: "bidEval.gateDdp",
}

const STATUS_CLS: Record<EvalStatus, string> = {
  ready: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]",
  awaiting_returns: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning-text)]",
  not_issued: "bg-[var(--color-tint-neutral)] text-[var(--color-text-muted)]",
  awarded: "bg-[var(--color-tint-neutral)] text-[var(--color-text-secondary)]",
}

function formatPriceFull(n: number, locale: Locale): string {
  return formatEurFigure(n, locale === "de" ? "de" : "en")
}

function historyText(bidId: string, label: "No History" | "Available", locale: Locale, asOf: string): string {
  if (label === "No History") return locale === "de" ? "Keine Historie" : "No History"
  const latest = vendorProfile(SUPPLIER_BY_BID[bidId] ?? "", [], asOf)?.latest
  if (latest?.overallScore == null) return locale === "de" ? "Verfügbar" : "Available"
  const period = latest.month?.slice(0, 7) ?? asOf
  return `${formatFixed(latest.overallScore, locale)} · ${period} · v1.2`
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string
  value: number | null
  max: number
}) {
  const { locale } = useStore()
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="tabular-nums font-medium text-[var(--color-text-primary)]">
          {value == null ? "—" : `${formatFixed(value, locale)} / ${formatFixed(max, locale)}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand-primary)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function GateChip({ id, passed }: { id: GateId; passed: boolean }) {
  const t = useT()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        passed
          ? "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]"
          : "bg-[var(--color-tint-critical)] text-[var(--color-accent-critical-text)]",
      )}
    >
      <SafeIcon name={passed ? "Check" : "X"} className="size-2.5" />
      {t(GATE_KEYS[id])}
    </span>
  )
}

function RankBadge({ rank, failed }: { rank: number | null; failed: boolean }) {
  if (failed) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint-critical)] text-[10px] font-semibold uppercase text-[var(--color-accent-critical-text)]">
        DQ
      </span>
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-inverse)] text-[15px] font-semibold tabular-nums text-[var(--color-text-inverse)]">
      #{rank}
    </span>
  )
}

function BidBaseballCard({
  result,
  selected,
  onSelect,
  index,
  locale,
}: {
  result: BidEvaluationResult
  selected: boolean
  onSelect: () => void
  index: number
  locale: Locale
}) {
  const t = useT()
  const motion = listItemMotion(index)
  const failed = result.gatingStatus !== "Pass"
  const allGates: GateId[] = ["iso9001", "knockForKnock", "ddpRotterdam"]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        pcmCard,
        motion.className,
        "w-full cursor-pointer rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-left",
        selected
          ? "ring-2 ring-[var(--color-text-secondary)]/40"
          : "hover:border-[var(--color-text-secondary)]/40",
      )}
      style={motion.style}
    >
      <div className="flex items-start gap-3 p-4">
        <RankBadge rank={result.finalRank} failed={failed} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {result.supplier}
              </h3>
              <p className="text-[12px] tabular-nums text-[var(--color-text-muted)]">
                {formatPriceFull(result.totalPrice, locale)}
                {result.compositeScore != null && (
                  <span className="ml-2 text-[var(--color-text-secondary)]">
                    · {t("bidEval.compositeLabel")} {formatFixed(result.compositeScore, locale)}
                  </span>
                )}
              </p>
              {!failed && result.historyLabel === "No History" && (
                <p className="text-[11px] text-[var(--color-text-muted)]">{t("bidEval.noHistoryScale")}</p>
              )}
            </div>
            {result.pdfPath && (
              <a
                href={result.pdfPath}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-default)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <SafeIcon name="FileText" className="size-3" />
                {t("bidEval.responsePdf")}
              </a>
            )}
          </div>

          {result.highCommercialRisk && (
            <div className="flex items-start gap-2 rounded-md bg-[var(--color-tint-warning)] px-2.5 py-2 text-[11px] text-[var(--color-accent-warning-text)]">
              <SafeIcon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0" />
              <span>{t("bidEval.riskBanner")}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {allGates.map((g) => (
              <GateChip key={g} id={g} passed={!result.gateFailures.includes(g)} />
            ))}
          </div>

          {!failed && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ScoreBar label={t("bidEval.price")} value={result.priceScore} max={result.applied.cost} />
              <ScoreBar label={t("bidEval.technical")} value={result.techScore} max={result.applied.service} />
              <ScoreBar label={t("bidEval.qaHseq")} value={result.qaScore} max={result.applied.capacity} />
              <ScoreBar label={t("bidEval.legal")} value={result.legalScore} max={result.applied.implementation} />
              <ScoreBar label={t("bidEval.sustainability")} value={result.sustainabilityScore} max={result.applied.sustainability} />
              {result.historyScore != null && result.applied.history != null && (
                <ScoreBar label={t("bidEval.history")} value={result.historyScore} max={result.applied.history} />
              )}
            </div>
          )}

          <div className="rounded-md bg-[var(--color-bg-subtle)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("bidEval.insightRecommendation")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {result.recommendation}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

function MatrixCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn("px-3 py-2.5 text-[12px] tabular-nums text-[var(--color-text-primary)]", className)}>
      {children}
    </td>
  )
}

interface PackageEvalRow {
  pkg: TenderPackage
  bidCount: number
  status: EvalStatus
  topScore: number | null
  topSupplier: string | null
  riskCount: number
  dqCount: number
}

function buildPackageRows(
  tenderStages: Record<string, MissionStage>,
  locale: Locale,
  bidsReleased: boolean,
  invitationsSent: boolean,
  throughMonth: string,
): PackageEvalRow[] {
  return localizedTenderPackages(locale)
    .filter((p) => p.id === EVAL_PACKAGE_ID)
    .map((pkg) => {
      const stage = tenderStages[pkg.id] ?? pkg.stage
      const effective = { ...pkg, stage }
      const bids = bidsReleased ? bidsForPackage(pkg.id, locale) : []
      const results = bids.length > 0 ? evaluateBids(bids, locale, throughMonth) : []
      const status: EvalStatus = bidsReleased && bids.length > 0
        ? "ready"
        : invitationsSent
          ? "awaiting_returns"
          : "not_issued"
      const ranked = results.filter((r) => r.finalRank != null)
      const top = ranked.find((r) => r.finalRank === 1) ?? null
      return {
        pkg: effective,
        bidCount: bids.length,
        status,
        topScore: top?.compositeScore ?? null,
        topSupplier: top?.supplier ?? null,
        riskCount: results.filter((r) => r.highCommercialRisk).length,
        dqCount: results.filter((r) => r.gatingStatus === "Fail").length,
      }
    })
    .sort((a, b) => {
      const order: Record<EvalStatus, number> = {
        ready: 0,
        awaiting_returns: 1,
        not_issued: 2,
        awarded: 3,
      }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.pkg.packageRef.localeCompare(b.pkg.packageRef)
    })
}

function EmptyPackageState({ title, copy, actionLabel, onAction }: { title: string; copy: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-6 py-16 text-center">
      <SafeIcon name="Inbox" className="mb-3 size-8 text-[var(--color-text-muted)]" />
      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
        {title}
      </p>
      {copy && (
        <p className="mt-1 max-w-md text-[12px] text-[var(--color-text-secondary)]">{copy}</p>
      )}
      <button
        type="button"
        onClick={onAction}
        className="mt-4 rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white"
      >
        {actionLabel}
      </button>
    </div>
  )
}

export function BidEvaluationPage() {
  const t = useT()
  const { focusEvalPackageId, tenderStages, openBidEvaluation, openTenderStudio, openInbox, locale, awardApprovals, submitAwardRecommendation, appliedTenderQtyByPackage, session } = useStore()
  const life = rfpLifecycle(session)
  const held = life.phase === "bids-ready" ? null : life.detail
  const invitationsSent = invitesSent(session)
  const rows = React.useMemo(
    () => buildPackageRows(tenderStages, locale, session.bidsReleased, invitationsSent, session.asOfMonth),
    [tenderStages, locale, session.bidsReleased, invitationsSent, session.asOfMonth],
  )
  const nextAction = life.action && life.phase !== "bids-ready"
    ? {
        label: locale === "de" ? life.action.label.de : life.action.label.en,
        run: () => {
          if (life.action?.id === "return-workspace") openTenderStudio(EVAL_PACKAGE_ID)
          else openInbox()
        },
      }
    : null

  const defaultId =
    focusEvalPackageId && rows.some((r) => r.pkg.id === focusEvalPackageId)
      ? focusEvalPackageId
      : rows.find((r) => r.status === "ready")?.pkg.id ??
        rows[0]?.pkg.id ??
        EVAL_PACKAGE_ID

  const [activePackageId, setActivePackageId] = React.useState(defaultId)

  React.useEffect(() => {
    if (focusEvalPackageId && rows.some((r) => r.pkg.id === focusEvalPackageId)) {
      setActivePackageId(focusEvalPackageId)
    }
  }, [focusEvalPackageId, rows])

  const activeRow = rows.find((r) => r.pkg.id === activePackageId) ?? rows[0]
  const pkg = activeRow?.pkg ?? tenderById(activePackageId)
  const bids = React.useMemo(() => {
    if (!activePackageId || !session.bidsReleased) return []
    const evidence: Record<string, string> = {
      "bid-alpinelink": "EML-007",
      "bid-rheinroute": "EML-008",
      "bid-veloce": "EML-009",
      "bid-northbridge": "EML-013",
    }
    return bidsForPackage(activePackageId, locale).filter((bid) => {
      const emailId = evidence[bid.id]
      if (!emailId) return false
      return session.emailClassifications[emailId] === "confirmed"
    })
  }, [activePackageId, locale, session.bidsReleased, session.emailClassifications])
  const results = React.useMemo(
    () => (bids.length > 0 ? sortEvaluationForDisplay(evaluateBids(bids, locale, session.asOfMonth)) : []),
    [bids, locale, session.asOfMonth],
  )
  const rankedResults = results.filter((row) => row.gatingStatus === "Pass" && row.finalRank != null)
  const failedResults = results.filter((row) => row.gatingStatus !== "Pass" || row.finalRank == null)

  const [notifyOpen, setNotifyOpen] = React.useState(false)
  const [recommendSnapshot, setRecommendSnapshot] = React.useState<AwardApprovalSnapshot | null>(null)
  const [toastName, setToastName] = React.useState<string | null>(null)
  const [selectedBidId, setSelectedBidId] = React.useState<string | null>(null)
  React.useEffect(() => {
    const top = results.find((r) => r.finalRank === 1) ?? results.find((r) => r.gatingStatus === "Pass")
    setSelectedBidId(top?.bidId ?? null)
  }, [results])

  const selectedResult = results.find((r) => r.bidId === selectedBidId) ?? null
  const awardRecord = pkg ? awardApprovals[pkg.id] : undefined
  const govCopy = awardGovCopy(locale)
  const govStatus = pkg ? awardGovernanceStatusFor(pkg.stage, awardRecord) : null
  const awardUnlocked = govStatus === "approved_for_award" || govStatus === "awarded" || pkg?.stage === "outcome_roi"
  const awardBlocked = false

  const recommendSelected = () => {
    if (!pkg || !selectedResult || selectedResult.gatingStatus !== "Pass") return
    if (awardRecord && awardRecord.status !== "procurement_review") return
    if (awardBlocked) return
    const approver = personForRole(pkg.sponsorRole, locale)
    const labels = gateLabels(locale)
    const snapshot = buildAwardSnapshot({
      packageId: pkg.id,
      packageRef: pkg.packageRef,
      packageTitle: pkg.title,
      projectName: PROJECT.name,
      ittRef,
      budgetUsd: pkg.budget,
      evidence: [
        ...pkg.evidence,
      ],
      selected: { ...selectedResult, gatingStatus: selectedResult.gatingStatus === "Pass" ? "Pass" : "Fail" },
      allResults: results.map((row) => ({ ...row, gatingStatus: row.gatingStatus === "Pass" ? "Pass" as const : "Fail" as const })),
      gateLabel: (id) => labels[id as GateId] ?? id,
      approver: {
        name: approver.name,
        role: approver.role,
        email: emailForPerson(approver.name),
      },
    })
    setRecommendSnapshot(snapshot)
  }

  const selectPackage = (id: string) => {
    setActivePackageId(id)
    openBidEvaluation(id)
  }

  const readyCount = rows.filter((r) => r.status === "ready").length
  const riskAcross = rows.reduce((s, r) => s + r.riskCount, 0)
  const returnsAcross = rows.reduce((s, r) => s + r.bidCount, 0)
  const pendingEvidence = invitesSent(session) && !session.bidsReleased
    ? quarantinedBidEvidence(session.emailClassifications)
    : []

  const weightChips = [
    { label: t("bidEval.price"), max: PRICE_MAX },
    { label: t("bidEval.tech"), max: TECH_MAX },
    { label: t("bidEval.qaHseq"), max: QA_MAX },
    { label: t("bidEval.legal"), max: LEGAL_MAX },
    { label: t("bidEval.sustainability"), max: SUSTAINABILITY_MAX },
    { label: t("bidEval.history"), max: HISTORY_MAX },
  ]

  const pageMotion = enterMotion(0)
  const ittRef = bids[0]?.ittRef ?? (pkg ? pkg.packageRef : "RFP-2026-001")

  return (
    <div className={cn("space-y-5", pageMotion.className)} style={pageMotion.style}>
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {t("bidEval.title")} · {PROJECT.shortName}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {t("bidEval.subtitle")}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-text-secondary)]">
              {t("bidEval.scoringExplain")} {t("bidEval.gatesVsWeights")}
            </p>
            <p className="mt-1 max-w-2xl text-[12px] text-[var(--color-text-muted)]">
              {t("bidEval.historyMethod")}
            </p>
            <p className="mt-2 text-[12px] font-medium text-[var(--color-text-primary)]">
              {locale === "de" ? life.identifier.de : life.identifier.en}
              {" · "}
              {locale === "de" ? life.status.de : life.status.en}
            </p>
            {pendingEvidence.length > 0 && (
              <p className="mt-2 text-[12px] text-[var(--color-accent-warning-text)]">
                {t("inbox.quarantineHint")} {pendingEvidence.join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-[12px]">
            <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 tabular-nums">
              <strong className="text-[var(--color-text-primary)]">{readyCount}</strong>{" "}
              <span className="text-[var(--color-text-muted)]">{t("bidEval.readyCount")}</span>
            </span>
            <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 tabular-nums">
              <strong className="text-[var(--color-text-primary)]">{pendingEvidence.length > 0 ? 0 : returnsAcross}</strong>{" "}
              <span className="text-[var(--color-text-muted)]">{pendingEvidence.length > 0 ? t("bidEval.eligible") : t("bidEval.returns")}</span>
            </span>
            <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 tabular-nums">
              <strong className="text-[var(--color-text-primary)]">{pendingEvidence.length > 0 ? pendingEvidence.length : riskAcross}</strong>{" "}
              <span className="text-[var(--color-text-muted)]">{pendingEvidence.length > 0 ? t("bidEval.awaitingReview") : t("bidEval.riskFlags")}</span>
            </span>
          </div>
        </div>
      </header>

      <WorkflowGuideBar page="bid-evaluation" />

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
        {/* ITT portfolio list */}
        <aside className={cn(pcmCard, "h-fit overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
          <div className="border-b border-[var(--color-border-default)] px-3 py-2.5">
            <h2 className="text-[12px] font-semibold text-[var(--color-text-primary)]">
              {t("bidEval.packages")}
            </h2>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {t("bidEval.issuedAndUpstream")}
            </p>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto p-1.5">
            {rows.map((row) => {
              const active = row.pkg.id === activePackageId
              return (
                <li key={row.pkg.id}>
                  <button
                    type="button"
                    onClick={() => selectPackage(row.pkg.id)}
                    className={cn(
                      "w-full rounded-[12px] px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[var(--color-tint-neutral)]"
                        : "hover:bg-[var(--color-bg-subtle)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                          {row.pkg.title}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                          STATUS_CLS[row.status],
                        )}
                      >
                        {t(STATUS_KEYS[row.status])}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--color-text-muted)]">
                      <span className="tabular-nums">{row.bidCount} {t("bidEval.returns")}</span>
                      {row.topScore != null && (
                        <span className="tabular-nums">
                          {t("bidEval.top")} {formatFixed(row.topScore, locale)}
                          {row.topSupplier ? ` · ${row.topSupplier}` : ""}
                        </span>
                      )}
                      {row.riskCount > 0 && (
                        <span className="text-[var(--color-accent-warning-text)]">
                          {row.riskCount} {t("bidEval.risk")}
                        </span>
                      )}
                      {row.dqCount > 0 && (
                        <span className="text-[var(--color-accent-critical-text)]">
                          {row.dqCount} DQ
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* Selected ITT detail */}
        <div className="min-w-0 space-y-4">
          {pkg && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                  {pkg.title}
                </h2>
                {govStatus && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AwardGovernanceChip status={govStatus} locale={locale} />
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      {govCopy.definition[govStatus]}
                      {awardRecord?.snapshot
                        ? ` ${awardRecord.snapshot.requiresDirectorApproval ? govCopy.exceedsThreshold : govCopy.withinAuthority}`
                        : ""}
                    </span>
                  </div>
                )}
                <p className="mt-1 max-w-2xl text-[12px] text-[var(--color-text-secondary)]">
                  {localizeQuantity(displayPackageQuantity(pkg.id, pkg.quantity, appliedTenderQtyByPackage, locale), locale)} · {t("bidEval.budget")} {formatEurFigure(pkg.budget, locale === "de" ? "de" : "en")} · {t("bidEval.closes")}{" "}
                  {formatDateDMY(pkg.submissionDeadline)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weightChips.map((w) => (
                  <span
                    key={w.label}
                    className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]"
                  >
                    {w.label}{" "}
                    <span className="tabular-nums text-[var(--color-text-primary)]">{w.max}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {pkg?.componentId === "road-freight" && (
            <div className="space-y-3">
              <LaneSlaPanel compact />
              {session.bidsReleased && <RateNormalisationPanel />}
              {session.bidsReleased && <LogisticsEvaluationPanel />}
            </div>
          )}

          {activeRow && activeRow.status !== "ready" && nextAction ? (
            <EmptyPackageState
              title={locale === "de" ? life.status.de : life.status.en}
              copy={held ? (locale === "de" ? held.de : held.en) : (locale === "de" ? life.status.de : life.status.en)}
              actionLabel={nextAction.label}
              onAction={nextAction.run}
            />
          ) : (
            <>
              <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-4 py-3">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      {t("bidEval.evaluationMatrix")}
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {t("bidEval.matrixExplain")} {t("bidEval.veloceNote")}
                    </p>
                  </div>
                  {results.some((r) => r.finalRank === 1) && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={recommendSelected}
                        disabled={!selectedResult || selectedResult.gatingStatus !== "Pass" || awardBlocked || (awardRecord != null && awardRecord.status !== "procurement_review")}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90 disabled:opacity-50"
                      >
                        <SafeIcon name="BadgeCheck" className="size-3.5" />
                        {awardRecord?.snapshot?.recommendedBidId === selectedBidId
                          ? govCopy.recommended
                          : govCopy.recommendForAward}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifyOpen(true)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--color-border-default)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <SafeIcon name="Mail" className="size-3.5" />
                        {t("bidEval.notifyBidders")}
                      </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        <th className="px-3 py-2.5">{t("bidEval.supplier")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.totalBidPrice")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.price")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.technical")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.qaHseq")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.legal")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.sustainability")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.history")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.gating")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.composite")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.rank")}</th>
                        <th className="px-3 py-2.5">{t("missionCard.risk")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedResults.map((r) => {
                        const selected = selectedBidId === r.bidId
                        return (
                          <tr
                            key={r.bidId}
                            onClick={() => setSelectedBidId(r.bidId)}
                            className={cn(
                              "cursor-pointer border-b border-[var(--color-border-default)] last:border-b-0 transition-colors",
                              selected
                                ? "bg-[var(--color-tint-neutral)]"
                                : "hover:bg-[var(--color-bg-subtle)]",
                            )}
                          >
                            <MatrixCell className="font-medium">{r.supplier}</MatrixCell>
                            <MatrixCell>{formatPriceFull(r.totalPrice, locale)}</MatrixCell>
                            <MatrixCell>{r.priceScore != null ? formatFixed(r.priceScore, locale) : "—"}</MatrixCell>
                            <MatrixCell>{r.techScore != null ? formatFixed(r.techScore, locale) : "—"}</MatrixCell>
                            <MatrixCell>{r.qaScore != null ? formatFixed(r.qaScore, locale) : "—"}</MatrixCell>
                            <MatrixCell>{r.legalScore != null ? formatFixed(r.legalScore, locale) : "—"}</MatrixCell>
                            <MatrixCell>{r.sustainabilityScore != null ? formatFixed(r.sustainabilityScore, locale) : "—"}</MatrixCell>
                            <MatrixCell>
                              {r.historyScore != null
                                ? `${formatFixed(r.historyScore, locale)} · ${historyText(r.bidId, r.historyLabel, locale, session.asOfMonth)}`
                                : historyText(r.bidId, r.historyLabel, locale, session.asOfMonth)}
                            </MatrixCell>
                            <MatrixCell>
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                  r.gatingStatus === "Pass"
                                    ? "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]"
                                    : "bg-[var(--color-tint-critical)] text-[var(--color-accent-critical-text)]",
                                )}
                              >
                                {r.gatingStatus === "Pass" ? t("common.pass") : r.gatingStatus === "Evidence missing" ? (locale === "de" ? "Nachweis fehlt" : "Evidence missing") : (locale === "de" ? "Disqualifiziert" : "Disqualified")}
                              </span>
                            </MatrixCell>
                            <MatrixCell className="font-semibold">
                              {r.compositeScore != null ? formatFixed(r.compositeScore, locale) : "—"}
                              {r.gatingStatus === "Pass" && r.historyLabel === "No History" && (
                                <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-[var(--color-text-muted)]">
                                  {t("bidEval.noHistoryScale")}
                                </span>
                              )}
                            </MatrixCell>
                            <MatrixCell className="font-semibold">
                              {r.finalRank != null ? `#${r.finalRank}` : r.gatingStatus === "Evidence missing" ? (locale === "de" ? "Offen" : "Open") : "DQ"}
                            </MatrixCell>
                            <MatrixCell>
                              {r.highCommercialRisk ? (
                                <span className="rounded bg-[var(--color-tint-warning)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-accent-warning-text)]">
                                  {t("bidEval.high")}
                                </span>
                              ) : (
                                <span className="text-[var(--color-text-muted)]">—</span>
                              )}
                            </MatrixCell>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {t("bidEval.bidCards")}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {t("bidEval.bidCardsExplain")}
                    {pkg ? ` · ${t("bidEval.budgetBaseline")} ${formatEurFigure(pkg.budget, locale === "de" ? "de" : "en")}` : ""}.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {rankedResults.map((r, i) => (
                    <BidBaseballCard
                      key={r.bidId}
                      result={r}
                      index={i}
                      locale={locale}
                      selected={selectedBidId === r.bidId}
                      onSelect={() => setSelectedBidId(r.bidId)}
                    />
                  ))}
                </div>
              </section>

              {failedResults.length > 0 && (
                <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4")}>
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {locale === "de" ? "Nicht gerankt" : "Not ranked"}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    {locale === "de"
                      ? "Nicht bestandene Angebote bleiben getrennt. Sie erhalten keinen Score und keinen Rang."
                      : "Failed bids stay apart. They receive no score and no rank."}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {failedResults.map((row) => (
                      <li key={row.bidId} className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{row.supplier}</p>
                        <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{row.recommendation}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>


      {notifyOpen && (
        <BidderNotifyModal
          ittRef={ittRef}
          packageTitle={pkg?.title ?? ""}
          results={results}
          awardUnlocked={awardUnlocked}
          onClose={() => setNotifyOpen(false)}
        />
      )}
      {recommendSnapshot && (
        <AwardRecommendPanel
          snapshot={recommendSnapshot}
          locale={locale}
          tenant="compass-logistics"
          onClose={() => setRecommendSnapshot(null)}
          onSubmit={(note) => {
            if (!pkg) return
            submitAwardRecommendation(
              pkg.id,
              recommendSnapshot,
              { name: ACTIVE_USER.name, role: ACTIVE_USER.role, email: ACTIVE_USER.email },
              note,
            )
            if (recommendSnapshot.requiresDirectorApproval) {
              setToastName(recommendSnapshot.requiredApproverName)
            }
            setRecommendSnapshot(null)
          }}
        />
      )}
      {toastName && <AwardNotificationToast name={toastName} locale={locale} onDismiss={() => setToastName(null)} />}
    </div>
  )
}
