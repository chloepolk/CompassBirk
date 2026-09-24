import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const fe = (...p) => path.join(ROOT, "src", "app", "prototype", "future-energy", ...p)

function rewrite(rel, fn) {
  const file = path.isAbsolute(rel) ? rel : path.join(ROOT, rel)
  let text = fs.readFileSync(file, "utf8")
  const next = fn(text)
  if (next === text) console.warn("no change", file)
  else fs.writeFileSync(file, next)
}

rewrite(fe("_pages", "tender-studio.tsx"), (text) => {
  text = text.replace(
    `import { RecordDispositionModal } from "../_components/hub/record-disposition-modal"\n`,
    "",
  )
  text = text.replace(
    `import {
  canApplyResidualToTender,
  controlReason,
  displayPackageQuantity,
  formatQty,
  formatTenderQty,
  ittIssueBlocked,
  openValidationActionForPackage,
  summarizePackage,
} from "../data/future-energy/_demand-validation"`,
    `import { displayPackageQuantity } from "../data/future-energy/_demand-validation"`,
  )
  text = text.replace(
    `  const { locale, focusTenderId, openTenderStudio, openBidEvaluation, openActionCentre, advanceTenderStage, setPage, draftedTenders, saveDraftedTender, deleteDraftedTender, inventoryOverlays, appliedTenderQtyByPackage, applyResidualToTender, recordInventoryDisposition } = useStore()`,
    `  const { locale, focusTenderId, openTenderStudio, openBidEvaluation, advanceTenderStage, setPage, draftedTenders, saveDraftedTender, deleteDraftedTender, appliedTenderQtyByPackage } = useStore()`,
  )
  text = text.replace(
    `  const [heldDispositionAction, setHeldDispositionAction] = React.useState<ReturnType<typeof openValidationActionForPackage>>(undefined)\n`,
    "",
  )
  text = text.replace(
    `    if (ittIssueBlocked(pkg.id, inventoryOverlays)) return\n`,
    "",
  )
  text = text.replace(
    `, inventoryOverlays])`,
    `])`,
  )
  text = text.replace(
    `  const validationSummary = pkg ? summarizePackage(pkg.id, inventoryOverlays) : null
  const issueBlocked = pkg ? ittIssueBlocked(pkg.id, inventoryOverlays) : false
  const openDemandAction = pkg ? openValidationActionForPackage(pkg.id, inventoryOverlays) : undefined
`,
    "",
  )
  text = text.replace(
    /          \{validationSummary && \([\s\S]*?          \)\}/,
    "",
  )
  text = text.replace(
    /      \{heldDispositionAction && \([\s\S]*?      \)\}/,
    "",
  )
  text = text.replaceAll(
    "Future Energy has been engaged for the engineering, procurement, construction and installation of the",
    "Compass Logistics Procurement is running a competitive sourcing event for",
  )
  text = text.replaceAll(
    "Future Energy est chargée de l’ingénierie, des achats, de la construction et de l’installation de",
    "Compass Logistics Procurement führt eine wettbewerbliche Ausschreibung für",
  )
  text = text.replaceAll(
    "the Future Energy Corporate Quality Assurance Manual (QA-MAN-2026-EPCI, Rev 3.0); deviations require formal dispensation from the Global HSEQ Director.",
    "the carrier performance and SLA standard (SRC-002) and the supplier qualification standard (SRC-008).",
  )
  text = text.replaceAll(
    "Manuel d’assurance qualité d’entreprise de Future Energy (QA-MAN-2026-EPCI, Rev 3.0) ; tout écart exige une dérogation formelle du Global HSEQ Director.",
    "Leistungs- und SLA-Standard (SRC-002) sowie den Qualifikationsstandard (SRC-008).",
  )
  text = text.replaceAll(
    "Future Energy Standard Terms and Conditions of Procurement (S7-SCM-TC-2026-v1.0).",
    "standard logistics contract terms (SRC-004).",
  )
  text = text.replaceAll(
    "Conditions générales d’achat de Future Energy (S7-SCM-TC-2026-v1.0).",
    "Standardvertragsbedingungen für Logistik (SRC-004).",
  )
  text = text.replaceAll(
    "via the Future Energy SCM Portal",
    "via the Compass Logistics Procurement portal",
  )
  text = text.replaceAll(
    "via le portail SCM Future Energy",
    "über das Portal von Compass Logistics Procurement",
  )
  return text
})

