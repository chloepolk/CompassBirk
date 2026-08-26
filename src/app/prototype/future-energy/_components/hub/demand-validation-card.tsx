"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { pcmButton } from "../motion"
import { employeeByRole } from "../../data/_people"
import { ACTIVE_USER } from "./active-user"
import { useT } from "../../_i18n/use-t"
import { useStore } from "../../_store"
import {
  CANDIDATE_MATCHES,
  RETAIN_REASONS,
  inventoryById,
  qualityByInventoryId,
  requirementById,
  reservationByInventoryId,
  type Disposition,
  type ValidationAction,
} from "../../data/future-energy/_inventory"
import {
  classificationLabel,
  formatQty,
  mergeMatch,
  residualProcurementQty,
  summarizeRequirement,
  type MatchOverlayMap,
} from "../../data/future-energy/_demand-validation"

const DISPOSITION_KEYS: { id: Disposition; key: string }[] = [
  { id: "use-inventory", key: "demand.useInventory" },
  { id: "use-partial", key: "demand.usePartial" },
  { id: "request-validation", key: "demand.requestValidation" },
  { id: "retain-full-quantity", key: "demand.retainFull" },
  { id: "reject-match", key: "demand.rejectMatch" },
]

const RETAIN_REASON_KEYS: Record<(typeof RETAIN_REASONS)[number], string> = {
  "Committed to another project": "demand.retain.committed",
  "Certification incomplete": "demand.retain.certification",
  "Required date cannot be met": "demand.retain.date",
  "Technical mismatch": "demand.retain.mismatch",
  "Contingency stock must be retained": "demand.retain.contingency",
  "Transfer and readiness cost exceeds the purchase alternative": "demand.retain.cost",
}

function formatAvoidance(eur: number, locale: "en" | "fr"): string {
  return locale === "fr"
    ? `${eur.toLocaleString("fr-FR")}\u00a0€`
    : `€${eur.toLocaleString("en-GB")}`
}

