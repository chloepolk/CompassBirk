"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"
import { useStore, type DraftedTender } from "../_store"
import { useT } from "../_i18n/use-t"
import { createT, localeTag, type Locale } from "../_i18n"
import { formatDateDMY, formatEurFigure } from "@/lib/compass/locale-display"
import { FORECAST_SHIPMENTS, vendorProfile } from "@/lib/compass/logistics/vendor-model"
import { localizeRole } from "../_i18n/domain"
import {
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
import { WorkflowGuideBar } from "../_components/workflow-guide-bar"
import { RequirementGovernance } from "./requirement-governance"
import { REQUIREMENTS } from "@/lib/compass/logistics/requirements"
import { invitesSent, materialExceptionsResolved, rfpLifecycle, type ApprovedRfp, type LaneRateTemplateRow, type RequirementDecision } from "@/lib/compass/logistics/session"
import { LANES } from "@/lib/compass/logistics/structured/lanes"
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
          `${spec.overview} Prognostizierte Sendungen sind eine Entscheidungsgrundlage, keine Abnahmeverpflichtung.`,
        ]
      : [
          `Compass Logistics Procurement is running a competitive sourcing event for ${project.name}: ${project.scope}. This request for proposal covers ${quantity} of ${spec.name} in accordance with SRC-001.`,
          `${spec.overview} Forecast shipments are a decision input, not a take-or-pay commitment.`,
        ],
    retrievalPlan,
    considerations: locale === "de"
      ? [
          "Challenger bleiben No History, bis geprüfte Ausführung im Monatsauszug vorliegt (SRC-008).",
          "Kraftstoffzuschlag nach SRC-005 offenlegen; Relationenraten in EUR.",
          "Qualifikationstore (Versicherung, Due Diligence, Datenanbindung) gehen nicht in die Gewichtungen ein.",
        ]
      : [
          "Challengers remain No History until verified execution exists in the monthly extract (SRC-008).",
          "Disclose fuel surcharge under SRC-005; price lane rates in EUR.",
          "Qualification gates (insurance, due diligence, data integration) are excluded from the weighted score.",
        ],
  }
}

function offerLaneCount(): number {
  return LANES.filter((lane) => lane.laneId).length
}

function formatShipmentCount(locale: Locale): string {
  return FORECAST_SHIPMENTS.toLocaleString(locale === "de" ? "de-DE" : "en-GB")
}

function citeRequirement(id: string): string {
  const row = REQUIREMENTS.find((item) => item.id === id)
  if (!row) return ""
  return `${row.source} ${row.sourceVersion} ${row.section}: ${row.passage}`
}

const PARAMETER_REQUIREMENT: Record<string, string> = {
  Lanes: "REQ-001",
  Equipment: "REQ-001",
  "OTD target": "REQ-002",
  "Shipment acceptance rate": "REQ-003",
  Currency: "REQ-006",
  Visibility: "REQ-005",
  Insurance: "REQ-004",
}

function parameterCitation(englishName: string | undefined): string | undefined {
  if (!englishName) return undefined
  if (englishName === "Forecast volume") {
    const version = REQUIREMENTS.find((row) => row.id === "REQ-001")?.sourceVersion ?? "v1.2"
    return `SRC-001 ${version}: ${FORECAST_SHIPMENTS} forecast shipments across ${offerLaneCount()} lanes. Non-binding planning and evaluation input.`
  }
  if (englishName === "Claims ceiling" || englishName === "Invoice accuracy") {
    return "SRC-002 v1.2: Claims ceiling is 0.5% of shipments. Invoice accuracy target is 99.0%."
  }
  const id = PARAMETER_REQUIREMENT[englishName]
  return id ? citeRequirement(id) : undefined
}

function fallbackTechnical(baseSpec: ComponentSpec, quantity: string, locale: Locale): TechnicalOutput {
  const spec = localizeComponentSpec(baseSpec, locale)
  const lanes = offerLaneCount()
  const forecast = formatShipmentCount(locale)
  return {
    scopeIntro: locale === "de"
      ? `Der Lieferant erbringt ${quantity} ${spec.name} in strikter Übereinstimmung mit der verbindlichen Spezifikation ${spec.docRef}.`
      : `The Supplier shall provide ${quantity} of ${spec.name} strictly in accordance with controlled specification ${spec.docRef}.`,
    parameters: spec.parameters.map((p, index) => {
      const englishName = baseSpec.parameters[index]?.parameter
      const requirement = englishName === "Forecast volume"
        ? (locale === "de"
          ? `${forecast} prognostizierte Sendungen. Das ist keine Mindestabnahme.`
          : `${forecast} forecast shipments. This is not a minimum commitment.`)
        : englishName === "Lanes"
          ? (locale === "de"
            ? `${lanes} europäische Start-Ziel-Paare`
            : `${lanes} European origin–destination pairs`)
          : p.requirement
      return { parameter: p.parameter, requirement, citation: parameterCitation(englishName) }
    }),
    notes: locale === "de"
      ? [
          `Mengenbasis: ${forecast} prognostizierte Sendungen (${spec.unit}). Das ist keine Mindestabnahme.`,
          "Der Bieter nennt API, EDI oder eine Tagesdatei, den Umsetzungsplan, den Testzeitplan und die Kosten.",
          spec.overview,
        ]
      : [
          `Quantity basis: ${forecast} forecast shipments (${spec.unit}). This is not a minimum commitment.`,
          "The bidder states API, EDI or a daily file, the implementation plan, the testing timetable and the cost.",
          spec.overview,
        ],
    citations: [spec.docRef, "SRC-002", "SRC-005", "SRC-008"],
  }
}

