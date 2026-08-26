"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { pcmButton } from "../motion"
import { employeeByRole } from "../../data/_people"
import { ACTIVE_USER } from "./active-user"
import {
  CANDIDATE_MATCHES,
  RETAIN_REASONS,
  inventoryById,
  qualityByInventoryId,
  requirementById,
  reservationByInventoryId,
  type Disposition,
  type ValidationAction,
} from "../../data/seaway7/_inventory"
import {
  classificationLabel,
  formatQty,
  mergeMatch,
  residualProcurementQty,
  summarizeRequirement,
  type MatchOverlayMap,
} from "../../data/seaway7/_demand-validation"

const DISPOSITIONS: { id: Disposition; label: string }[] = [
  { id: "use-inventory", label: "Use inventory" },
  { id: "use-partial", label: "Use partial quantity" },
  { id: "request-validation", label: "Request validation" },
  { id: "retain-full-quantity", label: "Retain full tender quantity" },
  { id: "reject-match", label: "Reject match" },
]

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
          : disposition === "use-partial"
            ? `Approve ${formatQty(thisApproved, requirement.uom)} from ${match.inventoryId}`
            : `Approve ${formatQty(thisApproved, requirement.uom)} from ${match.inventoryId}`

  const canRecord =
    (disposition !== "retain-full-quantity" || retainReason !== "") &&
    (disposition !== "reject-match" || rejectReason.trim().length > 0) &&
    (disposition !== "use-partial" || thisApproved > 0)

  return (
    <article className="space-y-3 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Demand validation · {requirement.packageRef}
          </p>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            {requirement.description}
          </h3>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            Requested {formatQty(requirement.requestedQty, requirement.uom)} · required at site {formatDateDMY(requirement.requiredAtSite)} · {requirement.deliveryLocation}
          </p>
        </div>
        <span className="rounded-md border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          {classificationLabel(match.classification)}
        </span>
      </div>

      <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Inventory</dt>
          <dd className="text-[var(--color-text-primary)]">
            {match.inventoryId}
            {inventory ? ` · ${inventory.storageLocation} · ${inventory.condition} · ${inventory.inventoryStatus}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Reservation</dt>
          <dd className="text-[var(--color-text-primary)]">
            {reservation
              ? `${reservation.id}: ${formatQty(reservation.reservedQty, reservation.uom)} on ${reservation.owningProject} (${reservation.transferPermitted} transfer)`
              : "None"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Match basis</dt>
          <dd className="text-[var(--color-text-primary)]">{match.matchBasis}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Outstanding check</dt>
          <dd className="text-[var(--color-text-primary)]">{quality?.outstandingCheck || action.question}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Owner</dt>
          <dd className="text-[var(--color-text-primary)]">
            {owner ? `${owner.name} · ${owner.role}` : action.owner}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Due</dt>
          <dd className="text-[var(--color-text-primary)]">{formatDateDMY(action.dueDate)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {DISPOSITIONS.map((d) => (
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
            {d.label}
          </button>
        ))}
      </div>

      {disposition === "use-partial" && (
        <label className="block text-[12px] text-[var(--color-text-secondary)]">
          Approved quantity
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
          Reason (required)
          <select
            value={retainReason}
            onChange={(e) => setRetainReason(e.target.value as typeof retainReason)}
            className="mt-1 w-full rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          >
            <option value="">Select a reason</option>
            {RETAIN_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      )}
      {disposition === "reject-match" && (
        <label className="block text-[12px] text-[var(--color-text-secondary)]">
          Reason (required)
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-1 w-full rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          />
        </label>
      )}

      <p className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        Residual procurement quantity would be {formatQty(residual, requirement.uom)} of {formatQty(requirement.requestedQty, requirement.uom)} requested. The proposed tender quantity changes only after a separate confirmation.
        {thisApproved > 0
          ? ` Identified purchase-avoidance opportunity if this quantity is approved: €${avoidanceEur.toLocaleString("en-GB")} (not realised savings).`
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
        Record disposition
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
  const req = summary.requirement
  const residualLabel = formatQty(summary.residualProcurementQty, req.uom)
  const requestedLabel = formatQty(req.requestedQty, req.uom)
  const applied = appliedQty === summary.residualProcurementQty

  return (
    <article className="space-y-3 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Proposed tender quantity · {req.packageRef}
        </p>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          {req.description}
        </h3>
      </div>
      {applied ? (
        <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          Proposed tender quantity is {residualLabel} (requested {requestedLabel}).
        </p>
      ) : (
        <>
          <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            Residual procurement quantity is {residualLabel} of {requestedLabel} requested. Confirm to write {residualLabel} into the proposed tender quantity.
          </p>
          <Button
            type="button"
            onClick={onApply}
            className={cn(pcmButton, "gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90")}
          >
            <SafeIcon name="PenLine" className="h-3.5 w-3.5" />
            Apply {residualLabel} to the ITT
          </Button>
        </>
      )}
    </article>
  )
}
