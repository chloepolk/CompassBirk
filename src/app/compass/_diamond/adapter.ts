/* ------------------------------------------------------------------ */
/*  Tender register → Action Centre adapter                             */
/*                                                                     */
/*  Promotes logistics sourcing packages into generic 5-gate     */
/*  missions (Scoped → Specified → Approved → Issued → Awarded) so     */
/*  the Action Centre carries the live tender pipeline with owners,     */
/*  deadlines and savings targets.                                     */
/* ------------------------------------------------------------------ */

import { formatDateDMY } from "@/lib/compass/locale-display"
import type { MissionStage } from "./stages"
import { STAGE_META, STAGE_ORDER, stageIndex, statusForStage } from "./stages"
import type { ClosedRecord, DiamondMission, MissionHealth, MissionHorizon, MissionReasoningMeta, GateTask, GateTaskStatus } from "./types"
import { personForRole } from "./org"
import { agentFor, type MissionTheme } from "./agents"
import { TODAY, PROJECT, type TenderPackage } from "../data/_tenders"
import { componentById } from "../data/_documents"
import { displayPackageQuantity } from "../data/_demand-validation"
import type { Locale } from "../_i18n/types"
import { localizedClosedPackages, localizedTenderPackages } from "../_i18n/domain"
import { createT, localeTag } from "../_i18n"
import { formatCompactEur, formatEur } from "../_i18n/currency"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

/** Bucket a package by its remaining window onto the matrix rows:
 *  shock = <24h (immediate), near = 1-30 days, long = >30 days. */
function horizonFor(totalDays: number): MissionHorizon {
  if (totalDays <= 1) return "shock"
  if (totalDays <= 30) return "near"
  return "long"
}

function cadenceFor(totalDays: number): "days" | "weeks" | "quarter" {
  if (totalDays >= 60) return "quarter"
  if (totalDays >= 21) return "weeks"
  return "days"
}

/* ------------------------------------------------------------------ */
/*  Per-gate task synthesis (human vs. agent responsibility)           */
/* ------------------------------------------------------------------ */

function statusFor(stageIdxForTask: number, missionStageIdx: number, isFirst: boolean): GateTaskStatus {
  if (stageIdxForTask < missionStageIdx) return "done"
  if (stageIdxForTask > missionStageIdx) return "pending"
  return isFirst ? "in_progress" : "pending"
}

