import { EMAILS } from "./expected/emails"
import { supplierById } from "./vendor-model"

export type InboxClass = "confirmed" | "potentially" | "not-relevant"
export type InboxDirection = "inbound" | "outbound"
export type InboxKind = "invitation" | "acknowledgement" | "clarification" | "bid" | "internal" | "newsletter" | "performance" | "corrective" | "autoreply"

export type AttachmentVersion = {
  name: string
  version: string
  supersedes?: string
}

export type InboxMessage = {
  id: string
  direction: InboxDirection
  kind: InboxKind
  date: string
  from: string
  to: string
  subject: string
  language: "EN" | "DE"
  suggestedClass: InboxClass
  eventId: string | null
  supplierId: string | null
  attachments: AttachmentVersion[]
  bodyEn: string
  bodyDe: string
  affectsBids: boolean
}

function idFromFile(fileName: string | null, fallback: string | null): string {
  if (fallback) return fallback
  const m = fileName?.match(/^(\d{3})_/)
  return m ? `EML-${m[1]}` : "EML-UNK"
}

function mapSuggested(raw: string | null): InboxClass {
  if (raw === "Irrelevant") return "not-relevant"
  if (raw === "Ambiguous") return "potentially"
  return "confirmed"
}

function parseDate(raw: string | null): string {
  if (!raw) return "2026-09-29"
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function attachmentsFor(id: string, rawSupplier: string | null, rawAttach: string | null): AttachmentVersion[] {
  const blob = [rawAttach, rawSupplier].filter(Boolean).join("; ")
  const names = blob
    .split(";")
    .map((s) => s.trim())
    .filter((s) => /\.(docx|csv|txt|pdf)$/i.test(s) || s.includes("Rate") || s.includes("Insurance") || s.includes("Corrective") || s.includes("RFP_"))
  if (id === "EML-008") {
    return [
      { name: "RheinRoute_Rate_Card_v1.csv", version: "v1", supersedes: undefined },
      { name: "RheinRoute_Rate_Card_v2.csv", version: "v2", supersedes: "RheinRoute_Rate_Card_v1.csv" },
    ]
  }
  return names.map((name) => ({
    name,
    version: /v2/i.test(name) ? "v2" : "v1",
    supersedes: /v2/i.test(name) ? name.replace(/v2/i, "v1") : undefined,
  }))
}

function supplierIdFor(id: string, raw: string | null): string | null {
  if (raw && /^SUP-\d+/.test(raw)) return raw
  if (id === "EML-001" || id === "EML-002") return null
  if (id === "EML-010" || id === "EML-011") return "SUP-001"
  return null
}

const BODIES: Record<string, { en: string; de: string; kind: InboxKind; direction: InboxDirection; affectsBids: boolean }> = {
  "EML-001": {
    direction: "outbound",
    kind: "invitation",
    affectsBids: false,
    en: "You are invited to respond to RFP-2026-001, European Road Freight Services 2027. Eighteen lanes; 2,448 forecast shipments; SLA in SRC-002. Rate card template attached. Responses close 23 October 2026. This invitation is confidential to the named recipient and does not disclose another bidder's rates.",
    de: "Sie sind eingeladen, auf RFP-2026-001, Europäische Straßentransporte 2027, zu antworten. Achtzehn Relationen; 2.448 prognostizierte Sendungen; SLA gemäß SRC-002. Preistabelle im Anhang. Frist 23. Oktober 2026. Diese Einladung ist für den genannten Empfänger vertraulich und nennt keine Raten eines anderen Bieters.",
  },
  "EML-002": {
    direction: "outbound",
    kind: "invitation",
    affectsBids: false,
    en: "German-language invitation to RFP-2026-001. Same lanes, volumes and SLA as the English original. Eighteen lanes; 2,448 forecast shipments. Responses close 23 October 2026. This file is a labelled translation of the EN-GB invitation. This invitation is confidential to the named recipient and does not disclose another bidder's rates.",
    de: "Deutschsprachige Einladung zu RFP-2026-001. Dieselben Relationen, Mengen und SLA wie das englische Original. Achtzehn Relationen; 2.448 prognostizierte Sendungen. Frist 23. Oktober 2026. Diese Datei ist eine gekennzeichnete Übersetzung der EN-GB-Einladung. Diese Einladung ist für den genannten Empfänger vertraulich und nennt keine Raten eines anderen Bieters.",
  },
  "EML-003": {
    direction: "inbound",
    kind: "acknowledgement",
    affectsBids: false,
    en: "AlpineLink acknowledges receipt of RFP-2026-001 and will submit a full 18-lane response. No History is understood as a state, not a penalty.",
    de: "AlpineLink bestätigt den Eingang von RFP-2026-001 und wird ein vollständiges Angebot über 18 Relationen einreichen. No History wird als Zustand verstanden, nicht als Abzug.",
  },
  "EML-004": {
    direction: "inbound",
    kind: "clarification",
    affectsBids: false,
    en: "Please confirm the fuel-surcharge baseline month and whether the SRC-005 formula is mandatory. We will price a disclosed surcharge on top of the lane rate.",
    de: "Bitte bestätigen Sie den BasisMonat für den Kraftstoffzuschlag und ob die Formel aus SRC-005 verbindlich ist. Wir kalkulieren einen offengelegten Zuschlag auf die Relationenrate.",
  },
  "EML-005": {
    direction: "inbound",
    kind: "internal",
    affectsBids: false,
    en: "Internal: is the 2,448-shipment figure a commitment or a decision input? Please classify before we publish a clarification.",
    de: "Intern: Ist die Zahl von 2.448 Sendungen eine Abnahmeverpflichtung oder eine Entscheidungsgrundlage? Bitte erst einstufen, bevor wir eine Klarstellung veröffentlichen.",
  },
  "EML-006": {
    direction: "inbound",
    kind: "newsletter",
    affectsBids: false,
    en: "European freight market weekly update — spot rates, capacity notes and an industry conference advert. Not linked to RFP-2026-001.",
    de: "Wöchentliches Update zum europäischen Frachtmarkt — Spot-Raten, Kapazitätshinweise und eine Konferenzanzeige. Nicht mit RFP-2026-001 verknüpft.",
  },
  "EML-007": {
    direction: "inbound",
    kind: "bid",
    affectsBids: true,
    en: "AlpineLink submits its bid for RFP-2026-001: narrative response and lane rate card. Treat as a supplier return only after this message is confirmed.",
    de: "AlpineLink reicht das Angebot zu RFP-2026-001 ein: Angebotstext und Relationen-Preistabelle. Erst nach Bestätigung dieser Nachricht als Angebot werten.",
  },
  "EML-008": {
    direction: "inbound",
    kind: "bid",
    affectsBids: true,
    en: "RheinRoute replaces its rate card. Version 2 supersedes version 1. Keep v1 in the audit trail. Do not apply v2 to scores until this message is confirmed.",
    de: "RheinRoute ersetzt die Preistabelle. Version 2 ersetzt Version 1. Version 1 bleibt im Prüfpfad. Version 2 nicht in Scores übernehmen, bis diese Nachricht bestätigt ist.",
  },
  "EML-009": {
    direction: "inbound",
    kind: "bid",
    affectsBids: true,
    en: "Veloce attaches an updated cargo-insurance certificate. Qualification still requires cover of at least EUR 5 million. Confirm before the gate is re-run.",
    de: "Veloce legt ein aktualisiertes Frachtversicherungszertifikat bei. Die Qualifikation verlangt weiterhin mindestens 5 Mio. €. Erst bestätigen, dann das Tor erneut prüfen.",
  },
  "EML-013": {
    direction: "inbound",
    kind: "bid",
    affectsBids: true,
    en: "NorthBridge submits its bid for RFP-2026-001: narrative response and a lane rate card covering 15 of 18 lanes. Treat as a supplier return only after this message is confirmed.",
    de: "NorthBridge reicht das Angebot zu RFP-2026-001 ein: Angebotstext und eine Relationen-Preistabelle für 15 von 18 Relationen. Erst nach Bestätigung dieser Nachricht als Angebot werten.",
  },
  "EML-010": {
    direction: "inbound",
    kind: "performance",
    affectsBids: false,
    en: "Operations: RheinRoute on-time delivery sat below the 98% contractual target for a third month. Five lanes drive most late deliveries.",
    de: "Betrieb: Die Pünktlichkeit von RheinRoute lag im dritten Monat unter dem vertraglichen Ziel von 98 %. Fünf Relationen verursachen die meisten Verspätungen.",
  },
  "EML-011": {
    direction: "outbound",
    kind: "corrective",
    affectsBids: false,
    en: "Draft corrective-action request: please submit a terminal recovery plan in German within seven days, covering the five late-delivery lanes.",
    de: "Entwurf der Korrekturmaßnahme: Bitte reichen Sie innerhalb von sieben Tagen einen deutschen Terminal-Maßnahmenplan für die fünf verspäteten Relationen ein.",
  },
  "EML-012": {
    direction: "inbound",
    kind: "autoreply",
    affectsBids: false,
    en: "Automatic reply: Lena Vogt is out of office. This message has no sourcing content.",
    de: "Automatische Antwort: Lena Vogt ist abwesend. Diese Nachricht enthält keinen Ausschreibungsinhalt.",
  },
}

export function inboxMessages(): InboxMessage[] {
  return EMAILS.filter((row) => row.fileName).map((row) => {
    const id = idFromFile(row.fileName, row.emailId)
    const meta = BODIES[id] ?? {
      direction: "inbound" as const,
      kind: "clarification" as const,
      affectsBids: false,
      en: row.subject ?? "",
      de: row.subject ?? "",
    }
    return {
      id,
      direction: meta.direction,
      kind: meta.kind,
      date: parseDate(row.date),
      from: row.from ?? "",
      to: row.to ?? "",
      subject: row.subject ?? id,
      language: row.language === "DE" ? "DE" : "EN",
      suggestedClass: mapSuggested(row.expectedClassification),
      eventId: row.eventId && row.eventId.startsWith("RFP") ? row.eventId : "RFP-2026-001",
      supplierId: supplierIdFor(id, row.supplierId),
      attachments: attachmentsFor(id, row.supplierId, row.attachments),
      bodyEn: meta.en,
      bodyDe: meta.de,
      affectsBids: meta.affectsBids,
    }
  })
}

export function isQuarantined(id: string, classifications: Record<string, InboxClass>): boolean {
  return classifications[id] !== "confirmed"
}

export function quarantinedBidEvidence(classifications: Record<string, InboxClass>): string[] {
  return inboxMessages()
    .filter((m) => m.affectsBids && isQuarantined(m.id, classifications))
    .map((m) => m.id)
}

export function carrierLabel(supplierId: string | null): string {
  if (!supplierId) return "—"
  return supplierById(supplierId)?.supplierName ?? supplierId
}
