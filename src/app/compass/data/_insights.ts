export type FindingCategory =
  | "pipeline-health"
  | "deadline-risk"
  | "savings-signal"
  | "compliance-flag"
  | "charter-interface"
  | "supplier-signal"
  | "inventory-validation"

export type Severity = "critical" | "high" | "medium" | "info"

export interface BPFinding {
  id: string
  category: FindingCategory
  severity: Severity
  title: string
  narrative: string
  evidence: string[]
  recommendation: string
  drillPath?: {
    page: string
    region?: string
    customer?: string
    jobType?: string
  }
  page: "operating-loop" | "tender-studio" | "bid-evaluation" | "vendor-360" | "performance"
  drillLevel: "macro" | "region" | "customer"
  regionScope?: string
  customerScope?: string
}

function procurementFindings(): BPFinding[] {
  return [
    {
      id: "clp-rfp-deadline",
      category: "deadline-risk",
      severity: "critical",
      title: "RFP-2026-001 bid deadline is 23 October 2026",
      narrative:
        "European Road Freight Services 2027 is the governed event. Carrier responses are not yet on file. Contract expiry, the sourcing need, a performance exception and a corrective action are open. Award target 20 November 2026.",
      evidence: [
        "Bid deadline 23 October 2026; award target 20 November 2026; service start 1 January 2027.",
        "Estimated annual value €5.65m across 18 lanes and 2,448 forecast shipments.",
        "RheinRoute and NorthBridge frameworks expire 31 December 2026 with 120-day notice.",
      ],
      recommendation: "Open Bid Evaluation on RFP-2026-001 and keep qualification separate from weighted scoring.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "clp-incumbent-otd",
      category: "supplier-signal",
      severity: "high",
      title: "RheinRoute OTD is below the 98% contractual target",
      narrative:
        "Verified execution on CON-2024-01 shows on-time delivery below 98% for three months. That history may inform evaluation as an approved evidence source. It is not an automatic incumbent preference and is not a realised saving.",
      evidence: [
        "ACT-006 performance alert; five lanes account for most late deliveries.",
        "Vendor score weights: Operational 40%, Commercial 25%, Contract/SLA 20%, Relationship 15%.",
      ],
      recommendation: "Open the performance action and keep the German corrective-action request in draft until a user approves send.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "clp-no-history",
      category: "compliance-flag",
      severity: "medium",
      title: "AlpineLink and Veloce remain No History",
      narrative:
        "Challengers have no verified internal operating record. AlpineLink is rank 1 on compliant cost. Veloce fails the cargo-insurance gate and is not ranked. Neither receives an invented score.",
      evidence: [
        "SRC-008: No History is a state, not a low score.",
        "Veloce insurance certificate is below the mandatory €5 million threshold.",
      ],
      recommendation: "Show No History on the evaluation cards. Do not impute or penalise missing history.",
      page: "bid-evaluation",
      drillLevel: "macro",
    },
    {
      id: "clp-dual-award",
      category: "savings-signal",
      severity: "medium",
      title: "Recommended scenario is dual award, not single-source",
      narrative:
        "AWD-02 (AlpineLink 65% / NorthBridge 35%) balances challenger cost with proven execution. Single-award AlpineLink is cheaper and more concentrated. Incumbent continuity is more expensive and keeps RheinRoute deterioration in the baseline.",
      evidence: [
        "AWD-02 annual cost €2.015m; AWD-01 €1.920m; AWD-03 €2.116m.",
        "All values are synthetic and labelled as such.",
      ],
      recommendation: "Present the three scenarios with cost, concentration and history trade-offs. Award still requires named human approval.",
      page: "bid-evaluation",
      drillLevel: "macro",
    },
  ]
}