/** Plain-language "how to do it" steps for a human-owned gate task. */
function humanInstructions(stage: MissionStage, theme: MissionTheme, subject: string, locale: Locale): string[] {
  if (locale === "de") {
    if (stage === "understand") {
      if (theme === "charter") {
        return [
          `Prüfen Sie die zusammengestellten Vertragsdaten und die Exposition für ${subject}.`,
          "Bestätigen Sie den Leistungsplan gegen den Betriebsstart.",
          "Kennzeichnen Sie Qualifikations- oder Versicherungseinschränkungen, die den kommerziellen Fall ändern.",
          "Geben Sie den Umfang frei, damit das Freigabetor öffnen kann.",
        ]
      }
      return [
        `Öffnen Sie das extrahierte Anforderungspaket für ${subject} — Parameter, SLA und Konditionen.`,
        "Bestätigen Sie die technischen Parameter gegen die letzte verbindliche Fassung.",
        "Prüfen Sie die Anwendbarkeit mit der leitenden Qualitätsingenieurin.",
        "Geben Sie die Anforderungsbasis frei, damit der Entwurf fortgesetzt werden kann.",
      ]
    }
    if (stage === "decide") return [
      "Prüfen Sie den ITT-Entwurf und das Prüfzertifikat gegen die Quelldokumente.",
      "Klären Sie gekennzeichnete Abweichungen von den Standardbedingungen.",
      "Erfassen Sie die Freigabe und genehmigen Sie die Ausgabe über das SCM-Portal.",
    ]
    if (stage === "execute") return theme === "charter"
      ? [
          `Setzen Sie die vertragliche Anzeige innerhalb der Frist für ${subject}.`,
          "Bestätigen Sie Konditionen, Mobilisierung und Leistungsstart mit dem Anbieter.",
          "Erfassen Sie den unterzeichneten Nachtrag in der Vertragsakte.",
        ]
      : [
          `Beantworten Sie Bieterklärungen zu ${subject} innerhalb von sieben Tagen.`,
          "Prüfen Sie die normalisierte Angebotstabelle und die Konformitätsergebnisse.",
          "Bereiten Sie die Zuschlagsempfehlung zur Freigabe vor.",
        ]
    if (stage === "outcome_roi") return [
      `Bestätigen Sie mit dem Commercial Manager die gebuchten Einsparungen für ${subject}.`,
      "Informieren Sie die SCM-Direktorin und schließen Sie das Los.",
    ]
    return [
      `Bestätigen Sie Ziel, Menge und Budgetbasis des Loses ${subject}.`,
      "Benennen Sie die verantwortliche Person und die freigebende Person.",
    ]
  }
  if (stage === "understand") {
    if (theme === "charter") return [
      `Review the charter particulars and exposure summary assembled for ${subject}.`,
      "Confirm the vessel schedule against the installation programme.",
      "Flag any marine assurance constraints that change the commercial case.",
      "Sign off the scope so the approval gate can open.",
    ]
    return [
      `Open the extracted requirements pack for ${subject} — parameters, standards and terms.`,
      "Confirm the technical parameters against the latest controlled spec revision.",
      "Check the standards applicability with the Lead Quality Engineer.",
      "Sign off the requirements baseline so drafting can proceed.",
    ]
  }
  if (stage === "decide") return [
    "Review the draft ITT and the audit certificate against source documents.",
    "Resolve any flagged deviations from standard terms.",
    "Record approval and authorise issue via the SCM Portal.",
  ]
  if (stage === "execute") {
    if (theme === "charter") return [
      `Serve the option notice inside the contractual window for ${subject}.`,
      "Confirm hire, mobilisation and delivery particulars with the Owners.",
      "Log the executed amendment against the charter file.",
    ]
    return [
      `Answer bidder clarifications for ${subject} inside the 7-day window.`,
      "Review the normalised bid tabulation and technical conformity results.",
      "Prepare the award recommendation for approval.",
    ]
  }
  if (stage === "outcome_roi") return [
    `Confirm the savings booked for ${subject} with the Commercial Manager.`,
    "Brief the SCM Director and close the package.",
  ]
  // mission_created
  return [
    `Confirm the package objective, quantity and budget baseline for ${subject}.`,
    "Name the accountable owner and approver.",
  ]
}

/** Short "what the agent does" steps for an automated gate task. */
function agentInstructions(stage: MissionStage, theme: MissionTheme, subject: string, locale: Locale): string[] {
  if (locale === "de") {
    if (stage === "mission_created") return [
      `Budgetbasis und verbindliche Dokumente für ${subject} abrufen.`,
      "Losakte und Rechercheplan entwerfen.",
      "Ausschreibungsfenster gegen den Leistungsstart planen.",
    ]
    if (stage === "understand") return theme === "charter"
      ? [
          "Vertragliche Leistungsdaten und Tarifreferenzen abrufen.",
          "Die Exposition über das Optionsfenster quantifizieren.",
          "Den kommerziellen Fall mit zitierten Klauseln vorbereiten.",
        ]
      : [
          "Die verbindliche Logistikspezifikation abrufen.",
          "SLA- und Qualifikationspflichten aus SRC-002 und SRC-008 zuordnen.",
          "Einkaufsbedingungen mit Zitaten zusammenstellen.",
        ]
    if (stage === "decide") return [
      "Den vollständigen ITT-Entwurf aus den extrahierten Anforderungen zusammenstellen.",
      "Die Gegenprüfung gegen jedes Quelldokument ausführen.",
      "Den geprüften Entwurf zur Freigabe einreihen.",
    ]
    if (stage === "execute") return theme === "charter"
      ? ["Anzeige und Nachtrag vorbereiten.", "Eingangsbestätigung der Gegenseite verfolgen.", "Unterzeichnete Dokumente in der Vertragsakte ablegen."]
      : ["Das ITT-Paket über das SCM-Portal ausgeben und Bestätigungen erfassen.", "Klärungen gegen die Sieben-Tage-Frist verfolgen.", "Eingegangene Angebote in das Tabellenmodell normalisieren."]
    return [
      `Den Zuschlagswert gegen die Budgetbasis von ${subject} abstimmen.`,
      "Die Einsparungen diesem Los zuordnen.",
      "Das Ergebnis im Einsparregister buchen.",
    ]
  }
  if (stage === "mission_created") return [
    `Pull the budget baseline and controlled documents for ${subject}.`,
    "Draft the package brief and retrieval plan.",
    "Schedule the tender window against the installation programme.",
  ]
  if (stage === "understand") {
    if (theme === "charter") return [
      "Pull the executed charter particulars and rate benchmarks.",
      "Quantify the exposure across the option window.",
      "Assemble the commercial case with cited clauses.",
    ]
    return [
      "Retrieve the controlled engineering specification.",
      "Map the applicable DNV / NORSOK / ISO standards from the QA manual.",
      "Assemble commercial terms and any charter flow-downs, with citations.",
    ]
  }
  if (stage === "decide") return [
    "Assemble the full ITT draft from the extracted requirements.",
    "Run the adversarial audit pass against every source document.",
    "Queue the audited draft for approval.",
  ]
  if (stage === "execute") {
    if (theme === "charter") return [
      "Prepare the option notice and amendment paperwork.",
      "Track counterparty acknowledgement.",
      "Queue the executed documents for the charter file.",
    ]
    return [
      "Issue the ITT pack via the SCM Portal and log acknowledgements.",
      "Track clarification requests against the 7-day deadline.",
      "Normalise returned bids into the tabulation model.",
    ]
  }
  // outcome_roi
  return [
    `Reconcile awarded value against the ${subject} budget baseline.`,
    "Attribute the savings to this package.",
    "Post the result to the savings ledger.",
  ]
}

