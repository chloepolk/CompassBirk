import type { Locale } from "../_i18n"
import type { TenderPackage } from "./_tenders"

export type MatchOverlayMap = Record<string, { timestamp: string }>

export type PackageValidationSummary = {
  residualProcurementQty: number
  approvedInventoryQty: number
  requested: string
  approved: string
  residual: string
  requirement: {
    id: string
    uom: string
    requestedQty: number
    packageId: string
  }
}

export function overlayFromDisposition(_args: unknown): { timestamp: string } {
  return { timestamp: new Date().toISOString() }
}

export function ittIssueBlocked(_packageId: string, _overlays: MatchOverlayMap = {}): boolean {
  return false
}

export function awardSubmissionBlocked(_packageId: string, _overlays: MatchOverlayMap = {}): boolean {
  return false
}

export function canApplyResidualToTender(
  _summaryOrPackageId?: unknown,
  _overlays?: MatchOverlayMap,
): boolean {
  return false
}

export function formatQty(n: number | string, _uom?: string, _locale?: Locale): string {
  return String(n)
}

export function formatTenderQty(n: number | string, _uom?: string, _locale?: Locale): string {
  return String(n)
}

export function summarizePackage(
  packageId: string,
  _overlays: MatchOverlayMap = {},
): PackageValidationSummary {
  return {
    residualProcurementQty: 0,
    approvedInventoryQty: 0,
    requested: "18 lanes",
    approved: "0",
    residual: "18 lanes",
    requirement: {
      id: packageId,
      uom: "lanes",
      requestedQty: 18,
      packageId,
    },
  }
}

export function openValidationActionForPackage(
  _packageId?: string,
  _overlays?: MatchOverlayMap,
): { id: string } | undefined {
  return undefined
}

export function openValidationActions(_overlays?: MatchOverlayMap) {
  return []
}

export function allRequirementSummaries() {
  return []
}

export function displayPackageQuantity(
  _packageIdOrPkg: string | TenderPackage,
  quantity?: string,
  _applied?: Record<string, number>,
  _locale?: Locale,
): string {
  if (typeof _packageIdOrPkg === "object") return _packageIdOrPkg.quantity
  return quantity ?? ""
}

export function controlReason(_summary?: PackageValidationSummary, _locale?: Locale): string {
  return ""
}

export function awardValidationLines(
  _summary?: PackageValidationSummary,
  _locale?: Locale,
): string[] {
  return []
}
