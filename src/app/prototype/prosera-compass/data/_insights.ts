import {
  allRequirementSummaries,
  formatQty,
  openValidationActions,
  type MatchOverlayMap,
} from "./seaway7/_demand-validation"

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
  page: "operating-loop" | "tender-studio" | "bid-evaluation"
  drillLevel: "macro" | "region" | "customer"
  regionScope?: string
  customerScope?: string
}

function procurementFindings(): BPFinding[] {
  return [
    {
      id: "s7-cable-critical-path",
      category: "deadline-risk",
      severity: "critical",
      title: "66 kV array cable ITT is on the programme critical path",
      narrative:
        "PKG-2101 has a 21-day tender window. Four returns are in — tabulate hard gates then score Price / Tech / QA / Legal so the Q2 2027 cable-lay campaign still holds. Cable lead times set the installation sequence: each week of evaluation slip moves the lay window by the same amount.",
      evidence: [
        "Submission deadline 03 Aug 2026 — 21 days from issue.",
        "Four bid PDFs received against ITT-MER-SCM-2101.",
        "PKG-2105 (J-tube seals) is sequenced behind the cable award for OD confirmation.",
      ],
recommendation: "Run Bid Evaluation on PKG-2101 and include the inventory-validation summary in the award recommendation.",      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-tp-fabrication-slot",
      category: "supplier-signal",
      severity: "high",
      title: "European TP fabrication slots are contested",
      narrative:
        "PKG-2102 (24 transition pieces) holds a reserved Q1 2027 fabrication slot. If the ITT is late, that slot can go to another developer. The Batch 1 benchmark of €1.83M per unit landed DDP anchors the negotiation.",
      evidence: [
        "Batch 1 award benchmark: €1.83M per unit landed DDP.",
        "Three yards on the bidder list, submission deadline 17 Aug 2026.",
      ],
      recommendation: "Complete demand validation and requirements extraction against TS-STR-TP-002, then issue inside the reserved-slot window.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-anode-fixed-pricing",
      category: "savings-signal",
      severity: "medium",
      title: "Anode tender exposed to aluminium alloy volatility",
      narrative:
        "PKG-2104 closes 24 July with four bidders. Clause 7.1 fixed pricing must hold without a commodities-index rider, or the €118,000 savings target erodes on award.",
      evidence: [
        "S7-SCM-TC-2026 §7.1: fixed firm pricing, no escalation without an agreed commodities index.",
        "4 of 4 bidders acknowledged receipt; two clarifications answered inside the 7-day window.",
      ],
      recommendation: "Hold clause 7.1 in negotiation; reject index riders unless offset by unit-price concessions.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-charter-flowdown",
      category: "charter-interface",
      severity: "high",
      title: "Charter flow-downs required on vessel-side packages",
      narrative:
        "Packages with vessel operations (cable, transition pieces, hook block) carry the SUPPLYTIME 2026 knock-for-knock regime and offshore marine warranty in Section 4.0. Without that flow-down, vessel-interface liability is uninsured.",
      evidence: [
        "SUPPLYTIME 2026 Clauses 4.1/4.2 — mutual knock-for-knock indemnities.",
        "Clause 2.2 — SOLAS/MARPOL marine warranty and classification requirement.",
      ],
      recommendation: "The Contracts & Maritime Agent applies the flow-down automatically; the audit pass verifies it before approval.",
      page: "tender-studio",
      drillLevel: "macro",
    },
    {
      id: "s7-traceability-gate",
      category: "compliance-flag",
      severity: "medium",
      title: "EN 10204 traceability is a hard acceptance gate",
      narrative:
        "Type 3.1/3.2 material certificates are a condition of acceptance at the Rotterdam mobilisation port — uncertified load-bearing materials are rejected on arrival. Every ITT must state this in Section 3.0.",
      evidence: [
        "QA-MAN-2026-EPCI §4.1: EN 10204 Type 3.1/3.2 mandatory for primary steel and load-bearing components.",
        "ITP submission required 30 days prior to manufacturing.",
      ],
      recommendation: "Confirm the traceability clause survives any supplier mark-up during clarifications.",
      page: "tender-studio",
      drillLevel: "macro",
    },
  ]
}

function demandValidationFindings(overlays: MatchOverlayMap = {}): BPFinding[] {
  const open = openValidationActions(overlays)
  const blocked = allRequirementSummaries(overlays).filter(s => s.control !== "clear")
  const jts = allRequirementSummaries(overlays).find(s => s.requirement.id === "REQ-MER-2105")
  const findings: BPFinding[] = []

  if (jts) {
    const pending = jts.matches.find(m => m.id === "MATCH-0013" && m.decisionStatus === "validation-pending")
    findings.push({
      id: "s7-jts-inventory-hold",
      category: "inventory-validation",
      severity: "high",
      title: "18 J-tube seals in Rotterdam need a quality decision before the tender quantity is locked",
      narrative:
        pending
          ? `REQ-MER-2105 asks for ${formatQty(jts.requirement.requestedQty, jts.requirement.uom)}. Compass found 18 unreserved units at Rotterdam Warehouse with matching dimensions and material (INV-0013). Certificates and preservation records still need review. If those units are approved, residual procurement quantity is ${formatQty(jts.requirement.requestedQty - 18, jts.requirement.uom)}; if they are rejected with a reason, the tender stays at ${formatQty(jts.requirement.requestedQty, jts.requirement.uom)}.`
          : `REQ-MER-2105 still has unresolved inventory matches. ITT issue is blocked until every plausible match has a recorded disposition.`,
      evidence: [
        "TS-SUB-JTS-005: cable OD 150 mm / tube ID 375 mm, 3.0 bar, diverless ROV.",
        "INV-0013: 18 units, New / preserved, Central inventory, certificate and preservation review required.",
        `${open.length} open demand-validation actions on the Action Centre.`,
      ],
      recommendation: "Complete the quality review on MATCH-0013 (ACT-0008), then record use, partial use, or reject with a reason.",
      page: "operating-loop",
      drillLevel: "macro",
    })
  }

  if (blocked.length > 0) {
    findings.push({
      id: "s7-inventory-gates-blocked",
      category: "inventory-validation",
      severity: "critical",
      title: `ITT issue and award are blocked on ${blocked.length} packages until inventory matches are closed`,
      narrative: blocked
        .map(s => `${s.requirement.packageId}: ${s.unresolvedMatches.length} unresolved match${s.unresolvedMatches.length === 1 ? "" : "es"} (${formatQty(s.requirement.requestedQty, s.requirement.uom)} requested).`)
        .join(" "),
      evidence: blocked.map(s =>
        `${s.requirement.packageRef} last search ${s.lastCheckAt.slice(0, 16).replace("T", " ")} UTC · ${s.locationsSearched.join(", ") || "no location"}`,
      ),
      recommendation: "Record a disposition on every plausible match in Action Centre before sending an ITT for approval or submitting an award recommendation.",
      page: "operating-loop",
      drillLevel: "macro",
    })
  }

  return findings
}

export function generateFindings(overlays: MatchOverlayMap = {}): BPFinding[] {
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, info: 3 }
  return [...demandValidationFindings(overlays), ...procurementFindings()].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  )
}
