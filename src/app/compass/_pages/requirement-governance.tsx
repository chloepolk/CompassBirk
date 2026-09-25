"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { ANALYSIS_STEPS, REQUIREMENTS, SOURCE_CLASSES } from "@/lib/compass/logistics/requirements"
import { journeyIndex, recordRequirementDecision } from "@/lib/compass/logistics/session"

export function RequirementGovernance() {
  const { locale, session, patchSession, advanceJourney } = useStore()
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [rationale, setRationale] = React.useState("")
  const de = locale === "de"
  const material = REQUIREMENTS.filter((r) => r.state !== "clear")
  const resolvedIds = new Set(session.requirementDecisions.map((d) => d.id))
  const unresolved = material.filter((r) => !resolvedIds.has(r.id))
  const locked = journeyIndex(session.journeyStep) >= 3

  const resolve = (id: string) => {
    if (rationale.trim().length < 8) return
    patchSession(recordRequirementDecision(session, { id, decision: "resolved", rationale: rationale.trim() }))
    setRationale("")
    setOpenId(null)
  }

  const approveRequirements = () => {
    if (unresolved.length > 0 || session.journeyStep !== "s2") return
    advanceJourney("s3")
  }

  const approveRfp = () => {
    if (!session.packageLocked || session.rfpApproved) return
    patchSession({ rfpApproved: true, rfpVersion: session.rfpVersion ?? "RFP-2026-001-v1" })
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
        {ANALYSIS_STEPS.map((step, i) => (
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
              return (
                <tr key={row.id} className="border-t border-[var(--color-border-default)] align-top">
                  <td className="py-2 pr-2">
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpenId(openId === row.id ? null : row.id)}>
                      {row.requirement}
                    </button>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{row.category} · {row.mandatory ? (de ? "verbindlich" : "mandatory") : (de ? "optional" : "optional")} · {row.confidence}</p>
                    {openId === row.id && (
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{row.source} §{row.section}: {row.passage}</p>
                    )}
                  </td>
                  <td className="py-2 pr-2">{row.source} §{row.section}</td>
                  <td className="py-2 pr-2">{row.state}</td>
                  <td className="py-2">
                    {row.state === "clear" ? (de ? "Keine Aktion" : "No action") : decision && openId !== row.id ? (
                      <div className="space-y-1">
                        <p>{decision.rationale}</p>
                        {locked && (
                          <button type="button" className="text-[11px] font-semibold text-[var(--color-brand-primary)]" onClick={() => { setOpenId(row.id); setRationale(decision.rationale) }}>
                            {de ? "Neue Version" : "Revise as new version"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          value={openId === row.id ? rationale : ""}
                          onFocus={() => setOpenId(row.id)}
                          onChange={(e) => { setOpenId(row.id); setRationale(e.target.value) }}
                          placeholder={de ? "Begründung" : "Rationale"}
                          className="w-full rounded border border-[var(--color-border-default)] px-2 py-1"
                        />
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
        <button
          type="button"
          disabled={unresolved.length > 0 || locked || session.journeyStep !== "s2"}
          onClick={approveRequirements}
          className={cn("rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40")}
        >
          {locked
            ? (de ? `Anforderungen ${session.requirementSetVersion}` : `Requirements ${session.requirementSetVersion}`)
            : (de ? "Anforderungen freigeben" : "Approve requirements")}
        </button>
        {locked && (
          <button
            type="button"
            disabled={session.rfpApproved}
            onClick={approveRfp}
            className={cn("rounded-[10px] border border-[var(--color-border-default)] px-4 py-2 text-[13px] font-semibold disabled:opacity-40")}
          >
            {session.rfpApproved
              ? (de ? `Ausschreibung ${session.rfpVersion} freigegeben` : `RFP ${session.rfpVersion} approved`)
              : (de ? "Zitierte Ausschreibung freigeben" : "Approve cited RFP")}
          </button>
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
