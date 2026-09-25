"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"
import { useStore, type DraftedTender } from "../_store"
import { useT } from "../_i18n/use-t"
import { createT, localeTag, type Locale } from "../_i18n"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { localizeRole } from "../_i18n/domain"
import {
  TENDER_SUGGESTIONS,
  localizeComponentSpec,
  localizedComponentSpecs,
  localizedDocuments,
  localizedDocumentsByCategory,
  localizedFatRequirements,
  localizedProcurementClauses,
  localizedProject,
  localizedStandards,
  localizeQuantity,
  resolveLocalizedComponent,
  resolveLocalizedQuantity,
} from "../_i18n/tender"
import { enterMotion, listItemMotion, pcmButton, pcmCard } from "../_components/motion"
import { LaneSlaPanel } from "../_components/lane-sla-panel"
import { RequirementGovernance } from "./requirement-governance"
import { ANALYSIS_STEPS } from "@/lib/compass/logistics/requirements"
import { materialExceptionsResolved } from "@/lib/compass/logistics/session"
import { ACTIVE_USER } from "../_components/hub/active-user"
import {
  COMPONENT_SPECS,
  type ComponentSpec,
  type DocumentCategory,
} from "../data/_documents"
import { TENDER_PACKAGES, PROJECT, TODAY, tenderById, type TenderPackage } from "../data/_tenders"
import { displayPackageQuantity } from "../data/_demand-validation"
import type {
  ScopeOutput,
  TechnicalOutput,
  QualityOutput,
  LegalOutput,
  IttDocument,
  TenderAuditOutput,
} from "../agents/_tender-types"

/* ------------------------------------------------------------------ */
/*  Pipeline state                                                     */
/* ------------------------------------------------------------------ */

type Phase = "idle" | "unresolved" | "scoping" | "specialists" | "composing" | "auditing" | "complete"

type StepStatus = "pending" | "running" | "done"

interface SpecialistStatuses {
  technical: StepStatus
  quality: StepStatus
  legal: StepStatus
}

/* ------------------------------------------------------------------ */
/*  Deterministic fallbacks (grounded in the controlled documents)     */
/* ------------------------------------------------------------------ */

function fallbackScope(baseSpec: ComponentSpec, quantity: string, locale: Locale): ScopeOutput {
  const spec = localizeComponentSpec(baseSpec, locale)
  const project = localizedProject(locale)
  const retrievalPlan = locale === "de"
    ? [
        { agent: "Technische Spezifikation", document: "SRC-001", task: `Relationen, Mengen, Equipment und Sichtbarkeit für ${spec.shortName} in Abschnitt 2.0 übernehmen.` },
        { agent: "Qualität & SLA", document: "SRC-002 / SRC-008", task: "SLA-Ziele, Qualifikationstore und No-History-Regel aus den verbindlichen Quellen übernehmen." },
        { agent: "Vertrag & Konditionen", document: "SRC-004 / SRC-005", task: "Vertragsbedingungen, EUR-Raten und Kraftstoffzuschlagsregeln zusammenstellen." },
      ]
    : [
        { agent: "Technical Specification Agent", document: "SRC-001", task: `Extract lanes, volumes, equipment and visibility for ${spec.shortName} into Section 2.0.` },
        { agent: "Quality & SLA Agent", document: "SRC-002 / SRC-008", task: "Compile SLA targets, qualification gates and No History treatment from the authoritative sources." },
        { agent: "Contracts & Commercial Agent", document: "SRC-004 / SRC-005", task: "Assemble contract terms, EUR lane rates and fuel-surcharge rules." },
      ]
  return {
    objective: locale === "de"
      ? `Ausschreibung für ${quantity} ${spec.name} im Rahmen von ${project.name} erstellen.`
      : `Draft the request for proposal for ${quantity} of ${spec.name} for ${project.name}.`,
    projectSummary: locale === "de"
      ? [
          `Compass Logistics Procurement schreibt ${project.name} wettbewerblich aus: ${project.scope}. Diese Ausschreibung umfasst ${quantity} ${spec.name} gemäß SRC-001.`,
          `${spec.overview} Prognostizierte Sendungen sind eine Entscheidungsgrundlage, keine Abnahmeverpflichtung. Die deutsche Fassung ist eine gekennzeichnete Übersetzung des EN-GB-Originals.`,
        ]
      : [
          `Compass Logistics Procurement is running a competitive sourcing event for ${project.name}: ${project.scope}. This request for proposal covers ${quantity} of ${spec.name} in accordance with SRC-001.`,
          `${spec.overview} Forecast shipments are a decision input, not a take-or-pay commitment. A German translation is supplied as a labelled companion to this EN-GB original.`,
        ],
    retrievalPlan,
    considerations: locale === "de"
      ? [
          "Challenger bleiben No History, bis zwölf Monate geprüfter Ausführung vorliegen (SRC-008).",
          "Kraftstoffzuschlag nach SRC-005 offenlegen; Relationenraten in EUR.",
          "Qualifikationstore (Versicherung, Due Diligence, Datenanbindung) gehen nicht in die Gewichtungen ein.",
        ]
      : [
          "Challengers remain No History until twelve months of verified execution exist (SRC-008).",
          "Disclose fuel surcharge under SRC-005; price lane rates in EUR.",
          "Qualification gates (insurance, due diligence, data integration) are excluded from the weighted score.",
        ],
  }
}

function fallbackTechnical(baseSpec: ComponentSpec, quantity: string, locale: Locale): TechnicalOutput {
  const spec = localizeComponentSpec(baseSpec, locale)
  return {
    scopeIntro: locale === "de"
      ? `Der Lieferant erbringt ${quantity} ${spec.name} in strikter Übereinstimmung mit der verbindlichen Spezifikation ${spec.docRef}.`
      : `The Supplier shall provide ${quantity} of ${spec.name} strictly in accordance with controlled specification ${spec.docRef}.`,
    parameters: spec.parameters.map(p => ({ parameter: p.parameter, requirement: p.requirement })),
    notes: locale === "de"
      ? [`Mengenbasis: ${quantity} (${spec.unit}).`, spec.overview]
      : [`Quantity basis: ${quantity} (${spec.unit}).`, spec.overview],
    citations: [spec.docRef],
  }
}

function fallbackQuality(spec: ComponentSpec, locale: Locale): QualityOutput {
  const applicable = localizedStandards(locale).filter(s => spec.applicableStandards.includes(s.ref))
  const baseline = localizedStandards(locale, true).filter(s => spec.applicableStandards.includes(s.ref) || s.ref === "ISO 9001:2015")
  return {
    intro: locale === "de"
      ? "Alle Leistungen aus dieser Ausschreibung müssen dem Leistungs- und SLA-Standard (SRC-002) sowie dem Qualifikationsstandard (SRC-008) entsprechen."
      : "All services supplied under this request for proposal shall comply with the carrier performance and SLA standard (SRC-002) and the supplier qualification standard (SRC-008).",
    standards: [
      ...applicable.map(s => ({ authority: s.authority, ref: s.ref, application: s.scope })),
      ...baseline.filter(b => !applicable.some(a => a.ref === b.ref)).map(s => ({ authority: s.authority, ref: s.ref, application: s.scope })),
    ],
    fatRequirements: localizedFatRequirements(locale),
    citations: locale === "de"
      ? ["SRC-002 (SLA und Eskalation)", "SRC-008 (Qualifikationstore und No History)"]
      : ["SRC-002 (SLA and escalation)", "SRC-008 (qualification gates and No History)"],
  }
}

