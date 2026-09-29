"use client"

import * as React from "react"
import { useStore } from "../_store"
import { buildDiamondMissions, buildPortfolioRoi } from "../_diamond/adapter"
import { personForRole } from "../_diamond/org"
import { formatCurrency } from "../_diamond/stages"
import type { DiamondMission, MissionHorizon } from "../_diamond/types"
import { AgenticFocusHero } from "../_components/agentic-hero"
import { PortfolioLedger } from "../_components/hub/portfolio-ledger"
import { ActionFilterBar, type AssigneeKey, type HorizonKey } from "../_components/hub/action-filter-bar"
import { DetailDisclosure, MissionActionCard } from "../_components/hub/mission-action-card"
import { translatedFlightPathSteps, flightProgressLabel, flightStepIdForStage, flightStepIdForSession } from "../_components/hub/flight-stages"
import { useT } from "../_i18n/use-t"
import type { AuditEntry, StatusKey } from "../_components/hub/hub-types"
import { EditActionModal } from "../_components/hub/edit-action-modal"
import { CompleteActionModal } from "../_components/hub/complete-action-modal"
import { EmailPreviewModal } from "../_components/hub/email-preview-modal"
import { AuditLogModal } from "../_components/hub/audit-log-modal"
import { closedRecordToCardData } from "../_components/hub/closed-action-helpers"
import { openExampleCards, type OpenExampleCard } from "../_components/hub/open-example-helpers"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { buildFullTimeline } from "../_components/hub/mission-timeline-helpers"
import {
  reconcileMissionAfterEdit,
  reconcileMissionAfterComplete,
  type MissionSessionPatch,
} from "../_components/hub/bluepilot-action-reconcile"
import { isMissionOwnedByActiveUser, ACTIVE_USER } from "../_components/hub/active-user"
import { journeyIndex, rfpLifecycle, statusForSession } from "@/lib/compass/logistics/session"
import { actionCentreStep, followGuide } from "@/lib/compass/logistics/workflow-guide"
import { listItemMotion } from "../_components/motion"
import { reasoningFromMission, buildActionBoardHeroReasoning } from "../_components/reasoning-helpers"
import type { Locale } from "../_i18n"
import { AwardGovernanceChip, AwardGovernanceCardBlock, AwardNotificationToast } from "@/lib/compass/award-approval-modal"
import {
  awardGovernanceStatusFor,
  awardGovCopy,
  formatAwardAuditLine,
} from "@/lib/compass/award-governance"
const HORIZON_MAP: Record<HorizonKey, MissionHorizon> = {
  immediate: "shock",
  "near-term": "near",
  "long-term": "long",
}

function roiOf(m: DiamondMission): number {
  return m.cost > 0 ? m.projectedValue / m.cost : m.projectedValue
}

function orderMissions(missions: DiamondMission[], priority: string[]): DiamondMission[] {
  const rankOf = (id: string) => {
    const i = priority.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...missions].sort((a, b) => {
    const ra = rankOf(a.id)
    const rb = rankOf(b.id)
    if (ra !== rb) return ra - rb
    return roiOf(b) - roiOf(a)
  })
}

function isOpenMission(m: DiamondMission): boolean {
  return m.stage !== "outcome_roi"
}

function matchesHorizon(m: DiamondMission, filter: HorizonKey | null): boolean {
  if (!filter) return true
  return m.horizon === HORIZON_MAP[filter]
}

function matchesAssignee(m: DiamondMission, filter: AssigneeKey | null): boolean {
  if (!filter) return true
  if (filter === "assigned-to-you") return isMissionOwnedByActiveUser(m)
  return true
}

function matchesExampleHorizon(card: OpenExampleCard, filter: HorizonKey | null): boolean {
  if (!filter) return true
  return card.horizon === HORIZON_MAP[filter]
}

function matchesExampleAssignee(card: OpenExampleCard, filter: AssigneeKey | null): boolean {
  if (!filter) return true
  if (filter === "assigned-to-you") return card.owner === ACTIVE_USER.name
  return true
}

function EmptyState() {
  const t = useT()
  return (
    <p className="rounded-[14px] border border-dashed border-[var(--color-border-default)] py-12 text-center text-[13px] text-[var(--color-text-muted)]">
      {t("actionCentre.empty")}
    </p>
  )
}

function missionFields(mission: DiamondMission, locale: Locale, patch?: MissionSessionPatch) {
  const stage = patch?.stage ?? mission.stage
  const ownerRole = patch?.ownerRole ?? mission.owner
  return {
    narrative: patch?.recommendation ?? mission.recommendation,
    risk: patch?.risk ?? mission.risk,
    confidence: patch?.confidence ?? mission.confidence,
    reasoning: patch?.reasoning ?? reasoningFromMission(mission, locale),
    timelineEntries: patch?.timelineEntries ?? buildFullTimeline(mission, locale),
    stage,
    ownerRole,
  }
}

