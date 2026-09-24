/** internal_replay — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (Internal Replay). Do not import xlsx at runtime. */

export type Replay = {
  internalCheckpointId: number | null
  checkpointName: string | null
  prerequisiteBusinessAction: string | null
  fixtureEvidenceLoaded: string | null
  expectedProductResponse: string | null
  nextFixturePrecondition: string | null
  customerUiVisibility: string | null
}

export const REPLAY: Replay[] = [
  {
    internalCheckpointId: 0,
    checkpointName: "Foundation",
    prerequisiteBusinessAction: "Open prototype and select European road freight event",
    fixtureEvidenceLoaded: "Suppliers, lanes, contracts, 12-month baseline",
    expectedProductResponse: "Shows contract expiry, spend and sourcing opportunity",
    nextFixturePrecondition: "User selects Create sourcing event",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 1,
    checkpointName: "Baseline review",
    prerequisiteBusinessAction: "Review vendor profiles and incumbent history",
    fixtureEvidenceLoaded: "Shipments, invoices, incidents, monthly scores",
    expectedProductResponse: "Explains score components and evidence lineage",
    nextFixturePrecondition: "User approves use of history",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 2,
    checkpointName: "Create event",
    prerequisiteBusinessAction: "Generate and edit RFP/ITT",
    fixtureEvidenceLoaded: "Sourcing event, requirements, bilingual documents",
    expectedProductResponse: "Identifies missing information and creates draft",
    nextFixturePrecondition: "User approves event",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 3,
    checkpointName: "Invite suppliers",
    prerequisiteBusinessAction: "Select suppliers and send invitations",
    fixtureEvidenceLoaded: "Outgoing EN/DE invitation emails",
    expectedProductResponse: "Creates messages and logs recipients",
    nextFixturePrecondition: "User sends invitations",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 4,
    checkpointName: "Clarifications",
    prerequisiteBusinessAction: "Review classified inbox and answer a question",
    fixtureEvidenceLoaded: "Relevant, irrelevant and ambiguous emails",
    expectedProductResponse: "Filters emails; links evidence to event; drafts reply",
    nextFixturePrecondition: "User approves clarification",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 5,
    checkpointName: "Receive bids",
    prerequisiteBusinessAction: "Import bids and accept revised rate card",
    fixtureEvidenceLoaded: "Four bids, lane rates, bid attachments",
    expectedProductResponse: "Normalises rates and preserves version history",
    nextFixturePrecondition: "User closes bidding",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 6,
    checkpointName: "Evaluate and award",
    prerequisiteBusinessAction: "Review gates, scores and award scenarios",
    fixtureEvidenceLoaded: "Evaluation, qualification evidence, scenarios",
    expectedProductResponse: "Excludes failed bid and recommends dual award",
    nextFixturePrecondition: "User approves award",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 7,
    checkpointName: "Monitor performance",
    prerequisiteBusinessAction: "Advance simulated time and review alert",
    fixtureEvidenceLoaded: "Post-award KPI deterioration and incidents",
    expectedProductResponse: "Detects trend and identifies contributing lanes",
    nextFixturePrecondition: "User opens performance action",
    customerUiVisibility: "Never",
  },
  {
    internalCheckpointId: 8,
    checkpointName: "Corrective action",
    prerequisiteBusinessAction: "Generate and send German corrective-action request",
    fixtureEvidenceLoaded: "Corrective-action evidence and outgoing email",
    expectedProductResponse: "Creates case, deadline and monitoring obligation",
    nextFixturePrecondition: "User approves message",
    customerUiVisibility: "Never",
  }
]
