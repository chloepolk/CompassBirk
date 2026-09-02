/* ------------------------------------------------------------------ */
/*  Procurement demand validation — quantity, blocking, summaries      */
/*                                                                     */
/*  Residual procurement quantity = requested − approved inventory,    */
/*  floored at zero. Money is an identified purchase-avoidance         */
/*  opportunity until inventory use is approved — not realised savings.*/
/* ------------------------------------------------------------------ */

import type { DisplayLocale } from "@/lib/compass/locale-display"
import {
  CANDIDATE_MATCHES,
  REQUIREMENTS,
  VALIDATION_ACTIONS,
  VALIDATION_AS_OF,
  VALIDATION_VALIDITY_HOURS,
  inventoryById,
  qualityByInventoryId,
  requirementByPackageId,
  type CandidateMatch,
  type Disposition,
  type IttAwardControl,
  type ProcurementRequirement,
  type ValidationAction,
  type ValidationState,
} from "./_inventory"

function qtyNumber(qty: number, locale: DisplayLocale = "en"): string {
  const tag = locale === "fr" ? "fr-FR" : "en-GB"
  return Number.isInteger(qty)
    ? qty.toLocaleString(tag)
    : qty.toLocaleString(tag, { maximumFractionDigits: 1 })
}

export interface MatchOverlay {
  disposition: Disposition
  approvedInventoryQty: number
  reason: string
  actor: string
  timestamp: string
  decisionStatus: CandidateMatch["decisionStatus"]
}

export type MatchOverlayMap = Record<string, MatchOverlay>

export interface RequirementValidationSummary {
  requirement: ProcurementRequirement
  matches: CandidateMatch[]
  unresolvedMatches: CandidateMatch[]
  approvedInventoryQty: number
  residualProcurementQty: number
  identifiedAvoidanceEur: number
  validationState: ValidationState
  control: IttAwardControl
  lastCheckAt: string
  checkExpired: boolean
  locationsSearched: string[]
}

export function residualProcurementQty(requestedQty: number, approvedInventoryQty: number): number {
  return Math.max(0, requestedQty - approvedInventoryQty)
}

/** Quantity string used on the tender register and ITT pricing line (e.g. "42 units", "4 400 mètres"). */
export function formatTenderQty(qty: number, uom: string, locale: DisplayLocale = "en"): string {
  const n = qtyNumber(qty, locale)
  if (locale === "fr") {
    if (uom === "m") return `${n} mètres`
    return `${n} ${qty === 1 ? "unité" : "unités"}`
  }
  if (uom === "m") return `${n} metres`
  return `${n} ${qty === 1 ? "unit" : "units"}`
}

export function canApplyResidualToTender(summary: RequirementValidationSummary): boolean {
  return summary.control === "clear" && summary.residualProcurementQty < summary.requirement.requestedQty
}

export function displayPackageQuantity(
  packageId: string,
  fallback: string,
  applied: Record<string, number> = {},
  locale: DisplayLocale = "en",
): string {
  const qty = applied[packageId]
  if (qty == null) return fallback
  const req = requirementByPackageId(packageId)
  if (!req) return fallback
  return formatTenderQty(qty, req.uom, locale)
}

export function identifiedAvoidanceEur(approvedInventoryQty: number, unitBaseline: number): number {
  return approvedInventoryQty * unitBaseline
}

export function mergeMatch(seed: CandidateMatch, overlay: MatchOverlay | undefined): CandidateMatch {
  if (!overlay) return seed
  return {
    ...seed,
    disposition: overlay.disposition,
    approvedInventoryQty: overlay.approvedInventoryQty,
    reason: overlay.reason,
    actionOwner: overlay.actor || seed.actionOwner,
    decisionTimestamp: overlay.timestamp,
    decisionStatus: overlay.decisionStatus,
  }
}

export function isPlausibleMatch(match: CandidateMatch): boolean {
  return match.classification !== "not-suitable"
}

export function isUnresolved(match: CandidateMatch): boolean {
  if (!isPlausibleMatch(match)) return false
  return match.decisionStatus === "validation-pending"
}

export function checkExpired(searchTimestamp: string, asOf = VALIDATION_AS_OF): boolean {
  const search = Date.parse(searchTimestamp)
  const now = Date.parse(asOf)
  if (Number.isNaN(search) || Number.isNaN(now)) return false
  return now - search > VALIDATION_VALIDITY_HOURS * 3600_000
}

export function formatQty(qty: number, uom: string, locale: DisplayLocale = "en"): string {
  const n = qtyNumber(qty, locale)
  if (locale === "fr") {
    return uom === "m" ? `${n} m` : `${n} ${qty === 1 ? "unité" : "unités"}`
  }
  return uom === "m" ? `${n} m` : `${n} ${qty === 1 ? "unit" : "units"}`
}