export function OperatingLoopPage() {
  const t = useT()
  const {
    missionPriority,
    bpReasoning,
    useStaticFallback,
    tenderStages,
    openTenderStudio,
    openBidEvaluation,
    locale,
    awardApprovals,
    approveAward,
    requestAwardClarification,
    respondToAwardClarification,
    returnAwardForRevision,
    resubmitAwardApproval,
    confirmAward,
    confirmAwardNotes,
    appliedTenderQtyByPackage,
    session,
    openVendor360,
    openPerformance,
    openInbox,
    openAward,
    openActionCentre,
    classifyEmail,
    patchSession,
    advanceJourney,
  } = useStore()
  const flightPathSteps = translatedFlightPathSteps(t)
  const life = rfpLifecycle(session)
  const rfpStatus = locale === "de" ? life.status.de : life.status.en
  const showRfpStatus = journeyIndex(session.journeyStep) <= 5 && !session.awardPending

  const [horizonFilter, setHorizonFilter] = React.useState<HorizonKey | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<StatusKey | null>(null)
  const [assigneeFilter, setAssigneeFilter] = React.useState<AssigneeKey | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [missionPatches, setMissionPatches] = React.useState<Record<string, MissionSessionPatch>>({})
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null)
  const [reconcilePhase, setReconcilePhase] = React.useState<string>("")
  const [sessionHeroNote, setSessionHeroNote] = React.useState<string | null>(null)
  const [auditLog, setAuditLog] = React.useState<Record<string, AuditEntry[]>>({})
  const [editingMissionId, setEditingMissionId] = React.useState<string | null>(null)
  const [completingMissionId, setCompletingMissionId] = React.useState<string | null>(null)
  const [emailPreviewMissionId, setEmailPreviewMissionId] = React.useState<string | null>(null)
  const [auditViewMissionId, setAuditViewMissionId] = React.useState<string | null>(null)
  const [toastName, setToastName] = React.useState<string | null>(null)
  const [resetNote, setResetNote] = React.useState(false)

  React.useEffect(() => {
    const show = () => {
      setResetNote(true)
      setExpandedId(null)
      setMissionPatches({})
      setAuditLog({})
      setSessionHeroNote(null)
      setReconcilingId(null)
      setReconcilePhase("")
      setEditingMissionId(null)
      setCompletingMissionId(null)
      setEmailPreviewMissionId(null)
      setAuditViewMissionId(null)
      setHorizonFilter(null)
      setStatusFilter(null)
      setAssigneeFilter(null)
    }
    window.addEventListener("clp-reset-complete", show)
    try {
      if (sessionStorage.getItem("clp-reset-complete") === "1") {
        sessionStorage.removeItem("clp-reset-complete")
        setResetNote(true)
      }
    } catch { /* ignore */ }
    return () => window.removeEventListener("clp-reset-complete", show)
  }, [])

  const openEdit = React.useCallback((id: string) => {
    setExpandedId(id)
    setEditingMissionId(id)
  }, [])

  const openEmail = React.useCallback((id: string) => {
    setExpandedId(id)
    setEmailPreviewMissionId(id)
    classifyEmail(`EML-${id}`)
    if (id === "PKG-CA-001" || id === "PKG-RFP-001") openInbox()
  }, [classifyEmail, openInbox])

  const openComplete = React.useCallback((id: string) => {
    setExpandedId(id)
    setCompletingMissionId(id)
  }, [])

  const derivedStages = React.useMemo(() => {
    const next = { ...tenderStages }
    if (session.awardApproved && journeyIndex(session.journeyStep) >= 10) next["PKG-RFP-001"] = "outcome_roi"
    else if (session.awardApproved) next["PKG-RFP-001"] = "execute"
    else if (session.bidsReleased) next["PKG-RFP-001"] = next["PKG-RFP-001"] ?? "execute"
    else if (session.packageLocked) next["PKG-RFP-001"] = next["PKG-RFP-001"] ?? "decide"
    return next
  }, [tenderStages, session.awardApproved, session.bidsReleased, session.packageLocked, session.journeyStep])

  const { missions, closed } = React.useMemo(
    () => buildDiamondMissions(derivedStages, locale, appliedTenderQtyByPackage),
    [derivedStages, locale, appliedTenderQtyByPackage],
  )
  const visibleMissions = React.useMemo(
    () => missions.filter((m) => {
      if (m.id === "PKG-REN-001") return journeyIndex(session.journeyStep) >= 9
      if (m.id === "PKG-RFP-001") return session.acceptedNeed && Boolean(session.sourcingEventId)
      if (m.id === "PKG-PERF-001" || m.id === "PKG-CA-001") return session.performanceReleased
      return false
    }),
    [missions, session.journeyStep, session.acceptedNeed, session.sourcingEventId, session.performanceReleased],
  )
  const orderedMissions = React.useMemo(() => orderMissions(visibleMissions, missionPriority), [visibleMissions, missionPriority])
  // Identified value on the road-freight programme is reference data. Reset
  // rewinds the journey, but this amount stays until the need is rejected.
  const metricMissions = React.useMemo(() => {
    if (session.needRejected || orderedMissions.some((m) => m.id === "PKG-RFP-001")) {
      return orderedMissions
    }
    const programme = missions.find((m) => m.id === "PKG-RFP-001")
    return programme ? [programme, ...orderedMissions] : orderedMissions
  }, [missions, orderedMissions, session.needRejected])
  const saveEdit = React.useCallback((missionId: string, oldValue: string, newValue: string) => {
    const mission = orderedMissions.find((m) => m.id === missionId)
    if (!mission || newValue.trim() === oldValue.trim()) {
      setEditingMissionId(null)
      return
    }

    setEditingMissionId(null)
    setExpandedId(missionId)
    setReconcilingId(missionId)
    setReconcilePhase(t("actionCentre.ingestingEdit"))

    void reconcileMissionAfterEdit(mission, newValue, setReconcilePhase, locale).then((patch) => {
      setMissionPatches((prev) => ({ ...prev, [missionId]: patch }))
      setAuditLog((prev) => ({
        ...prev,
        [missionId]: [
          ...(prev[missionId] ?? []),
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: "recommendation",
            oldValue,
            newValue,
          },
        ],
      }))
      setSessionHeroNote(t("actionCentre.updatedAfterEdit", { name: mission.name }))
      setReconcilingId(null)
      setReconcilePhase("")
    })
  }, [orderedMissions, t, locale])

  const saveComplete = React.useCallback((missionId: string, oldValue: string, confirmedAction: string) => {
    const mission = orderedMissions.find((m) => m.id === missionId)
    if (!mission || !confirmedAction.trim()) {
      setCompletingMissionId(null)
      return
    }

    const existingPatch = missionPatches[missionId]
    const effectiveMission: DiamondMission = {
      ...mission,
      stage: existingPatch?.stage ?? mission.stage,
      owner: existingPatch?.ownerRole ?? mission.owner,
      recommendation: existingPatch?.recommendation ?? mission.recommendation,
    }

    setCompletingMissionId(null)
    setExpandedId(missionId)
    setReconcilingId(missionId)
    setReconcilePhase(t("actionCentre.ingestingEdit"))

    if (effectiveMission.stage === "execute" && awardApprovals[missionId]?.status === "approved_for_award") {
      confirmAward(missionId, { name: ACTIVE_USER.name, role: ACTIVE_USER.role })
    }
    if (missionId === "PKG-RFP-001" || missionId === "PKG-CON-001" || missionId === "PKG-REN-001") {
      patchSession({ acceptedNeed: true })
    }
    if (missionId === "PKG-CA-001" || missionId === "PKG-PERF-001") {
      patchSession({ caAssigned: true, replayCheckpoint: Math.max(session.replayCheckpoint, 8) })
    }

    void reconcileMissionAfterComplete(effectiveMission, confirmedAction, setReconcilePhase, locale).then((patch) => {
      setMissionPatches((prev) => ({
        ...prev,
        [missionId]: { ...(prev[missionId] ?? {}), ...patch },
      }))
      setAuditLog((prev) => ({
        ...prev,
        [missionId]: [
          ...(prev[missionId] ?? []),
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: "completion",
            oldValue,
            newValue: confirmedAction,
          },
        ],
      }))
      setSessionHeroNote(t("actionCentre.recordedConfirmation", { name: mission.name }))
      setReconcilingId(null)
      setReconcilePhase("")
    })
  }, [orderedMissions, missionPatches, t, locale, awardApprovals, confirmAward, patchSession, session.replayCheckpoint])

  const exampleBaseline = React.useMemo(() => openExampleCards(locale), [locale])
  const roi = React.useMemo(() => {
    const base = buildPortfolioRoi(metricMissions, closed)
    const extra = exampleBaseline.reduce((sum, card) => sum + card.projectedValue, 0)
    return {
      ...base,
      inFlightProjected: base.inFlightProjected + extra,
      inFlightCount: base.inFlightCount + exampleBaseline.length,
    }
  }, [metricMissions, closed, exampleBaseline])

  const forcedId = React.useMemo(() => {
    const forced = orderedMissions.find((mission) => {
      const status = awardApprovals[mission.id]?.status
      return status === "clarification_requested" || status === "revision_required"
    })
    return forced?.id ?? null
  }, [orderedMissions, awardApprovals])

  const openMissions = React.useMemo(
    () =>
      orderedMissions.filter(
        (m) => isOpenMission(m) && matchesHorizon(m, horizonFilter) && matchesAssignee(m, assigneeFilter),
      ),
    [orderedMissions, horizonFilter, assigneeFilter],
  )

  const completedLiveMissions = React.useMemo(
    () =>
      orderedMissions.filter(
        (m) => !isOpenMission(m) && matchesHorizon(m, horizonFilter) && matchesAssignee(m, assigneeFilter),
      ),
    [orderedMissions, horizonFilter, assigneeFilter],
  )

  const closedCards = React.useMemo(
    () =>
      [...closed]
        .map((record) => closedRecordToCardData(record, locale))
        .sort((a, b) => b.completionDate.localeCompare(a.completionDate)),
    [closed, locale],
  )
  const visibleExamples = React.useMemo(
    () => exampleBaseline.filter((card) => matchesExampleHorizon(card, horizonFilter) && matchesExampleAssignee(card, assigneeFilter)),
    [exampleBaseline, horizonFilter, assigneeFilter],
  )

  const showOpen = statusFilter === null || statusFilter === "open"
  const showCompleted = statusFilter === null || statusFilter === "completed"
  const showSections = statusFilter === null
  const showNeedCard = showOpen && !session.acceptedNeed
  const totalVisible =
    (showNeedCard ? 1 : 0) +
    (showOpen ? openMissions.length + visibleExamples.length : 0) +
    (showCompleted ? completedLiveMissions.length + closedCards.length : 0)

  const protectTotal =
    metricMissions.filter((m) => m.valueType === "protection").reduce((s, m) => s + m.projectedValue, 0) +
    exampleBaseline.filter((card) => card.valueType === "protection").reduce((s, card) => s + card.projectedValue, 0)
  const createTotal =
    metricMissions.filter((m) => m.valueType === "creation").reduce((s, m) => s + m.projectedValue, 0) +
    exampleBaseline.filter((card) => card.valueType === "creation").reduce((s, card) => s + card.projectedValue, 0)

  const staticHeroHeadline = t("actionCentre.heroHeadline", {
    amount: formatCurrency(protectTotal + createTotal, locale),
  })
  const staticHeroBody = t("actionCentre.heroBody", {
    count: orderedMissions.filter(isOpenMission).length + exampleBaseline.length + (session.acceptedNeed ? 0 : 1),
  })

  const heroReasoning = React.useMemo(
    () =>
      buildActionBoardHeroReasoning(metricMissions, {
        agentSteps: bpReasoning.map((s) => s.text),
        useAgentSteps: !useStaticFallback && bpReasoning.length > 0,
        locale,
      }),
    [metricMissions, bpReasoning, useStaticFallback, locale],
  )

  const renderOpenMission = (mission: DiamondMission, i: number) => {
    const expanded = forcedId != null ? mission.id === forcedId : expandedId === mission.id
    const patch = missionPatches[mission.id]
    const fields = missionFields(mission, locale, patch)
    const person = personForRole(fields.ownerRole, locale)
    const motion = listItemMotion(i)
    const reconciling = reconcilingId === mission.id
    const assignedToYou = isMissionOwnedByActiveUser({ ...mission, owner: fields.ownerRole })
    // Packages ahead of the approval gate can be drafted in the Sourcing Workspace.
    const isLiveEvent = mission.id === "PKG-RFP-001"
    const step = session.journeyStep
    const canDraft = !isLiveEvent && (fields.stage === "mission_created" || fields.stage === "understand")
    const canEvaluate = fields.stage === "execute" && session.bidsReleased
    const isPerf = mission.id === "PKG-PERF-001" || mission.id === "PKG-CA-001"
    const isVendor = mission.id === "PKG-CON-001" || mission.id === "PKG-CON-002"
    const isRenewal = mission.id === "PKG-REN-001"
    const govCopy = awardGovCopy(locale)
    const awardRecord = awardApprovals[mission.id]
    const govStatus = isLiveEvent && session.awardApproved
      ? "awarded"
      : awardGovernanceStatusFor(fields.stage, awardRecord)
    const inAwardFlow = isLiveEvent
      ? step === "s6"
      : govStatus === "awaiting_approver" ||
        govStatus === "clarification_requested" ||
        govStatus === "revision_required" ||
        govStatus === "approved_for_award"
    const centre = isLiveEvent ? actionCentreStep(session) : null
    const liveCta = centre
      ? {
          label: locale === "de" ? centre.label.de : centre.label.en,
          run: () => followGuide(centre, {
            advanceJourney,
            openActionCentre: () => openActionCentre(),
            openTenderStudio,
            openInbox,
            openBidEvaluation,
            openAward,
            openPerformance,
          }),
        }
      : null
    const primaryActionLabel = liveCta
      ? liveCta.label
      : inAwardFlow
        ? undefined
        : isPerf
          ? t("actionCentre.reviewPerformance")
          : isVendor
            ? t("actionCentre.openVendor")
            : isRenewal
              ? t("actionCentre.reuseHistory")
              : canEvaluate
                ? t("actionCentre.evaluateBids")
                : canDraft
                  ? (locale === "de" ? "Ausschreibung entwerfen" : "Draft RFP")
                  : undefined
    const onPrimaryAction = liveCta
      ? liveCta.run
      : inAwardFlow
        ? undefined
        : isPerf
          ? () => openPerformance("SUP-001")
          : isVendor
            ? () => openVendor360(mission.id === "PKG-CON-002" ? "SUP-002" : "SUP-001")
            : isRenewal
              ? () => openTenderStudio(mission.id)
              : canEvaluate
                ? () => openBidEvaluation(mission.id)
                : canDraft
                  ? () => openTenderStudio(mission.id)
                : undefined
    const assignedName = awardRecord?.assignedToName ?? person.name
    const assignedRole = awardRecord?.assignedToRole ?? person.role
    const assignedToYouNow = assignedName === ACTIVE_USER.name || assignedToYou
    const procurementActor = { name: ACTIVE_USER.name, role: ACTIVE_USER.role, email: ACTIVE_USER.email }
    const approverActor = {
      name: awardRecord?.snapshot?.requiredApproverName ?? ACTIVE_USER.name,
      role: awardRecord?.snapshot?.requiredApproverRole ?? "SCM Director",
      email: awardRecord?.snapshot?.requiredApproverEmail,
    }
    const ping = (name: string | null | undefined) => {
      if (name) setToastName(name)
    }
    const awardAuditEntries: AuditEntry[] = (awardApprovals[mission.id]?.audit ?? []).map((entry) => ({
      id: entry.id,
      timestamp: entry.at,
      field: "award_governance" as const,
      oldValue: "",
      newValue: formatAwardAuditLine(entry, locale),
    }))
    const mergedAudit = [...(auditLog[mission.id] ?? []), ...awardAuditEntries].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    )
    return (
      <div key={mission.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onPrimaryAction}
          rank={i + 1}
          title={mission.name}
          narrative={fields.narrative}
          valueChip={formatCurrency(mission.projectedValue, locale)}
          valueType={mission.valueType}
          statusLabel={t(`health.${mission.health}`).toUpperCase()}
          statusTone={mission.health}
          stageLabel={isLiveEvent && showRfpStatus ? rfpStatus : isLiveEvent ? t(`flight.${statusForSession(session)}`) : flightProgressLabel(fields.stage, t)}
          flightPathSteps={flightPathSteps}
          currentFlightStepId={isLiveEvent ? flightStepIdForSession(session) : flightStepIdForStage(fields.stage)}
          owner={assignedName}
          ownerRole={assignedRole}
          isAssignedToYou={assignedToYouNow}
          confidence={fields.confidence}
          cost={mission.cost}
          risk={fields.risk}
          reasoning={fields.reasoning}
          expanded={expanded}
          onToggleExpand={() => {
            if (forcedId) return
            setExpandedId(expanded ? null : mission.id)
          }}
          onEditClick={() => openEdit(mission.id)}
          onEmailClick={() => openEmail(mission.id)}
          onCompleteClick={isLiveEvent && journeyIndex(step) < 10 ? undefined : () => {
            if (fields.stage === "execute" && awardApprovals[mission.id]?.status !== "approved_for_award") {
              setExpandedId(mission.id)
              return
            }
            openComplete(mission.id)
          }}
          auditEntries={mergedAudit}
          onViewAudit={() => setAuditViewMissionId(mission.id)}
          timelineEntries={fields.timelineEntries}
          isReconciling={reconciling}
          reconcilePhase={reconcilePhase}
          governanceChip={
            govStatus ? <AwardGovernanceChip status={govStatus} locale={locale} /> : undefined
          }
          governanceNote={
            govStatus === "clarification_requested" || govStatus === "revision_required"
              ? undefined
              : govStatus
                ? `${govCopy.status[govStatus]}${awardRecord?.approvalId ? ` — ${awardRecord.approvalId}` : ""} — ${govCopy.definition[govStatus]}`
                : undefined
          }
          governancePanel={
            awardRecord && !(isLiveEvent && session.awardApproved) ? (
              <AwardGovernanceCardBlock
                record={awardRecord}
                locale={locale}
                tenant="compass-logistics"
                onApprove={(comments) => approveAward(mission.id, comments, approverActor)}
                onRequestClarification={(question) => {
                  requestAwardClarification(mission.id, question, approverActor)
                  ping(awardRecord.procurementOwnerName)
                }}
                onReturnForRevision={(args) => {
                  returnAwardForRevision(mission.id, args, approverActor)
                  ping(awardRecord.procurementOwnerName)
                }}
                onSubmitClarification={(args) => {
                  respondToAwardClarification(mission.id, args, procurementActor)
                  ping(awardRecord.snapshot?.requiredApproverName)
                }}
                onResubmit={(args) => {
                  resubmitAwardApproval(mission.id, args, procurementActor)
                  ping(awardRecord.snapshot?.requiredApproverName)
                }}
                onConfirmAward={() => confirmAward(mission.id, procurementActor)}
                onConfirmNotes={() => confirmAwardNotes(mission.id, approverActor)}
              />
            ) : undefined
          }
          evaluateBidsLabel={canEvaluate && inAwardFlow ? t("actionCentre.evaluateBids") : undefined}
          onEvaluateBids={canEvaluate && inAwardFlow ? () => openBidEvaluation(mission.id) : undefined}
          decisionBasis={(
            <dl className="grid gap-2 text-[12px] text-[var(--color-text-secondary)] sm:grid-cols-2">
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Typ" : "Type"}</dt><dd>{isLiveEvent ? "RFP-2026-001" : mission.id}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Verantwortlich" : "Owner"}</dt><dd>{assignedName} · {assignedRole}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Fällig" : "Due"}</dt><dd>{isLiveEvent ? "23 October 2026" : mission.targetCompletionAt.slice(0, 10)}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Status" : "Status"}</dt><dd>{isLiveEvent && showRfpStatus ? rfpStatus : isLiveEvent ? t(`flight.${statusForSession(session)}`) : t(`health.${mission.health}`)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Begründung" : "Rationale"}</dt><dd>{isLiveEvent ? (locale === "de" ? "Vertragsablauf am 31. Dezember 2026 löst die Beschaffung aus." : "Contract expiry on 31 December 2026 triggers sourcing.") : fields.narrative}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Nachweis" : "Evidence"}</dt><dd>{(mission.evidence.length > 0 ? mission.evidence : ["SRC-001"]).join(", ")}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Exposition" : "Exposure"}</dt><dd>{formatCurrency(isLiveEvent ? 5650000 : mission.projectedValue, locale)}. {locale === "de" ? "Formel: angezeigter Betrag aus der Ereignisquelle." : "Formula: displayed amount from the event source."}</dd></div>
            </dl>
          )}
        />
      </div>
    )
  }

  const renderCompletedMission = (mission: DiamondMission, i: number) => {
    const expanded = forcedId == null && expandedId === mission.id
    const person = personForRole(mission.owner, locale)
    const patch = missionPatches[mission.id]
    const fields = missionFields(mission, locale, patch)
    const motion = listItemMotion(i)
    return (
      <div key={mission.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          rank={i + 1}
          title={mission.name}
          narrative={fields.narrative}
          valueChip={formatCurrency(mission.realizedValue ?? mission.projectedValue, locale)}
          valueType={mission.valueType}
          statusLabel={t("actionCentre.landed")}
          statusTone="on_track"
          stageLabel={t("actionCentre.landed")}
          flightPathSteps={flightPathSteps}
          currentFlightStepId="landed"
          owner={person.name}
          ownerRole={person.role}
          isAssignedToYou={person.name === ACTIVE_USER.name}
          confidence={fields.confidence}
          cost={mission.cost}
          risk={fields.risk}
          reasoning={fields.reasoning}
          expanded={expanded}
          onToggleExpand={() => setExpandedId(expanded ? null : mission.id)}
          isCompleted
          timelineEntries={fields.timelineEntries}
          governanceChip={<AwardGovernanceChip status="awarded" locale={locale} />}
          governanceNote={`${awardGovCopy(locale).status.awarded} — ${awardGovCopy(locale).definition.awarded}`}
        />
      </div>
    )
  }

  const renderOpenExample = (card: OpenExampleCard, i: number) => {
    const expanded = forcedId == null && expandedId === card.id
    const motion = listItemMotion(i)
    return (
      <div key={card.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          hideWorkflowActions
          rank={i + 1}
          title={card.title}
          narrative={card.narrative}
          valueChip={card.valueChip}
          valueType={card.valueType}
          statusLabel={t(`health.${card.health}`).toUpperCase()}
          statusTone={card.health}
          stageLabel={t(`flight.${card.flightStepId}`)}
          flightPathSteps={flightPathSteps}
          currentFlightStepId={card.flightStepId}
          owner={card.owner}
          ownerRole={card.ownerRole}
          isAssignedToYou={card.owner === ACTIVE_USER.name}
          confidence={card.confidence}
          cost={card.cost}
          risk={card.risk}
          expanded={expanded}
          onToggleExpand={() => setExpandedId(expanded ? null : card.id)}
          timelineEntries={card.timelineEntries}
          decisionBasis={(
            <dl className="grid gap-2 text-[12px] text-[var(--color-text-secondary)] sm:grid-cols-2">
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Typ" : "Type"}</dt><dd>{locale === "de" ? "Offene Aktion" : "Open action"}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Verantwortlich" : "Owner"}</dt><dd>{card.owner} · {card.ownerRole}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Fällig" : "Due"}</dt><dd>{formatDateDMY(card.due)}</dd></div>
              <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Status" : "Status"}</dt><dd>{t(`flight.${card.flightStepId}`)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Begründung" : "Rationale"}</dt><dd>{card.narrative}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Nachweis" : "Evidence"}</dt><dd>{card.evidence.join(" ")}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Exposition" : "Exposure"}</dt><dd>{card.valueChip}. {locale === "de" ? "Nicht Teil von RFP-2026-001." : "Not part of RFP-2026-001."}</dd></div>
            </dl>
          )}
        />
      </div>
    )
  }

  const renderClosedCard = (card: ReturnType<typeof closedRecordToCardData>, i: number) => {
    const expanded = forcedId == null && expandedId === card.id
    const motion = listItemMotion(i)

    return (
      <div key={card.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          rank={i + 1}
          title={card.title}
          narrative={card.narrative}
          valueChip={card.valueChip}
          valueType={card.valueType}
          statusLabel={t("actionCentre.landed")}
          statusTone="on_track"
          stageLabel={t("actionCentre.landed")}
          flightPathSteps={flightPathSteps}
          currentFlightStepId="landed"
          owner={card.owner}
          ownerRole={card.ownerRole}
          isAssignedToYou={card.owner === ACTIVE_USER.name}
          confidence={card.confidence}
          cost={card.cost}
          risk={card.risk}
          expanded={expanded}
          onToggleExpand={() => setExpandedId(expanded ? null : card.id)}
          isCompleted
          timelineEntries={card.timelineEntries}
        />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {resetNote && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--color-accent-positive)]/30 bg-[var(--color-tint-positive)] px-4 py-3 text-[13px] font-semibold text-[var(--color-text-primary)]"
        >
          <span>{locale === "de" ? "Zurücksetzen abgeschlossen" : "Reset complete"}</span>
          <button
            type="button"
            className="text-[12px] font-semibold text-[var(--color-text-secondary)]"
            onClick={() => setResetNote(false)}
          >
            {locale === "de" ? "Schließen" : "Dismiss"}
          </button>
        </div>
      )}
      <AgenticFocusHero
        eyebrow={t("actionCentre.todaysFocus")}
        staticHeadline={staticHeroHeadline}
        staticBody={staticHeroBody}
        bodyOverride={sessionHeroNote}
        reasoningDisclosure="expand"
        reasoningContent={heroReasoning}
        agentReasoningSummary={t("actionCentre.heroReasoningSummary")}
        ctaLabel={t("actionCentre.reviewPipeline")}
        onCta={() => document.getElementById("actions-section")?.scrollIntoView({ behavior: "smooth" })}
        stats={[
          { value: formatCurrency(protectTotal, locale), label: t("actionCentre.valueProtection") },
          { value: formatCurrency(createTotal, locale), label: t("actionCentre.valueCreation") },
        ]}
      />

      <PortfolioLedger roi={roi} />

      <div id="actions-section" className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">{t("actionCentre.actions")}</h2>
          <ActionFilterBar
            horizon={horizonFilter}
            onHorizonChange={setHorizonFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            assignee={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
          />
        </div>

        {totalVisible === 0 ? (
          <EmptyState />
        ) : (showSections || showNeedCard) ? (
          <div className="space-y-6">
            {showOpen && (showNeedCard || openMissions.length > 0 || visibleExamples.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {t("actionCentre.openSection")}
                </h3>
                {!session.acceptedNeed && (
                  <article className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
                    {(() => {
                      const needOpen = forcedId == null && expandedId === "sourcing-need"
                      const stateLabel = showRfpStatus ? rfpStatus : t(`flight.${statusForSession(session)}`)
                      return (
                        <>
                          <button
                            type="button"
                            aria-expanded={needOpen}
                            onClick={() => {
                              if (forcedId) return
                              setExpandedId(needOpen ? null : "sourcing-need")
                            }}
                            className="flex w-full items-start gap-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <h2 className="text-[14px] font-semibold leading-snug text-[var(--color-text-primary)]">
                                {locale === "de" ? "Verträge laufen am 31. Dezember 2026 aus" : "Contracts expire on 31 December 2026"}
                              </h2>
                              <p className="mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
                                {locale === "de" ? "Kategoriemanager, Logistik" : "Category Manager, Logistics"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-[8px] bg-[var(--color-bg-subtle)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                              {stateLabel}
                            </span>
                            <span className="shrink-0 text-[15px] font-bold tabular-nums text-[var(--color-text-primary)]">
                              {locale === "de" ? "€5,65 Mio." : "€5.65m"}
                            </span>
                          </button>
                          <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-[var(--color-text-secondary)]">
                            {session.needRejected
                              ? (locale === "de" ? "Bedarf abgelehnt. Es wurde kein Beschaffungsereignis angelegt." : "Need rejected. No sourcing event was created.")
                              : (locale === "de" ? "Vertragsablauf. Noch kein neues Beschaffungsereignis." : "Contract expiry. No new sourcing event exists yet.")}
                          </p>
                          <p className="mt-2 text-[12px] font-medium text-[var(--color-text-secondary)]">
                            {locale === "de" ? "Bedarf erkannt" : "Need identified"}
                          </p>
                          <div className="mt-3">
                            {session.needRejected ? (
                              <button
                                type="button"
                                className="rounded-[8px] bg-[var(--color-bg-inverse)] px-[13px] py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)]"
                                onClick={() => patchSession({ needRejected: false })}
                              >
                                {locale === "de" ? "Ablehnung zurücknehmen" : "Withdraw rejection"}
                              </button>
                            ) : !needOpen ? (
                              <button
                                type="button"
                                className="rounded-[8px] bg-[var(--color-bg-inverse)] px-[13px] py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)]"
                                onClick={() => setExpandedId("sourcing-need")}
                              >
                                {locale === "de" ? "Bedarf bestätigen" : "Validate sourcing need"}
                              </button>
                            ) : null}
                          </div>
                          {needOpen && (
                            <div className="mt-4 space-y-3 border-t border-[var(--color-border-default)] pt-4">
                              <DetailDisclosure title={t("missionCard.decisionBasis")}>
                              <dl className="grid gap-2 text-[12px] text-[var(--color-text-secondary)] sm:grid-cols-2">
                                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Typ" : "Type"}</dt><dd>{locale === "de" ? "Beschaffungsbedarf" : "Sourcing need"}</dd></div>
                                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Verantwortlich" : "Owner"}</dt><dd>{locale === "de" ? "Kategoriemanager, Logistik" : "Category Manager, Logistics"}</dd></div>
                                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Fällig" : "Due"}</dt><dd>31 December 2026</dd></div>
                                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Status" : "Status"}</dt><dd>{stateLabel}</dd></div>
                                <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Verträge" : "Contracts"}</dt><dd>CON-2024-01 RheinRoute · CON-2024-02 NorthBridge</dd></div>
                                <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Umfang" : "Scope"}</dt><dd>{locale === "de" ? "Europäischer Straßengüterverkehr · 18 Relationen · 2.448 prognostizierte Sendungen" : "European road freight · 18 lanes · 2,448 forecast shipments"}</dd></div>
                                <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Begründung" : "Rationale"}</dt><dd>{locale === "de" ? "Vertragsablauf. Noch kein neues Beschaffungsereignis." : "Contract expiry. No new sourcing event exists yet."}</dd></div>
                                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Nachweis" : "Evidence"}</dt><dd>SRC-001 v1.2 · SRC-009 · SRC-010</dd></div>
                                <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Exposition" : "Exposure"}</dt><dd>{locale === "de" ? "€5,65 Mio. Jahreswert. Formel: Ereigniswert aus SRC-001." : "€5.65m annual value. Formula: event value from SRC-001."}</dd></div>
                              </dl>
                              </DetailDisclosure>
                              {!session.needRejected && (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="rounded-[8px] bg-[var(--color-bg-inverse)] px-[13px] py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)]"
                                    onClick={() => {
                                      patchSession({ needRejected: false, sourcingEventId: "RFP-2026-001" })
                                      advanceJourney("s1")
                                    }}
                                  >
                                    {locale === "de" ? "Bedarf annehmen" : "Accept sourcing need"}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-[8px] border border-[var(--color-border-default)] px-[13px] py-1.5 text-[12px] font-semibold"
                                    onClick={() => patchSession({ needRejected: true, sourcingEventId: null, acceptedNeed: false })}
                                  >
                                    {locale === "de" ? "Bedarf ablehnen" : "Reject sourcing need"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </article>
                )}
                {openMissions.map((mission, i) => renderOpenMission(mission, i))}
                {visibleExamples.map((card, i) => renderOpenExample(card, openMissions.length + i))}
              </div>
            )}
            {showCompleted && (completedLiveMissions.length > 0 || closedCards.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-accent-positive-text)]">
                  {locale === "de" ? "Historische abgeschlossene Ereignisse" : "Historical completed events"}
                </h3>
                {completedLiveMissions.map((mission, i) => renderCompletedMission(mission, i))}
                {closedCards.map((card, i) => renderClosedCard(card, completedLiveMissions.length + i))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {showOpen && openMissions.map((mission, i) => renderOpenMission(mission, i))}
            {showOpen && visibleExamples.map((card, i) => renderOpenExample(card, openMissions.length + i))}
            {showCompleted && (
              <>
                {completedLiveMissions.map((mission, i) => renderCompletedMission(mission, i))}
                {closedCards.map((card, i) => renderClosedCard(card, completedLiveMissions.length + i))}
              </>
            )}
          </div>
        )}
      </div>

      {editingMissionId && (() => {
        const mission = orderedMissions.find((m) => m.id === editingMissionId)
        if (!mission) return null
        const patch = missionPatches[editingMissionId]
        const currentValue = patch?.recommendation ?? mission.recommendation
        return (
          <EditActionModal
            mission={mission}
            currentValue={currentValue}
            onSave={(newValue) => saveEdit(editingMissionId, currentValue, newValue)}
            onClose={() => setEditingMissionId(null)}
          />
        )
      })()}
      {completingMissionId && (() => {
        const mission = orderedMissions.find((m) => m.id === completingMissionId)
        if (!mission) return null
        const patch = missionPatches[completingMissionId]
        const currentValue = patch?.recommendation ?? mission.recommendation
        return (
          <CompleteActionModal
            mission={mission}
            currentValue={currentValue}
            onSubmit={(confirmedAction) => saveComplete(completingMissionId, currentValue, confirmedAction)}
            onClose={() => setCompletingMissionId(null)}
          />
        )
      })()}
      {emailPreviewMissionId && (() => {
        const mission = orderedMissions.find((m) => m.id === emailPreviewMissionId)
        if (!mission) return null
        const patch = missionPatches[emailPreviewMissionId]
        const fields = missionFields(mission, locale, patch)
        return (
          <EmailPreviewModal
            mission={mission}
            narrative={patch?.recommendation ?? mission.recommendation}
            timelineEntries={fields.timelineEntries}
            onClose={() => setEmailPreviewMissionId(null)}
          />
        )
      })()}
      {auditViewMissionId && (
        <AuditLogModal
          missionName={orderedMissions.find((m) => m.id === auditViewMissionId)?.name ?? ""}
          entries={[
            ...(auditLog[auditViewMissionId] ?? []),
            ...(awardApprovals[auditViewMissionId]?.audit ?? []).map((entry) => ({
              id: entry.id,
              timestamp: entry.at,
              field: "award_governance" as const,
              oldValue: "",
              newValue: formatAwardAuditLine(entry, locale),
            })),
          ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))}
          onClose={() => setAuditViewMissionId(null)}
        />
      )}
      {toastName && (
        <AwardNotificationToast name={toastName} locale={locale} onDismiss={() => setToastName(null)} />
      )}
    </div>
  )
}

export default OperatingLoopPage