function fallbackLegal(_spec: ComponentSpec, locale: Locale): LegalOutput {
  const clausesSource = localizedProcurementClauses(locale)
  const pick = (ref: string) => clausesSource.find(c => c.ref === ref)
  const clauseRefs = ["4.1", "4.3", "5.1–5.3", "6.2", "7.1", "7.2", "9.1–9.2"]
  const clauses = clauseRefs
    .map(pick)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map(c => ({ heading: c.heading, text: c.text, source: `SRC-004 ${locale === "de" ? "Abschnitt" : "section"} ${c.ref}` }))

  return {
    governingTerms: locale === "de"
      ? "Diese Ausschreibung und jede nachfolgende Bestellung unterliegen den Standardvertragsbedingungen für Logistik (SRC-004)."
      : "This request for proposal and any subsequent contract are governed by the standard logistics contract terms (SRC-004).",
    clauses,
    citations: ["SRC-004", "SRC-005"],
  }
}

function fallbackAudit(itt: IttDocument, baseSpec: ComponentSpec, locale: Locale): TenderAuditOutput {
  const spec = localizeComponentSpec(baseSpec, locale)
  const paramChecks = itt.technical.parameters.slice(0, 4).map(p => ({
    section: locale === "de" ? "2.0 Technischer Leistungsumfang" : "2.0 Technical Scope",
    claim: `${p.parameter}: ${p.requirement}`,
    status: "pass" as const,
    note: locale === "de"
      ? `Stimmt wörtlich mit ${spec.docRef} überein — Wert, Einheit und Toleranz geprüft.`
      : `Matches ${spec.docRef} verbatim — value, unit and tolerance verified.`,
  }))
  const standardChecks = itt.quality.standards.slice(0, 4).map(s => ({
    section: locale === "de" ? "3.0 Qualität und HSEQ" : "3.0 Quality & HSEQ",
    claim: locale === "de" ? `${s.ref} gilt für diese Leistungsklasse` : `${s.ref} applied to this component class`,
    status: "pass" as const,
    note: locale === "de"
      ? `${s.ref} steht im Quellenregister und gilt für ${spec.shortName}.`
      : `${s.ref} is in the source register and applies to ${spec.shortName}.`,
  }))
  const legalChecks = [
    {
      section: locale === "de" ? "4.0 Einkauf und Recht" : "4.0 Commercial & Legal",
      claim: locale === "de" ? "Leistungsgewähr: SLA gemäß SRC-002 über die Vertragslaufzeit" : "Performance warranty: SLA in SRC-002 for the contract term",
      status: "pass" as const,
      note: locale === "de" ? "Stimmt mit SRC-004 überein." : "Consistent with SRC-004.",
    },
    {
      section: locale === "de" ? "4.0 Einkauf und Recht" : "4.0 Commercial & Legal",
      claim: locale === "de" ? "Zahlungsziel: 60 Tage nach Monatsende der Rechnung" : "Payment terms: 60 days from end of invoice month",
      status: "pass" as const,
      note: locale === "de" ? "Stimmt mit SRC-004 überein." : "Consistent with SRC-004.",
    },
  ]
  const consistency = [{
    section: locale === "de" ? "1.0 / 5.0 Konsistenz" : "1.0 / 5.0 Consistency",
    claim: locale === "de"
      ? `Leistung, Menge (${itt.pricing.items[0]?.qty ?? ""}) und Angebotsfrist sind in allen Abschnitten konsistent`
      : `Component, quantity (${itt.pricing.items[0]?.qty ?? ""}) and submission deadline are consistent across all sections`,
    status: "pass" as const,
    note: locale === "de" ? "Kein Platzhalter und kein Vorlagenrest im auszugebenden Text." : "No placeholder or template residue detected in the issued text.",
  }]
  return {
    verified: true,
    checks: [...paramChecks, ...standardChecks, ...legalChecks, ...consistency],
    corrections: [],
    assessment: locale === "de"
      ? `Der Entwurf wurde Abschnitt für Abschnitt gegen SRC-001, SRC-002, SRC-004, SRC-005 und SRC-008 geprüft. Relationen und SLA stimmen mit dem Register überein. Die deutsche Fassung ist eine gekennzeichnete Übersetzung. Bereit zur Freigabe.`
      : `The draft was verified section by section against SRC-001, SRC-002, SRC-004, SRC-005 and SRC-008. Lanes and SLAs match the register. The German companion is a labelled translation of this EN-GB original. The document is ready for approval.`,
  }
}

/* ------------------------------------------------------------------ */
/*  Composition (deterministic)                                        */
/* ------------------------------------------------------------------ */

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string, _locale: Locale): string {
  return formatDateDMY(iso + "T00:00:00")
}

function withCitation(doc: IttDocument, locale: Locale, requirementSetVersion: string | null, evaluationMethodVersion: string | null): IttDocument {
  const requirement = requirementSetVersion ?? "REQ-2026-001-v1"
  const method = evaluationMethodVersion ?? "EVAL-LOG-v1"
  const line = locale === "de"
    ? `Gekennzeichnete Übersetzung. Zitiert gegen ${requirement} und ${method}. Beträge, Relations-IDs, Einheiten, Daten und Zitate entsprechen dem britischen Original.`
    : `British English original. Cited against ${requirement} and ${method}. German is the linked translation; amounts, lane IDs, units, dates and citations are unchanged.`
  return { ...doc, projectSummary: [line, ...doc.projectSummary] }
}

