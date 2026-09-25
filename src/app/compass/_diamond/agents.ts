import type { Locale } from "../_i18n/types"

/* ------------------------------------------------------------------ */
/*  Agent registry — automated workers that can be spawned to execute  */
/*  specific gate tasks on procurement packages. Each agent is a       */
/*  focused capability; the adapter assigns one to a task and the      */
/*  board can "spawn" it to stream a working log.                      */
/* ------------------------------------------------------------------ */

export type MissionTheme = "supply" | "charter"

export interface DiamondAgent {
  id: string
  name: string
  /** Short capability domain. */
  capability: string
  /** Lucide icon name. */
  icon: string
}

export const AGENTS: Record<string, DiamondAgent> = {
  scope: { id: "agt-scope", name: "Scope Agent", capability: "Frames the package, budget baseline and retrieval plan", icon: "FileText" },
  spec: { id: "agt-spec", name: "Specification Agent", capability: "Extracts engineering parameters from controlled tech specs", icon: "Ruler" },
  quality: { id: "agt-quality", name: "Quality & Standards Agent", capability: "Maps DNV / NORSOK / ISO obligations from the QA manual", icon: "ShieldCheck" },
  legal: { id: "agt-legal", name: "Contracts & Maritime Agent", capability: "Assembles liability, indemnity and charter flow-down clauses", icon: "Scale" },
  commercial: { id: "agt-commercial", name: "Commercial Agent", capability: "Builds pricing schedules and normalises bid tabulations", icon: "Coins" },
  audit: { id: "agt-audit", name: "Quality and compliance review", capability: "Citation coverage, conflicts, unsupported clauses and terminology", icon: "SearchCheck" },
  award: { id: "agt-award", name: "Award & Savings Agent", capability: "Reconciles awarded value against budget and books savings", icon: "BadgeCheck" },
}

/** Pick the most relevant agent for a stage + package theme. */
const DE_AGENTS: Record<string, Pick<DiamondAgent, "name" | "capability">> = {
  scope: { name: "Scope-Agent", capability: "Rahmt das Los, die Budgetbasis und den Rechercheplan" },
  spec: { name: "Spezifikationsagent", capability: "Extrahiert Parameter aus verbindlichen Spezifikationen" },
  quality: { name: "Qualität-und-Standards-Agent", capability: "Ordnet SLA- und Qualifikationspflichten aus SRC-002 und SRC-008 zu" },
  legal: { name: "Vertrags- und Konditionen-Agent", capability: "Stellt Einkaufs- und Vertragsbedingungen zusammen" },
  commercial: { name: "Konditionenagent", capability: "Erstellt Preisblätter und normalisiert Angebotstabellen" },
  audit: { name: "Prüfagent", capability: "Gegenprüfung jeder Klausel gegen Quelldokumente" },
  award: { name: "Zuschlags- und Einsparagent", capability: "Stimmt den Zuschlagswert gegen das Budget ab und bucht Einsparungen" },
}

function localizedAgent(key: keyof typeof AGENTS, locale: Locale): DiamondAgent {
  return locale === "de" ? { ...AGENTS[key], ...DE_AGENTS[key] } : AGENTS[key]
}

export function agentFor(stage: string, theme: MissionTheme, locale: Locale = "en"): DiamondAgent {
  if (stage === "mission_created") return localizedAgent("scope", locale)
  if (stage === "outcome_roi") return localizedAgent("award", locale)
  if (stage === "understand") {
    if (theme === "charter") return localizedAgent("legal", locale)
    return localizedAgent("spec", locale)
  }
  if (stage === "decide") {
    if (theme === "charter") return localizedAgent("commercial", locale)
    return localizedAgent("audit", locale)
  }
  // execute
  return localizedAgent("commercial", locale)
}
