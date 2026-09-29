import { personForRole } from "../../_diamond/org"
import { formatCurrency } from "../../_diamond/stages"
import type { MissionHealth, MissionHorizon, MissionObjective } from "../../_diamond/types"
import type { Locale } from "../../_i18n/types"
import { OPEN_EXAMPLES, type OpenExample } from "../../data/_open-examples"
import type { ActionTimelineEntry } from "./hub-types"

export type OpenExampleCard = {
  id: string
  title: string
  narrative: string
  valueChip: string
  valueType: MissionObjective
  projectedValue: number
  owner: string
  ownerRole: string
  cost: number
  confidence: number
  risk: string
  health: MissionHealth
  horizon: MissionHorizon
  flightStepId: string
  due: string
  evidence: string[]
  timelineEntries: ActionTimelineEntry[]
}

function timelineFor(example: OpenExample, locale: Locale, owner: string, role: string): ActionTimelineEntry[] {
  const de = locale === "de"
  return [
    {
      id: `${example.id}-open`,
      label: de ? "Offene Aktion auf dem Board erfasst" : "Opened on the Action Centre",
      assignee: owner,
      assigneeRole: role,
      status: "done",
      completedAt: "2026-09-12",
      stageLabel: de ? "Erfasst" : "Opened",
    },
    {
      id: `${example.id}-review`,
      label: de ? "Verantwortliche Person prüft Umfang und Betrag" : "Owner reviews scope and the amount",
      assignee: owner,
      assigneeRole: role,
      status: "current",
      dueAt: example.due,
      stageLabel: de ? "Offen" : "Open",
    },
  ]
}

export function openExampleCards(locale: Locale): OpenExampleCard[] {
  const de = locale === "de"
  return OPEN_EXAMPLES.map((example) => {
    const person = personForRole(example.ownerRole, locale)
    return {
      id: example.id,
      title: de ? example.titleDe : example.titleEn,
      narrative: de ? example.narrativeDe : example.narrativeEn,
      valueChip: formatCurrency(example.projectedValue, locale),
      valueType: example.valueType,
      projectedValue: example.projectedValue,
      owner: person.name,
      ownerRole: person.role,
      cost: example.cost,
      confidence: example.confidence,
      risk: de ? example.riskDe : example.riskEn,
      health: example.health,
      horizon: example.horizon,
      flightStepId: example.flightStepId,
      due: example.due,
      evidence: de ? example.evidenceDe : example.evidenceEn,
      timelineEntries: timelineFor(example, locale, person.name, person.role),
    }
  })
}