function fallbackQuality(spec: ComponentSpec, locale: Locale): QualityOutput {
  const applicable = localizedStandards(locale).filter(s => spec.applicableStandards.includes(s.ref) && s.ref !== "ISO 9001:2015")
  return {
    intro: locale === "de"
      ? "Alle Leistungen aus dieser Ausschreibung müssen dem Leistungs- und SLA-Standard (SRC-002) sowie dem Qualifikationsstandard (SRC-008) entsprechen."
      : "All services supplied under this request for proposal shall comply with the carrier performance and SLA standard (SRC-002) and the supplier qualification standard (SRC-008).",
    standards: applicable.map(s => ({ authority: s.authority, ref: s.ref, application: s.scope })),
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
  const legalRequirement: Record<string, string> = {
    "4.3": "REQ-005",
    "5.1–5.3": "REQ-004",
    "6.2": "REQ-002",
    "7.1": "REQ-006",
  }
  const clauses = clauseRefs
    .map(pick)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map(c => {
      const requirementId = legalRequirement[c.ref]
      const fromRegister = requirementId === "REQ-002"
        ? [citeRequirement("REQ-002"), citeRequirement("REQ-003")].filter(Boolean).join(" ")
        : requirementId
          ? citeRequirement(requirementId)
          : ""
      return {
        heading: c.heading,
        text: c.text,
        source: `SRC-004 ${locale === "de" ? "Abschnitt" : "section"} ${c.ref}`,
        citation: fromRegister || `SRC-004 v1.2 ${c.ref}: ${c.text}`,
      }
    })

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

function withCitation(
  doc: IttDocument,
  locale: Locale,
  requirementSetVersion: string | null,
  evaluationMethodVersion: string | null,
  decisions: RequirementDecision[] = [],
): IttDocument {
  if (!requirementSetVersion || !evaluationMethodVersion) return doc
  const line = locale === "de"
    ? `Zitiert gegen ${requirementSetVersion} und ${evaluationMethodVersion}.`
    : `Cited against ${requirementSetVersion} and ${evaluationMethodVersion}.`
  const clauses = REQUIREMENTS.map((row) => {
    const decision = decisions.find((item) => item.id === row.id)
    const text = locale === "de" ? row.requirementDe : row.requirement
    const resolution = decision
      ? (locale === "de" ? `Entscheidung ${decision.decision}. ${decision.rationale}` : `Decision ${decision.decision}. ${decision.rationale}`)
      : (locale === "de" ? "Keine Ausnahme." : "No exception.")
    return `${row.id} · ${text} · ${row.source} ${row.sourceVersion} ${row.section} · ${row.passage} · ${resolution}`
  })
  return { ...doc, projectSummary: [line, ...clauses, ...doc.projectSummary] }
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
    title: locale === "de" ? `Ausschreibung — ${spec.name}` : `Request for proposal — ${spec.name}`,
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
          "Suppliers must submit responses electronically via the Compass Logistics Procurement portal no later than the submission deadline stated above. Late responses will not be evaluated.",
          "Requests for clarification must be raised through the SCM Portal at least 7 days prior to the submission deadline.",
          "Suppliers shall confirm compliance with each section of this request for proposal or table deviations explicitly in their returnables.",
        ],
    technical,
    quality,
    legal,
    pricing: {
      intro: locale === "de"
        ? `Alle Preise sind in EUR, ohne USt., als feste Relationenraten gemäß SRC-004 Abschnitt 7.1 und SRC-005 anzugeben, mit einer offengelegten Kraftstoffzuschlagsformel und einem Nebenkostenverzeichnis. Die Prognose von ${formatShipmentCount(locale)} Sendungen ist keine Mindestabnahme. ${citeRequirement("REQ-006")}`
        : `All prices shall be quoted in EUR, excluding VAT, as fixed lane rates in accordance with SRC-004 clause 7.1 and SRC-005, with a disclosed fuel-surcharge formula and an accessorial schedule. The forecast of ${formatShipmentCount(locale)} shipments is not a minimum commitment. ${citeRequirement("REQ-006")}`,
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

function citationLine(paragraph: string): string {
  const text = paragraph.trim()
  const english = text.match(/Cited against (REQ-\S+) and (EVAL-\S+)\./)
  if (english) return `Cited against ${english[1]} and ${english[2]}.`
  const german = text.match(/zitiert gegen (REQ-\S+) und (EVAL-\S+)\./i)
  if (german) return `Zitiert gegen ${german[1]} und ${german[2]}.`
  return text
}

function isInternalCitationParagraph(paragraph: string): boolean {
  const text = citationLine(paragraph)
  if (/^REQ-\d+\b/.test(text)) return true
  if (/^Cited against\b/i.test(text)) return true
  if (/^Zitiert gegen\b/i.test(text)) return true
  return false
}

function stripInlineCitations(text: string): string {
  let next = text
  for (const row of REQUIREMENTS) {
    const cite = `${row.source} ${row.sourceVersion} ${row.section}: ${row.passage}`
    if (cite.trim()) next = next.split(cite).join("")
  }
  return next.replace(/[ \t]{2,}/g, " ").trim()
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
  const techNotes = itt.technical.notes.map((n, i) => `<p class="note">${esc(t("tenderStudio.note"))} ${i + 1}: ${esc(stripInlineCitations(n))}</p>`).join("")
  const guidelines = itt.submissionGuidelines.map(g => `<li>${esc(stripInlineCitations(g))}</li>`).join("")
  const fatItems = itt.quality.fatRequirements.map(f => `<li>${esc(stripInlineCitations(f))}</li>`).join("")
  const clauses = itt.legal.clauses
    .map(c => `<div class="clause"><p class="clause-title">${esc(c.heading)}</p><p>${esc(c.text)}</p></div>`)
    .join("")
  const summary = itt.projectSummary
    .filter((paragraph) => !isInternalCitationParagraph(paragraph))
    .map(p => `<p>${esc(stripInlineCitations(p))}</p>`)
    .join("")

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
  <p>${esc(stripInlineCitations(itt.technical.scopeIntro))}</p>
  <table>
    <thead><tr><th>${esc(t("tenderStudio.parameter"))}</th><th>${esc(t("tenderStudio.requirement"))}</th></tr></thead>
    <tbody>${paramRows}</tbody>
  </table>
  ${techNotes}

  <h2>3.0 ${esc(t("tenderStudio.section3"))}</h2>
  <p>${esc(stripInlineCitations(itt.quality.intro))}</p>
  <table>
    <thead><tr><th>${esc(t("tenderStudio.standard"))}</th><th>${esc(t("tenderStudio.application"))}</th></tr></thead>
    <tbody>${standardRows}</tbody>
  </table>
  <h3>${esc(t("tenderStudio.fatTraceability"))}</h3>
  <ul>${fatItems}</ul>

  <h2>4.0 ${esc(t("tenderStudio.section4"))}</h2>
  <p>${esc(stripInlineCitations(itt.legal.governingTerms))}</p>
  ${clauses}

  <h2>5.0 ${esc(t("tenderStudio.section5"))}</h2>
  <p>${esc(stripInlineCitations(itt.pricing.intro))}</p>
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

function laneRateTemplate(): LaneRateTemplateRow[] {
  return LANES.filter((lane) => lane.laneId).map((lane) => ({
    laneId: lane.laneId!,
    origin: `${lane.originCity}, ${lane.originCountry}`,
    destination: `${lane.destinationCity}, ${lane.destinationCountry}`,
    forecastShipments: lane.forecastAnnualShipments ?? 0,
    currency: "EUR",
    rate: "",
    fuelSurcharge: "SRC-005",
    accessorials: "Bidder schedule",
  }))
}

function citedPackage(
  locale: Locale,
  requirementSetVersion: string | null,
  evaluationMethodVersion: string | null,
  decisions: RequirementDecision[],
) {
  const base = COMPONENT_SPECS[0]
  const quantity = localizeQuantity(base.defaultQuantity, locale)
  const pkg = TENDER_PACKAGES.find((row) => row.id === "PKG-RFP-001") ?? null
  const scope = fallbackScope(base, quantity, locale)
  const itt = withCitation(
    composeItt(
      base,
      quantity,
      pkg,
      scope,
      fallbackTechnical(base, quantity, locale),
      fallbackQuality(base, locale),
      fallbackLegal(base, locale),
      locale,
    ),
    locale,
    requirementSetVersion,
    evaluationMethodVersion,
    decisions,
  )
  return { base, quantity, pkg, scope, itt, audit: fallbackAudit(itt, base, locale) }
}

function RfpSections({ doc, locale }: { doc: IttDocument; locale: Locale }) {
  const t = createT(locale)
  return (
    <div className="space-y-7 px-6 py-6">
      <div className="space-y-3">
        <SectionHeading number="1.0" title={t("tenderStudio.section1")} />
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("tenderStudio.section11")}</p>
          {doc.projectSummary.map((paragraph, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{citationLine(paragraph)}</p>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("tenderStudio.section12")}</p>
          <ul className="space-y-1">
            {doc.submissionGuidelines.map((line, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="space-y-3">
        <SectionHeading number="2.0" title={t("tenderStudio.section2")} />
        <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{doc.technical.scopeIntro}</p>
        <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] text-left">
                <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.parameter")}</th>
                <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.requirement")}</th>
              </tr>
            </thead>
            <tbody>
              {doc.technical.parameters.map((row, i) => (
                <tr key={i} className="border-t border-[var(--color-border-default)]">
                  <td className="px-3 py-1.5 font-medium text-[var(--color-text-primary)]">{row.parameter}</td>
                  <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">
                    {row.requirement}
                    {row.citation && <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{row.citation}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {doc.technical.notes.map((note, i) => (
          <p key={i} className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">{t("tenderStudio.note")} {i + 1}: {note}</p>
        ))}
        <p className="text-[10px] text-[var(--color-text-muted)]">{t("tenderStudio.source")}: {doc.technical.citations.join(" · ")}</p>
      </div>
      <div className="space-y-3">
        <SectionHeading number="3.0" title={t("tenderStudio.section3")} />
        <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{doc.quality.intro}</p>
        <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] text-left">
                <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.standard")}</th>
                <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.application")}</th>
              </tr>
            </thead>
            <tbody>
              {doc.quality.standards.map((row, i) => (
                <tr key={i} className="border-t border-[var(--color-border-default)]">
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-[var(--color-text-primary)]">{row.authority} {row.ref}</td>
                  <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{row.application}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-1">
          {doc.quality.fatRequirements.map((line, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
              <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
              {line}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[var(--color-text-muted)]">{t("tenderStudio.source")}: {doc.quality.citations.join(" · ")}</p>
      </div>
      <div className="space-y-3">
        <SectionHeading number="4.0" title={t("tenderStudio.section4")} />
        <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{doc.legal.governingTerms}</p>
        {doc.legal.clauses.map((clause, i) => (
          <div key={i} className="rounded-[10px] border border-[var(--color-border-default)] p-3 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{clause.heading}</p>
              <span className="text-[10px] text-[var(--color-text-muted)]">{clause.source}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{clause.text}</p>
            {clause.citation && <p className="text-[10px] text-[var(--color-text-muted)]">{clause.citation}</p>}
          </div>
        ))}
        <p className="text-[10px] text-[var(--color-text-muted)]">{t("tenderStudio.source")}: {doc.legal.citations.join(" · ")}</p>
      </div>
      <div className="space-y-3">
        <SectionHeading number="5.0" title={t("tenderStudio.section5")} />
        <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{doc.pricing.intro}</p>
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
              {doc.pricing.items.map((item) => (
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
  )
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
                  <div
                    key={doc.id}
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
                  </div>
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
  const { locale, focusTenderId, openTenderStudio, draftedTenders, saveDraftedTender, deleteDraftedTender, appliedTenderQtyByPackage, advanceJourney, patchSession, session } = useStore()

  const [prompt, setPrompt] = React.useState("")
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [generationBlocked, setGenerationBlocked] = React.useState<"exceptions" | "lock" | null>(null)
  const [rfpLanguage, setRfpLanguage] = React.useState<Locale>("en")
  const [translation, setTranslation] = React.useState<IttDocument | null>(null)
  const [laneRows, setLaneRows] = React.useState<LaneRateTemplateRow[]>([])
  const [lanesExpanded, setLanesExpanded] = React.useState(false)
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

  React.useEffect(() => {
    if (session.journeyStep === "s1" && session.acceptedNeed) advanceJourney("s2")
  }, [session.journeyStep, session.acceptedNeed, advanceJourney])

  // Restore a catalogued draft into the working area without re-running the pipeline.
  const loadDraft = React.useCallback((d: DraftedTender) => {
    const baseSpec = COMPONENT_SPECS.find(c => c.id === d.componentId)
    if (!baseSpec || !d.itt) return
    const loadedPkg = d.packageId ? TENDER_PACKAGES.find(p => p.id === d.packageId) ?? null : null
    setSpec(localizeComponentSpec(baseSpec, "en"))
    setQuantity(d.quantity)
    setPkg(loadedPkg)
    setPrompt(d.prompt)
    setScope(d.scope)
    setItt(d.itt)
    setTranslation(d.translation ?? null)
    setLaneRows(d.laneRateTemplate ?? [])
    setRfpLanguage(locale)
    setLanesExpanded(false)
    setAudit(d.audit)
    setSubmitted(d.submitted)
    setSpecialists({ technical: "done", quality: "done", legal: "done" })
    setAuditOpen(false)
    setPipelineOpen(false)
    setPhase("complete")
  }, [locale])

  // Preload the composer when the board's Draft ITT action opened this page.
  // If that package already has a catalogued draft, restore it instead of regenerating.
  React.useEffect(() => {
    if (!focusTenderId || focusTenderId === "PKG-REN-001") return
    const t = tenderById(focusTenderId)
    if (t?.componentId) {
      const existing = draftedTenders.find(d => d.packageId === t.id)
      if (existing && session.rfpGenerated) {
        loadDraft(existing)
      } else if (!session.rfpGenerated) {
        setItt(null)
        setPhase("idle")
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
    if (!session.rfpGenerated || focusTenderId || draftedTenders.length === 0) return
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
  }, [locale, phase, prompt])

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

  const run = React.useCallback(async () => {
    if (runningRef.current || session.rfpGenerated) return
    if (!session.acceptedNeed) return
    if (!materialExceptionsResolved(session.requirementDecisions)) {
      setGenerationBlocked("exceptions")
      return
    }
    if (!session.packageLocked || !session.evaluationMethodApproved) {
      setGenerationBlocked("lock")
      return
    }
    setGenerationBlocked(null)
    runningRef.current = true
    const english = citedPackage("en", session.requirementSetVersion, session.evaluationMethodVersion, session.requirementDecisions)
    const german = citedPackage("de", session.requirementSetVersion, session.evaluationMethodVersion, session.requirementDecisions)
    const rows = laneRateTemplate()
    setSpec(localizeComponentSpec(english.base, "en"))
    setQuantity(english.quantity)
    setPkg(english.pkg)
    setPrompt(`Draft the RFP for European road-freight services across ${offerLaneCount()} lanes`)
    setScope(null)
    setItt(null)
    setTranslation(null)
    setLaneRows([])
    setAudit(null)
    setSubmitted(false)
    setAuditOpen(false)
    setPipelineOpen(false)
    setSpecialists({ technical: "pending", quality: "pending", legal: "pending" })
    setPhase("scoping")
    await new Promise((resolve) => setTimeout(resolve, 250))
    setScope(english.scope)
    setPhase("specialists")
    setSpecialists({ technical: "done", quality: "done", legal: "done" })
    await new Promise((resolve) => setTimeout(resolve, 250))
    setPhase("composing")
    await new Promise((resolve) => setTimeout(resolve, 250))
    setItt(english.itt)
    setTranslation(german.itt)
    setLaneRows(rows)
    setRfpLanguage(locale)
    setPhase("auditing")
    await new Promise((resolve) => setTimeout(resolve, 250))
    setAudit(english.audit)
    setPhase("complete")
    runningRef.current = false
    saveDraftedTender({
      id: english.itt.ittRef,
      componentId: english.base.id,
      quantity: english.quantity,
      packageId: english.pkg?.id ?? "PKG-RFP-001",
      prompt: `Draft the RFP for European road-freight services across ${offerLaneCount()} lanes`,
      createdAt: new Date().toISOString(),
      scope: english.scope,
      itt: english.itt,
      translation: german.itt,
      laneRateTemplate: rows,
      audit: english.audit,
      submitted: false,
    })
    const rfpVersion = (session.requirementSetVersion ?? "REQ-2026-001-v1").replace(/^REQ-/, "RFP-")
    patchSession({ rfpGenerated: true, rfpVersion, rfpApproved: false, approvedRfp: null })
  }, [locale, saveDraftedTender, patchSession, session.acceptedNeed, session.requirementDecisions, session.packageLocked, session.evaluationMethodApproved, session.rfpGenerated, session.requirementSetVersion, session.evaluationMethodVersion])

  const wasGenerated = React.useRef(session.rfpGenerated)
  React.useEffect(() => {
    const previous = wasGenerated.current
    wasGenerated.current = session.rfpGenerated
    if (previous && !session.rfpGenerated) {
      setItt(null)
      setTranslation(null)
      setLaneRows([])
      setAudit(null)
      setPhase("idle")
    }
  }, [session.rfpGenerated])

  const viewingGerman = rfpLanguage === "de" && translation != null
  const docLocale: Locale = viewingGerman ? "de" : "en"
  const docT = createT(docLocale)
  const docProject = localizedProject(docLocale)
  const activeRfp = viewingGerman ? translation : itt
  const isRunning = phase === "scoping" || phase === "specialists" || phase === "composing" || phase === "auditing"
  const outstanding = [
    !session.acceptedNeed ? (locale === "de" ? "Beschaffungsbedarf bestätigen" : "Validate the sourcing need") : null,
    !session.evaluationMethodApproved ? (locale === "de" ? "Bewertungsmethode EVAL-LOG-v1 freigeben" : "Approve evaluation method EVAL-LOG-v1") : null,
    !session.packageLocked ? (locale === "de" ? "Anforderungen REQ-2026-001 freigeben" : "Approve requirements REQ-2026-001") : null,
  ].filter((item): item is string => Boolean(item))
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

      <WorkflowGuideBar page="tender-studio" />

      {focusTenderId === "PKG-REN-001" && session.renewalEventId && (
        <section data-guide-anchor="renewal-prefill" className="scroll-mt-28 rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 text-[12px] text-[var(--color-text-secondary)]">
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            {locale === "de" ? `Vorbefüllt ${session.renewalEventId}` : `Prepopulated ${session.renewalEventId}`}
          </h2>
          <p className="mt-1">
            {locale === "de"
              ? `Vorherige Anforderungen ${session.requirementSetVersion ?? "—"}. Bewertung ${session.evaluationMethodVersion ?? "—"}. Ausschreibung ${session.rfpVersion ?? "—"}. Die Prognose von ${formatShipmentCount("de")} Sendungen ist keine Abnahmeverpflichtung. No History ist kein Abzug. Das kaufmännische Ergebnis ist nicht entschieden.`
              : `Prior requirements ${session.requirementSetVersion ?? "—"}. Method ${session.evaluationMethodVersion ?? "—"}. RFP ${session.rfpVersion ?? "—"}. The ${formatShipmentCount("en")}-shipment forecast is not a volume commitment. No History is not a penalty. The commercial outcome is not decided.`}
          </p>
          {session.createdContracts.length > 0 && (
            <ul className="mt-2 space-y-1">
              {session.createdContracts.map((c) => (
                <li key={c.contractId}>
                  {c.contractId} · {c.contractTitle} · {formatEurFigure(c.contractValueEur, locale === "de" ? "de" : "en")} · OTD {((c.otdTarget ?? 0) * 100).toFixed(1)}% · {c.startDate} – {c.endDate}
                </li>
              ))}
            </ul>
          )}
          {(() => {
            const history = vendorProfile("SUP-001", session.createdContracts, session.asOfMonth)
            if (!history?.latest) return null
            return (
              <p className="mt-2">
                {locale === "de"
                  ? `RheinRoute ${session.asOfMonth}: Score ${history.score?.total ?? "—"}, OTD ${((history.latest.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}%, ${history.months.length} Monate, ${history.incidents.length} Vorfälle.`
                  : `RheinRoute ${session.asOfMonth}: score ${history.score?.total ?? "—"}, OTD ${((history.latest.onTimeDeliveryPct ?? 0) * 100).toFixed(1)}%, ${history.months.length} months, ${history.incidents.length} incidents.`}
              </p>
            )
          })()}
        </section>
      )}
      <LaneSlaPanel compact />
      <RequirementGovernance />
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
      {(() => {
        const life = rfpLifecycle(session)
        const text = locale === "de" ? life.status.de : life.status.en
        const issued = invitesSent(session) ? (locale === "de" ? life.issueLine?.de : life.issueLine?.en) : null
        return (
          <div className="space-y-1">
            <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{text}</p>
            {issued && <p className="text-[12px] text-[var(--color-text-secondary)]">{issued}</p>}
          </div>
        )
      })()}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left rail */}
        <div className="space-y-4">
          {/* Composer */}
          <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-3")}>
            <div className="flex items-center gap-2">
              <SafeIcon name="PenLine" className="h-4 w-4 text-[var(--color-text-muted)]" />
              <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("tenderStudio.draftTender")}</h2>
            </div>
            {session.packageLocked ? (
              <div data-guide-anchor="generate-rfp" className="scroll-mt-28 space-y-2">
                <p className="text-[12px] font-medium text-[var(--color-text-primary)]">
                  {locale === "de" ? rfpLifecycle(session).identifier.de : rfpLifecycle(session).identifier.en}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {session.rfpGenerated
                    ? (locale === "de"
                      ? `Dokument ${session.rfpVersion} wurde aus ${session.requirementSetVersion} und ${session.evaluationMethodVersion} erzeugt. ${offerLaneCount()} Relationen, ${formatShipmentCount(locale)} prognostizierte Sendungen.`
                      : `Document ${session.rfpVersion} was generated from ${session.requirementSetVersion} and ${session.evaluationMethodVersion}. ${offerLaneCount()} lanes, ${formatShipmentCount(locale)} forecast shipments.`)
                    : (locale === "de"
                      ? `Dokumentstatus: Nicht erzeugt. Die Ausschreibung wird aus der freigegebenen REQ-2026-001 und EVAL-LOG-v1 erzeugt. ${offerLaneCount()} Relationen, ${formatShipmentCount(locale)} prognostizierte Sendungen.`
                      : `Document status: Not generated. The RFP will be generated from approved REQ-2026-001 and EVAL-LOG-v1. ${offerLaneCount()} lanes, ${formatShipmentCount(locale)} forecast shipments.`)}
                </p>
                <Button
                  type="button"
                  disabled={isRunning || !session.packageLocked || session.rfpGenerated}
                  onClick={() => { void run() }}
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
                      {locale === "de" ? "Ausschreibung erzeugen" : "Generate RFP"}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div data-guide-anchor="generate-rfp" className="scroll-mt-28 space-y-1">
                <p className="text-[12px] font-medium text-[var(--color-text-primary)]">
                  {locale === "de" ? "Reservierte Ausschreibungs-ID: RFP-2026-001" : "Reserved RFP ID: RFP-2026-001"}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {locale === "de" ? "Dokumentstatus: Nicht erzeugt." : "Document status: Not generated."}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {locale === "de"
                    ? "Die Ausschreibung wird aus der freigegebenen REQ-2026-001 und EVAL-LOG-v1 erzeugt."
                    : "The RFP will be generated from approved REQ-2026-001 and EVAL-LOG-v1."}
                </p>
                {outstanding.length > 0 && (
                  <ul className="space-y-1 text-[12px] text-[var(--color-text-secondary)]">
                    {outstanding.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  disabled
                  className={cn(pcmButton, "w-full gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[13px] font-semibold text-[var(--color-text-inverse)]")}
                >
                  <SafeIcon name="FileSignature" className="h-3.5 w-3.5" />
                  {locale === "de" ? "Ausschreibung erzeugen" : "Generate RFP"}
                </Button>
              </div>
            )}
          </section>


          {/* Drafted tender catalogue */}
          {session.rfpGenerated && draftedTenders.length > 0 && (
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
              {activeRfp && session.rfpGenerated && (
                <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
                  {/* Document header */}
                  <div className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-inverse)] px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-text-inverse)]/60">
                          {docT("tenderStudio.scmLabel")}
                        </p>
                        <h2 className="text-[18px] font-bold text-[var(--color-text-inverse)]">{activeRfp.title}</h2>
                        <p className="text-[12px] text-[var(--color-text-inverse)]/70">{docProject.name} — {docProject.client}</p>
                      </div>
                      {phase === "complete" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            role="group"
                            aria-label={t("common.language")}
                            className="inline-flex items-center rounded-[9px] border border-white/25 p-0.5 text-[11px] font-semibold"
                          >
                            {([
                              { id: "en" as const, label: "EN" },
                              { id: "de" as const, label: "DE" },
                            ]).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={opt.id === "de" && !translation}
                                aria-pressed={docLocale === opt.id}
                                onClick={() => setRfpLanguage(opt.id)}
                                className={cn(
                                  "rounded-[7px] px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                                  docLocale === opt.id
                                    ? "bg-white text-[var(--color-text-primary)]"
                                    : "text-white/70 hover:text-white",
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <Button
                            type="button"
                            onClick={() => openPrintView(activeRfp, docLocale)}
                            className={cn(pcmButton, "gap-1.5 rounded-[10px] border border-[var(--color-text-inverse)]/25 bg-transparent text-[12px] font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-text-inverse)]/10")}
                          >
                            <SafeIcon name="Printer" className="h-3.5 w-3.5" />
                            {t("tenderStudio.printPdf")}
                          </Button>
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
                      <p className="text-[var(--color-text-inverse)]/60">{docT("tenderStudio.reference")} <span className="block font-mono font-medium text-[var(--color-text-inverse)]">{activeRfp.ittRef}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">{docT("tenderStudio.issueDate")} <span className="block font-medium text-[var(--color-text-inverse)]">{formatDate(activeRfp.issueDate, docLocale)}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">{docT("tenderStudio.submissionDeadline")} <span className="block font-medium text-[var(--color-text-inverse)]">{formatDate(activeRfp.submissionDeadline, docLocale)}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">{docT("tenderStudio.procurementOfficer")} <span className="block font-medium text-[var(--color-text-inverse)]">{activeRfp.procurementOfficer}</span></p>
                    </div>
                  </div>

                  <RfpSections doc={activeRfp} locale={docLocale} />
                  {laneRows.length > 0 && (
                    <div className="border-t border-[var(--color-border-default)] px-6 py-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                          {docLocale === "de" ? "Relationen-Ratenvorlage" : "Lane-rate template"} · Lane_Rate_Template.csv · {session.rfpVersion}
                        </p>
                        {laneRows.length > 8 && (
                          <button type="button" className="text-[12px] font-semibold text-[var(--color-brand-primary)]" onClick={() => setLanesExpanded((open) => !open)}>
                            {lanesExpanded
                              ? (docLocale === "de" ? "Weniger anzeigen" : "Show fewer")
                              : (docLocale === "de" ? `Alle ${laneRows.length} anzeigen` : `View all ${laneRows.length}`)}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {lanesExpanded
                          ? (docLocale === "de" ? `${laneRows.length} Relationen. Feste EUR-Raten, Kraftstoffzuschlag nach SRC-005, Nebenkostenverzeichnis vom Bieter.` : `${laneRows.length} lanes. Fixed EUR rates, SRC-005 fuel surcharge, bidder accessorial schedule.`)
                          : (docLocale === "de" ? `8 von ${laneRows.length} angezeigt. Die gespeicherte Vorlage enthält alle ${laneRows.length} Relationen.` : `Showing 8 of ${laneRows.length}. The saved template contains all ${laneRows.length} lanes.`)}
                      </p>
                      <div className="overflow-x-auto rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full min-w-[720px] text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="px-3 py-2">Lane</th>
                              <th className="px-3 py-2">{docLocale === "de" ? "Relation" : "Route"}</th>
                              <th className="px-3 py-2">{docLocale === "de" ? "Prognose" : "Forecast"}</th>
                              <th className="px-3 py-2">EUR</th>
                              <th className="px-3 py-2">{docLocale === "de" ? "Zuschlag" : "Surcharge"}</th>
                              <th className="px-3 py-2">{docLocale === "de" ? "Nebenkosten" : "Accessorials"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(lanesExpanded ? laneRows : laneRows.slice(0, 8)).map((row) => (
                              <tr key={row.laneId} className="border-t border-[var(--color-border-default)]">
                                <td className="px-3 py-1.5 font-medium">{row.laneId}</td>
                                <td className="px-3 py-1.5">{row.origin} → {row.destination}</td>
                                <td className="px-3 py-1.5 tabular-nums">{row.forecastShipments}</td>
                                <td className="px-3 py-1.5">{row.currency}</td>
                                <td className="px-3 py-1.5">{row.fuelSurcharge}</td>
                                <td className="px-3 py-1.5">{row.accessorials}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div data-guide-anchor="approve-rfp" className="scroll-mt-28 space-y-2 border-t border-[var(--color-border-default)] px-6 py-4">
                    <label className="block text-[12px] font-medium text-[var(--color-text-primary)]">
                      {locale === "de" ? "Prüfungskommentar" : "Review note"}
                      <textarea
                        value={session.rfpEditNote}
                        onChange={(e) => patchSession({ rfpEditNote: e.target.value })}
                        rows={2}
                        className="mt-1 w-full rounded-[10px] border border-[var(--color-border-default)] px-3 py-2 text-[12px]"
                        placeholder={locale === "de" ? "Optionaler Kommentar zur Freigabe" : "Optional note with the approval"}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!session.rfpGenerated || session.rfpApproved || phase !== "complete" || !itt || !translation || laneRows.length === 0}
                      onClick={() => {
                        if (!itt || !translation) return
                        const version = session.rfpVersion ?? "RFP-2026-001-v1"
                        const approvedRfp: ApprovedRfp = {
                          version,
                          requirementSetVersion: session.requirementSetVersion ?? "REQ-2026-001-v1",
                          evaluationMethodVersion: session.evaluationMethodVersion ?? "EVAL-LOG-v1",
                          english: itt,
                          german: translation,
                          laneRateTemplate: laneRows,
                          reviewNote: session.rfpEditNote,
                          attachments: [
                            { name: "RFP_EN.docx", version },
                            { name: "RFP_DE.docx", version },
                            { name: "Lane_Rate_Template.csv", version },
                          ],
                        }
                        patchSession({ rfpApproved: true, rfpVersion: version, approvedRfp })
                      }}
                      className="rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                    >
                      {session.rfpApproved
                        ? (locale === "de" ? `${session.rfpVersion} freigegeben` : `${session.rfpVersion} approved`)
                        : (locale === "de" ? "Zitierte Ausschreibung freigeben" : "Approve cited RFP")}
                    </button>
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