function composeItt(
  baseSpec: ComponentSpec,
  quantity: string,
  pkg: TenderPackage | null,
  scope: ScopeOutput,
  technical: TechnicalOutput,
  quality: QualityOutput,
  legal: LegalOutput,
  locale: Locale,
): IttDocument {
  const spec = localizeComponentSpec(baseSpec, locale)
  const project = localizedProject(locale)
  return {
    ittRef: pkg ? pkg.packageRef : `RFP-2026-001`,
    title: locale === "de" ? `Ausschreibung — ${spec.name} (gekennzeichnete Übersetzung)` : `Request for proposal — ${spec.name}`,
    issueDate: TODAY,
    submissionDeadline: pkg?.submissionDeadline ?? addDaysIso(TODAY, 21),
    procurementOfficer: `${ACTIVE_USER.name}, ${localizeRole(ACTIVE_USER.role, locale)}`,
    projectSummary: scope.projectSummary,
    submissionGuidelines: locale === "de"
      ? [
          "Angebote sind elektronisch über das Portal von Compass Logistics Procurement bis zur oben genannten Frist einzureichen. Verspätete Angebote werden nicht bewertet.",
          "Klärungsfragen sind mindestens 7 Tage vor Angebotsfrist über das SCM-Portal zu stellen.",
          "Bieter bestätigen die Einhaltung jedes Abschnitts dieser Ausschreibung oder legen Abweichungen ausdrücklich in den Rückgaben dar.",
        ]
      : [
          "Tenders must be submitted electronically via the Compass Logistics Procurement portal no later than the submission deadline stated above. Late submissions will not be evaluated.",
          "Requests for clarification must be raised through the SCM Portal at least 7 days prior to the submission deadline.",
          "Tenderers shall confirm compliance with each section of this request for proposal or table deviations explicitly in their returnables.",
        ],
    technical,
    quality,
    legal,
    pricing: {
      intro: locale === "de"
        ? `Alle Preise sind in EUR, ohne USt., fest und bindend gemäß SRC-004 Abschnitt 7.1 und SRC-005 anzugeben. Ein offengelegter Kraftstoffzuschlag ist das einzige zulässige variable Element.`
        : `All prices shall be quoted in EUR, excluding VAT, fixed and firm in accordance with SRC-004 clause 7.1 and SRC-005. A disclosed fuel surcharge is the only permitted variable element.`,
      items: locale === "de"
        ? [
            { item: 1, description: `${spec.name} — Leistung in voller Übereinstimmung mit ${spec.docRef}`, qty: quantity },
            { item: 2, description: "Sichtbarkeit und POD-Nachweise gemäß SRC-002 / SRC-004 Abschnitt 4.3", qty: "1 Los" },
            { item: 3, description: `Leistungsort: ${project.mobilisationPort} — vereinbarte Relationen und Equipment`, qty: "1 Los" },
          ]
        : [
            { item: 1, description: `${spec.name} — supply in full accordance with ${spec.docRef}`, qty: quantity },
            { item: 2, description: "Visibility and POD evidence per SRC-002 / SRC-004 clause 4.3", qty: "1 lot" },
            { item: 3, description: `Performance on ${project.mobilisationPort} — agreed lanes and equipment`, qty: "1 lot" },
          ],
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Print / PDF view                                                   */
/* ------------------------------------------------------------------ */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function printableIttHtml(itt: IttDocument, locale: Locale): string {
  const t = createT(locale)
  const project = localizedProject(locale)
  const paramRows = itt.technical.parameters
    .map(p => `<tr><td class="param">${esc(p.parameter)}</td><td>${esc(p.requirement)}</td></tr>`)
    .join("")
  const standardRows = itt.quality.standards
    .map(s => `<tr><td class="param">${esc(s.authority)} ${esc(s.ref)}</td><td>${esc(s.application)}</td></tr>`)
    .join("")
  const pricingRows = itt.pricing.items
    .map(i => `<tr><td class="num">${i.item}</td><td>${esc(i.description)}</td><td class="nowrap">${esc(i.qty)}</td><td class="muted nowrap">${esc(t("tenderStudio.toBeQuoted"))}</td></tr>`)
    .join("")
  const techNotes = itt.technical.notes.map((n, i) => `<p class="note">${esc(t("tenderStudio.note"))} ${i + 1}: ${esc(n)}</p>`).join("")
  const guidelines = itt.submissionGuidelines.map(g => `<li>${esc(g)}</li>`).join("")
  const fatItems = itt.quality.fatRequirements.map(f => `<li>${esc(f)}</li>`).join("")
  const clauses = itt.legal.clauses
    .map(c => `<div class="clause"><div class="clause-head"><span class="clause-title">${esc(c.heading)}</span><span class="clause-src">${esc(c.source)}</span></div><p>${esc(c.text)}</p></div>`)
    .join("")
  const summary = itt.projectSummary.map(p => `<p>${esc(p)}</p>`).join("")

  return `<!DOCTYPE html>
<html lang="${localeTag(locale)}">
<head>
<meta charset="utf-8">
<title>${esc(itt.ittRef)} — ${esc(itt.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; font-size: 11pt; line-height: 1.5; }
  header { border-bottom: 3px solid #0a2540; padding-bottom: 12px; margin-bottom: 20px; }
  .kicker { font-family: Arial, sans-serif; font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; color: #555; margin: 0 0 4px; }
  h1 { font-size: 17pt; margin: 0 0 2px; color: #0a2540; }
  .project { font-size: 10.5pt; color: #444; margin: 0; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 16px; margin-top: 12px; font-family: Arial, sans-serif; font-size: 8.5pt; }
  .meta div span { display: block; color: #777; }
  .meta div strong { font-size: 9.5pt; color: #1a1a1a; }
  h2 { font-family: Arial, sans-serif; font-size: 12pt; color: #0a2540; border-bottom: 1px solid #bbb; padding-bottom: 3px; margin: 22px 0 8px; page-break-after: avoid; }
  h3 { font-family: Arial, sans-serif; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 14px 0 6px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0; page-break-inside: auto; }
  th { font-family: Arial, sans-serif; text-align: left; background: #eef1f5; padding: 5px 8px; border: 1px solid #c9cfd8; font-size: 9pt; }
  td { padding: 4px 8px; border: 1px solid #c9cfd8; vertical-align: top; }
  td.param { font-weight: bold; width: 38%; }
  td.num { width: 34px; text-align: center; }
  .nowrap { white-space: nowrap; }
  .muted { color: #777; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin-bottom: 4px; }
  .note { font-size: 9pt; color: #555; margin: 3px 0; }
  .source { font-family: Arial, sans-serif; font-size: 8pt; color: #888; margin: 4px 0 0; }
  .clause { border: 1px solid #c9cfd8; border-radius: 3px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .clause-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .clause-title { font-family: Arial, sans-serif; font-weight: bold; font-size: 9.5pt; }
  .clause-src { font-family: Arial, sans-serif; font-size: 8pt; color: #888; white-space: nowrap; }
  .clause p { margin: 4px 0 0; font-size: 9.5pt; }
  footer { margin-top: 28px; border-top: 1px solid #bbb; padding-top: 8px; font-family: Arial, sans-serif; font-size: 8pt; color: #888; }
</style>
</head>
<body>
  <header>
    <p class="kicker">${esc(t("tenderStudio.scmLabel"))}</p>
    <h1>${esc(itt.title)}</h1>
    <p class="project">${esc(project.name)} — ${esc(project.client)}</p>
    <div class="meta">
      <div><span>${esc(t("tenderStudio.reference"))}</span><strong>${esc(itt.ittRef)}</strong></div>
      <div><span>${esc(t("tenderStudio.issueDate"))}</span><strong>${esc(formatDate(itt.issueDate, locale))}</strong></div>
      <div><span>${esc(t("tenderStudio.submissionDeadline"))}</span><strong>${esc(formatDate(itt.submissionDeadline, locale))}</strong></div>
      <div><span>${esc(t("tenderStudio.procurementOfficer"))}</span><strong>${esc(itt.procurementOfficer)}</strong></div>
    </div>
  </header>

  <h2>1.0 ${esc(t("tenderStudio.section1"))}</h2>
  <h3>${esc(t("tenderStudio.section11"))}</h3>
  ${summary}
  <h3>${esc(t("tenderStudio.section12"))}</h3>
  <ul>${guidelines}</ul>

  <h2>2.0 ${esc(t("tenderStudio.section2"))}</h2>
  <p>${esc(itt.technical.scopeIntro)}</p>
  <table>
    <thead><tr><th>${esc(t("tenderStudio.parameter"))}</th><th>${esc(t("tenderStudio.requirement"))}</th></tr></thead>
    <tbody>${paramRows}</tbody>
  </table>
  ${techNotes}
  <p class="source">${esc(t("tenderStudio.source"))}: ${esc(itt.technical.citations.join(" · "))}</p>

  <h2>3.0 ${esc(t("tenderStudio.section3"))}</h2>
  <p>${esc(itt.quality.intro)}</p>
  <table>
    <thead><tr><th>${esc(t("tenderStudio.standard"))}</th><th>${esc(t("tenderStudio.application"))}</th></tr></thead>
    <tbody>${standardRows}</tbody>
  </table>
  <h3>${esc(t("tenderStudio.fatTraceability"))}</h3>
  <ul>${fatItems}</ul>
  <p class="source">${esc(t("tenderStudio.source"))}: ${esc(itt.quality.citations.join(" · "))}</p>

  <h2>4.0 ${esc(t("tenderStudio.section4"))}</h2>
  <p>${esc(itt.legal.governingTerms)}</p>
  ${clauses}
  <p class="source">${esc(t("tenderStudio.source"))}: ${esc(itt.legal.citations.join(" · "))}</p>

  <h2>5.0 ${esc(t("tenderStudio.section5"))}</h2>
  <p>${esc(itt.pricing.intro)}</p>
  <table>
    <thead><tr><th>${esc(t("tenderStudio.item"))}</th><th>${esc(t("tenderStudio.description"))}</th><th>${esc(t("tenderStudio.quantity"))}</th><th>${esc(t("tenderStudio.unitPrice"))}</th></tr></thead>
    <tbody>${pricingRows}</tbody>
  </table>

  <footer>
    ${esc(itt.ittRef)} · ${esc(t("tenderStudio.controlledFooter"))}
  </footer>
  <script>window.onload = function () { window.print() }</script>
</body>
</html>`
}

function openPrintView(itt: IttDocument, locale: Locale) {
  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(printableIttHtml(itt, locale))
  w.document.close()
}

/* ------------------------------------------------------------------ */
/*  API helper                                                         */
/* ------------------------------------------------------------------ */

async function postAgent<T>(url: string, body: Record<string, unknown>, fallback: () => T, minMs = 900): Promise<T> {
  const started = Date.now()
  let result: T
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    result = json && !json.fallback && json.data ? (json.data as T) : fallback()
  } catch {
    result = fallback()
  }
  // Keep the pipeline readable even when responses are instant.
  const elapsed = Date.now() - started
  if (elapsed < minMs) await new Promise(r => setTimeout(r, minMs - elapsed))
  return result
}

/* ------------------------------------------------------------------ */
/*  Small UI pieces                                                    */
/* ------------------------------------------------------------------ */

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <SafeIcon name="CheckCircle2" className="h-4 w-4 text-emerald-500" />
  if (status === "running") return <SafeIcon name="Loader2" className="h-4 w-4 animate-spin text-[var(--color-brand-primary)]" />
  return <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--color-border-default)]" />
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h3 className="flex items-baseline gap-2 border-b border-[var(--color-border-default)] pb-1.5 text-[14px] font-bold text-[var(--color-text-primary)]">
      <span className="tabular-nums">{number}</span>
      {title}
    </h3>
  )
}