rewrite(fe("_pages", "bid-evaluation.tsx"), (text) => {
  text = text.replace(
    `import { RecordDispositionModal } from "../_components/hub/record-disposition-modal"\n`,
    "",
  )
  text = text.replace(
    `import {
  openValidationActionForPackage,
  awardValidationLines,
  awardSubmissionBlocked,
  controlReason,
  displayPackageQuantity,
  formatQty,
  summarizePackage,
} from "../data/future-energy/_demand-validation"`,
    `import { displayPackageQuantity } from "../data/future-energy/_demand-validation"`,
  )
  text = text.replace(
    `  const { focusEvalPackageId, tenderStages, openBidEvaluation, openTenderStudio, openActionCentre, locale, awardApprovals, submitAwardRecommendation, inventoryOverlays, appliedTenderQtyByPackage, recordInventoryDisposition, applyResidualToTender } = useStore()`,
    `  const { focusEvalPackageId, tenderStages, openBidEvaluation, openTenderStudio, locale, awardApprovals, submitAwardRecommendation, appliedTenderQtyByPackage } = useStore()`,
  )
  text = text.replace(
    `  const [heldDispositionAction, setHeldDispositionAction] = React.useState<ReturnType<typeof openValidationActionForPackage>>(undefined)\n`,
    "",
  )
  text = text.replace(
    `  const validationSummary = pkg ? summarizePackage(pkg.id, inventoryOverlays) : null
  const awardBlocked = pkg ? awardSubmissionBlocked(pkg.id, inventoryOverlays) : false
  const openDemandAction = pkg ? openValidationActionForPackage(pkg.id, inventoryOverlays) : undefined
`,
    "  const awardBlocked = false\n",
  )
  text = text.replace(
    `        ...(validationSummary ? awardValidationLines(validationSummary, locale) : []),
`,
    "",
  )
  text = text.replace(
    /                \{validationSummary && \([\s\S]*?                \)\}/,
    "",
  )
  text = text.replace(
    /      \{heldDispositionAction && \([\s\S]*?      \)\}/,
    "",
  )
  return text
})

rewrite(fe("_store.tsx"), (text) => {
  text = text.replace(
    `  /** UI language for the Future Energy module (EN / FR). Persisted in localStorage. */`,
    `  /** UI language (EN / DE). Persisted in localStorage. */`,
  )
  text = text.replace(
    `      case "operating-loop": return "Centre dâ€™actions â€” pipeline actif des appels dâ€™offres du programme Ã©olien offshore Meridian, oÃ¹ les lots dâ€™achats progressent par 5 portes (CadrÃ© â†’ SpÃ©cifiÃ© â†’ ApprouvÃ© â†’ Ã‰mis â†’ AttribuÃ©), avec responsable, date limite de soumission, objectif dâ€™Ã©conomies et registre cumulÃ© des Ã©conomies"
      case "tender-studio": return "Gestion des appels d'offres â€” espace de rÃ©daction des AO depuis les documents contrÃ´lÃ©s, avec pipeline multi-agents dâ€™assemblage, dâ€™audit et de rendu"
      case "bid-evaluation": return "Ã‰valuation des offres â€” portefeuille de rÃ©ponses fournisseurs dÃ©pouillÃ©es avec portes Ã©liminatoires et notation composite sur 100, matrice et recommandations dâ€™attribution"
      default: return "Espace de gestion de la chaÃ®ne dâ€™approvisionnement du programme Ã©olien offshore Meridian"`,
    `      case "operating-loop": return "Aktionszentrum — live Ausschreibungspipeline für europäische Straßengüterverkehre, in der Pakete fünf Tore durchlaufen (Scoped → Specified → Approved → Issued → Awarded)"
      case "tender-studio": return "Ausschreibungsmanagement — Entwurf von ITT aus kontrollierten Logistikdokumenten"
      case "bid-evaluation": return "Angebotsbewertung — Trägerangebote mit Qualifikationstoren und gewichteter Bewertung"
      default: return "Beschaffungsarbeitsbereich von Compass Logistics Procurement"`,
  )
  text = text.replace(
    `    case "operating-loop": return "Action Centre — the live tender pipeline for the Meridian offshore wind programme, where procurement packages move through 5 gates (Scoped → Specified → Approved → Issued → Awarded), each with an accountable owner, submission deadline and savings target, plus an accumulated savings ledger of awarded packages"
    case "tender-studio": return "Tender Management — the ITT drafting workspace: a controlled document repository (engineering specifications, QA manual, procurement terms, charter party), a drafting prompt, and the multi-agent pipeline that assembles, audits and renders a complete Invitation to Tender"
    case "bid-evaluation": return "Bid Evaluation — multi-ITT portfolio of tabulated supplier returns with hard gates (ISO 9001, knock-for-knock, DDP Rotterdam) and 100-point composite scoring (Price 35 / Tech 25 / QA 20 / Legal 20), including matrix, baseball cards and award recommendations"
    default: return "Supply chain management workspace for the Meridian offshore wind programme covering Action Centre, Tender Management and Bid Evaluation"`,
    `    case "operating-loop": return "Action Centre — the live tender pipeline for European road-freight sourcing, where packages move through 5 gates (Scoped → Specified → Approved → Issued → Awarded), each with an accountable owner, bid deadline and value target"
    case "tender-studio": return "Tender Management — the ITT drafting workspace: controlled logistics specifications, SLA, qualification and contract terms, plus the multi-agent pipeline that assembles, audits and renders an Invitation to Tender"
    case "bid-evaluation": return "Bid Evaluation — tabulated carrier returns with qualification gates (insurance, due diligence, data integration) and weighted scoring, including matrix, cards and award recommendations"
    default: return "Compass Logistics Procurement workspace covering Action Centre, Tender Management and Bid Evaluation"`,
  )
  text = text.replace(`formatTenderQty(requestedQty, uom, "fr")`, `formatTenderQty(requestedQty, uom, "de")`)
  text = text.replace(`formatQty(requestedQty, uom, "fr")`, `formatQty(requestedQty, uom, "de")`)
  return text
})

