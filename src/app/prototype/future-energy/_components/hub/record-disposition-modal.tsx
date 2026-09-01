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
  canApplyResidualToTender,
  classificationLabel,
  formatQty,
  mergeMatch,
  residualProcurementQty,
  summarizeRequirement,
  type MatchOverlayMap,
} from "../../data/future-energy/_demand-validation"

/** Do not lead with use-inventory — pick a disposition first. */
const DISPOSITION_KEYS: { id: Disposition; key: string }[] = [
  { id: "request-validation", key: "demand.requestValidation" },
  { id: "retain-full-quantity", key: "demand.retainFull" },
  { id: "reject-match", key: "demand.rejectMatch" },
  { id: "use-partial", key: "demand.usePartial" },
  { id: "use-inventory", key: "demand.useInventory" },
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

export function RecordDispositionModal({
  action,
  overlays,
  appliedQty,
  onRecord,
  onApplyResidual,
  onOpenTenderStudio,
  onOpenBidEvaluation,
  onClose,
}: {
  action: ValidationAction
  overlays: MatchOverlayMap
  appliedQty?: number
  onRecord: (args: {
    matchId: string
    disposition: Disposition
    approvedQty: number
    reason: string
    actor: string
  }) => void
  onApplyResidual: (packageId: string) => void
  onOpenTenderStudio: (packageId: string) => void
  onOpenBidEvaluation: (packageId: string) => void
  onClose: () => void
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
  const [disposition, setDisposition] = React.useState<Disposition | null>(null)
  const [partialQty, setPartialQty] = React.useState(usable)
  const [retainReason, setRetainReason] = React.useState<(typeof RETAIN_REASONS)[number] | "">("")
  const [rejectReason, setRejectReason] = React.useState(match?.reason ?? action.question)
  const [recorded, setRecorded] = React.useState(false)

  React.useEffect(() => {
    setPartialQty(usable)
    setRejectReason(match?.reason || action.question)
    setDisposition(null)
    setRecorded(false)
  }, [action.id, usable, match?.reason, action.question])

  if (!match || !requirement || !summary) return null

  const othersApproved = summary.approvedInventoryQty - match.approvedInventoryQty
  const thisApproved =
    disposition === "use-inventory"
      ? usable
      : disposition === "use-partial"
        ? Math.max(0, Math.min(partialQty, usable))
        : 0
  const previewApproved = recorded ? summary.approvedInventoryQty : othersApproved + thisApproved
  const residual = residualProcurementQty(requirement.requestedQty, previewApproved)
  const avoidanceEur = thisApproved * requirement.newPurchaseUnitBaseline
  const requestedLabel = formatQty(requirement.requestedQty, requirement.uom, locale)
  const approvedLabel = formatQty(previewApproved, requirement.uom, locale)
  const residualLabel = formatQty(residual, requirement.uom, locale)
  const canWriteResidual =
    recorded && canApplyResidualToTender(summary) && appliedQty !== summary.residualProcurementQty
  const alreadyWritten = recorded && appliedQty === summary.residualProcurementQty

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
    disposition != null &&
    (disposition !== "retain-full-quantity" || retainReason !== "") &&
    (disposition !== "reject-match" || rejectReason.trim().length > 0) &&
    (disposition !== "use-partial" || thisApproved > 0)

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("common.close")} className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="ClipboardCheck" className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h3 className="text-sm font-semibold">{t("demand.recordDisposition")}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("demand.eyebrow", { ref: requirement.packageRef })}
            </p>
            <h4 className="mt-0.5 text-[15px] font-semibold text-[var(--color-text-primary)]">
              {requirement.description}
            </h4>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
              {t("demand.requestedLine", {
                qty: requestedLabel,
                date: formatDateDMY(requirement.requiredAtSite),
                location: requirement.deliveryLocation,
              })}
            </p>
          </div>

          <p className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            {t("demand.qtyBalance", {
              requested: requestedLabel,
              approved: approvedLabel,
              residual: residualLabel,
            })}
          </p>

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

          <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
            {classificationLabel(match.classification, locale)}
          </p>

          {!recorded ? (
            <>
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
              {disposition == null && (
                <p className="text-[12px] text-[var(--color-text-muted)]">{t("demand.pickDisposition")}</p>
              )}
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
              {disposition != null && (
                <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                  {t("demand.residualPreview", {
                    approved: approvedLabel,
                    residual: residualLabel,
                    requested: requestedLabel,
                  })}
                  {thisApproved > 0
                    ? ` ${t("demand.avoidanceIfApproved", { amount: formatAvoidance(avoidanceEur, locale) })}`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] font-medium text-[var(--color-accent-positive-text)]">{t("demand.recorded")}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("demand.nextSteps")}
              </p>
              <div className="flex flex-col gap-1.5">
                {canWriteResidual && (
                  <Button
                    type="button"
                    onClick={() => onApplyResidual(requirement.packageId)}
                    className={cn(pcmButton, "justify-start gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90")}
                  >
                    <SafeIcon name="PenLine" className="h-3.5 w-3.5" />
                    {t("demand.writeToItt", { residual: residualLabel })}
                  </Button>
                )}
                {alreadyWritten && (
                  <p className="text-[12px] text-[var(--color-text-secondary)]">
                    {t("demand.proposedIs", { residual: residualLabel, requested: requestedLabel })}
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenTenderStudio(requirement.packageId)}
                  className="h-auto justify-start rounded-[10px] border border-[var(--color-border-default)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  {t("demand.openTenderStudio")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenBidEvaluation(requirement.packageId)}
                  className="h-auto justify-start rounded-[10px] border border-[var(--color-border-default)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  {t("demand.openBidEvaluation")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted"
          >
            {t("common.cancel")}
          </button>
          {!recorded && (
            <button
              type="button"
              disabled={!canRecord}
              onClick={() => {
                if (!disposition) return
                onRecord({
                  matchId: match.id,
                  disposition,
                  approvedQty: thisApproved,
                  reason,
                  actor: ACTIVE_USER.name,
                })
                setRecorded(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <SafeIcon name="Check" className="h-3.5 w-3.5" />
              {t("demand.recordDisposition")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