export function classificationLabel(c: CandidateMatch["classification"], locale: DisplayLocale = "en"): string {
  if (locale === "fr") {
    switch (c) {
      case "available-compliant": return "Disponible et conforme"
      case "partially-available": return "Partiellement disponible"
      case "potential-substitute": return "Substitut possible"
      case "available-reserved": return "Disponible mais réservé"
      case "available-not-ready": return "Disponible mais pas prêt"
      case "not-suitable": return "Non adapté"
      case "no-inventory": return "Aucun inventaire identifié"
    }
  }
  switch (c) {
    case "available-compliant": return "Available and compliant"
    case "partially-available": return "Partially available"
    case "potential-substitute": return "Potential substitute"
    case "available-reserved": return "Available but reserved"
    case "available-not-ready": return "Available but not ready"
    case "not-suitable": return "Not suitable"
    case "no-inventory": return "No inventory identified"
  }
}

function validationStateFor(
  matches: CandidateMatch[],
  unresolved: CandidateMatch[],
  approvedQty: number,
  expired: boolean,
): ValidationState {
  if (expired) return "recheck-required"
  if (unresolved.length > 0) return "validation-pending"
  if (matches.length === 0) return "validated-retained"
  if (approvedQty > 0) return "validated-reduced"
  return "validated-retained"
}

function controlFor(unresolved: CandidateMatch[], expired: boolean): IttAwardControl {
  if (expired) return "blocked-expired"
  if (unresolved.length > 0) return "blocked-unresolved"
  return "clear"
}

export function summarizeRequirement(
  requirement: ProcurementRequirement,
  overlays: MatchOverlayMap = {},
  asOf = VALIDATION_AS_OF,
): RequirementValidationSummary {
  const matches = CANDIDATE_MATCHES
    .filter(m => m.requirementId === requirement.id)
    .map(m => mergeMatch(m, overlays[m.id]))
  const unresolvedMatches = matches.filter(isUnresolved)
  const approvedInventoryQty = matches.reduce((s, m) => s + m.approvedInventoryQty, 0)
  const residualProcurementQtyValue = residualProcurementQty(requirement.requestedQty, approvedInventoryQty)
  const expired = checkExpired(requirement.searchTimestamp, asOf)
  const locations = [...new Set(
    matches.map(m => inventoryById(m.inventoryId)?.storageLocation).filter((x): x is string => Boolean(x)),
  )]

  return {
    requirement,
    matches,
    unresolvedMatches,
    approvedInventoryQty,
    residualProcurementQty: residualProcurementQtyValue,
    identifiedAvoidanceEur: identifiedAvoidanceEur(approvedInventoryQty, requirement.newPurchaseUnitBaseline),
    validationState: validationStateFor(matches, unresolvedMatches, approvedInventoryQty, expired),
    control: controlFor(unresolvedMatches, expired),
    lastCheckAt: requirement.searchTimestamp,
    checkExpired: expired,
    locationsSearched: locations,
  }
}

export function summarizePackage(packageId: string, overlays: MatchOverlayMap = {}): RequirementValidationSummary | null {
  const req = requirementByPackageId(packageId)
  if (!req) return null
  return summarizeRequirement(req, overlays)
}

export function openValidationActions(overlays: MatchOverlayMap = {}): ValidationAction[] {
  return VALIDATION_ACTIONS.filter(a => {
    const seed = CANDIDATE_MATCHES.find(m => m.id === a.matchId)
    if (!seed) return false
    const match = mergeMatch(seed, overlays[a.matchId])
    return isUnresolved(match)
  })
}

export function openValidationActionForPackage(
  packageId: string,
  overlays: MatchOverlayMap = {},
): ValidationAction | undefined {
  const req = requirementByPackageId(packageId)
  if (!req) return undefined
  return openValidationActions(overlays).find(a => a.requirementId === req.id)
}

export function ittIssueBlocked(packageId: string, overlays: MatchOverlayMap = {}): boolean {
  const summary = summarizePackage(packageId, overlays)
  return summary != null && summary.control !== "clear"
}

export function awardSubmissionBlocked(packageId: string, overlays: MatchOverlayMap = {}): boolean {
  return ittIssueBlocked(packageId, overlays)
}

export function controlReason(summary: RequirementValidationSummary, locale: DisplayLocale = "en"): string {
  if (summary.control === "blocked-expired") {
    return locale === "fr"
      ? `Le contrôle d’inventaire daté du ${summary.lastCheckAt.slice(0, 10)} a plus de ${VALIDATION_VALIDITY_HOURS} heures. Relancez la recherche avant l’émission de l’AO ou l’attribution.`
      : `Inventory check dated ${summary.lastCheckAt.slice(0, 10)} is older than ${VALIDATION_VALIDITY_HOURS} hours. Run the search again before ITT issue or award.`
  }
  if (summary.control === "blocked-unresolved") {
    const n = summary.unresolvedMatches.length
    return locale === "fr"
      ? `${n} correspondance${n === 1 ? "" : "s"} d’inventaire ${n === 1 ? "nécessite" : "nécessitent"} encore une disposition enregistrée.`
      : `${n} inventory match${n === 1 ? "" : "es"} still need${n === 1 ? "s" : ""} a recorded disposition.`
  }
  return locale === "fr"
    ? "Le contrôle d’inventaire est à jour et chaque correspondance plausible a une disposition enregistrée."
    : "Inventory check is current and every plausible match has a recorded disposition."
}

