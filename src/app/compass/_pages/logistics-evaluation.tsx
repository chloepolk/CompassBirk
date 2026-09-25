"use client"

import * as React from "react"
import { useStore } from "../_store"
import { AWARD_SCENARIOS } from "@/lib/compass/logistics/award-scenarios"
import { formatEur } from "../_i18n/currency"

const METHOD = [
  { name: "Normalised cost", weight: "30%", note: "Lane rate plus disclosed fuel surcharge, EUR. Original rate card stays attached." },
  { name: "Service / SLA", weight: "25%", note: "OTD, acceptance, claims and invoice accuracy against SRC-002." },
  { name: "Capacity / coverage", weight: "20%", note: "Lanes offered versus the 18-lane requirement." },
  { name: "Implementation / visibility", weight: "15%", note: "API, EDI or daily file, SRC-006." },
  { name: "Sustainability", weight: "10%", note: "Emissions reporting, SRC-007. Not a qualification gate." },
]

export function LogisticsEvaluationPanel() {
  const { locale, session, patchSession, advanceJourney, openAward } = useStore()
  const de = locale === "de"
  const [scenarioId, setScenarioId] = React.useState(session.selectedScenarioId ?? "AWD-02")
  const [override, setOverride] = React.useState("")
  const [audit, setAudit] = React.useState<string[]>([])
  const selected = AWARD_SCENARIOS.find((s) => s.id === scenarioId) ?? AWARD_SCENARIOS[1]

  const recommend = () => {
    const originalScenarioId = "AWD-02"
    const rationale = override.trim()
    if (scenarioId !== originalScenarioId && rationale.length < 8) return
    const entry = {
      at: new Date().toISOString(),
      originalScenarioId,
      scenarioId,
      rationale: rationale || "Accepted the preferred scenario.",
    }
    patchSession({
      selectedScenarioId: scenarioId,
      evaluationOverrides: [...session.evaluationOverrides, entry],
    })
    advanceJourney("s6")
    setAudit((prev) => [...prev, `${entry.at} recommendation ${scenarioId}${rationale ? ` override: ${rationale}` : ""}`])
    openAward()
  }

  return (
    <section className="space-y-4 rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5">
      <div>
        <h3 className="text-[15px] font-semibold">{de ? "Logistik-Bewertungsmethode EVAL-LOG-v1" : "Logistics evaluation method EVAL-LOG-v1"}</h3>
        <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
          {de
            ? "Qualifikationstore laufen vor der Gewichtung. No History ist kein Nullwert und kein automatischer Abzug."
            : "Qualification gates run before weighting. No History is not zero and is not an automatic penalty."}
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {METHOD.map((row) => (
          <li key={row.name} className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px]">
            <p className="font-medium">{row.name} · {row.weight}</p>
            <p className="text-[var(--color-text-muted)]">{row.note}</p>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-[var(--color-text-secondary)]">
        {de
          ? "Normalisierung: Relationenrate in EUR, Kraftstoffzuschlag nach SRC-005, Ausschlüsse separat. Formel: normalisierte Rate = Angebotsrate × (1 + Zuschlag). Annahme: bestätigte aktuelle Version."
          : "Normalisation: lane rate in EUR, fuel surcharge per SRC-005, exclusions kept separate. Formula: normalised rate = quoted rate × (1 + surcharge). Assumption: confirmed current version. Originals remain on the attachment."}
      </p>
      <div className="space-y-2">
        <h4 className="text-[13px] font-semibold">{de ? "Szenarien" : "Scenarios"}</h4>
        {AWARD_SCENARIOS.map((s) => (
          <label key={s.id} className="flex cursor-pointer gap-2 rounded-[10px] border border-[var(--color-border-default)] px-3 py-2 text-[12px]">
            <input type="radio" name="scenario" checked={scenarioId === s.id} onChange={() => setScenarioId(s.id)} />
            <span>
              <span className="font-medium">{s.title}</span> · {formatEur(s.costEur, locale)} · {s.service} · {s.capacity} · {s.concentration} · {s.transitionRisk} · {s.history}
              <span className="mt-0.5 block text-[var(--color-text-muted)]">{s.why} {s.id !== "AWD-02" ? s.whyNot : ""}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-[12px] text-[var(--color-text-secondary)]">
        {de ? "Empfehlung" : "Recommendation"}: {selected.why} {de ? "Annahmen" : "Assumptions"}: {selected.assumptions} {de ? "Ausnahmen" : "Exceptions"}: {selected.exceptions}
      </p>
      <textarea
        value={override}
        onChange={(e) => setOverride(e.target.value)}
        rows={2}
        placeholder={de ? "Abweichung nur mit Begründung. Das Original bleibt im Prüfpfad." : "Override only with a rationale. The original recommendation stays in the audit history."}
        className="w-full rounded-[10px] border border-[var(--color-border-default)] px-3 py-2 text-[12px]"
      />
      <button type="button" onClick={recommend} className="rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white">
        {de ? "Empfehlung zur Freigabe" : "Recommend for approval"}
      </button>
      {audit.length > 0 && (
        <ul className="text-[11px] text-[var(--color-text-muted)]">
          {audit.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
    </section>
  )
}
