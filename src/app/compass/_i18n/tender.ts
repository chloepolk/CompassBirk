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

export function localizeComponentSpec(spec: ComponentSpec, locale: Locale): ComponentSpec {
  if (locale !== "de" || spec.id !== "road-freight") return spec
  return {
    ...spec,
    name: "Europäische Straßentransporte",
    shortName: "Straßentransporte",
    overview: "FTL- und LTL-Kapazität auf 18 europäischen Relationen, mit Anforderungen an Sichtbarkeit, SLA und EUR-Ratenkarte.",
    unit: "Relationen",
    parameters: [
      { parameter: "Relationen", requirement: "18 europäische Abgangs- und Zielpaare" },
      { parameter: "Prognosemenge", requirement: "2.448 Sendungen pro Jahr (Entscheidungsgrundlage, keine garantierte Abnahme)" },
      { parameter: "Equipment", requirement: "Curtainsider / Koffer; ausgewählte Relationen temperaturgeführt" },
      { parameter: "OTD-Ziel", requirement: "98,0 % pünktliche Zustellung" },
      { parameter: "Annahmequote", requirement: "97,0 %" },
      { parameter: "Schadensobergrenze", requirement: "0,5 % der Sendungen" },
      { parameter: "Rechnungsgenauigkeit", requirement: "99,0 %" },
      { parameter: "Währung", requirement: "EUR, feste Relationenraten zuzüglich offengelegtem Kraftstoffzuschlag" },
      { parameter: "Sichtbarkeit", requirement: "API, EDI oder vereinbarte Tagesdatei" },
      { parameter: "Versicherung", requirement: "Frachtversicherung von mindestens 5 Mio. EUR" },
    ],
  }
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

const FAT_DE = [
  "Frachtführer reichen Qualifikationsnachweise (Versicherung, Due Diligence und Datenanbindung) mindestens 30 Tage vor dem geplanten Leistungsbeginn ein.",
  "Eine Frachtversicherung von mindestens 5 Mio. EUR ist verpflichtend, bevor ein Angebot das Qualifikationstor bestehen kann.",
  "Die Sendungssichtbarkeit erfolgt über API, EDI oder eine vereinbarte Tagesdatei gemäß SRC-006.",
]

export function localizedFatRequirements(locale: Locale): string[] {
  return locale === "de" ? [...FAT_DE] : [...FAT_TRACEABILITY_CLAUSES]
}

const CLAUSE_DE: Record<string, { heading: string; text: string }> = {
  "4.1": {
    heading: "Leistungserbringung",
    text: "Sofern die Bestellung nichts anderes vorsieht, werden die Leistungen auf den vereinbarten Abgangs- und Zielrelationen mit dem benannten Equipment erbracht.",
  },
  "4.3": {
    heading: "Sichtbarkeit und Nachweis",
    text: "Der Lieferant stellt die vereinbarte Sichtbarkeit (API, EDI oder Tagesdatei) und den POD-Nachweis spätestens in der in SRC-002 genannten Frist bereit.",
  },
  "5.1–5.3": {
    heading: "Haftung und Versicherung",
    text: "Der Lieferant hält eine Frachtversicherung von mindestens 5 Mio. EUR und bleibt für Verlust oder Beschädigung der Güter in seiner Obhut verantwortlich.",
  },
  "6.2": {
    heading: "Leistungsgarantie",
    text: "Die Leistung folgt der SLA in SRC-002 über die Vertragslaufzeit. Abweichungen werden nach dem Prüfrhythmus dieses Standards eskaliert.",
  },
  "7.1": {
    heading: "Festpreise",
    text: "Relationenraten sind in EUR fest und bindend. Ein nach SRC-005 offengelegter Kraftstoffzuschlag ist das einzige zulässige variable Element, sofern kein Index schriftlich vereinbart ist.",
  },
  "7.2": {
    heading: "Zahlungsbedingungen",
    text: "Die Zahlung erfolgt sechzig (60) Tage nach Ende des Monats, in dem eine richtige und vollständig belegte Rechnung eingeht.",
  },
  "9.1–9.2": {
    heading: "Anwendbares Recht und Streitigkeiten",
    text: "Dieser Vertrag unterliegt dem Recht von England und Wales. Streitigkeiten werden abschließend nach den LCIA-Regeln geschlichtet; der Schiedsort ist London, England.",
  },
}

export function localizedProcurementClauses(locale: Locale): TermsClause[] {
  if (locale !== "de") return PROCUREMENT_CLAUSES
  return PROCUREMENT_CLAUSES.map((clause) => {
    const translated = CLAUSE_DE[clause.ref]
    return translated ? { ...clause, ...translated } : clause
  })
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
        name: "Europäische Straßentransporte 2027",
        shortName: "Straßentransporte",
        scope: "europäische Straßengüterverkehre — 18 Relationen, 2.448 prognostizierte Sendungen",
        mobilisationPort: "Europäisches Straßennetz",
      }
    : PROJECT
}