function buildTasksForMission(opts: {
  missionId: string
  theme: MissionTheme
  stage: MissionStage
  humanRole: string
  sponsorRole: string
  subject: string
  openedAt: string
  totalDays: number
  locale: Locale
}): Record<MissionStage, GateTask[]> {
  const { missionId, theme, stage, humanRole, sponsorRole, subject, openedAt, totalDays, locale } = opts
  const missionIdx = stageIndex(stage)
  const human = personForRole(humanRole, locale)
  const sponsor = personForRole(sponsorRole, locale)
  const out = {} as Record<MissionStage, GateTask[]>

  const de = locale === "de"
  const understandLabel = theme === "charter"
    ? (de ? `Charterdaten und Exposition für ${subject} zusammenstellen` : `Assemble charter particulars & exposure case for ${subject}`)
    : (de ? `Parameter, Normen und Konditionen für ${subject} extrahieren` : `Extract spec parameters, standards & terms for ${subject}`)
  const executeLabel = theme === "charter"
    ? (de ? `Optionsanzeige und Nachtrag für ${subject} vorbereiten` : `Prepare option notice and amendment for ${subject}`)
    : (de ? `Ausschreibung über das SCM-Portal ausgeben und Angebote für ${subject} tabellieren` : `Issue ITT via SCM Portal and tabulate bids for ${subject}`)

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    const agent = agentFor(s, theme, locale)
    const tasks: GateTask[] = []
    // Stagger a due date per gate across the tender window.
    const gateDue = addDays(openedAt, Math.round(totalDays * ((i + 1) / STAGE_ORDER.length)))

    const agentTask = (label: string, why: string, doneWhen: string, objective: string): GateTask => ({
      id: `${missionId}-${s}-a`,
      stage: s,
      label,
      ownerType: "agent",
      owner: agent.name,
      ownerRole: agent.capability,
      agentIcon: agent.icon,
      status: statusFor(i, missionIdx, tasks.length === 0),
      why,
      doneWhen,
      instructions: agentInstructions(s, theme, subject, locale),
      dueAt: gateDue,
      agentObjective: objective,
    })
    const humanTask = (who: typeof human, label: string, why: string, doneWhen: string): GateTask => ({
      id: `${missionId}-${s}-h`,
      stage: s,
      label,
      ownerType: "human",
      owner: who.name,
      ownerRole: who.role,
      status: statusFor(i, missionIdx, tasks.length === 0),
      why,
      doneWhen,
      instructions: humanInstructions(s, theme, subject, locale),
      dueAt: gateDue,
    })

    if (s === "mission_created") {
      tasks.push(agentTask(
        de ? `Losakte und Rechercheplan für ${subject} zusammenstellen` : `Assemble package brief & retrieval plan for ${subject}`,
        de ? "Das Los vor der Erstellung mit den richtigen verbindlichen Dokumenten rahmen." : "Frame the package with the right controlled documents before drafting begins.",
        de ? "Akte freigegeben und Budgetbasis erfasst." : "Brief approved and budget baseline captured.",
        de ? `Losakte für ${subject} erstellen: Budgetbasis, verbindliche Dokumente und Ausschreibungsfenster.` : `Compile the package brief for ${subject}: budget baseline, controlled document set, and tender window.`,
      ))
    } else if (s === "understand") {
      tasks.push(agentTask(
        understandLabel,
        de ? "Jede Anforderung muss vor der Aufnahme in die Ausschreibung auf ein verbindliches Dokument verweisen." : "Every requirement must trace to a controlled document before it enters the ITT.",
        de ? "Anforderungen mit Dokumentzitaten extrahiert." : "Requirements extracted with document citations.",
        de ? `Vollständige Anforderungsbasis für ${subject} extrahieren und jede Quelle und Revision zitieren.` : `Extract the complete requirements baseline for ${subject}, citing every source document and revision.`,
      ))
      tasks.push(humanTask(human, de ? "Anforderungsbasis bestätigen" : "Validate the requirements baseline", de ? "Die Extraktion ist quellenbezogen, die Umfangsentscheidung bleibt menschlich." : "Extraction is grounded, but scope judgement stays human.", de ? "Der Verantwortliche bestätigt die Anforderungsbasis." : "Owner signs off the requirements baseline."))
    } else if (s === "decide") {
      tasks.push(agentTask(
        de ? "Ausschreibungsentwurf zusammenstellen und prüfen" : "Assemble the draft ITT and run the audit pass",
        de ? "Der Entwurf muss die Gegenprüfung bestehen, bevor er zur Freigabe geht." : "The draft must survive adversarial verification before it reaches an approver.",
        de ? "Geprüfter Entwurf mit sauberem Zertifikat in der Warteschlange." : "Audited draft queued with a clean certificate.",
        de ? `Vollständige Ausschreibung für ${subject} zusammenstellen und jede Klausel gegen die Quelldokumente prüfen.` : `Assemble the full ITT for ${subject} and verify every clause against the source documents.`,
      ))
      tasks.push(humanTask(sponsor, de ? "Ausschreibung freigeben und Ausgabe genehmigen" : "Approve the ITT and authorise issue", de ? "Freigabe und Abweichungsakzeptanz bleiben menschlich." : "Approval authority and deviation acceptance stay human.", de ? "Freigabe erfasst; Ausgabe genehmigt." : "Approval recorded; issue authorised."))
    } else if (s === "execute") {
      tasks.push(agentTask(
        executeLabel,
        de ? "Den freigegebenen Entwurf in eine laufende Ausschreibung mit Angebotsverfolgung überführen." : "Turn the approved draft into a live tender with tracked returns.",
        de ? "Angebote tabelliert und Konformität geprüft." : "Bids tabulated and conformity checked.",
        de ? `Laufende Ausschreibung für ${subject} steuern: Ausgabe, Eingangsbestätigungen, Klärungen und Tabellierung.` : `Run the live tender for ${subject}: issue, acknowledgements, clarifications and bid tabulation.`,
      ))
      tasks.push(humanTask(human, de ? `Klärungen und Zuschlagsempfehlung für ${subject} führen` : `Run clarifications and the award recommendation for ${subject}`, de ? "Lieferantenverhandlung und Bewertungsurteil bleiben menschlich." : "Supplier negotiation and evaluation judgement stay human.", de ? "Zuschlagsempfehlung eingereicht." : "Award recommendation submitted."))
    } else {
      tasks.push(agentTask(
        de ? "Zuschlagswert abstimmen und Einsparungen buchen" : "Reconcile awarded value and book the savings",
        de ? "Nachweisen, dass die Ausschreibung Wert geschaffen hat, und ihn dem Los zuordnen." : "Prove the tender created value and attribute it to the package.",
        de ? "Einsparungen im Register gebucht." : "Savings booked to the ledger.",
        de ? `Zuschlagswert gegen das Budget für ${subject} abstimmen und die Einsparungen buchen.` : `Reconcile awarded value against budget for ${subject} and post the savings attribution.`,
      ))
    }

    out[s] = tasks
  }
  return out
}

