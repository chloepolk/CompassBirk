import type { Locale } from "./types"
import { CLOSED_PACKAGES, TENDER_PACKAGES, type ClosedPackage, type TenderPackage } from "../data/_tenders"

const ROLE_DE: Record<string, string> = {
  "Senior Project SCM Manager": "Senior Project-SCM-Manager",
  "SCM Director": "SCM-Direktorin",
  "Package Manager — Cables": "Losmanagerin — Kabel",
  "Package Manager — Structures": "Losmanager — Strukturen",
  "Lead Quality Engineer": "Leitende Qualitätsingenieurin",
  "Senior Contracts Counsel": "Senior Legal Counsel",
  "Commercial Manager": "Commercial Manager",
  "Vessel & Marine Assurance Lead": "Leiterin Carrier-Assurance",
  "Cost & Estimating Analyst": "Kosten- und Kalkulationsanalystin",
  "Expediting & Logistics Lead": "Leiter Expediting und Logistik",
  "Project Director": "Projektdirektorin",
  "Cable Engineering Lead": "Leiterin Kabeltechnik",
  "Structural QA Lead": "Leiter Structural QA",
  "Structural Engineering Lead": "Leiterin Konstruktion",
  "Cathodic Protection QA Lead": "Leiter Kathodenschutz-QA",
  "Cathodic Protection Engineer": "Ingenieurin Kathodenschutz",
  "Supplier Manager": "Lieferantenmanagerin",
}

