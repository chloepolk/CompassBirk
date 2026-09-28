"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { formatEurFigure } from "@/lib/compass/locale-display"
import { pcmCard } from "../_components/motion"
import { NOTIFY_DELEGATE } from "../_components/hub/active-user"
import { AWARD_SCENARIOS, scenarioById, scenarioText } from "@/lib/compass/logistics/award-scenarios"
import { awardBlock, journeyIndex } from "@/lib/compass/logistics/session"

export function AwardPage() {
  const t = useT()
  const { locale, session, confirmAward, retreatJourney, openBidEvaluation, patchSession } = useStore()
  const selected = session.selectedScenarioId ? scenarioById(session.selectedScenarioId) : null
  const selectedCopy = selected ? scenarioText(selected, locale === "de" ? "de" : "en") : null
  const money = (n: number) => formatEurFigure(n, locale === "de" ? "de" : "en")
  const [rationale, setRationale] = React.useState("")
  const [overrideOn, setOverrideOn] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const pending = session.journeyStep === "s6" || session.awardPending
  const approved = journeyIndex(session.journeyStep) >= 7
  const held = awardBlock(session)

  const approve = () => {
    if (overrideOn && rationale.trim().length < 8) {
      setNotice(locale === "de" ? "Eine Begründung ist erforderlich." : "A rationale is required.")
      return
    }
    confirmAward("PKG-RFP-001", { name: NOTIFY_DELEGATE.name, role: NOTIFY_DELEGATE.role }, {
      comment: rationale.trim(),
      overrideReason: overrideOn ? rationale.trim() : null,
    })
    setNotice(locale === "de" ? "Zuschlag freigegeben. Vertragsbaseline erstellt." : "Award approved. Contract baseline created.")
  }

  const returnForRevision = () => {
    if (rationale.trim().length < 8) {
      setNotice(locale === "de" ? "Eine Begründung ist erforderlich." : "A rationale is required.")
      return
    }
    patchSession({
      evaluationOverrides: [
        ...session.evaluationOverrides,
        {
          at: new Date().toISOString(),
          originalScenarioId: session.selectedScenarioId ?? "AWD-02",
          scenarioId: "returned",
          rationale: rationale.trim(),
        },
      ],
    })
    retreatJourney("s5")
    setNotice(locale === "de" ? "Zur Überarbeitung zurückgegeben." : "Returned for revision.")
    openBidEvaluation("PKG-RFP-001")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t("nav.award")}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
          {locale === "de"
            ? "Benannte Freigabe für RFP-2026-001. Kein Zuschlag wird vor dieser Freigabe erfasst."
            : "Named approval for RFP-2026-001. No award is recorded before this approval."}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          {locale === "de" ? "Freigebende Person" : "Approver"}: {NOTIFY_DELEGATE.name} · {NOTIFY_DELEGATE.role}
        </p>
        {selected && (
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            {locale === "de"
              ? `Herkunft: ${session.requirementSetVersion ?? "—"} · ${session.evaluationMethodVersion ?? "—"} · ${session.rfpVersion ?? "—"} · ${selected.id}. Die Empfehlung erzeugt den Zuschlag nicht.`
              : `Lineage: ${session.requirementSetVersion ?? "—"} · ${session.evaluationMethodVersion ?? "—"} · ${session.rfpVersion ?? "—"} · ${selected.id}. The recommendation does not create the award.`}
          </p>
        )}
      </div>

      {held && (
        <p className="rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
          {locale === "de" ? held.de : held.en}
        </p>
      )}

      {!selected && (
        <button
          type="button"
          onClick={() => openBidEvaluation("PKG-RFP-001")}
          className="rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white"
        >
          {locale === "de" ? "Szenario in der Angebotsbewertung wählen" : "Choose a scenario in Bid Evaluation"}
        </button>
      )}

      {selected && (
      <>
      <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-3")}>
        <h2 className="text-[16px] font-semibold">{selectedCopy?.title}</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)]">{selectedCopy?.why}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            [locale === "de" ? "Kosten" : "Cost", money(selected.costEur)],
            [locale === "de" ? "Service" : "Service", selectedCopy?.service ?? ""],
            [locale === "de" ? "Kapazität" : "Capacity", selectedCopy?.capacity ?? ""],
            [locale === "de" ? "Konzentration" : "Concentration", selectedCopy?.concentration ?? ""],
            [locale === "de" ? "Historie" : "History", selectedCopy?.history ?? ""],
            [locale === "de" ? "Nachhaltigkeit" : "Sustainability", selectedCopy?.sustainability ?? ""],
            [locale === "de" ? "Übergangsrisiko" : "Transition risk", selectedCopy?.transitionRisk ?? ""],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
              <p className="text-[13px] font-medium">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {locale === "de" ? "Annahmen" : "Assumptions"}: {selectedCopy?.assumptions}
        </p>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {locale === "de" ? "Ausnahmen" : "Exceptions"}: {selectedCopy?.exceptions}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[14px] font-semibold">{locale === "de" ? "Alternativen" : "Alternatives"}</h2>
        {AWARD_SCENARIOS.filter((s) => s.id !== selected.id).map((alt) => {
          const copy = scenarioText(alt, locale === "de" ? "de" : "en")
          return (
          <div key={alt.id} className="rounded-[12px] border border-[var(--color-border-default)] px-4 py-3">
            <p className="text-[13px] font-medium">{copy.title} · {money(alt.costEur)}</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">{copy.whyNot}</p>
          </div>
          )
        })}
      </section>
      </>
      )}

      {session.approvalTrace && (
        <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-[12px] text-[var(--color-text-secondary)]")}>
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{locale === "de" ? "Nachverfolgung" : "Trace"}</h2>
          <p className="mt-1">
            {session.approvalTrace.requirementSetVersion} · {session.approvalTrace.evaluationMethodVersion} · {session.approvalTrace.rfpVersion} → {session.approvalTrace.bidVersion} → {session.approvalTrace.scenarioId} → {session.approvalTrace.approverName} ({session.approvalTrace.approverRole}) {session.approvalTrace.approvedAt.slice(0, 10)} → {session.approvalTrace.contractIds.join(", ")}
          </p>
          {session.approvalTrace.comment && <p className="mt-1">{session.approvalTrace.comment}</p>}
          {session.approvalTrace.overrideReason && <p className="mt-1">{session.approvalTrace.overrideReason}</p>}
        </section>
      )}

      {(pending || approved) && (
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={overrideOn} onChange={(e) => setOverrideOn(e.target.checked)} />
            {locale === "de" ? "Autorisierte Abweichung" : "Authorised override"}
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder={locale === "de" ? "Begründung" : "Rationale"}
            className="w-full rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px]"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={approved} onClick={approve} className="rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
              {approved ? (locale === "de" ? "Zuschlag freigegeben" : "Award approved") : (locale === "de" ? "Zuschlag freigeben" : "Approve award")}
            </button>
            <button type="button" onClick={returnForRevision} className="rounded-[10px] border border-[var(--color-border-default)] px-4 py-2 text-[13px] font-semibold">
              {locale === "de" ? "Zurückgeben" : "Return for revision"}
            </button>
          </div>
          {notice && <p className="text-[12px] text-[var(--color-text-secondary)]">{notice}</p>}
          {approved && session.createdContracts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[14px] font-semibold">{locale === "de" ? "Vertragsbaseline" : "Contract baseline"}</h2>
              {session.createdContracts.map((c) => (
                <div key={c.contractId} className="rounded-[12px] border border-[var(--color-border-default)] px-4 py-3 text-[12px]">
                  <p className="font-medium">{c.contractTitle}</p>
                  <p>{c.contractId} · {money(c.contractValueEur)} · OTD {(c.otdTarget * 100).toFixed(1)}%</p>
                  <p className="text-[var(--color-text-muted)]">{c.startDate} – {c.endDate} · {c.rateBasis ?? "Lane rates from selected scenario"} · {c.renewalTerms ?? "120-day notice"}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