/** Build entry dates for each reached gate; null for gates not yet reached. */
function buildStageDates(stage: MissionStage, openedAt: string, elapsedDays: number, completedAt?: string): Record<MissionStage, string | null> {
  const idx = stageIndex(stage)
  const dates = {} as Record<MissionStage, string | null>
  const spacing = idx > 0 ? Math.max(1, Math.floor(elapsedDays / idx)) : elapsedDays
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    if (i > idx) { dates[s] = null; continue }
    if (s === "outcome_roi" && completedAt) { dates[s] = completedAt; continue }
    dates[s] = addDays(openedAt, i * spacing)
  }
  return dates
}

/** Reached gates fully complete; current gate partial; future gates empty. */
function buildGateProgress(stage: MissionStage): Record<MissionStage, { done: number; total: number }> {
  const idx = stageIndex(stage)
  const out = {} as Record<MissionStage, { done: number; total: number }>
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    const total = STAGE_META[s].checklist.length
    if (i < idx) out[s] = { done: total, total }
    else if (i === idx) out[s] = { done: stage === "outcome_roi" && idx === 4 ? total : Math.max(1, Math.round(total * 0.5)), total }
    else out[s] = { done: 0, total }
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Tender packages → missions                                         */
/* ------------------------------------------------------------------ */

function missionFromPackage(pkg: TenderPackage, locale: Locale, stageOverride?: MissionStage): DiamondMission {
  const t = createT(locale)
  const de = locale === "de"
  const stage = stageOverride ?? pkg.stage
  const idx = stageIndex(stage)
  const theme: MissionTheme = pkg.componentId ? "supply" : "charter"
  const spec = pkg.componentId ? componentById(pkg.componentId) : undefined

  const totalDays = daysBetween(pkg.openedAt, pkg.submissionDeadline)
  const elapsedDays = Math.min(totalDays, daysBetween(pkg.openedAt, TODAY))
  const remaining = totalDays - elapsedDays

  const projectedValue = pkg.targetSavings
  const realizedValue = stage === "outcome_roi" ? (pkg.realisedSavings ?? pkg.targetSavings) : undefined
  const roiMultiple = realizedValue ? Math.round((realizedValue / pkg.tenderCost) * 10) / 10 : undefined
  const completedAt = stage === "outcome_roi" ? pkg.submissionDeadline : undefined

  const health: MissionHealth =
    stage === "outcome_roi" ? "on_track"
      : remaining <= 3 && idx < 3 ? "overdue"
        : pkg.confidence >= 0.84 ? "on_track"
          : pkg.confidence >= 0.76 ? "at_risk"
            : "overdue"

  const subject = locale === "de" ? pkg.title : spec?.shortName ?? pkg.title

  const pct = (value: number) => value.toLocaleString(localeTag(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const money = (value: number) => formatEur(value, locale)
  const date = (value: string) => formatDateDMY(value)
  const reasoningMeta: MissionReasoningMeta = {
    theme,
    steps: de
      ? [
          `Verbindliche Spezifikation ${spec?.docRef ?? "SRC-001"} laden und Parameterbasis sperren`,
          "SLA- und Qualifikationspflichten aus SRC-002 und SRC-008 zuordnen",
          "Einkaufsbedingungen aus SRC-004 und SRC-005 anhängen",
          "Einsparziel aus Budgetbasis und Bieterwettbewerb dimensionieren",
        ]
      : [
          `Retrieved the controlled specification ${spec?.docRef ?? "SRC-001"} and locked the parameter baseline`,
          "Mapped applicable standards from SRC-002 and SRC-008",
          "Attached governing procurement terms (SRC-004) and qualification gates",
          "Sized the savings target from the budget baseline and bidder competition",
        ],
    equations: [
      de ? `Budgetbasis = ${money(pkg.budget)} (${pkg.quantity})` : `Budget baseline = ${money(pkg.budget)} (${pkg.quantity})`,
      realizedValue
        ? (de ? `Gebuchte Einsparungen = ${money(realizedValue)} gegenüber Ziel ${money(pkg.targetSavings)}` : `Savings booked = ${money(realizedValue)} vs. target ${money(pkg.targetSavings)}`)
        : (de ? `Einsparziel = ${money(pkg.targetSavings)} (${pct((pkg.targetSavings / pkg.budget) * 100)} % des Budgets, ${pkg.bidders} Bieter)` : `Savings target = ${money(pkg.targetSavings)} (${pct((pkg.targetSavings / pkg.budget) * 100)}% of budget across ${pkg.bidders} bidders)`),
      de ? `Ausschreibungskosten = ${money(pkg.tenderCost)} — Rendite ${pct(projectedValue / pkg.tenderCost)}× bei Zielerreichung` : `Tender cost = ${money(pkg.tenderCost)} — return ${pct(projectedValue / pkg.tenderCost)}× if target holds`,
      de ? `Fenster: Eröffnung ${date(pkg.openedAt)}, Angebotsende ${date(pkg.submissionDeadline)} (${remaining > 0 ? `${remaining} Tage verbleibend` : "geschlossen"})` : `Window: opened ${date(pkg.openedAt)}, submissions close ${date(pkg.submissionDeadline)} (${remaining > 0 ? `${remaining} days remaining` : "closed"})`,
    ],
    sources: [
      de
        ? `${spec?.docRef ?? "SRC-001"} — Verbindliche Spezifikation: ${pkg.title}`
        : `${spec?.docRef ?? "SRC-001"} — ${spec?.name ?? pkg.title}`,
      de ? "SRC-002 / SRC-008 — SLA- und Qualifikationsstandards" : "SRC-002 / SRC-008 — SLA and qualification standards",
      de ? "SRC-004 — Standardvertragsbedingungen für Logistik" : "SRC-004 — Standard logistics contract terms",
    ],
  }

  const critical = stage === "outcome_roi" ? null : {
    owner: pkg.ownerRole,
    label: t(`stages.${stage}.checklist${Math.min(2, STAGE_META[stage].checklist.length - 1)}`),
    status: (health === "overdue" ? "blocked" : idx >= 1 ? "in_progress" : "pending") as "blocked" | "in_progress" | "pending",
  }

  const currentMetric = stage === "outcome_roi" ? realizedValue! : stage === "execute" ? Math.round(projectedValue * 0.45) : 0

  return {
    id: pkg.id,
    name: `${pkg.title} · ${pkg.quantity}`,
    objective: de
      ? `${pkg.packageRef} vom Umfang bis zum Zuschlag für ${PROJECT.shortName} führen — ${pkg.quantity}, Budget ${money(pkg.budget)}, Ziel ${money(pkg.targetSavings)} verhandelte Einsparungen.`
      : `Take ${pkg.packageRef} from scope to award for ${PROJECT.shortName} — ${pkg.quantity} against a ${formatCompactEur(pkg.budget, locale)} budget, targeting ${formatCompactEur(pkg.targetSavings, locale)} in negotiated savings.`,
    source: { page: "tender-studio", label: de ? "In Ausschreibungsmanagement öffnen" : "Open in Tender Management" },
    stage,
    status: statusForStage[stage],
    health,
    owner: pkg.ownerRole,
    sponsor: pkg.sponsorRole,
    cost: pkg.tenderCost,
    projectedValue,
    realizedValue,
    roiMultiple,
    confidence: pkg.confidence,
    recommendation: pkg.narrative,
    risk: pkg.risk,
    evidence: pkg.evidence,
    successMetric: {
      label: theme === "charter" ? (de ? "Vertragsrisiko vermieden" : "Charter exposure avoided") : (de ? "Verhandelte Einsparungen gegenüber Budget" : "Negotiated savings vs. budget"),
      baseline: 0,
      target: projectedValue,
      current: currentMetric,
      unit: "€",
      direction: "increase",
    },
    openedAt: pkg.openedAt,
    targetCompletionAt: pkg.submissionDeadline,
    completedAt,
    cadence: cadenceFor(totalDays),
    horizon: horizonFor(Math.max(1, remaining)),
    valueType: pkg.valueType,
    elapsedDays,
    totalDays,
    stageDates: buildStageDates(stage, pkg.openedAt, elapsedDays, completedAt),
    critical,
    gateProgress: buildGateProgress(stage),
    tasksByStage: buildTasksForMission({
      missionId: pkg.id,
      theme,
      stage,
      humanRole: pkg.ownerRole,
      sponsorRole: pkg.sponsorRole,
      subject,
      openedAt: pkg.openedAt,
      totalDays,
      locale,
    }),
    reasoningMeta,
  }
}

/* ------------------------------------------------------------------ */
/*  Closed ledger (awarded package history)                            */
/* ------------------------------------------------------------------ */

function closedHistory(locale: Locale): ClosedRecord[] {
  return localizedClosedPackages(locale).map(c => ({
  id: c.id,
  name: c.name,
  source: "tender-studio",
  cost: c.cost,
  realizedValue: c.realisedSavings,
  roiMultiple: Math.round((c.realisedSavings / c.cost) * 10) / 10,
  completionDate: c.completionDate,
  decisionMaker: c.decisionMaker,
  }))
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface DiamondData {
  missions: DiamondMission[]
  closed: ClosedRecord[]
}

/**
 * Build the Action Centre from the tender register.
 * `stageOverrides` carries session progress (e.g. an ITT drafted in
 * Tender Management advances its package to the approval gate).
 */
export function buildDiamondMissions(
  stageOverrides?: Record<string, MissionStage>,
  locale: Locale = "en",
  appliedQty?: Record<string, number>,
): DiamondData {
  const missions = localizedTenderPackages(locale).map(pkg => {
    const quantity = displayPackageQuantity(pkg.id, pkg.quantity, appliedQty, locale)
    return missionFromPackage({ ...pkg, quantity }, locale, stageOverrides?.[pkg.id])
  })

  // Stable display order: furthest-progressed active work first, awarded last.
  missions.sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage))

  return { missions, closed: closedHistory(locale) }
}

/* ------------------------------------------------------------------ */
/*  Portfolio savings roll-up (for the accumulated strip)              */
/* ------------------------------------------------------------------ */

export interface PortfolioRoi {
  missionsClosed: number
  realizedToDate: number
  totalInvested: number
  blendedRoi: number
  inFlightProjected: number
  inFlightCount: number
  cumulative: { label: string; total: number }[]
  ledger: ClosedRecord[]
}

export function buildPortfolioRoi(missions: DiamondMission[], closed: ClosedRecord[]): PortfolioRoi {
  const closedMissions = missions.filter(m => m.stage === "outcome_roi" && m.realizedValue)
  const closedRealized = closedMissions.reduce((s, m) => s + (m.realizedValue ?? 0), 0)
  const closedCost = closedMissions.reduce((s, m) => s + m.cost, 0)

  const historyRealized = closed.reduce((s, c) => s + c.realizedValue, 0)
  const historyCost = closed.reduce((s, c) => s + c.cost, 0)

  const realizedToDate = closedRealized + historyRealized
  const totalInvested = closedCost + historyCost
  const inFlight = missions.filter(m => m.stage !== "outcome_roi")

  const ledger: ClosedRecord[] = [
    ...closedMissions.map(m => ({
      id: m.id,
      name: m.name,
      source: m.source.page,
      cost: m.cost,
      realizedValue: m.realizedValue ?? 0,
      roiMultiple: m.roiMultiple ?? 0,
      completionDate: m.completedAt ?? m.targetCompletionAt,
      decisionMaker: m.owner,
    })),
    ...closed,
  ].sort((a, b) => a.completionDate.localeCompare(b.completionDate))

  let running = 0
  const cumulative = ledger.map(e => {
    running += e.realizedValue
    return { label: formatDateDMY(e.completionDate), total: running }
  })

  return {
    missionsClosed: ledger.length,
    realizedToDate,
    totalInvested,
    blendedRoi: totalInvested > 0 ? realizedToDate / totalInvested : 0,
    inFlightProjected: inFlight.reduce((s, m) => s + m.projectedValue, 0),
    inFlightCount: inFlight.length,
    cumulative,
    ledger,
  }
}
