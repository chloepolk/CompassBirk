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
import { SHIPMENTS } from "@/lib/compass/logistics/structured/shipments"
import {
  allVendorProfiles,
  computeScore,
  incidentsFor,
  laneLabel,
  actualShipmentCount,
} from "@/lib/compass/logistics/vendor-model"

export function PerformancePage() {
  const t = useT()
  const { locale, focusSupplierId, openVendor360, openInbox, openTenderStudio, session, patchSession, advanceJourney } = useStore()
  const incumbents = React.useMemo(
    () => allVendorProfiles(session.createdContracts, session.asOfMonth).filter((p) => p.historyStatus === "Available"),
    [session.createdContracts, session.asOfMonth],
  )
  const [activeId, setActiveId] = React.useState(focusSupplierId ?? incumbents[0]?.supplier.supplierId ?? "SUP-001")
  const profile = incumbents.find((p) => p.supplier.supplierId === activeId) ?? incumbents[0]
  const awardedBaseline = session.createdContracts.find((c) => c.supplierId === profile?.supplier.supplierId)
  const seedContract = CONTRACTS.find((c) => c.supplierId === profile?.supplier.supplierId)
  const contract = session.awardApproved && awardedBaseline ? awardedBaseline : seedContract
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draftNotes, setDraftNotes] = React.useState("")
  const [draftEvidence, setDraftEvidence] = React.useState("")
  const lateShipments = SHIPMENTS.filter(
    (row) => row.supplierId === profile?.supplier.supplierId && row.onTimeDelivery === 0 && (row.month ?? "").slice(0, 7) <= (session.asOfMonth ?? "2026-09"),
  ).slice(0, 4)
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
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{t("performance.subtitle", { shipments: actualShipmentCount(undefined, session.asOfMonth).toLocaleString("en-GB") })}</p>
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
              {t("performance.baseline")} {awardedBaseline && session.awardApproved ? awardedBaseline.contractId : contract?.contractId ?? "—"}
              {contract ? ` · OTD ${(contract.otdTarget ?? 0) * 100}% · ${t("vendor.acceptance")} ${(contract.acceptanceTarget ?? 0) * 100}%` : ` · ${t("vendor.noContracts")}`}
              {awardedBaseline?.rateBasis ? ` · ${awardedBaseline.rateBasis}` : ""}
              {awardedBaseline?.renewalTerms ? ` · ${awardedBaseline.renewalTerms}` : ""}
            </p>
            {profile.latest && (
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                {(() => {
                  const latest = profile.latest
                  if (!latest) return null
                  const prior = profile.months.length >= 2 ? profile.months[profile.months.length - 2] : null
                  const currentScore = computeScore(latest, profile.evidenceMonths)
                  const priorScore = prior ? computeScore(prior, profile.evidenceMonths) : null
                  const movement = currentScore && priorScore ? currentScore.total - priorScore.total : null
                  const late = lateShipments.length
                  return locale === "de"
                    ? `Abweichung im Zeitraum ${session.asOfMonth}: OTD ${((latest.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}% gegen Ziel. ${actualShipmentCount(profile.supplier.supplierId!, session.asOfMonth)} geprüfte Sendungen. Score ${currentScore ? formatFixed(currentScore.total, locale) : "—"}${movement !== null ? ` (${movement > 0 ? "+" : ""}${formatFixed(movement, locale)} gegenüber ${prior?.month?.slice(0, 7)})` : ""}. ${late} verspätete Sendungen und ${profile.incidents.length} Vorfälle in diesem Zeitraum. Die Prognose von 2.448 ist keine Ist-Menge.`
                    : `Variance for ${session.asOfMonth}: OTD ${((latest.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}% against target. ${actualShipmentCount(profile.supplier.supplierId!, session.asOfMonth)} verified shipments. Score ${currentScore ? formatFixed(currentScore.total, locale) : "—"}${movement !== null && prior ? ` (${movement > 0 ? "+" : ""}${formatFixed(movement, locale)} from ${prior.month?.slice(0, 7)})` : ""}. ${late} late shipments and ${profile.incidents.length} incidents in the selected period changed the latest month. The 2,448 figure is a sourcing forecast, not this total.`
                })()}
              </p>
            )}
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
                openActions.map((a) => {
                  const record = session.actionRecords.find((r) => r.id === a.actionId)
                  return (
                  <div key={a.actionId} className="rounded-[10px] border border-[var(--color-border-default)] px-3 py-2">
                    <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{a.title}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {a.actionId} · {record?.owner ?? a.owner} · {formatDateDMY(a.dueDate)} · {record?.status ?? a.status}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{a.recommendedAction}</p>
                    {editingId === a.actionId && (
                      <div className="mt-2 space-y-1">
                        <input
                          value={draftNotes}
                          onChange={(e) => setDraftNotes(e.target.value)}
                          placeholder={locale === "de" ? "Notiz" : "Notes"}
                          className="w-full rounded border border-[var(--color-border-default)] px-2 py-1 text-[11px]"
                        />
                        <input
                          value={draftEvidence}
                          onChange={(e) => setDraftEvidence(e.target.value)}
                          placeholder={locale === "de" ? "Abschlussnachweis" : "Closure evidence"}
                          className="w-full rounded border border-[var(--color-border-default)] px-2 py-1 text-[11px]"
                        />
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-[var(--color-brand-primary)]"
                          onClick={() => patchSession({
                            actionRecords: [
                              ...session.actionRecords.filter((r) => r.id !== a.actionId),
                              {
                                id: a.actionId!,
                                status: "edited",
                                owner: record?.owner ?? a.owner ?? "Supplier Manager",
                                dueDate: record?.dueDate ?? a.dueDate ?? "",
                                rationale: a.trigger ?? "",
                                notes: draftNotes,
                                closureEvidence: draftEvidence || undefined,
                              },
                            ],
                          })}
                        >
                          {locale === "de" ? "Notiz speichern" : "Save note"}
                        </button>
                      </div>
                    )}
                    {record?.closureEvidence && (
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{record.closureEvidence}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["accepted", "edited", "dismissed", "assigned", "closed"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="text-[11px] font-semibold text-[var(--color-brand-primary)]"
                          onClick={() => {
                            if (status === "edited") {
                              setEditingId(a.actionId ?? null)
                              setDraftNotes(record?.notes ?? "")
                              return
                            }
                            if (status === "closed") {
                              setEditingId(a.actionId ?? null)
                              setDraftEvidence(record?.closureEvidence ?? "")
                            }
                            patchSession({
                              actionRecords: [
                                ...session.actionRecords.filter((r) => r.id !== a.actionId),
                                {
                                  id: a.actionId!,
                                  status,
                                  owner: record?.owner ?? a.owner ?? "Supplier Manager",
                                  dueDate: record?.dueDate ?? a.dueDate ?? "",
                                  rationale: a.trigger ?? "",
                                  notes: record?.notes ?? "",
                                  closureEvidence: status === "closed" ? (draftEvidence || record?.closureEvidence) : record?.closureEvidence,
                                },
                              ],
                            })
                          }}
                        >
                          {status}
                        </button>
                      ))}
                      {a.actionId === "ACT-007" && (
                        <button type="button" className="text-[11px] font-semibold" onClick={() => openInbox("EML-011")}>
                          {locale === "de" ? "Deutschen Entwurf prüfen" : "Review German draft"}
                        </button>
                      )}
                    </div>
                  </div>
                  )
                })
              )}
              {lateShipments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                    {locale === "de" ? "Verspätete Sendungen" : "Late shipments"}
                  </p>
                  {lateShipments.map((row) => (
                    <p key={`${row.sHP00001}-${row.pickupDate}`} className="text-[11px] text-[var(--color-text-secondary)]">
                      {row.sHP00001} · {laneLabel(row.laneId)} · {formatDateDMY(row.actualDelivery)} · {locale === "de" ? "nicht pünktlich" : "not on time"}
                    </p>
                  ))}
                </div>
              )}
              {session.approvalTrace && (
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {session.approvalTrace.requirementSetVersion} → {session.approvalTrace.bidVersion} → {session.approvalTrace.scenarioId} → {session.approvalTrace.approverName} {formatDateDMY(session.approvalTrace.approvedAt)} → {session.approvalTrace.contractIds.join(", ")}
                  {session.approvalTrace.overrideReason ? ` · ${session.approvalTrace.overrideReason}` : ""}
                </p>
              )}
              {session.createdContracts.length > 0 && (
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {t("performance.newBaseline")} {session.createdContracts.map((c) => c.contractId).join(", ")} · {formatEur(session.createdContracts.reduce((s, c) => s + c.contractValueEur, 0), locale)}
                </p>
              )}
            </section>
          </div>

          {session.awardApproved && (
            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-2")}>
              <h3 className="text-[15px] font-semibold">{locale === "de" ? "Verlängerung" : "Renewal"}</h3>
              <dl className="grid gap-2 text-[12px] text-[var(--color-text-secondary)] sm:grid-cols-2">
                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Ablauf" : "Expiry"}</dt><dd>{awardedBaseline?.endDate ?? contract?.endDate ?? "31 December 2026"} · {awardedBaseline?.renewalTerms ?? "120-day notice"}</dd></div>
                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Ist gegen Zuschlag" : "Actual versus awarded"}</dt><dd>OTD {((profile.latest?.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}% / {((awardedBaseline?.otdTarget ?? contract?.otdTarget ?? 0) * 100).toFixed(1)}% · {formatEur(awardedBaseline?.contractValueEur ?? contract?.contractValueEur ?? 0, locale)}</dd></div>
                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Trend" : "Trend"}</dt><dd>{profile.latest?.trendFlag ?? "—"} · {profile.months.length} {locale === "de" ? "Monate bis" : "months through"} {session.asOfMonth}</dd></div>
                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Vorfälle" : "Incidents"}</dt><dd>{profile.incidents.length}</dd></div>
                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Maßnahmen" : "Actions"}</dt><dd>{openActions.filter((a) => (session.actionRecords.find((r) => r.id === a.actionId)?.status ?? "open") !== "closed" && (session.actionRecords.find((r) => r.id === a.actionId)?.status ?? "open") !== "dismissed").length} {locale === "de" ? "offen" : "still open"}</dd></div>
                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Lücke" : "Gap"}</dt><dd>{(profile.latest?.onTimeDeliveryPct ?? 1) < (awardedBaseline?.otdTarget ?? contract?.otdTarget ?? 0) ? (locale === "de" ? "OTD unter dem zugesagten Ziel" : "OTD below the awarded target") : (locale === "de" ? "Keine offene KPI-Lücke" : "No open KPI gap")}</dd></div>
                <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Nächster Schritt" : "Recommended next step"}</dt><dd>{locale === "de" ? "Neuausschreibung mit geprüfter Historie vorbereiten. Das kaufmännische Ergebnis wird nicht automatisch entschieden." : "Prepare a re-tender with verified history. The commercial outcome is not decided automatically."}</dd></div>
              </dl>
              <button
                type="button"
                className="rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white"
                disabled={session.journeyStep !== "s9" && session.journeyStep !== "s10"}
                onClick={() => {
                  if (session.journeyStep !== "s9" && session.journeyStep !== "s10") return
                  patchSession({ renewalEventId: "RFP-2027-001" })
                  advanceJourney("s10")
                  openTenderStudio("PKG-REN-001")
                }}
              >
                {session.renewalEventId
                  ? (locale === "de" ? `Ereignis ${session.renewalEventId} vorbefüllt` : `Event ${session.renewalEventId} prepopulated`)
                  : (locale === "de" ? "Neuausschreibung mit Historie anlegen" : "Create re-tender with verified history")}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default PerformancePage
