"use client"

import { cn } from "@/lib/utils"
import { useT } from "../_i18n/use-t"
import { useStore } from "../_store"
import { formatEur, formatFixed } from "../_i18n/currency"
import { pcmCard } from "./motion"
import { LANES } from "@/lib/compass/logistics/structured/lanes"
import { BID_RATES } from "@/lib/compass/logistics/structured/bid-rates"
import { SUPPLIERS } from "@/lib/compass/logistics/structured/suppliers"
import { CONTRACTS } from "@/lib/compass/logistics/structured/contracts"
import { laneLabel } from "@/lib/compass/logistics/vendor-model"

function supplierName(id: string | null): string {
  return SUPPLIERS.find((s) => s.supplierId === id)?.supplierName ?? id ?? "—"
}

export function LaneSlaPanel({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const sla = CONTRACTS[0]
  const rows = compact ? LANES.filter((l) => l.laneId).slice(0, 8) : LANES.filter((l) => l.laneId)

  return (
    <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
      <div className="border-b border-[var(--color-border-default)] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("lanes.title")}</h3>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          {t("lanes.slaLine", {
            otd: sla ? `${((sla.otdTarget ?? 0) * 100).toFixed(1)}%` : "98.0%",
            acceptance: sla ? `${((sla.acceptanceTarget ?? 0) * 100).toFixed(1)}%` : "97.0%",
            claims: sla ? `${((sla.claimsTargetMax ?? 0) * 100).toFixed(1)}%` : "0.5%",
          })}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[var(--color-bg-subtle)] text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2">{t("lanes.lane")}</th>
              <th className="px-3 py-2">{t("lanes.volume")}</th>
              <th className="px-3 py-2">{t("lanes.transit")}</th>
              <th className="px-3 py-2">{t("lanes.equipment")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lane) => (
              <tr key={lane.laneId} className="border-t border-[var(--color-border-default)]">
                <td className="px-3 py-2 text-[var(--color-text-primary)]">
                  {lane.originCity} → {lane.destinationCity}
                  <span className="ml-1 text-[var(--color-text-muted)]">{lane.laneId}</span>
                </td>
                <td className="px-3 py-2 tabular-nums text-[var(--color-text-secondary)]">
                  {lane.forecastAnnualShipments}
                </td>
                <td className="px-3 py-2 tabular-nums text-[var(--color-text-secondary)]">
                  {lane.targetTransitHours}h
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{lane.equipment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RateNormalisationPanel() {
  const t = useT()
  const { locale } = useStore()
  const latest = BID_RATES.filter((r) => r.eventId === "RFP-2026-001" && r.laneId && r.supplierId)
  const bySupplier = new Map<string, { cost: number; lanes: number }>()
  for (const row of latest) {
    const id = row.supplierId!
    const cur = bySupplier.get(id) ?? { cost: 0, lanes: 0 }
    cur.cost += row.annualForecastCostEur ?? 0
    cur.lanes += 1
    bySupplier.set(id, cur)
  }
  const ranked = [...bySupplier.entries()].sort((a, b) => a[1].cost - b[1].cost)
  const floor = ranked[0]?.[1].cost ?? 0

  return (
    <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-3")}>
      <div>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("lanes.ratesTitle")}</h3>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{t("lanes.ratesExplain")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-2 py-1.5">{t("bidEval.supplier")}</th>
              <th className="px-2 py-1.5">{t("lanes.annualCost")}</th>
              <th className="px-2 py-1.5">{t("lanes.lanesCovered")}</th>
              <th className="px-2 py-1.5">{t("lanes.vsFloor")}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(([id, row]) => (
              <tr key={id} className="border-t border-[var(--color-border-default)]">
                <td className="px-2 py-1.5 text-[var(--color-text-primary)]">{supplierName(id)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatEur(row.cost, locale)}</td>
                <td className="px-2 py-1.5 tabular-nums text-[var(--color-text-secondary)]">{row.lanes}</td>
                <td className="px-2 py-1.5 tabular-nums text-[var(--color-text-secondary)]">
                  {floor > 0 ? `${formatFixed((row.cost / floor) * 100, locale)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)]">{t("lanes.historyMethod")}</p>
    </section>
  )
}

export function sampleLaneLabel(laneId: string | null): string {
  return laneLabel(laneId)
}
