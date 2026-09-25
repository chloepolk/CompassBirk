import {
  BASELINE_STANDARDS,
  COMPONENT_SPECS,
  DOCUMENTS,
  FAT_TRACEABILITY_CLAUSES,
  PROCUREMENT_CLAUSES,
  STANDARDS_MATRIX,
  resolveComponentFromPrompt,
  type ComponentSpec,
  type DocumentCategory,
  type S7Document,
  type StandardRow,
  type TermsClause,
} from "../data/_documents"
import { PROJECT } from "../data/_tenders"
import type { Locale } from "./types"

export const TENDER_SUGGESTIONS: Record<Locale, string[]> = {
  en: [
    "Draft the RFP for European road-freight services across 18 lanes",
    "Prepare a request for proposal for FTL and LTL capacity from January 2027",
  ],
  de: [
    "Entwurf der Ausschreibung für europäische Straßengüterverkehre über 18 Relationen",
    "Ausschreibung für FTL- und LTL-Kapazität ab Januar 2027 vorbereiten",
  ],
}

export function localizeComponentSpec(spec: ComponentSpec, _locale: Locale): ComponentSpec {
  return spec
}

export function localizedComponentSpecs(locale: Locale): ComponentSpec[] {
  return COMPONENT_SPECS.map((spec) => localizeComponentSpec(spec, locale))
}

export function resolveLocalizedComponent(prompt: string, _locale: Locale): ComponentSpec | null {
  return resolveComponentFromPrompt(prompt)
}

export function localizeQuantity(quantity: string, locale: Locale): string {
  if (locale !== "de") return quantity
  return quantity
    .replace("forecast shipments", "prognostizierte Sendungen")
    .replace("Core European lanes", "Europäische Kernrelationen")
    .replace("UK / Northern Europe lanes", "Relationen UK / Nordeuropa")
    .replace("Five late-delivery lanes", "Fünf Relationen mit verspäteter Zustellung")
    .replace("awarded 2027 baseline", "Zuschlags-Baseline 2027")
    .replace(/\blanes\b/g, "Relationen")
}

export function resolveLocalizedQuantity(prompt: string, baseSpec: ComponentSpec, _locale: Locale): string {
  const match = prompt.match(/([\d,]+(?:\.\d+)?)\s*(metres|meters|m\b|units?|lanes?|shipments?|off\b|sets?|pcs)/i)
  if (!match) return baseSpec.defaultQuantity
  const unit = match[2].toLowerCase().startsWith("lane")
    ? "lanes"
    : match[2].toLowerCase().startsWith("ship")
      ? "shipments"
      : match[2].toLowerCase().startsWith("m")
        ? "metres"
        : "units"
  return `${match[1]} ${unit}`
}

export function localizedStandards(_locale: Locale, baseline = false): StandardRow[] {
  return baseline ? BASELINE_STANDARDS : STANDARDS_MATRIX
}

export function localizedFatRequirements(_locale: Locale): string[] {
  return [...FAT_TRACEABILITY_CLAUSES]
}

export function localizedProcurementClauses(_locale: Locale): TermsClause[] {
  return PROCUREMENT_CLAUSES
}

export function localizedDocuments(_locale: Locale): S7Document[] {
  return DOCUMENTS
}

export function localizedDocumentsByCategory(category: DocumentCategory, locale: Locale): S7Document[] {
  return localizedDocuments(locale).filter((document) => document.category === category)
}

export function localizedProject(locale: Locale) {
  return locale === "de"
    ? {
        ...PROJECT,
        scope: "europäische Straßengüterverkehre — 18 Relationen, Basis 12 Monate",
        mobilisationPort: "Europäisches Straßennetz",
      }
    : PROJECT
}
