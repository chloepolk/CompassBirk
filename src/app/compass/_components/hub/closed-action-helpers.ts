import type { ClosedRecord } from "../../_diamond/types"
import type { MissionObjective } from "../../_diamond/types"
import { AGENTS, agentFor } from "../../_diamond/agents"
import { personForRole } from "../../_diamond/org"
import { formatCurrency } from "../../_diamond/stages"
import type { ActionTimelineEntry, AgentTimelineSubEntry } from "./hub-types"
import type { Locale } from "../../_i18n/types"

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function doneAgent(
  id: string,
  label: string,
  agent: (typeof AGENTS)[keyof typeof AGENTS],
  completedAt: string,
): AgentTimelineSubEntry {
  return {
    id,
    label,
    assignee: agent.name,
    assigneeRole: agent.capability,
    status: "done",
    completedAt,
  }
}

function buildClosedTimeline(record: ClosedRecord, locale: Locale): ActionTimelineEntry[] {
  const de = locale === "de"
  const decisionMaker = personForRole(record.decisionMaker, locale)
  const commercial = personForRole("Commercial Manager", locale)
  const analyst = personForRole("Cost & Estimating Analyst", locale)
  const auditAgent = agentFor("decide", "supply", locale)
  const specAgent = agentFor("understand", "supply", locale)
  const commercialAgent = agentFor("execute", "supply", locale)
  const awardAgent = agentFor("outcome_roi", "supply", locale)
  const closed = record.completionDate

  return [
    {
      id: `${record.id}-approve`,
      label: de ? "Ausgabe der Ausschreibung und Bewertungskriterien freigegeben" : "Approved RFP release and evaluation criteria",
      assignee: decisionMaker.name,
      assigneeRole: decisionMaker.role,
      status: "done",
      completedAt: addDays(closed, -34),
      stageLabel: de ? "Freigeben" : "Approve",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-audit`,
          de ? `Ausschreibungsentwurf für ${record.name} gegen verbindliche Dokumente geprüft` : `Quality review of the draft RFP for ${record.name} against controlled documents`,
          auditAgent,
          addDays(closed, -35),
        ),
        doneAgent(
          `${record.id}-agent-spec`,
          de ? `Technische und Qualitätsanforderungen für ${record.name} zusammengestellt` : `Compiled technical and quality requirements for ${record.name}`,
          specAgent,
          addDays(closed, -38),
        ),
      ],
    },
    {
      id: `${record.id}-evaluate`,
      label: de ? "Ausschreibungsfenster geführt und Angebote bewertet" : "Ran the tender window and evaluated bids",
      assignee: commercial.name,
      assigneeRole: commercial.role,
      status: "done",
      completedAt: addDays(closed, -8),
      stageLabel: de ? "Ausgeben und bewerten" : "Issue & Evaluate",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-commercial`,
          de ? `Angebotstabelle und kaufmännischer Vergleich für ${record.name} normalisiert` : `Normalised bid tabulation and commercial comparison for ${record.name}`,
          commercialAgent,
          addDays(closed, -10),
        ),
      ],
    },
    {
      id: `${record.id}-verify`,
      label: de ? "Betrag gegen die Budgetbasis gekennzeichnet" : "Labelled the amount against the budget baseline",
      assignee: analyst.name,
      assigneeRole: analyst.role,
      status: "done",
      completedAt: addDays(closed, -2),
      stageLabel: de ? "Zuschlag" : "Award",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-award`,
          de ? `${formatCurrency(record.realizedValue, locale)} gegenüber der Budgetbasis geprüft` : `Checked ${formatCurrency(record.realizedValue, locale)} against the budget baseline`,
          awardAgent,
          addDays(closed, -3),
        ),
      ],
    },
    {
      id: `${record.id}-book`,
      label: de ? "Zuschlag erfasst." : "Award recorded.",
      assignee: decisionMaker.name,
      assigneeRole: decisionMaker.role,
      status: "done",
      completedAt: closed,
      stageLabel: de ? "Zuschlag" : "Award",
    },
  ]
}

export type ClosedActionCardData = {
  id: string
  title: string
  narrative: string
  valueChip: string
  valueType: MissionObjective
  owner: string
  ownerRole: string
  cost: number
  realizedValue: number
  confidence: number
  risk: string
  timelineEntries: ActionTimelineEntry[]
  completionDate: string
}

export function closedRecordToCardData(record: ClosedRecord, locale: Locale = "en"): ClosedActionCardData {
  const decisionMaker = personForRole(record.decisionMaker, locale)
  const de = locale === "de"
  const valueType: MissionObjective = "creation"

  return {
    id: record.id,
    title: record.name,
    narrative: de
      ? `Historisches Los. ${formatCurrency(record.realizedValue, locale)} gegenüber der Budgetbasis.`
      : `Historical package. ${formatCurrency(record.realizedValue, locale)} against the budget baseline.`,
    valueChip: formatCurrency(record.realizedValue, locale),
    valueType,
    owner: decisionMaker.name,
    ownerRole: decisionMaker.role,
    cost: record.cost,
    realizedValue: record.realizedValue,
    confidence: 0.92,
    risk: de ? "Vergeben — Los geschlossen." : "Awarded — package closed.",
    timelineEntries: buildClosedTimeline(record, locale),
    completionDate: record.completionDate,
  }
}