rewrite(fe("data", "_people.ts"), (text) => {
  text = text.replace(
    `Employee directory — Future Energy Meridian OWF project SCM roster.`,
    `Employee directory — Compass Logistics Procurement roster.`,
  )
  text = text.replace(
    `"Daniel owns the Meridian tender pipeline — package sequencing, ITT issue and award recommendations route through him."`,
    `"Daniel owns the European road-freight tender pipeline — event sequencing, ITT issue and award recommendations route through him."`,
  )
  text = text.replace(
    `"Anders decides whether Skagen-reserved lots can transfer to Meridian."`,
    `"Anders reviews whether reserved capacity on an incumbent contract can transfer into the new event."`,
  )
  text = text.replace(
    `"No assigned owner for this role in the directory — Daniel is the default lead for cross-package actions on Meridian."`,
    `"No assigned owner for this role in the directory — Daniel is the default lead for cross-package logistics actions."`,
  )
  return text
})

rewrite(fe("_components", "hub", "hub-types.ts"), (text) =>
  text.replaceAll("@future-energy.com", "@compass.example"),
)

rewrite(fe("_components", "hub", "avatar-color.ts"), (text) =>
  text.replace("share the same asset so Seaway + Future Energy stay visually aligned.", "shared avatar asset."),
)

rewrite(fe("_i18n", "use-t.ts"), (text) =>
  text.replace("active Future Energy locale", "active Compass locale"),
)

rewrite(fe("_i18n", "en.ts"), (text) =>
  text
    .replace(
      "High commercial risk: warranty cut exceeds 25% of the Future Energy standard. Flag before award.",
      "High commercial risk: cargo insurance is below the mandatory EUR 5 million threshold. Flag before award.",
    )
    .replace('gateKfk: "Mutual knock-for-knock"', 'gateKfk: "Due diligence"')
    .replace('gateDdp: "DDP Rotterdam"', 'gateDdp: "Data integration"')
    .replace('vesselCharter: "Vessel charter"', 'vesselCharter: "Sourcing event"')
    .replace('vessel: "Vessel"', 'vessel: "Network"')
    .replace('hireRate: "Hire rate"', 'hireRate: "Estimated value"')
    .replace('perDay: "/day"', 'perDay: ""')
    .replace(
      'charterFlowdown: "Knock-for-knock liability flows down to every supplier working over the vessel side."',
      'charterFlowdown: "Qualification gates and No History treatment apply to every bidder."',
    )
    .replace('technical: "Engineering Specifications"', 'technical: "Logistics specifications"')
    .replace('quality: "Quality & HSEQ"', 'quality: "Performance & SLA"')
    .replace('legal: "Legal & Maritime"', 'legal: "Legal & qualification"')
    .replace('charter-interface": "Charter"', 'charter-interface": "SLA"')
    .replace('inventory-validation": "Inventory"', 'inventory-validation": "Qualification"'),
)