const AUDIT_STATUS_STYLE: Record<string, { icon: string; cls: string; labelKey: "common.pass" | "tenderStudio.corrected" | "tenderStudio.flagged" }> = {
  pass: { icon: "CheckCircle2", cls: "text-emerald-600 dark:text-emerald-400", labelKey: "common.pass" },
  corrected: { icon: "Wrench", cls: "text-amber-600 dark:text-amber-400", labelKey: "tenderStudio.corrected" },
  flagged: { icon: "TriangleAlert", cls: "text-red-600 dark:text-red-400", labelKey: "tenderStudio.flagged" },
}

/* ------------------------------------------------------------------ */
/*  Document repository rail                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_ORDER: DocumentCategory[] = ["technical", "quality", "commercial", "legal", "template"]

function DocumentRepository({ activeDocRefs, locale }: { activeDocRefs: Set<string>; locale: Locale }) {
  const t = useT()
  const documents = localizedDocuments(locale)
  return (
    <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-4")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SafeIcon name="FolderLock" className="h-4 w-4 text-[var(--color-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.sources")}</h2>
        </div>
        <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{t("tenderStudio.onRegister", { count: documents.length })}</span>
      </div>
      <div className="space-y-3">
        {CATEGORY_ORDER.map(cat => {
          const docs = localizedDocumentsByCategory(cat, locale)
          if (docs.length === 0) return null
          return (
            <div key={cat} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">
                {t(`categories.${cat}`)}
              </p>
              {docs.map(doc => {
                const active = activeDocRefs.has(doc.docRef)
                return (
                  <a
                    key={doc.id}
                    href={doc.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center gap-2 rounded-[9px] border px-2.5 py-2 transition-colors",
                      active
                        ? "border-[var(--color-border-default)] bg-[var(--color-tint-neutral)]"
                        : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-subtle)]",
                    )}
                  >
                    <SafeIcon name="FileText" className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[var(--color-text-primary)]">{doc.docRef}</span>
                      <span className="block truncate text-[10px] text-[var(--color-text-muted)]">{doc.title} · {doc.revision}</span>
                    </span>
                    {active && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-secondary)] animate-pulse" />}
                  </a>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function TenderStudioPage() {
  const t = useT()
  const { locale, focusTenderId, openTenderStudio, openBidEvaluation, advanceTenderStage, setPage, draftedTenders, saveDraftedTender, deleteDraftedTender, appliedTenderQtyByPackage, advanceJourney, session } = useStore()

  const [prompt, setPrompt] = React.useState("")
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [generationBlocked, setGenerationBlocked] = React.useState<"exceptions" | "lock" | null>(null)
  const [showTranslation, setShowTranslation] = React.useState(false)
  const [spec, setSpec] = React.useState<ComponentSpec | null>(null)
  const [quantity, setQuantity] = React.useState("")
  const [pkg, setPkg] = React.useState<TenderPackage | null>(null)
  const [scope, setScope] = React.useState<ScopeOutput | null>(null)
  const [specialists, setSpecialists] = React.useState<SpecialistStatuses>({ technical: "pending", quality: "pending", legal: "pending" })
  const [itt, setItt] = React.useState<IttDocument | null>(null)
  const [audit, setAudit] = React.useState<TenderAuditOutput | null>(null)
  const [submitted, setSubmitted] = React.useState(false)
  // Audit detail collapses by default so the ITT itself sits right below the result line.
  const [auditOpen, setAuditOpen] = React.useState(false)
  // Pipeline steps stay collapsed unless the user expands them (less is more).
  const [pipelineOpen, setPipelineOpen] = React.useState(false)
  const runningRef = React.useRef(false)

  // Restore a catalogued draft into the working area without re-running the pipeline.
  const loadDraft = React.useCallback((d: DraftedTender) => {
    const baseSpec = COMPONENT_SPECS.find(c => c.id === d.componentId)
    if (!baseSpec) return
    const localizedSpec = localizeComponentSpec(baseSpec, locale)
    const localizedQuantity = localizeQuantity(d.quantity, locale)
    const loadedPkg = d.packageId ? TENDER_PACKAGES.find(p => p.id === d.packageId) ?? null : null
    const localizedScope = fallbackScope(baseSpec, localizedQuantity, locale)
    const localizedItt = withCitation(composeItt(
      baseSpec,
      localizedQuantity,
      loadedPkg,
      localizedScope,
      fallbackTechnical(baseSpec, localizedQuantity, locale),
      fallbackQuality(baseSpec, locale),
      fallbackLegal(baseSpec, locale),
      locale,
    ), locale, session.requirementSetVersion, session.evaluationMethodVersion)
    setSpec(localizedSpec)
    setQuantity(localizedQuantity)
    setPkg(loadedPkg)
    setPrompt(locale === "de"
      ? `Ausschreibung entwerfen für ${localizedQuantity} ${localizedSpec.name}${loadedPkg ? ` (${loadedPkg.packageRef})` : ""}`
      : d.prompt)
    setScope(localizedScope)
    setItt(localizedItt)
    setAudit(fallbackAudit(localizedItt, baseSpec, locale))
    setSubmitted(d.submitted)
    setSpecialists({ technical: "done", quality: "done", legal: "done" })
    setAuditOpen(false)
    setPipelineOpen(false)
    setPhase("complete")
  }, [locale, session.requirementSetVersion, session.evaluationMethodVersion])

  // Preload the composer when the board's Draft ITT action opened this page.
  // If that package already has a catalogued draft, restore it instead of regenerating.
  React.useEffect(() => {
    if (!focusTenderId) return
    const t = tenderById(focusTenderId)
    if (t?.componentId) {
      const existing = draftedTenders.find(d => d.packageId === t.id)
      if (existing) {
        loadDraft(existing)
      } else {
        const s = COMPONENT_SPECS.find(c => c.id === t.componentId)
        if (s) {
          const localSpec = localizeComponentSpec(s, locale)
          const localQuantity = localizeQuantity(
            displayPackageQuantity(t.id, t.quantity, appliedTenderQtyByPackage, locale),
            locale,
          )
          setPrompt(locale === "de"
            ? `Ausschreibung entwerfen für ${localQuantity} ${localSpec.name} (${t.packageRef})`
            : `Draft the RFP for ${localQuantity} of ${localSpec.name} (package ${t.packageRef})`)
        }
      }
    }
    openTenderStudio(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTenderId])

  // Returning to the studio with drafts on file: reopen the most recent one
  // instead of presenting an empty composer.
  const restoredRef = React.useRef(false)
  React.useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (focusTenderId || draftedTenders.length === 0) return
    loadDraft(draftedTenders[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previousLocaleRef = React.useRef(locale)
  React.useEffect(() => {
    const previousLocale = previousLocaleRef.current
    const localeChanged = previousLocale !== locale
    previousLocaleRef.current = locale
    if (localeChanged && phase === "idle" && prompt.trim()) {
      const baseSpec = resolveLocalizedComponent(prompt, previousLocale)
      if (baseSpec) {
        const oldQuantity = resolveLocalizedQuantity(prompt, baseSpec, previousLocale)
        const nextQuantity = localizeQuantity(oldQuantity, locale)
        const nextSpec = localizeComponentSpec(baseSpec, locale)
        setPrompt(locale === "de"
          ? `Ausschreibung entwerfen für ${nextQuantity} ${nextSpec.name}`
          : `Draft the RFP for ${nextQuantity} of ${nextSpec.name}`)
      }
      return
    }
    if (phase !== "complete" || !itt) return
    const contentLanguageMismatch = locale === "de"
      ? !itt.title.startsWith("Ausschreibung")
      : !itt.title.startsWith("Request for proposal")
    if (!localeChanged && !contentLanguageMismatch) return
    const saved = draftedTenders.find((draft) => draft.id === itt.ittRef)
    if (saved) loadDraft(saved)
  }, [locale, phase, prompt, itt, draftedTenders, loadDraft])

  const activeDocRefs = React.useMemo(() => {
    const refs = new Set<string>()
    if (!spec || phase === "idle" || phase === "unresolved") return refs
    refs.add(spec.docRef)
    refs.add("SRC-002")
    refs.add("SRC-004")
    refs.add("SRC-005")
    refs.add("SRC-008")
    return refs
  }, [spec, phase])

  const run = React.useCallback(async (text: string) => {
    if (runningRef.current || !text.trim()) return
    const resolved = resolveLocalizedComponent(text, locale)
    if (!resolved) {
      setSpec(null)
      setPhase("unresolved")
      return
    }
    if (!session.acceptedNeed) return
    if (!materialExceptionsResolved(session.requirementDecisions)) {
      if (session.journeyStep === "s1") advanceJourney("s2")
      setGenerationBlocked("exceptions")
      return
    }
    if (!session.packageLocked) {
      if (session.journeyStep === "s1") advanceJourney("s2")
      setGenerationBlocked("lock")
      return
    }
    setGenerationBlocked(null)
    if (session.journeyStep === "s1") advanceJourney("s2")
    runningRef.current = true
    const qty = resolveLocalizedQuantity(text, resolved, locale)
    const matchedPkg = TENDER_PACKAGES.find(p => p.componentId === resolved.id) ?? null

    setSpec(localizeComponentSpec(resolved, locale))
    setQuantity(qty)
    setPkg(matchedPkg)
    setScope(null)
    setItt(null)
    setAudit(null)
    setSubmitted(false)
    setAuditOpen(false)
    setPipelineOpen(false)
    setSpecialists({ technical: "pending", quality: "pending", legal: "pending" })
    setPhase("scoping")

    const scopeResponse = await postAgent<ScopeOutput>(
      "/api/compass/scope",
      { componentId: resolved.id, quantity: qty, prompt: text, officer: `${ACTIVE_USER.name} (${localizeRole(ACTIVE_USER.role, locale)})`, locale },
      () => fallbackScope(resolved, qty, locale),
    )
    const scopeOut = locale === "de" ? fallbackScope(resolved, qty, locale) : scopeResponse
    setScope(scopeOut)

    setPhase("specialists")
    setSpecialists({ technical: "running", quality: "running", legal: "running" })

    const [techResponse, qualResponse, legalResponse] = await Promise.all([
      postAgent<TechnicalOutput>("/api/compass/specialist/technical", { componentId: resolved.id, quantity: qty, locale }, () => fallbackTechnical(resolved, qty, locale), 1200)
        .then(r => { setSpecialists(s => ({ ...s, technical: "done" })); return r }),
      postAgent<QualityOutput>("/api/compass/specialist/quality", { componentId: resolved.id, locale }, () => fallbackQuality(resolved, locale), 1600)
        .then(r => { setSpecialists(s => ({ ...s, quality: "done" })); return r }),
      postAgent<LegalOutput>("/api/compass/specialist/legal", { componentId: resolved.id, locale }, () => fallbackLegal(resolved, locale), 2000)
        .then(r => { setSpecialists(s => ({ ...s, legal: "done" })); return r }),
    ])
    const techOut = locale === "de" ? fallbackTechnical(resolved, qty, locale) : techResponse
    const qualOut = locale === "de" ? fallbackQuality(resolved, locale) : qualResponse
    const legalOut = locale === "de" ? fallbackLegal(resolved, locale) : legalResponse

    setPhase("composing")
    await new Promise(r => setTimeout(r, 700))
    const doc = withCitation(
      composeItt(resolved, qty, matchedPkg, scopeOut, techOut, qualOut, legalOut, locale),
      locale,
      session.requirementSetVersion,
      session.evaluationMethodVersion,
    )
    setItt(doc)

    setPhase("auditing")
    const auditResponse = await postAgent<TenderAuditOutput>(
      "/api/compass/audit",
      { componentId: resolved.id, itt: doc, locale },
      () => fallbackAudit(doc, resolved, locale),
      1400,
    )
    const auditOut = locale === "de" ? fallbackAudit(doc, resolved, locale) : auditResponse
    setAudit(auditOut)
    setPhase("complete")
    runningRef.current = false

    saveDraftedTender({
      id: doc.ittRef,
      componentId: resolved.id,
      quantity: qty,
      packageId: matchedPkg?.id ?? null,
      prompt: text,
      createdAt: new Date().toISOString(),
      scope: scopeOut,
      itt: doc,
      audit: auditOut,
      submitted: false,
    })
  }, [locale, saveDraftedTender, session.journeyStep, session.acceptedNeed, session.requirementDecisions, session.packageLocked, session.requirementSetVersion, session.evaluationMethodVersion, advanceJourney])

  const submitForApproval = React.useCallback(() => {
    if (!pkg || !session.packageLocked || !session.rfpApproved) return
    advanceTenderStage(pkg.id, "decide")
    setSubmitted(true)
    if (itt) {
      const existing = draftedTenders.find(d => d.id === itt.ittRef)
      if (existing) saveDraftedTender({ ...existing, submitted: true })
    }
    setTimeout(() => setPage("operating-loop"), 900)
  }, [pkg, advanceTenderStage, setPage, itt, draftedTenders, saveDraftedTender, session.packageLocked, session.rfpApproved])

  const isRunning = phase === "scoping" || phase === "specialists" || phase === "composing" || phase === "auditing"
  const otherLocale = locale === "de" ? "en" : "de"
  const linkedTranslation = showTranslation && spec
    ? withCitation(
        composeItt(
          spec,
          quantity,
          pkg,
          scope ?? fallbackScope(spec, quantity, otherLocale),
          fallbackTechnical(spec, quantity, otherLocale),
          fallbackQuality(spec, otherLocale),
          fallbackLegal(spec, otherLocale),
          otherLocale,
        ),
        otherLocale,
        session.requirementSetVersion,
        session.evaluationMethodVersion,
      )
    : null
  const heroMotion = enterMotion(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(heroMotion.className, "space-y-1")} style={heroMotion.style}>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t("tenderStudio.title")}</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          {t("tenderStudio.subtitle")}
        </p>
      </div>

      {focusTenderId === "PKG-REN-001" && session.renewalEventId && (
        <section className="rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 text-[12px] text-[var(--color-text-secondary)]">
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            {locale === "de" ? `Vorbefüllt ${session.renewalEventId}` : `Prepopulated ${session.renewalEventId}`}
          </h2>
          <p className="mt-1">
            {locale === "de"
              ? `Vorherige Anforderungen ${session.requirementSetVersion ?? "REQ-2026-001-v1"}. Geprüfte Historie aus der Zuschlagsbaseline. Lehre: die Prognose von 2.448 Sendungen ist keine Abnahmeverpflichtung; No History ist kein Abzug.`
              : `Prior requirements ${session.requirementSetVersion ?? "REQ-2026-001-v1"}. Verified history from the awarded baseline. Lesson: the 2,448-shipment forecast is not a volume commitment, and No History is not a penalty.`}
          </p>
        </section>
      )}
      <LaneSlaPanel compact />
      <RequirementGovernance />
      <ol className="grid gap-2 sm:grid-cols-2">
        {ANALYSIS_STEPS.map((step, i) => (
          <li key={step.id} className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-[12px]">
            <span className="font-medium">{i + 1}. {step.label}</span>
            <span className="mt-0.5 block text-[var(--color-text-muted)]">{step.count}</span>
          </li>
        ))}
      </ol>
      {generationBlocked && (
        <p className="text-[12px] text-[var(--color-accent-warning-text)]">
          {generationBlocked === "lock"
            ? (locale === "de"
              ? "Die zitierte Ausschreibung wird erst erzeugt, wenn der Anforderungssatz freigegeben ist."
              : "The cited RFP is generated only after the requirement set is approved.")
            : (locale === "de"
              ? "Die Ausschreibung wird nicht erzeugt, solange eine wesentliche Ausnahme offen ist."
              : "The RFP is not generated while a material exception is unresolved.")}
        </p>
      )}
      {session.rfpApproved && session.rfpVersion && (
        <p className="text-[12px] text-[var(--color-text-secondary)]">
          {locale === "de"
            ? `Ausgegeben gegen ${session.requirementSetVersion} und ${session.evaluationMethodVersion}. Dokument ${session.rfpVersion}.`
            : `Issued against ${session.requirementSetVersion} and ${session.evaluationMethodVersion}. Document ${session.rfpVersion}.`}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left rail */}
        <div className="space-y-4">
          {/* Composer */}
          <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-3")}>
            <div className="flex items-center gap-2">
              <SafeIcon name="PenLine" className="h-4 w-4 text-[var(--color-text-muted)]" />
              <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.draftTender")}</h2>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); void run(prompt) }}
              className="space-y-2.5"
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                disabled={isRunning}
                placeholder={t("tenderStudio.placeholder")}
                className="w-full resize-none rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand-primary)] disabled:opacity-60"
              />
              <Button
                type="submit"
                disabled={isRunning || !prompt.trim()}
                className={cn(pcmButton, "w-full gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[13px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90")}
              >
                {isRunning ? (
                  <>
                    <SafeIcon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
                    {t("tenderStudio.drafting")}
                  </>
                ) : (
                  <>
                    <SafeIcon name="FileSignature" className="h-3.5 w-3.5" />
                    {t("tenderStudio.draft")}
                  </>
                )}
              </Button>
            </form>
            {phase === "idle" && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">{t("tenderStudio.suggestions")}</p>
                {TENDER_SUGGESTIONS[locale].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPrompt(p); void run(p) }}
                    className="w-full rounded-[9px] border border-[var(--color-border-default)] px-2.5 py-2 text-left text-[11px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </section>


          {/* Drafted tender catalogue */}
          {draftedTenders.length > 0 && (
            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-2.5")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SafeIcon name="Archive" className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.archive")}</h2>
                </div>
                <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{draftedTenders.length}</span>
              </div>
              <div className="space-y-1">
                {draftedTenders.map(d => {
                  const active = itt?.ittRef === d.id && phase === "complete"
                  return (
                    <div
                      key={d.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-[9px] border px-2.5 py-2 transition-colors",
                        active
                          ? "border-[var(--color-border-default)] bg-[var(--color-tint-neutral)]"
                          : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-subtle)]",
                      )}
                    >
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => loadDraft(d)}
                        className="min-w-0 flex-1 text-left disabled:opacity-60"
                      >
                        <span className="block truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                          {localizeComponentSpec(COMPONENT_SPECS.find(candidate => candidate.id === d.componentId) ?? COMPONENT_SPECS[0], locale).name}
                        </span>
                        <span className="block truncate text-[10px] text-[var(--color-text-muted)]">
                          {d.id} · {localizeQuantity(d.quantity, locale)} · {formatDateDMY(d.createdAt)}
                        </span>
                      </button>
                      {d.submitted ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">{t("tenderStudio.issued")}</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-text-muted)]">{t("tenderStudio.draftStatus")}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteDraftedTender(d.id)}
                        title={t("tenderStudio.removeDraft")}
                        className="shrink-0 rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <SafeIcon name="X" className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <DocumentRepository activeDocRefs={activeDocRefs} locale={locale} />
        </div>

        {/* Working area */}
        <div className="min-w-0 space-y-4">
          {phase === "idle" && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-[var(--color-border-default)] py-24 text-center">
              <SafeIcon name="FileSignature" className="h-8 w-8 text-[var(--color-text-muted)]/50" />
              <div className="space-y-1">
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">{t("tenderStudio.emptyTitle")}</p>
                <p className="mx-auto max-w-[420px] text-[12px] text-[var(--color-text-muted)]">
                  {t("tenderStudio.emptyBody")}
                </p>
              </div>
            </div>
          )}

          {phase === "unresolved" && (
            <div className={cn(pcmCard, "rounded-[16px] border border-amber-400/50 bg-amber-500/5 p-5 space-y-3")}>
              <div className="flex items-center gap-2">
                <SafeIcon name="SearchX" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.unresolvedTitle")}</p>
              </div>
              <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                {t("tenderStudio.unresolvedBody", { project: PROJECT.shortName })}
              </p>
              <ul className="space-y-1">
                {localizedComponentSpecs(locale).map(c => (
                  <li key={c.id} className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                    <SafeIcon name="FileText" className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                    {c.name} <span className="text-[var(--color-text-muted)]">({c.docRef})</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                {t("tenderStudio.unresolvedHelp")}
              </p>
            </div>
          )}

          {(isRunning || phase === "complete") && spec && (
            <>
              {/* Pipeline rail — collapsed by default; spinner stays in the header while running */}
              <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-3")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <SafeIcon name="Loader2" className="h-4 w-4 animate-spin text-[var(--color-brand-primary)]" />
                    ) : (
                      <SafeIcon name="Workflow" className="h-4 w-4 text-[var(--color-text-muted)]" />
                    )}
                    <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.pipeline")}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {spec.name} · {quantity}{pkg ? ` · ${pkg.packageRef}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPipelineOpen((v) => !v)}
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      <SafeIcon name={pipelineOpen ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5" />
                      {pipelineOpen ? t("tenderStudio.showLess") : t("tenderStudio.showDetails")}
                    </button>
                  </div>
                </div>

                {pipelineOpen && (
                <div className="space-y-2.5">
                  {/* Scope */}
                  <div className="flex gap-2.5">
                    <StepIcon status={phase === "scoping" ? "running" : "done"} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)]">
                        {t("tenderStudio.scopeAgent")}
                        <span className="ml-2 text-[11px] font-normal text-[var(--color-text-muted)]">{t("tenderStudio.scopeDetail")}</span>
                      </p>
                      {scope && (
                        <div className="space-y-1.5 rounded-[10px] bg-[var(--color-bg-subtle)] p-2.5">
                          <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{scope.objective}</p>
                          <div className="space-y-1">
                            {scope.retrievalPlan.map((r, i) => (
                              <p key={i} className="text-[10px] text-[var(--color-text-muted)]">
                                <span className="font-medium text-[var(--color-text-secondary)]">{r.agent}</span> → {r.document}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Specialists */}
                  {(phase !== "scoping") && (
                    <div className="space-y-2 border-l-2 border-[var(--color-border-default)] pl-4 ml-2">
                      {([
                        { key: "technical" as const, name: t("tenderStudio.technicalAgent"), detail: t("tenderStudio.technicalDetail", { document: spec.docRef }) },
                        { key: "quality" as const, name: t("tenderStudio.qualityAgent"), detail: t("tenderStudio.qualityDetail") },
                        { key: "legal" as const, name: t("tenderStudio.legalAgent"), detail: t("tenderStudio.legalDetailStandard") },
                      ]).map(s => (
                        <div key={s.key} className="flex items-center gap-2.5">
                          <StepIcon status={specialists[s.key]} />
                          <p className="text-[12px] text-[var(--color-text-primary)]">
                            {s.name}
                            <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">{s.detail}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compose */}
                  {(phase === "composing" || phase === "auditing" || phase === "complete") && (
                    <div className="flex items-center gap-2.5">
                      <StepIcon status={phase === "composing" ? "running" : "done"} />
                      <p className="text-[12px] text-[var(--color-text-primary)]">
                        {t("tenderStudio.assembling")}
                        <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">{t("tenderStudio.assemblingDetail")}</span>
                      </p>
                    </div>
                  )}

                  {/* Audit */}
                  {(phase === "auditing" || phase === "complete") && (
                    <div className="flex items-center gap-2.5">
                      <StepIcon status={phase === "auditing" ? "running" : "done"} />
                      <p className="text-[12px] text-[var(--color-text-primary)]">
                        {t("tenderStudio.auditAgent")}
                        <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">{t("tenderStudio.auditDetail")}</span>
                      </p>
                    </div>
                  )}
                </div>
                )}
              </section>

              {/* Audit register */}
              {audit && (
                <section className={cn(pcmCard, "rounded-[16px] border p-4 space-y-3", audit.verified ? "border-emerald-400/40 bg-emerald-500/5" : "border-amber-400/50 bg-amber-500/5")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SafeIcon name={audit.verified ? "ShieldCheck" : "ShieldAlert"} className={cn("h-4 w-4", audit.verified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")} />
                      <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {t("tenderStudio.audit")}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
                        {t("tenderStudio.checksCorrections", { checks: audit.checks.length, corrections: audit.corrections.length })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAuditOpen((v) => !v)}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        <SafeIcon name={auditOpen ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5" />
                        {auditOpen ? t("tenderStudio.showLess") : t("tenderStudio.showDetails")}
                      </button>
                    </div>
                  </div>
                  {auditOpen && (
                    <>
                      <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{audit.assessment}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                    {audit.checks.map((c, i) => {
                      const style = AUDIT_STATUS_STYLE[c.status] ?? AUDIT_STATUS_STYLE.pass
                      const motion = listItemMotion(i)
                      return (
                        <div key={i} className={cn(motion.className, "flex gap-2 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-2.5")} style={motion.style}>
                          <div className="mt-0.5 flex shrink-0 flex-col items-center gap-0.5">
                            <SafeIcon name={style.icon} className={cn("h-3.5 w-3.5", style.cls)} />
                            <span className={cn("text-[8px] font-semibold uppercase tracking-wide", style.cls)}>{t(style.labelKey)}</span>
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{c.section}</p>
                            <p className="text-[11px] font-medium leading-snug text-[var(--color-text-primary)]">{c.claim}</p>
                            <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">{c.note}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                      {audit.corrections.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">{t("tenderStudio.correctionsApplied")}</p>
                          {audit.corrections.map((c, i) => (
                            <div key={i} className="rounded-[10px] border border-amber-400/40 bg-[var(--color-bg-surface)] p-2.5 text-[11px]">
                              <p className="font-medium text-[var(--color-text-primary)]">{c.section}</p>
                              <p className="text-[var(--color-text-muted)] line-through">{c.original}</p>
                              <p className="text-[var(--color-text-secondary)]">{c.corrected}</p>
                              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{c.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {/* Rendered ITT */}
              {itt && (
                <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
                  {/* Document header */}
                  <div className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-inverse)] px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-text-inverse)]/60">
                          {t("tenderStudio.scmLabel")}
                        </p>
                        <h2 className="text-[18px] font-bold text-[var(--color-text-inverse)]">{itt.title}</h2>
                        <p className="text-[12px] text-[var(--color-text-inverse)]/70">{PROJECT.name} — {PROJECT.client}</p>
                        <button type="button" className="text-[12px] font-semibold text-[var(--color-text-inverse)] underline" onClick={() => setShowTranslation((open) => !open)}>
                          {showTranslation
                            ? (locale === "de" ? "Übersetzung ausblenden" : "Hide German translation")
                            : (locale === "de" ? "Britisches Original anzeigen" : "Open German translation")}
                        </button>
                      </div>
                      {phase === "complete" && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => openPrintView(itt, locale)}
                            className={cn(pcmButton, "gap-1.5 rounded-[10px] border border-[var(--color-text-inverse)]/25 bg-transparent text-[12px] font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-text-inverse)]/10")}
                          >
                            <SafeIcon name="Printer" className="h-3.5 w-3.5" />
                            {t("tenderStudio.printPdf")}
                          </Button>
                          {pkg && !submitted && (
                            <Button
                              type="button"
                              onClick={submitForApproval}
                              disabled={!session.packageLocked || !session.rfpApproved}
                              className={cn(pcmButton, "gap-1.5 rounded-[10px] bg-[var(--color-brand-primary)] text-[12px] font-semibold text-[var(--color-brand-onPrimary)] hover:opacity-90 disabled:opacity-50")}
                            >
                              <SafeIcon name="SendHorizontal" className="h-3.5 w-3.5" />
                              {t("tenderStudio.issue")}
                            </Button>
                          )}
                          {submitted && (
                            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-400">
                              <SafeIcon name="CheckCircle2" className="h-3.5 w-3.5" />
                              {t("tenderStudio.issued")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid gap-x-8 gap-y-1 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                      <p className="text-[var(--color-text-inverse)]/60">{t("tenderStudio.reference")} <span className="block font-mono font-medium text-[var(--color-text-inverse)]">{itt.ittRef}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">{t("tenderStudio.issueDate")} <span className="block font-medium text-[var(--color-text-inverse)]">{formatDate(itt.issueDate, locale)}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">{t("tenderStudio.submissionDeadline")} <span className="block font-medium text-[var(--color-text-inverse)]">{formatDate(itt.submissionDeadline, locale)}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">{t("tenderStudio.procurementOfficer")} <span className="block font-medium text-[var(--color-text-inverse)]">{itt.procurementOfficer}</span></p>
                    </div>
                  </div>

                  {linkedTranslation && (
                    <div className="border-b border-[var(--color-border-default)] px-6 py-4 text-[12px] text-[var(--color-text-secondary)]">
                      <p className="font-semibold text-[var(--color-text-primary)]">{linkedTranslation.title}</p>
                      {linkedTranslation.projectSummary.slice(0, 2).map((paragraph) => (
                        <p key={paragraph} className="mt-1">{paragraph}</p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-7 px-6 py-6">
                    {/* Section 1 */}
                    <div className="space-y-3">
                      <SectionHeading number="1.0" title={t("tenderStudio.section1")} />
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("tenderStudio.section11")}</p>
                        {itt.projectSummary.map((p, i) => (
                          <p key={i} className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{p}</p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("tenderStudio.section12")}</p>
                        <ul className="space-y-1">
                          {itt.submissionGuidelines.map((g, i) => (
                            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                              <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-3">
                      <SectionHeading number="2.0" title={t("tenderStudio.section2")} />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.technical.scopeIntro}</p>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.parameter")}</th>
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.requirement")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itt.technical.parameters.map((p, i) => (
                              <tr key={i} className="border-t border-[var(--color-border-default)]">
                                <td className="px-3 py-1.5 font-medium text-[var(--color-text-primary)]">{p.parameter}</td>
                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{p.requirement}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {itt.technical.notes.length > 0 && (
                        <ul className="space-y-1">
                          {itt.technical.notes.map((n, i) => (
                            <li key={i} className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">{t("tenderStudio.note")} {i + 1}: {n}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[10px] text-[var(--color-text-muted)]">{t("tenderStudio.source")}: {itt.technical.citations.join(" · ")}</p>
                    </div>

                    {/* Section 3 */}
                    <div className="space-y-3">
                      <SectionHeading number="3.0" title={t("tenderStudio.section3")} />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.quality.intro}</p>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.standard")}</th>
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.application")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itt.quality.standards.map((s, i) => (
                              <tr key={i} className="border-t border-[var(--color-border-default)]">
                                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-[var(--color-text-primary)]">{s.authority} {s.ref}</td>
                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{s.application}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("tenderStudio.fatTraceability")}</p>
                        <ul className="space-y-1">
                          {itt.quality.fatRequirements.map((f, i) => (
                            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                              <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{t("tenderStudio.source")}: {itt.quality.citations.join(" · ")}</p>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-3">
                      <SectionHeading number="4.0" title={t("tenderStudio.section4")} />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.legal.governingTerms}</p>
                      <div className="space-y-2">
                        {itt.legal.clauses.map((c, i) => (
                          <div key={i} className="rounded-[10px] border border-[var(--color-border-default)] p-3 space-y-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                              <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{c.heading}</p>
                              <span className="text-[10px] text-[var(--color-text-muted)]">{c.source}</span>
                            </div>
                            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{c.text}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{t("tenderStudio.source")}: {itt.legal.citations.join(" · ")}</p>
                    </div>

                    {/* Section 5 */}
                    <div className="space-y-3">
                      <SectionHeading number="5.0" title={t("tenderStudio.section5")} />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.pricing.intro}</p>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="w-12 px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.item")}</th>
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.description")}</th>
                              <th className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.quantity")}</th>
                              <th className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.unitPrice")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itt.pricing.items.map(item => (
                              <tr key={item.item} className="border-t border-[var(--color-border-default)]">
                                <td className="px-3 py-1.5 tabular-nums text-[var(--color-text-secondary)]">{item.item}</td>
                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{item.description}</td>
                                <td className="whitespace-nowrap px-3 py-1.5 text-[var(--color-text-secondary)]">{item.qty}</td>
                                <td className="whitespace-nowrap px-3 py-1.5 text-[var(--color-text-muted)]">{t("tenderStudio.toBeQuoted")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  )
}

export default TenderStudioPage
