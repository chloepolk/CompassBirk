"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { formatEur, formatFixed } from "../_i18n/currency"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { enterMotion, pcmCard } from "../_components/motion"
import {
  allVendorProfiles,
  SCORE_WEIGHTS,
  MIN_EVIDENCE_MONTHS,
  type VendorProfile,
} from "@/lib/compass/logistics/vendor-model"

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="tabular-nums font-medium text-[var(--color-text-primary)]">
          {formatFixed(value, "en")} · {Math.round(weight * 100)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand-primary)]"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

function VendorCard({
  profile,
  selected,
  onSelect,
}: {
  profile: VendorProfile
  selected: boolean
  onSelect: () => void
}) {
  const t = useT()
  const { locale } = useStore()
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        pcmCard,
        "w-full rounded-[16px] border p-4 text-left transition-colors",
        selected
          ? "border-[var(--color-brand-primary)] bg-[var(--color-tint-brand)]"
          : "border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{profile.supplier.supplierName}</p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            {profile.supplier.country} · {profile.supplier.status}
          </p>
        </div>
        {profile.historyStatus === "No History" ? (
          <span className="rounded-md bg-[var(--color-tint-neutral)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {t("vendor.noHistory")}
          </span>
        ) : (
          <span className="tabular-nums text-[18px] font-semibold text-[var(--color-text-primary)]">
            {profile.score ? formatFixed(profile.score.total, locale) : "—"}
          </span>
        )}
      </div>
      <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
        {t("vendor.spend")} {formatEur(profile.supplier.annualSpendEur ?? 0, locale)}
      </p>
    </button>
  )
}

export function Vendor360Page() {
  const t = useT()
  const { locale, focusSupplierId, session } = useStore()
  const profiles = React.useMemo(() => allVendorProfiles(session.createdContracts), [session.createdContracts])
  const [activeId, setActiveId] = React.useState(focusSupplierId ?? profiles[0]?.supplier.supplierId ?? "SUP-001")

  React.useEffect(() => {
    if (focusSupplierId && profiles.some((p) => p.supplier.supplierId === focusSupplierId)) {
      setActiveId(focusSupplierId)
    }
  }, [focusSupplierId, profiles])

  const profile = profiles.find((p) => p.supplier.supplierId === activeId) ?? profiles[0]
  const hero = enterMotion(0)

  return (
    <div className="space-y-6">
      <div className={hero.className} style={hero.style}>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t("vendor.title")}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{t("vendor.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {profiles.map((p) => (
            <VendorCard
              key={p.supplier.supplierId}
              profile={p}
              selected={p.supplier.supplierId === profile?.supplier.supplierId}
              onSelect={() => setActiveId(p.supplier.supplierId!)}
            />
          ))}
        </div>

        {profile && (
          <div className="space-y-4">
            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-3")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">{profile.supplier.supplierName}</h2>
                  <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                    {profile.supplier.services} · {profile.supplier.contactName} · {profile.supplier.contactEmail}
                  </p>
                </div>
                <span className="rounded-md border border-[var(--color-border-default)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  {profile.supplier.approved === "Yes" ? t("vendor.approved") : profile.supplier.approved}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{t("vendor.relationship")}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[var(--color-text-primary)]">
                    {profile.supplier.relationshipStart ? formatDateDMY(profile.supplier.relationshipStart) : t("vendor.noHistory")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{t("vendor.spend")}</p>
                  <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[var(--color-text-primary)]">
                    {formatEur(profile.supplier.annualSpendEur ?? 0, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{t("vendor.history")}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[var(--color-text-primary)]">{profile.historyStatus}</p>
                </div>
              </div>
            </section>

            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-3")}>
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("vendor.scoreTitle")}</h3>
              {profile.score ? (
                <>
                  <p className="text-[28px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatFixed(profile.score.total, locale)}
                  </p>
                  <ScoreBar label={t("vendor.operational")} value={profile.score.operational} weight={SCORE_WEIGHTS.operational} />
                  <ScoreBar label={t("vendor.commercial")} value={profile.score.commercial} weight={SCORE_WEIGHTS.commercial} />
                  <ScoreBar label={t("vendor.sla")} value={profile.score.sla} weight={SCORE_WEIGHTS.sla} />
                  <ScoreBar label={t("vendor.relationshipDim")} value={profile.score.relationship} weight={SCORE_WEIGHTS.relationship} />
                  <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">{profile.score.method}</p>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                  {t("vendor.noHistoryBody", { months: MIN_EVIDENCE_MONTHS })}
                </p>
              )}
            </section>

            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-3")}>
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("vendor.contracts")}</h3>
              {profile.contracts.length === 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)]">{t("vendor.noContracts")}</p>
              ) : (
                profile.contracts.map((c) => (
                  <div key={c.contractId} className="rounded-[10px] border border-[var(--color-border-default)] px-3 py-2">
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{c.contractTitle}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                      {c.contractId} · {formatDateDMY(c.startDate)} – {formatDateDMY(c.endDate)} · {t("vendor.notice")} {c.noticeDays}d
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-[var(--color-text-muted)]">
                      {formatEur(c.contractValueEur ?? 0, locale)} · OTD {(c.otdTarget ?? 0) * 100}%
                    </p>
                  </div>
                ))
              )}
            </section>

            {profile.latest && profile.historyStatus === "Available" && (
              <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-2")}>
                <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("vendor.opsKpis")}</h3>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {t("vendor.latestMonth")} {formatDateDMY(profile.latest.month)} · {profile.latest.trendFlag}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    [t("vendor.otd"), `${((profile.latest.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}%`],
                    [t("vendor.acceptance"), `${((profile.latest.tenderAcceptancePct ?? 0) * 100).toFixed(1)}%`],
                    [t("vendor.claims"), `${((profile.latest.claimsPct ?? 0) * 100).toFixed(2)}%`],
                    [t("vendor.invoice"), `${((profile.latest.invoiceAccuracyPct ?? 0) * 100).toFixed(1)}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
                      <p className="text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {profile.incidents.length > 0 && (
              <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-2")}>
                <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("vendor.incidents")}</h3>
                {profile.incidents.slice(0, 6).map((inc) => (
                  <p key={inc.incidentId} className="text-[12px] text-[var(--color-text-secondary)]">
                    <span className="font-medium text-[var(--color-text-primary)]">{inc.incidentId}</span>
                    {" · "}
                    {formatDateDMY(inc.incidentDate)} · {inc.incidentType} · {inc.severity}
                  </p>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Vendor360Page
