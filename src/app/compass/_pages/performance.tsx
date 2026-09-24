"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { formatEur, formatFixed } from "../_i18n/currency"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { enterMotion, pcmCard } from "../_components/motion"
import { ACTIONS } from "@/lib/compass/logistics/expected/actions"
import { CONTRACTS } from "@/lib/compass/logistics/structured/contracts"
import {
  allVendorProfiles,
  incidentsFor,
  laneLabel,
  FORECAST_SHIPMENTS,
} from "@/lib/compass/logistics/vendor-model"

export function PerformancePage() {
  const t = useT()
  const { locale, focusSupplierId, openVendor360, session } = useStore()
  const incumbents = React.useMemo(
    () => allVendorProfiles(session.createdContracts).filter((p) => p.historyStatus === "Available"),
    [session.createdContracts],
  )
  const [activeId, setActiveId] = React.useState(focusSupplierId ?? incumbents[0]?.supplier.supplierId ?? "SUP-001")
  const profile = incumbents.find((p) => p.supplier.supplierId === activeId) ?? incumbents[0]
  const contract = CONTRACTS.find((c) => c.supplierId === profile?.supplier.supplierId)
  const incidents = profile ? incidentsFor(profile.supplier.supplierId!) : []
  const openActions = ACTIONS.filter(
    (a) =>
      (a.relatedEntity === profile?.supplier.supplierId || a.actionType === "Performance alert" || a.actionType === "Corrective action") &&
      a.status !== "Closed",
  )
  const hero = enterMotion(0)

  return (
    <div className="space-y-6">
      <div className={hero.className} style={hero.style}>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t("performance.title")}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{t("performance.subtitle", { shipments: FORECAST_SHIPMENTS.toLocaleString("en-GB") })}</p>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          {t("performance.asOf", { month: session.asOfMonth ?? "2026-09" })}
          {!session.performanceReleased ? ` · ${t("performance.postAward")}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {incumbents.map((p) => (
          <button
            key={p.supplier.supplierId}
            type="button"
            onClick={() => setActiveId(p.supplier.supplierId!)}
            className={cn(
              "rounded-[10px] border px-3 py-1.5 text-[12px] font-medium",
              p.supplier.supplierId === profile?.supplier.supplierId
                ? "border-[var(--color-brand-primary)] bg-[var(--color-tint-brand)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]",
            )}
          >
            {p.supplier.supplierName}
          </button>
        ))}
      </div>

      {profile && (
        <>
          <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-3")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{profile.supplier.supplierName}</h2>
              <button
                type="button"
                onClick={() => openVendor360(profile.supplier.supplierId)}
                className="text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                {t("performance.openVendor")}
              </button>
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              {t("performance.baseline")} {contract ? `OTD ${(contract.otdTarget ?? 0) * 100}% · ${t("vendor.acceptance")} ${(contract.acceptanceTarget ?? 0) * 100}%` : t("vendor.noContracts")}
            </p>
            {profile.latest && (
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  [t("vendor.otd"), (profile.latest.onTimeDeliveryPct ?? 0) * 100, (contract?.otdTarget ?? 0) * 100],
                  [t("vendor.acceptance"), (profile.latest.tenderAcceptancePct ?? 0) * 100, (contract?.acceptanceTarget ?? 0) * 100],
                  [t("vendor.claims"), (profile.latest.claimsPct ?? 0) * 100, (contract?.claimsTargetMax ?? 0) * 100],
                  [t("vendor.invoice"), (profile.latest.invoiceAccuracyPct ?? 0) * 100, (contract?.invoiceAccuracyTarget ?? 0) * 100],
                ].map(([label, actual, target]) => {
                  const a = Number(actual)
                  const tgt = Number(target)
                  const worse = label === t("vendor.claims") ? a > tgt : a < tgt
                  return (
                    <div key={String(label)} className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
                      <p className={cn("text-[16px] font-semibold tabular-nums", worse ? "text-[var(--color-accent-warning-text)]" : "text-[var(--color-text-primary)]")}>
                        {formatFixed(a, locale)}%
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{t("performance.target")} {formatFixed(tgt, locale)}%</p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
            <div className="border-b border-[var(--color-border-default)] px-5 py-3">
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("performance.trend")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--color-bg-subtle)] text-left text-[var(--color-text-muted)]">
                    <th className="px-4 py-2 font-medium">{t("performance.month")}</th>
                    <th className="px-4 py-2 font-medium">{t("vendor.otd")}</th>
                    <th className="px-4 py-2 font-medium">{t("performance.shipments")}</th>
                    <th className="px-4 py-2 font-medium">{t("vendor.scoreTitle")}</th>
                    <th className="px-4 py-2 font-medium">{t("performance.flag")}</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.months.map((row) => (
                    <tr key={row.month} className="border-t border-[var(--color-border-default)]">
                      <td className="px-4 py-2 text-[var(--color-text-secondary)]">{formatDateDMY(row.month)}</td>
                      <td className="px-4 py-2 tabular-nums text-[var(--color-text-primary)]">{((row.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2 tabular-nums text-[var(--color-text-secondary)]">{row.shipments}</td>
                      <td className="px-4 py-2 tabular-nums text-[var(--color-text-primary)]">{formatFixed(row.overallScore ?? 0, locale)}</td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)]">{row.trendFlag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-2")}>
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("vendor.incidents")}</h3>
              {incidents.length === 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)]">{t("performance.noIncidents")}</p>
              ) : (
                incidents.slice(0, 8).map((inc) => (
                  <div key={inc.incidentId} className="rounded-[10px] border border-[var(--color-border-default)] px-3 py-2">
                    <p className="text-[12px] font-medium text-[var(--color-text-primary)]">
                      {inc.incidentId} · {inc.incidentType}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {formatDateDMY(inc.incidentDate)} · {laneLabel(inc.laneId)} · {inc.severity}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{inc.description}</p>
                  </div>
                ))
              )}
            </section>
            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-2")}>
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("performance.corrective")}</h3>
              {openActions.length === 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)]">{t("performance.noActions")}</p>
              ) : (
                openActions.map((a) => (
                  <div key={a.actionId} className="rounded-[10px] border border-[var(--color-border-default)] px-3 py-2">
                    <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{a.title}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {a.actionId} · {a.owner} · {formatDateDMY(a.dueDate)} · {a.status}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{a.recommendedAction}</p>
                  </div>
                ))
              )}
              {session.createdContracts.length > 0 && (
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {t("performance.newBaseline")} {session.createdContracts.map((c) => c.contractId).join(", ")} · {formatEur(session.createdContracts.reduce((s, c) => s + c.contractValueEur, 0), locale)}
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default PerformancePage
