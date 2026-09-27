"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { ANALYSIS_STEPS, REQUIREMENTS, SOURCE_CLASSES } from "@/lib/compass/logistics/requirements"
import { isDismissalRationale, journeyIndex, recordRequirementDecision, type ResolutionChoice } from "@/lib/compass/logistics/session"

type DecisionDraft = { choice: ResolutionChoice | ""; rationale: string }

const EMPTY_DRAFT: DecisionDraft = { choice: "", rationale: "" }

export function RequirementGovernance() {
  const { locale, session, patchSession, advanceJourney } = useStore()
  const [passageId, setPassageId] = React.useState<string | null>(null)
  const [editingIds, setEditingIds] = React.useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = React.useState<Record<string, DecisionDraft>>({})
  const [rowNotice, setRowNotice] = React.useState<Record<string, string>>({})
  const [methodApproved, setMethodApproved] = React.useState(session.evaluationMethodApproved)
  const choices: { id: ResolutionChoice; en: string; de: string }[] = [
    { id: "use-source-a", en: "Use source A", de: "Quelle A verwenden" },
    { id: "use-source-b", en: "Use source B", de: "Quelle B verwenden" },
    { id: "accept-gap", en: "Accept as an approved gap", de: "Als genehmigte Lücke akzeptieren" },
    { id: "request-information", en: "Request information", de: "Information anfordern" },
    { id: "exclude-scope", en: "Exclude from scope", de: "Aus dem Umfang nehmen" },
  ]
  const de = locale === "de"
  const choiceLabel = (id: ResolutionChoice) => choices.find((row) => row.id === id)?.[de ? "de" : "en"] ?? id
  const material = REQUIREMENTS.filter((r) => r.state !== "clear")
  const resolvedIds = new Set(session.requirementDecisions.map((d) => d.id))
  const unresolved = material.filter((r) => !resolvedIds.has(r.id))
  const locked = journeyIndex(session.journeyStep) >= 3

  const draftFor = (id: string): DecisionDraft => drafts[id] ?? EMPTY_DRAFT

  const writeDraft = (id: string, patch: Partial<DecisionDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...EMPTY_DRAFT, ...prev[id], ...patch } }))
    setRowNotice((prev) => (prev[id] ? { ...prev, [id]: "" } : prev))
  }

  const resolve = (id: string) => {
    const draft = draftFor(id)
    if (!draft.choice) {
      setRowNotice((prev) => ({
        ...prev,
        [id]: de ? "Wählen Sie eine Entscheidung, bevor Sie speichern." : "Choose a decision before saving.",
      }))
      return
    }
    if (isDismissalRationale(draft.rationale)) {
      setRowNotice((prev) => ({
        ...prev,
        [id]: de ? "Dieser Text ist keine Entscheidung." : "That text is not a decision.",
      }))
      return
    }
    if (draft.rationale.trim().length < 8) {
      setRowNotice((prev) => ({
        ...prev,
        [id]: de
          ? "Die Begründung wird getrennt gespeichert und braucht mindestens 8 Zeichen."
          : "The rationale is saved separately and needs at least 8 characters.",
      }))
      return
    }
    patchSession(recordRequirementDecision(session, { id, decision: draft.choice, rationale: draft.rationale.trim() }))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setEditingIds((prev) => ({ ...prev, [id]: false }))
    setRowNotice((prev) => ({ ...prev, [id]: "" }))
  }

  const beginRevise = (id: string, saved: { decision: ResolutionChoice; rationale: string }) => {
    setEditingIds((prev) => ({ ...prev, [id]: true }))
    setDrafts((prev) => ({
      ...prev,
      [id]: prev[id] ?? { choice: saved.decision, rationale: saved.rationale },
    }))
    setRowNotice((prev) => ({ ...prev, [id]: "" }))
  }

  React.useEffect(() => {
    if (session.journeyStep === "s2" && session.evaluationMethodApproved && unresolved.length === 0) {
      advanceJourney("s3")
    }
  }, [session.journeyStep, session.evaluationMethodApproved, unresolved.length, advanceJourney])

  const approveRequirements = () => {
    if (unresolved.length > 0 || session.journeyStep !== "s2" || !methodApproved) return
    patchSession({ evaluationMethodApproved: true })
  }

  return (
    <section className="space-y-4 rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
          {de ? "Anforderungssteuerung" : "Requirement governance"}
        </h2>
        <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
          {de
            ? "Die Ausgabe bleibt gesperrt, solange eine wesentliche Ausnahme offen ist."
            : "Issue stays blocked while a material exception is unresolved."}
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {ANALYSIS_STEPS.filter((step) => session.rfpGenerated || (step.id !== "draft" && step.id !== "review")).map((step, i) => (
          <li key={step.id} className="rounded-[10px] bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px]">
            <span className="font-medium">{i + 1}. {step.label}</span>
            <span className="mt-0.5 block text-[var(--color-text-muted)]">{step.count}</span>
          </li>
        ))}
      </ol>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="py-1 pr-2">{de ? "Anforderung" : "Requirement"}</th>
              <th className="py-1 pr-2">{de ? "Quelle" : "Source"}</th>
              <th className="py-1 pr-2">{de ? "Status" : "State"}</th>
              <th className="py-1">{de ? "Entscheidung" : "Decision"}</th>
            </tr>
          </thead>
          <tbody>
            {REQUIREMENTS.map((row) => {
              const decision = session.requirementDecisions.find((d) => d.id === row.id)
              const draft = draftFor(row.id)
              const editing = row.state !== "clear" && (!decision || editingIds[row.id])
              return (
                <tr key={row.id} className="border-t border-[var(--color-border-default)] align-top">
                  <td className="py-2 pr-2">
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => setPassageId(passageId === row.id ? null : row.id)}>
                      {row.requirement}
                    </button>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{row.category} · {row.mandatory ? (de ? "verbindlich" : "mandatory") : (de ? "optional" : "optional")} · {row.confidence}</p>
                    {passageId === row.id && (
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{row.source} {row.sourceVersion} §{row.section}: {row.passage}</p>
                    )}
                  </td>
                  <td className="py-2 pr-2">{row.source} {row.sourceVersion} §{row.section}</td>
                  <td className="py-2 pr-2">{row.state}</td>
                  <td className="py-2">
                    {row.state === "clear" ? (de ? "Keine Aktion" : "No action") : decision && !editing ? (
                      <div className="space-y-1">
                        <p className="font-medium">{choiceLabel(decision.decision)}</p>
                        <p>{decision.rationale}</p>
                        {locked && (
                          <button type="button" className="text-[11px] font-semibold text-[var(--color-brand-primary)]" onClick={() => beginRevise(row.id, decision)}>
                            {de ? "Neue Version" : "Revise as new version"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <select
                          aria-label={de ? "Entscheidung" : "Decision"}
                          value={draft.choice}
                          onChange={(e) => writeDraft(row.id, { choice: e.target.value as ResolutionChoice | "" })}
                          className="w-full rounded border border-[var(--color-border-default)] px-2 py-1"
                        >
                          <option value="">{de ? "Entscheidung wählen" : "Choose a decision"}</option>
                          {choices.map((option) => (
                            <option key={option.id} value={option.id}>{de ? option.de : option.en}</option>
                          ))}
                        </select>
                        <input
                          aria-label={de ? "Begründung" : "Rationale"}
                          value={draft.rationale}
                          onChange={(e) => writeDraft(row.id, { rationale: e.target.value })}
                          placeholder={de ? "Begründung, getrennt von der Entscheidung" : "Rationale, separate from the decision"}
                          className="w-full rounded border border-[var(--color-border-default)] px-2 py-1"
                        />
                        {isDismissalRationale(draft.rationale) && (
                          <p className="text-[11px] text-[var(--color-accent-warning-text)]">
                            {de ? "Dieser Text ist keine Entscheidung." : "That text is not a decision."}
                          </p>
                        )}
                        {rowNotice[row.id] && (
                          <p className="text-[11px] text-[var(--color-accent-warning-text)]">{rowNotice[row.id]}</p>
                        )}
                        <button type="button" onClick={() => resolve(row.id)} className="text-[11px] font-semibold text-[var(--color-brand-primary)]">
                          {locked ? (de ? "Als neue Version speichern" : "Save as new version") : (de ? "Ausnahme schließen" : "Resolve exception")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)]">
        {de ? "Quellenklassen" : "Source classes"}: {SOURCE_CLASSES.join("; ")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={methodApproved || locked}
            disabled={locked}
            onChange={(e) => setMethodApproved(e.target.checked)}
          />
          {de ? "Bewertungsmethode EVAL-LOG-v1 freigeben" : "Approve evaluation method EVAL-LOG-v1"}
        </label>
        <button
          type="button"
          disabled={unresolved.length > 0 || locked || session.journeyStep !== "s2" || !methodApproved}
          onClick={approveRequirements}
          className={cn("rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40")}
        >
          {locked
            ? (de ? `Anforderungen ${session.requirementSetVersion}` : `Requirements ${session.requirementSetVersion}`)
            : (de ? "Anforderungen freigeben" : "Approve requirements")}
        </button>
        {locked && (
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            {session.rfpGenerated
              ? (session.rfpApproved
                ? (de ? `${session.rfpVersion} ist freigegeben.` : `${session.rfpVersion} is approved.`)
                : (de ? `Entwurf ${session.rfpVersion} steht zur Prüfung. Die Freigabe erfolgt am Dokument.` : `Draft ${session.rfpVersion} is ready for review. Approve it on the document.`))
              : (de ? "Erzeugen Sie die zitierte Ausschreibung aus dieser Baseline." : "Generate the cited RFP from this baseline.")}
          </p>
        )}
        {unresolved.length > 0 && (
          <p className="text-[12px] text-[var(--color-accent-warning-text)]">
            {de ? `${unresolved.length} wesentliche Ausnahme offen` : `${unresolved.length} material exception open`}
          </p>
        )}
        {locked && (
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            {de ? "Bewertungsmethode" : "Evaluation method"} {session.evaluationMethodVersion}. {de ? "Deutsch ist eine verknüpfte Übersetzung." : "German is a linked translation. Amounts, lane IDs and citations are unchanged."}
          </p>
        )}
      </div>
    </section>
  )
}
