import type { FlightPathStep } from "@/components/ui/prosera/flight-path"
import type { TranslateFn } from "../../_i18n"
import { JOURNEY_ORDER, statusForStep, type JourneyStatus, type JourneyStep } from "@/lib/compass/logistics/session"

/** Named journey statuses. Percentages are not shown. */
export const STATUS_IDS: JourneyStatus[] = [
  "need-identified",
  "requirements-approved",
  "rfp-issued",
  "responses-validated",
  "evaluation-complete",
  "award-approved",
  "monitoring-active",
]

export function translatedFlightPathSteps(t: TranslateFn): FlightPathStep[] {
  return STATUS_IDS.map((id) => ({ id, label: t(`flight.${id}`) }))
}

export const FLIGHT_PATH_STEPS: FlightPathStep[] = STATUS_IDS.map((id) => ({
  id,
  label: id,
}))

export function flightStepIdForJourney(step: JourneyStep): JourneyStatus {
  return statusForStep(step)
}

/** @deprecated Journey status replaces stage percentages. */
export function flightStepIdForStage(stage: string): string {
  if (stage === "outcome_roi") return "award-approved"
  if (stage === "execute") return "rfp-issued"
  if (stage === "decide") return "requirements-approved"
  return "need-identified"
}

export function flightProgressLabel(stageOrStep: string, t?: TranslateFn): string {
  const id = JOURNEY_ORDER.includes(stageOrStep as JourneyStep)
    ? statusForStep(stageOrStep as JourneyStep)
    : flightStepIdForStage(stageOrStep)
  if (t) return t(`flight.${id}`)
  return id
}
