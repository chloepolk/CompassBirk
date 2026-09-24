/** expected_generated_outputs — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (Actions). Do not import xlsx at runtime. */

export type Actions = {
  actionId: string | null
  stage: string | null
  actionType: string | null
  title: string | null
  owner: string | null
  dueDate: string | null
  status: string | null
  trigger: string | null
  recommendedAction: string | null
  relatedEntity: string | null
}

export const ACTIONS: Actions[] = [
  {
    actionId: "ACT-001",
    stage: "03 Invite",
    actionType: "Approval",
    title: "Approve bilingual RFP/ITT before issue",
    owner: "Category Manager",
    dueDate: "2026-09-27",
    status: "Ready",
    trigger: "Draft sourcing event complete",
    recommendedAction: "Review and approve release",
    relatedEntity: "RFP-2026-001",
  },
  {
    actionId: "ACT-002",
    stage: "04 Clarifications",
    actionType: "Email review",
    title: "Review supplier clarification on fuel surcharge",
    owner: "Sourcing Analyst",
    dueDate: "2026-10-07",
    status: "Pending",
    trigger: "Relevant inbound email classified",
    recommendedAction: "Publish response to all bidders",
    relatedEntity: "EML-004",
  },
  {
    actionId: "ACT-003",
    stage: "05 Bid Receipt",
    actionType: "Bid exception",
    title: "Review revised RheinRoute rate card",
    owner: "Sourcing Analyst",
    dueDate: "2026-10-23",
    status: "Pending",
    trigger: "Attachment supersedes bid v1",
    recommendedAction: "Accept v2 and retain audit trail",
    relatedEntity: "SUP-001",
  },
  {
    actionId: "ACT-004",
    stage: "06 Evaluation",
    actionType: "Qualification failure",
    title: "Exclude Veloce pending compliant insurance evidence",
    owner: "Category Manager",
    dueDate: "2026-10-28",
    status: "Open",
    trigger: "Mandatory gate failed",
    recommendedAction: "Disqualify or request evidence before deadline",
    relatedEntity: "SUP-005",
  },
  {
    actionId: "ACT-005",
    stage: "06 Evaluation",
    actionType: "Award approval",
    title: "Approve dual-award scenario",
    owner: "Procurement Director",
    dueDate: "2026-11-20",
    status: "Ready",
    trigger: "Evaluation complete",
    recommendedAction: "Award 65% AlpineLink / 35% NorthBridge",
    relatedEntity: "AWD-02",
  },
  {
    actionId: "ACT-006",
    stage: "07 Performance",
    actionType: "Performance alert",
    title: "RheinRoute OTD below contractual target",
    owner: "Logistics Procurement Lead",
    dueDate: "2026-09-25",
    status: "Open",
    trigger: "OTD below 98% for three months",
    recommendedAction: "Initiate supplier performance review",
    relatedEntity: "SUP-001",
  },
  {
    actionId: "ACT-007",
    stage: "08 Corrective Action",
    actionType: "Corrective action",
    title: "Request terminal recovery plan from RheinRoute",
    owner: "Supplier Manager",
    dueDate: "2026-10-02",
    status: "Draft",
    trigger: "Five lanes account for majority of late deliveries",
    recommendedAction: "Send corrective action request in German",
    relatedEntity: "CAP-001",
  }
]
