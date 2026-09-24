import type { DiamondMission } from "../../_diamond/types"
import type { MissionStage } from "../../_diamond/stages"
import { STAGE_ORDER, stageIndex } from "../../_diamond/stages"
import type { ReasoningContent } from "../reasoning-disclosure"
import { reasoningFromMission } from "../reasoning-helpers"
import type { ActionTimelineEntry } from "./hub-types"
import { buildFullTimeline } from "./mission-timeline-helpers"
import type { Locale } from "../../_i18n/types"

export type MissionSessionPatch = {
  recommendation: string
  risk: string
  confidence: number
  reasoning: ReasoningContent
  timelineEntries: ActionTimelineEntry[]
  /** Advanced gate after owner confirmation. */
  stage?: MissionStage
  /** Role accountable for the new current timeline step. */
  ownerRole?: string
}

function nextStage(stage: MissionStage): MissionStage | undefined {
  const idx = stageIndex(stage)
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return undefined
  return STAGE_ORDER[idx + 1]
}

const RECONCILE_PHASES = [
  "Ingesting your edit…",
  "Re-scoring risk and confidence…",
  "Updating execution timeline…",
] as const

const COMPLETE_PHASES = [
  "Ingesting your confirmation…",
  "Advancing execution timeline…",
  "Updating mission status…",
] as const

const PHASE_MS = 520

function firstSentence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/)
  return (match?.[0] ?? trimmed).trim()
}

function deriveRisk(mission: DiamondMission, newRecommendation: string, locale: Locale): string {
  const lower = newRecommendation.toLowerCase()
  if (/urgent|immediate|asap|deadline|window/.test(lower)) {
    return locale === "de" ? "Die verantwortliche Person hat den Plan gestrafft — der verdichtete Zeitplan erhöht die Ausführungsvarianz; tägliche Nachverfolgung erforderlich." : "Owner tightened the plan — compressed timeline increases execution variance; monitor daily."
  }
  if (/pause|hold|delay|postpone/.test(lower)) {
    return locale === "de" ? "Die verantwortliche Person hat die Ausführung verschoben — der verbleibende Entscheidungszeitraum kann sich verkürzen, wenn die Änderung nicht zeitnah rückgängig gemacht wird." : "The owner deferred execution. The remaining decision period may shorten if the change is not reversed promptly."
  }
  if (/expand|additional|broader|more accounts/.test(lower)) {
    return locale === "de" ? "Umfang auf Anweisung der verantwortlichen Person erweitert — Budgetbasis und kommerzielle Leitplanken vor der Ausgabe prüfen." : "Scope expanded per owner direction — validate budget baseline and commercial guardrails before issue."
  }
    return locale === "de" ? "Anpassung mit der verantwortlichen Person abgestimmt — Abweichungen zwischen überarbeiteter Empfehlung und Losausführung beobachten." : "The owner aligned this adjustment. Monitor any divergence between the revised recommendation and package execution."
}

function applyEditToTimeline(
  entries: ActionTimelineEntry[],
  newRecommendation: string,
  locale: Locale,
): ActionTimelineEntry[] {
  const snippet = firstSentence(newRecommendation)
  const clipped = snippet.length > 72 ? `${snippet.slice(0, 72)}…` : snippet

  return entries.map((entry) => {
    if (entry.status !== "current") return entry
    return {
      ...entry,
      label: locale === "de" ? `Überarbeiteten Plan ausführen: ${clipped}` : `Execute revised plan: ${clipped}`,
      agentSteps: entry.agentSteps?.map((a) =>
        a.status === "current" ? { ...a, label: locale === "de" ? `Compass-Vorbereitung an die Änderung angepasst: ${clipped}` : `Compass prep aligned to edit: ${clipped}` } : a,
      ),
    }
  })
}

function applyCompletionToTimeline(
  entries: ActionTimelineEntry[],
  confirmedAction: string,
  locale: Locale,
): ActionTimelineEntry[] {
  const snippet = firstSentence(confirmedAction)
  const clipped = snippet.length > 72 ? `${snippet.slice(0, 72)}…` : snippet
  const currentIdx = entries.findIndex((e) => e.status === "current")
  if (currentIdx === -1) return entries

  const today = new Date().toISOString().slice(0, 10)

  return entries.map((entry, i) => {
    if (i === currentIdx) {
      return {
        ...entry,
        status: "done" as const,
        completedAt: today,
        label: locale === "de" ? `Bestätigt: ${clipped}` : `Confirmed: ${clipped}`,
        agentSteps: entry.agentSteps?.map((a) =>
          a.status === "current" ? { ...a, status: "done" as const, completedAt: today } : a,
        ),
      }
    }
    if (i === currentIdx + 1 && entry.status === "upcoming") {
      return { ...entry, status: "current" as const }
    }
    return entry
  })
}