const PACKAGE_DE: Record<string, Pick<TenderPackage, "title" | "quantity" | "narrative" | "risk" | "evidence">> = {
  "PKG-RFP-001": {
    title: "Europäische Straßengüterverkehre 2027",
    quantity: "18 Relationen · 2.448 prognostizierte Sendungen",
    narrative:
      "Beschaffungsbedarf: Europäische Straßengüterverkehre 2027 müssen die Rahmenverträge ablösen, die am 31. Dezember 2026 auslaufen. Entwerfen Sie die zweisprachige RFP gegen 18 Relationen, 2.448 prognostizierte Sendungen und das SLA SRC-002, bevor die Einladungen versendet werden. Trägerantworten sind noch nicht eingegangen.",
    risk:
      "Die Rahmenverträge RheinRoute und NorthBridge laufen am 31. Dezember 2026 mit 120-Tage-Kündigungsfrist aus. Ein später Zuschlag verdichtet den Übergang in den Leistungsstart Januar 2027.",
    evidence: [
      "SRC-001: FTL/LTL-Kapazität über 18 europäische Relationen; Sichtbarkeit per API, EDI oder täglicher Datei.",
      "SRC-002: Pünktlichkeitsziel 98,0 %; Sendungsannahmerate 97,0 %; Schadensdeckel 0,5 %.",
      "SRC-008: Neue Carrier bleiben No History; Incumbent-Scores sind eine freigegebene Evidenzquelle, keine automatische Präferenz.",
      "Geschätzter Jahreswert 5,65 Mio. €. Leistungsstart 1. Januar 2027.",
    ],
  },
  "PKG-CON-001": {
    title: "RheinRoute-Rahmenvertrag — Ablauf Kernrelationen",
    quantity: "Europäische Kernrelationen",
    narrative:
      "CON-2024-01 mit der RheinRoute Logistics GmbH endet am 31. Dezember 2026 (120-Tage-Kündigung). Die geprüfte Pünktlichkeit liegt seit drei Monaten unter dem vertraglichen Ziel von 98 %. Der Ablauf ist der Auslöser für RFP-2026-001, kein separater Zuschlag.",
    risk:
      "Ohne Nachfolgevertrag bleibt die Abdeckung der Kernrelationen ab 1. Januar 2027 unkontrahiert.",
    evidence: [
      "Vertragswert 4,75 Mio. €; Pünktlichkeitsziel 98 %; Rechnungsgenauigkeitsziel 99 %.",
      "Leistungswarnung ACT-006: Pünktlichkeit drei Monate unter Ziel auf fünf Relationen.",
      "Incumbent-Historie ist verfügbar und als geprüft gekennzeichnet, nicht imputiert.",
    ],
  },
  "PKG-CON-002": {
    title: "NorthBridge-Rahmenvertrag — Ablauf UK und Nordeuropa",
    quantity: "Relationen UK / Nordeuropa",
    narrative:
      "CON-2024-02 mit NorthBridge Freight Ltd endet ebenfalls am 31. Dezember 2026. NorthBridge ist der stärkste Incumbent beim Service-Score und Kandidat im Dual-Award-Szenario (35 %) neben AlpineLink.",
    risk:
      "Das Kündigungsfenster ist dasselbe wie bei CON-2024-01 — als ein Beschaffungsereignis behandeln, nicht als zwei isolierte Ausschreibungen.",
    evidence: [
      "Vertragswert 3,08 Mio. €; Pünktlichkeitsziel 97,5 %.",
      "Bewertungsrang 3; in Dual-Award-Szenario AWD-02 aufnehmen.",
    ],
  },
  "PKG-PERF-001": {
    title: "Leistungsabweichung — RheinRoute-Pünktlichkeit unter Vertragsziel",
    quantity: "Fünf Relationen mit verspäteter Zustellung",
    narrative:
      "Nachverfolgung im aktuellen RheinRoute-Rahmenvertrag: die Pünktlichkeit liegt drei Monate in Folge unter dem Ziel von 98 %. Legen Sie eine Leistungsprüfung und eine deutsche Korrekturmaßnahme an. Das ist Überwachungsevidenz, keine realisierte Einsparung.",
    risk:
      "Fünf Relationen verursachen die meisten Verspätungen. Ungeklärt wird die Verschlechterung zur Zuschlags- und Erneuerungsevidenz.",
    evidence: [
      "Leistungswarnung ACT-006; Korrekturmaßnahmenentwurf ACT-007.",
      "Der operative Score nutzt Pünktlichkeit, Sendungsannahmerate und Schäden (40 % des Lieferantenscores).",
      "Synthetische Ausführungsdaten sind als synthetisch gekennzeichnet.",
    ],
  },
  "PKG-CA-001": {
    title: "Korrekturmaßnahme — RheinRoute Terminal-Sanierungsplan",
    quantity: "Fünf Relationen mit verspäteter Zustellung",
    narrative:
      "Korrekturmaßnahme: fordern Sie von RheinRoute einen deutschsprachigen Terminal-Sanierungsplan an. Fünf Relationen verursachen die meisten Verspätungen. Das ist eine Überwachungspflicht, keine realisierte Einsparung.",
    risk:
      "Ohne zugewiesene Person und Frist wird die Verschlechterung zur Bewertungsevidenz und zum Erneuerungstreiber.",
    evidence: [
      "Korrekturmaßnahmenentwurf ACT-007; CAP-001.",
      "Verknüpft mit Leistungswarnung ACT-006 und der Pünktlichkeitsserie bis zum Stichtag.",
    ],
  },
  "PKG-REN-001": {
    title: "Verlängerung / Neuausschreibung — nur geprüfte Historie nutzen",
    quantity: "18 Relationen · Zuschlags-Baseline 2027",
    narrative:
      "Nach dem Zuschlag 2027 darf die nächste Verlängerung oder Neuausschreibung nur geprüfte Ausführungshistorie wiederverwenden. Challenger bleiben No History. Keine erfundenen Scores und keine ungeprüften Behauptungen in das nächste Ereignis übernehmen.",
    risk:
      "Die Wiederverwendung ungeprüfter oder nachträglicher Gerüchte als Historie würde die nächste Bewertung verzerren.",
    evidence: [
      "Zuschlags-Vertragsbaseline aus dem Dual Award 2027 ohne erneute SLA-Erfassung übernommen.",
      "Incumbent-Scores nutzen die veröffentlichte Monatssumme, Berechnung v1.2, für die Monate bis zum Stichtag.",
    ],
  },
}

const CLOSED_DE: Record<string, string> = {
  "PKG-2087": "Westeuropa-Überlauf — Mini-Ausschreibung 2025",
  "PKG-2090": "Saisonale Spitzenkapazität — Q1 2026",
  "PKG-2095": "Temperaturgeführter Überlauf — Niederlande",
}

export function localizeRole(role: string, locale: Locale): string {
  if (locale !== "de") return role
  return ROLE_DE[role] ?? role
}

export function localizedTenderPackages(locale: Locale): TenderPackage[] {
  if (locale !== "de") return TENDER_PACKAGES
  return TENDER_PACKAGES.map((pkg) => {
    const de = PACKAGE_DE[pkg.id]
    if (!de) return pkg
    return {
      ...pkg,
      title: de.title,
      quantity: de.quantity,
      narrative: de.narrative,
      risk: de.risk,
      evidence: de.evidence,
      ownerRole: localizeRole(pkg.ownerRole, locale),
      sponsorRole: localizeRole(pkg.sponsorRole, locale),
    }
  })
}

export function localizedClosedPackages(locale: Locale): ClosedPackage[] {
  if (locale !== "de") return CLOSED_PACKAGES
  return CLOSED_PACKAGES.map((pkg) => ({
    ...pkg,
    name: CLOSED_DE[pkg.id] ?? pkg.name,
    decisionMaker: localizeRole(pkg.decisionMaker, locale),
  }))
}