rewrite(fe("data", "future-energy", "_bid-scoring.ts"), (text) =>
  text
    .replaceAll("Future Energy", "Compass")
    .replaceAll("24-month Future Energy standard", "mandatory EUR 5 million cargo-insurance threshold")
    .replace(
      `      return \`Disqualifié — échec aux portes éliminatoires : \${labels}. Ne pas faire progresser vers une recommandation d’attribution commerciale.\``,
      `      return \`Disqualifiziert — Qualifikationstore nicht erfüllt: \${labels}. Nicht zur Zuschlagsempfehlung weiterleiten.\``,
    )
    .replace(
      `      return \`Rang n°\${result.finalRank}, score composite \${result.compositeScore}. Risque commercial élevé : garantie réduite de plus de 25 % sous la norme Future Energy de 24 mois. Privilégier un soumissionnaire conforme mieux classé, sauf acceptation formelle du risque.\``,
      `      return \`Rang \${result.finalRank}, Gesamtwert \${result.compositeScore}. Hohes kommerzielles Risiko: Versicherungsnachweis unter der Pflichtschwelle. Einen konformen Bieter vorziehen, sofern das Risiko nicht förmlich akzeptiert wird.\``,
    )
    .replace(
      `      return \`Candidat recommandé pour l’attribution — rang n°1, score composite \${result.compositeScore}. \${bid.insight}\``,
      `      return \`Empfohlener Zuschlagskandidat — Rang 1, Gesamtwert \${result.compositeScore}. \${bid.insight}\``,
    )
    .replace(
      `    return \`Rang n°\${result.finalRank}, score composite \${result.compositeScore}. \${bid.insight}\``,
      `    return \`Rang \${result.finalRank}, Gesamtwert \${result.compositeScore}. \${bid.insight}\``,
    ),
)

rewrite(fe("_i18n", "tender.ts"), (text) => {
  text = text.replace(
    `export const TENDER_SUGGESTIONS: Record<Locale, string[]> = {
  en: [
    "Draft the ITT for 5,000 metres of 66 kV subsea array cable",
    "Prepare an invitation to tender for 24 monopile transition pieces",
    "Draft the tender for the replacement 3000T crane hook block",
    "Draft an ITT for 60 diverless J-tube seals",
  ],
  fr: [
    "Rédiger l’AO pour 5 000 mètres de câble sous-marin inter-éoliennes 66 kV",
    "Préparer un appel d’offres pour 24 pièces de transition de monopieux",
    "Rédiger l’AO pour le moufle de grue 3 000 t de remplacement",
    "Rédiger un AO pour 60 joints de J-tubes installables sans plongeur",
  ],
}`,
    `export const TENDER_SUGGESTIONS: Record<Locale, string[]> = {
  en: [
    "Draft the ITT for European road-freight services across 18 lanes",
    "Prepare an invitation to tender for FTL and LTL capacity from January 2027",
  ],
  de: [
    "Entwurf der Ausschreibung für europäische Straßengüterverkehre über 18 Relationen",
    "Ausschreibung für FTL- und LTL-Kapazität ab Januar 2027 vorbereiten",
  ],
}`,
  )
  text = text.replace(
    `export function localizeComponentSpec(spec: ComponentSpec, locale: Locale): ComponentSpec {
  return locale === "de" ? { ...spec, ...FR_SPECS[spec.id] } : spec
}`,
    `export function localizeComponentSpec(spec: ComponentSpec, _locale: Locale): ComponentSpec {
  return spec
}`,
  )
  text = text.replace(
    `  if (resolved || locale !== "fr") return resolved`,
    `  if (resolved || locale !== "de") return resolved`,
  )
  text = text.replaceAll(`locale === "de" ? FR_FAT`, `locale === "de" ? [...FAT_TRACEABILITY_CLAUSES]`)
  text = text.replace(
    `  return locale === "de" ? rows.map((row) => ({ ...row, scope: FR_STANDARD_SCOPES[row.ref] ?? row.scope })) : rows`,
    `  return rows`,
  )
  text = text.replace(
    `  return locale === "de"
    ? PROCUREMENT_CLAUSES.map((clause) => ({ ...clause, ...FR_CLAUSES[clause.ref] }))
    : PROCUREMENT_CLAUSES`,
    `  return PROCUREMENT_CLAUSES`,
  )
  text = text.replace(
    `  "Tous les composants critiques doivent faire l’objet d’essais de réception en usine (FAT) avant expédition ; le Fournisseur doit transmettre un plan d’inspection et d’essais (ITP) au contrôle qualité de Future Energy au moins 30 jours avant le début de la fabrication.",`,
    `  "Kritische Leistungsnachweise müssen vor Betriebsaufnahme vorliegen; der Anbieter übermittelt Qualifikationsunterlagen mindestens 30 Tage vor dem Leistungsbeginn.",`,
  )
  return text
})

console.log("phase2-edits applied")