function buildCompletionPatch(mission: DiamondMission, confirmedAction: string, locale: Locale): MissionSessionPatch {
  const confidence = Math.min(0.98, Math.round((mission.confidence + 0.05) * 100) / 100)
  const baseReasoning = reasoningFromMission(mission, locale)
  const timelineEntries = applyCompletionToTimeline(buildFullTimeline(mission, locale), confirmedAction, locale)
  const advancedStage = nextStage(mission.stage)
  const nextOwner = timelineEntries.find((e) => e.status === "current")

  return {
    recommendation: confirmedAction,
    risk: locale === "de" ? "Ausführung von der verantwortlichen Person bestätigt — nachgelagerte Schritte auf Wertrealisierung überwachen." : "Owner confirmed execution — monitor downstream gates for value realisation.",
    confidence,
    reasoning: {
      ...baseReasoning,
      summary: locale === "de" ? `Compass hat Ihre Bestätigung zu „${mission.name}“ übernommen.` : `Compass ingested your confirmation for "${mission.name}".`,
      conclusion: locale === "de" ? `Aktion der verantwortlichen Person erfasst: ${firstSentence(confirmedAction)} Der Zeitplan ist zum nächsten Tor vorgerückt.` : `Owner action logged: ${firstSentence(confirmedAction)} Timeline advanced to the next gate.`,
      steps: locale === "de" ? [
        "Bestätigung und Aktionsdetail erfasst",
        "Aktuelles menschliches Tor als erledigt markiert",
        "Zum nächsten verantwortlichen Schritt vorgerückt",
      ] : [
        "Recorded owner confirmation and action details",
        "Marked current human gate complete on the timeline",
        "Advanced execution to the next accountable step",
      ],
    },
    timelineEntries,
    stage: advancedStage,
    ownerRole: nextOwner?.assigneeRole ?? mission.owner,
  }
}

function runPhasedReconcile(
  phases: readonly string[],
  onPhase: ((label: string) => void) | undefined,
  build: () => MissionSessionPatch,
): Promise<MissionSessionPatch> {
  return new Promise((resolve) => {
    let i = 0
    const tick = () => {
      if (i < phases.length) {
        onPhase?.(phases[i]!)
        i += 1
        setTimeout(tick, PHASE_MS)
      } else {
        resolve(build())
      }
    }
    tick()
  })
}
function buildEditPatch(mission: DiamondMission, newRecommendation: string, locale: Locale): MissionSessionPatch {
  const confidence = Math.min(0.97, Math.round((mission.confidence + 0.03) * 100) / 100)
  const risk = deriveRisk(mission, newRecommendation, locale)
  const baseReasoning = reasoningFromMission(mission, locale)

  return {
    recommendation: newRecommendation,
    risk,
    confidence,
    reasoning: {
      ...baseReasoning,
      summary: locale === "de" ? `Compass hat eine Änderung der verantwortlichen Person zu „${mission.name}“ erneut übernommen.` : `Compass re-ingested an owner edit to "${mission.name}".`,
      conclusion: locale === "de" ? `Empfehlung aktualisiert: ${firstSentence(newRecommendation)} Konfidenz neu bewertet auf ${Math.round(confidence * 100)} %.` : `Updated recommendation: ${firstSentence(newRecommendation)} Confidence re-scored to ${Math.round(confidence * 100)}%.`,
      steps: locale === "de" ? [
        "Manuelle Änderungen an der empfohlenen Aktion analysiert",
        "Risiko gegen den überarbeiteten Ausführungsweg neu bewertet",
        "Offene Schritte für die verantwortliche Person aktualisiert",
      ] : [
        "Parsed manual changes to the recommended action",
        "Re-scored risk against the revised execution path",
        "Refreshed open timeline steps for the accountable owner",
      ],
    },
    timelineEntries: applyEditToTimeline(buildFullTimeline(mission, locale), newRecommendation, locale),
  }
}

/** Simulate Compass ingest after an owner edit. */
export function reconcileMissionAfterEdit(
  mission: DiamondMission,
  newRecommendation: string,
  onPhase?: (label: string) => void,
  locale: Locale = "en",
): Promise<MissionSessionPatch> {
  const phases = locale === "de"
    ? ["Ihre Änderung wird übernommen…", "Risiko und Konfidenz werden neu bewertet…", "Ausführungszeitplan wird aktualisiert…"]
    : RECONCILE_PHASES
  return runPhasedReconcile(phases, onPhase, () => buildEditPatch(mission, newRecommendation, locale))
}

/** Simulate Compass ingest after an owner confirms mission completion. */
export function reconcileMissionAfterComplete(
  mission: DiamondMission,
  confirmedAction: string,
  onPhase?: (label: string) => void,
  locale: Locale = "en",
): Promise<MissionSessionPatch> {
  const phases = locale === "de"
    ? ["Ihre Bestätigung wird übernommen…", "Ausführungszeitplan rückt vor…", "Missionsstatus wird aktualisiert…"]
    : COMPLETE_PHASES
  return runPhasedReconcile(phases, onPhase, () => buildCompletionPatch(mission, confirmedAction, locale))
}