export function awardValidationLines(summary: RequirementValidationSummary, locale: DisplayLocale = "en"): string[] {
  const req = summary.requirement
  const loc = locale
  if (loc === "fr") {
    return [
      `Dernier contrôle : ${summary.lastCheckAt.replace("T", " ").replace("Z", " UTC")}.`,
      `Lieux recherchés : ${summary.locationsSearched.length > 0 ? summary.locationsSearched.join(" ; ") : "aucun retour"}.`,
      `${summary.matches.length} correspondances identifiées ; ${summary.unresolvedMatches.length} non résolue${summary.unresolvedMatches.length === 1 ? "" : "s"}.`,
      `Quantité utilisable approuvée depuis l’inventaire : ${formatQty(summary.approvedInventoryQty, req.uom, loc)}.`,
      `Quantité d’achat résiduelle : ${formatQty(summary.residualProcurementQty, req.uom, loc)} sur ${formatQty(req.requestedQty, req.uom, loc)} demandée.`,
      summary.identifiedAvoidanceEur > 0
        ? `Opportunité d’évitement d’achat identifiée : ${summary.identifiedAvoidanceEur.toLocaleString("fr-FR")} € (${formatQty(summary.approvedInventoryQty, req.uom, loc)} × ${req.newPurchaseUnitBaseline.toLocaleString("fr-FR")} € ${req.uom === "m" ? "par mètre" : "par unité"} ; baseline d’achat neuf uniquement).`
        : "Aucune quantité d’inventaire approuvée, donc aucune opportunité d’évitement d’achat identifiée.",
      ...summary.matches.filter(m => m.approvedInventoryQty === 0 && isPlausibleMatch(m) && m.decisionStatus === "closed").map(m => {
        const place = inventoryById(m.inventoryId)?.storageLocation ?? m.inventoryId
        return `Non utilisé : ${m.inventoryId} à ${place} — ${m.reason}`
      }),
    ]
  }
  return [
    `Last check: ${summary.lastCheckAt.replace("T", " ").replace("Z", " UTC")}.`,
    `Locations searched: ${summary.locationsSearched.length > 0 ? summary.locationsSearched.join("; ") : "none returned"}.`,
    `${summary.matches.length} matches identified; ${summary.unresolvedMatches.length} unresolved.`,
    `Usable quantity approved from inventory: ${formatQty(summary.approvedInventoryQty, req.uom)}.`,
    `Residual procurement quantity: ${formatQty(summary.residualProcurementQty, req.uom)} of ${formatQty(req.requestedQty, req.uom)} requested.`,
    summary.identifiedAvoidanceEur > 0
      ? `Identified purchase-avoidance opportunity: €${summary.identifiedAvoidanceEur.toLocaleString("en-GB")} (${formatQty(summary.approvedInventoryQty, req.uom)} × €${req.newPurchaseUnitBaseline.toLocaleString("en-GB")} ${req.uom === "m" ? "per metre" : "per unit"}; new-purchase unit baseline only).`
      : "No approved inventory quantity, so no identified purchase-avoidance opportunity.",
    ...summary.matches.filter(m => m.approvedInventoryQty === 0 && isPlausibleMatch(m) && m.decisionStatus === "closed").map(m => {
      const place = inventoryById(m.inventoryId)?.storageLocation ?? m.inventoryId
      return `Unused: ${m.inventoryId} at ${place} — ${m.reason}`
    }),
  ]
}

export function overlayFromDisposition(args: {
  match: CandidateMatch
  disposition: Disposition
  approvedQty: number
  reason: string
  actor: string
  timestamp?: string
}): MatchOverlay {
  const { match, disposition, approvedQty, reason, actor, timestamp } = args
  const capped = Math.max(0, Math.min(approvedQty, match.potentiallyUsableQty || match.candidateQty))
  const status: CandidateMatch["decisionStatus"] =
    disposition === "request-validation" ? "validation-pending" : disposition === "use-inventory" || disposition === "use-partial" ? "approved" : "closed"
  return {
    disposition,
    approvedInventoryQty: disposition === "use-inventory" || disposition === "use-partial" ? capped : 0,
    reason,
    actor,
    timestamp: timestamp ?? new Date().toISOString(),
    decisionStatus: status,
  }
}

export function matchContext(match: CandidateMatch) {
  return {
    inventory: inventoryById(match.inventoryId) ?? null,
    quality: qualityByInventoryId(match.inventoryId) ?? null,
  }
}

export function allRequirementSummaries(overlays: MatchOverlayMap = {}): RequirementValidationSummary[] {
  return REQUIREMENTS.map(r => summarizeRequirement(r, overlays))
}