const FINDINGS_DE: Record<string, Pick<BPFinding, "title" | "narrative" | "evidence" | "recommendation">> = {
  "clp-rfp-deadline": {
    title: "Die Angebotsfrist für RFP-2026-001 ist der 23. Oktober 2026",
    narrative:
      "Europäische Straßengüterverkehre 2027 ist das gesteuerte Ereignis. Trägerantworten liegen noch nicht vor. Vertragsablauf, Beschaffungsbedarf, eine Leistungsabweichung und eine Korrekturmaßnahme sind offen. Zuschlagsziel 20. November 2026.",
    evidence: [
      "Angebotsfrist 23. Oktober 2026; Zuschlagsziel 20. November 2026; Leistungsstart 1. Januar 2027.",
      "Geschätzter Jahreswert 5,65 Mio. € über 18 Relationen und 2.448 prognostizierte Sendungen.",
      "Die Rahmenverträge RheinRoute und NorthBridge laufen am 31. Dezember 2026 mit 120-Tage-Kündigung aus.",
    ],
    recommendation: "Öffnen Sie die Angebotsbewertung zu RFP-2026-001 und halten Sie Qualifikation getrennt vom gewichteten Score.",
  },
  "clp-incumbent-otd": {
    title: "RheinRoute-Pünktlichkeit liegt unter dem vertraglichen Ziel von 98 %",
    narrative:
      "Die geprüfte Ausführung zu CON-2024-01 zeigt drei Monate Pünktlichkeit unter 98 %. Diese Historie darf die Bewertung als freigegebene Evidenzquelle informieren. Sie ist keine automatische Incumbent-Präferenz und keine realisierte Einsparung.",
    evidence: [
      "Leistungswarnung ACT-006; fünf Relationen verursachen die meisten Verspätungen.",
      "Gewicht des Lieferantenscores: Operativ 40 %, Kommerziell 25 %, Vertrag/SLA 20 %, Beziehung 15 %.",
    ],
    recommendation: "Öffnen Sie die Leistungsaktion und halten Sie die deutsche Korrekturmaßnahme im Entwurf, bis eine Person das Senden freigibt.",
  },
  "clp-no-history": {
    title: "AlpineLink und Veloce bleiben No History",
    narrative:
      "Challenger haben keinen geprüften internen Betriebsnachweis. AlpineLink liegt auf Rang 1 bei konformen Kosten. Veloce fällt am Frachtversicherungstor durch und wird nicht gerankt. Keiner erhält einen erfundenen Score.",
    evidence: [
      "SRC-008: No History ist ein Zustand, kein niedriger Score.",
      "Das Versicherungszertifikat von Veloce liegt unter der Pflichtschwelle von 5 Mio. €.",
    ],
    recommendation: "No History auf den Bewertungskarten zeigen. Fehlende Historie weder imputieren noch bestrafen.",
  },
  "clp-dual-award": {
    title: "Empfohlenes Szenario ist Dual Award, nicht Alleinvergabe",
    narrative:
      "AWD-02 (AlpineLink 65 % / NorthBridge 35 %) gleicht Challenger-Kosten mit nachgewiesener Ausführung aus. Alleinvergabe an AlpineLink ist günstiger und konzentrierter. Incumbent-Kontinuität ist teurer und hält die RheinRoute-Verschlechterung in der Baseline.",
    evidence: [
      "AWD-02 Jahreskosten 2,015 Mio. €; AWD-01 1,920 Mio. €; AWD-03 2,116 Mio. €.",
      "Alle Werte sind synthetisch und als solche gekennzeichnet.",
    ],
    recommendation: "Die drei Szenarien mit Kosten-, Konzentrations- und Historie-Abwägungen darstellen. Der Zuschlag bleibt an eine namentliche menschliche Freigabe gebunden.",
  },
}

export function generateFindings(_overlays: unknown = {}, locale: "en" | "de" = "en"): BPFinding[] {
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, info: 3 }
  const findings = procurementFindings().map((finding) => {
    if (locale !== "de") return finding
    const de = FINDINGS_DE[finding.id]
    return de ? { ...finding, ...de } : finding
  })
  return findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