export function DemandValidationCard({
  action,
  overlays,
  onRecord,
}: {
  action: ValidationAction
  overlays: MatchOverlayMap
  onRecord: (args: {
    matchId: string
    disposition: Disposition
    approvedQty: number
    reason: string
    actor: string
  }) => void
}) {
  const t = useT()
  const { locale } = useStore()
  const seed = CANDIDATE_MATCHES.find((m) => m.id === action.matchId)
  const requirement = requirementById(action.requirementId)
  const match = seed ? mergeMatch(seed, overlays[seed.id]) : null
  const inventory = match ? inventoryById(match.inventoryId) : null
  const quality = match ? qualityByInventoryId(match.inventoryId) : null
  const reservation = match ? reservationByInventoryId(match.inventoryId) : null
  const owner = employeeByRole(action.owner)
  const summary = requirement ? summarizeRequirement(requirement, overlays) : null

  const usable = match ? (match.potentiallyUsableQty || match.candidateQty) : 0
  const [disposition, setDisposition] = React.useState<Disposition>("use-inventory")
  const [partialQty, setPartialQty] = React.useState(usable)
  const [retainReason, setRetainReason] = React.useState<(typeof RETAIN_REASONS)[number] | "">("")
  const [rejectReason, setRejectReason] = React.useState(match?.reason ?? action.question)

  React.useEffect(() => {
    setPartialQty(usable)
    setRejectReason(match?.reason || action.question)
  }, [action.id, usable, match?.reason, action.question])

  if (!match || !requirement || !summary) return null

  const othersApproved = summary.approvedInventoryQty - match.approvedInventoryQty
  const thisApproved =
    disposition === "use-inventory" ? usable : disposition === "use-partial" ? Math.max(0, Math.min(partialQty, usable)) : 0
  const residual = residualProcurementQty(requirement.requestedQty, othersApproved + thisApproved)
  const avoidanceEur = thisApproved * requirement.newPurchaseUnitBaseline

  const reason =
    disposition === "retain-full-quantity"
      ? retainReason
      : disposition === "reject-match"
        ? rejectReason.trim()
        : disposition === "request-validation"
          ? action.question
          : t("demand.approveFrom", {
              qty: formatQty(thisApproved, requirement.uom, locale),
              id: match.inventoryId,
            })

  const canRecord =
    (disposition !== "retain-full-quantity" || retainReason !== "") &&
    (disposition !== "reject-match" || rejectReason.trim().length > 0) &&
    (disposition !== "use-partial" || thisApproved > 0)

  return (
    <article className="space-y-3 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {t("demand.eyebrow", { ref: requirement.packageRef })}
          </p>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            {requirement.description}
          </h3>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            {t("demand.requestedLine", {
              qty: formatQty(requirement.requestedQty, requirement.uom, locale),
              date: formatDateDMY(requirement.requiredAtSite),
              location: requirement.deliveryLocation,
            })}
          </p>
        </div>
        <span className="rounded-md border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          {classificationLabel(match.classification, locale)}
        </span>
      </div>

      <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{t("demand.inventory")}</dt>
          <dd className="text-[var(--color-text-primary)]">
            {match.inventoryId}
            {inventory ? ` · ${inventory.storageLocation} · ${inventory.condition} · ${inventory.inventoryStatus}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{t("demand.reservation")}</dt>
          <dd className="text-[var(--color-text-primary)]">
            {reservation
              ? t("demand.reservationLine", {
                  id: reservation.id,
                  qty: formatQty(reservation.reservedQty, reservation.uom, locale),
                  project: reservation.owningProject,
                  transfer: reservation.transferPermitted === "No" ? t("demand.transferNo") : t("demand.transferConditional"),
                })
              : t("demand.none")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{t("demand.matchBasis")}</dt>
          <dd className="text-[var(--color-text-primary)]">{match.matchBasis}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{t("demand.outstandingCheck")}</dt>
          <dd className="text-[var(--color-text-primary)]">{quality?.outstandingCheck || action.question}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{t("demand.owner")}</dt>
          <dd className="text-[var(--color-text-primary)]">
            {owner ? `${owner.name} · ${owner.role}` : action.owner}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{t("demand.due")}</dt>
          <dd className="text-[var(--color-text-primary)]">{formatDateDMY(action.dueDate)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {DISPOSITION_KEYS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDisposition(d.id)}
            className={cn(
              "rounded-[8px] border px-2.5 py-1 text-[11px] font-medium",
              disposition === d.id
                ? "border-[var(--color-bg-inverse)] bg-[var(--color-bg-inverse)] text-[var(--color-text-inverse)]"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]",
            )}
          >
            {t(d.key)}
          </button>
        ))}
      </div>

      {disposition === "use-partial" && (
        <label className="block text-[12px] text-[var(--color-text-secondary)]">
          {t("demand.approvedQty")}
          <input
            type="number"
            min={1}
            max={usable}
            value={partialQty}
            onChange={(e) => setPartialQty(Number(e.target.value))}
            className="mt-1 w-full rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          />
        </label>
      )}
      {disposition === "retain-full-quantity" && (
        <label className="block text-[12px] text-[var(--color-text-secondary)]">
          {t("demand.reasonRequired")}
          <select
            value={retainReason}
            onChange={(e) => setRetainReason(e.target.value as typeof retainReason)}
            className="mt-1 w-full rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          >
            <option value="">{t("demand.selectReason")}</option>
            {RETAIN_REASONS.map((r) => (
              <option key={r} value={r}>{t(RETAIN_REASON_KEYS[r])}</option>
            ))}
          </select>
        </label>
      )}
      {disposition === "reject-match" && (
        <label className="block text-[12px] text-[var(--color-text-secondary)]">
          {t("demand.reasonRequired")}
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-1 w-full rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          />
        </label>
      )}

      <p className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        {t("demand.residualPreview", {
          residual: formatQty(residual, requirement.uom, locale),
          requested: formatQty(requirement.requestedQty, requirement.uom, locale),
        })}
        {thisApproved > 0
          ? ` ${t("demand.avoidanceIfApproved", { amount: formatAvoidance(avoidanceEur, locale) })}`
          : ""}
      </p>

      <Button
        type="button"
        disabled={!canRecord}
        onClick={() =>
          onRecord({
            matchId: match.id,
            disposition,
            approvedQty: thisApproved,
            reason,
            actor: ACTIVE_USER.name,
          })
        }
        className={cn(pcmButton, "gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90")}
      >
        <SafeIcon name="Check" className="h-3.5 w-3.5" />
        {t("demand.recordDisposition")}
      </Button>
    </article>
  )
}

export function ApplyResidualConfirm({
  summary,
  appliedQty,
  onApply,
}: {
  summary: NonNullable<ReturnType<typeof summarizeRequirement>>
  appliedQty?: number
  onApply: () => void
}) {
  const t = useT()
  const { locale } = useStore()
  const req = summary.requirement
  const residualLabel = formatQty(summary.residualProcurementQty, req.uom, locale)
  const requestedLabel = formatQty(req.requestedQty, req.uom, locale)
  const applied = appliedQty === summary.residualProcurementQty

  return (
    <article className="space-y-3 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {t("demand.proposedQty", { ref: req.packageRef })}
        </p>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          {req.description}
        </h3>
      </div>
      {applied ? (
        <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {t("demand.proposedIs", { residual: residualLabel, requested: requestedLabel })}
        </p>
      ) : (
        <>
          <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            {t("demand.confirmWrite", { residual: residualLabel, requested: requestedLabel })}
          </p>
          <Button
            type="button"
            onClick={onApply}
            className={cn(pcmButton, "gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90")}
          >
            <SafeIcon name="PenLine" className="h-3.5 w-3.5" />
            {t("demand.applyToItt", { residual: residualLabel })}
          </Button>
        </>
      )}
    </article>
  )
}
