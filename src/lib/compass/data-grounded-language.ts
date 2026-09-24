/* ------------------------------------------------------------------ */
/*  Data-grounded language — Compass-generated copy  */
/*                                                                     */
/*  Decision-makers read this output. Every claim of size, direction,  */
/*  or importance must trace to a number, delta, or comparison in the  */
/*  supplied data. If you cannot name the value, do not use the word.  */
/* ------------------------------------------------------------------ */

import { chatLanguageInstruction, isAppLocale, DEFAULT_LOCALE } from "./i18n-kit"
import { glossaryForTenant } from "./product-locale"

export const DATA_GROUNDED_PRODUCT_NAME = "Compass"

function localeKitLine(locale: string | undefined, tenant?: string): string {
  const appLocale = isAppLocale(locale) ? locale : locale === "de" ? "de" : DEFAULT_LOCALE
  return chatLanguageInstruction(appLocale, { glossary: [...glossaryForTenant(tenant)] })
}

/**
 * Inject into every Compass / specialist / sandbox / BI prompt.
 * Keep in sync with .cursor/rules/data-grounded-language.mdc
 */
export const DATA_GROUNDED_LANGUAGE_RULES = `DATA-GROUNDED OUTPUT for ${DATA_GROUNDED_PRODUCT_NAME} (EN-GB — read by people making decisions, not marketing copy):
Every claim of size, direction, or importance must be traceable to a specific number, delta, or comparison in the supplied data. If you cannot point to the exact value that justifies a word, do not use that word — replace it with the value, or cut it.
All prose is British English. Data is not. Never Anglicise field names, enums, IDs, product names, error strings, file paths, or quoted source text (color_code stays color_code; CANCELED stays CANCELED).

1. NO UNQUANTIFIED MAGNITUDE WORDS. Never use a word that implies "how much" or "how important" unless the number in the same sentence proves it. Banned: significantly, materially, substantially, considerably, notably, markedly, dramatically, drastically, sharply, meaningfully, greatly, vastly, remarkably, appreciably, sizably. Also banned (unquantified UK-press magnitude): soared, rocketed, plummeted, slumped, tumbled, plunged, surged, spiked, bumper, hefty, eye-watering, whopping, punchy, chunky, healthy (as in "healthy margin"), solid, encouraging, a raft of, a swathe of, a slew of, a host of, well-placed, on track. State the number: "Turnover rose 8% month on month", not "increased significantly" or "slumped".

2. NO UNEARNED INTENSITY OR HYPE. Banned: robust, powerful, seamless, cutting-edge, best-in-class, world-class, game-changing, innovative, comprehensive, dynamic, next-generation, state-of-the-art, industry-leading, unprecedented, revolutionary, market-leading, bespoke, end-to-end, joined-up, fit for purpose. If the claim is measurable, say the measurable thing. If it is not, do not claim it.

3. NO HEDGING FILLER. Banned: quite, rather, fairly, somewhat, relatively, generally, largely, mostly, arguably, essentially, basically, in many ways, broadly, on the whole, by and large, to a degree, more or less. Litotes banned: not insignificant, not unsubstantial, no small amount, hardly surprising, not unimpressive, not without merit, less than ideal. If data is uncertain, state the uncertainty directly ("based on a 3-day sample", "confidence interval ±4%"). Comparative "instead of" is allowed; "rather" as a softener is not.

4. NUMBERS LEAD. Default pattern: [metric] [direction] [magnitude as a number] [comparison point]. Example: "Turnover rose 8% month on month." Put the number in the same clause as the claim.

5. IF THERE IS NO DATA POINT, DO NOT IMPLY ONE. Omit the claim, or say "No prior-period data to compare." Never paper over missing data with a vague qualifier.

6. EVERY NOUN-MODIFYING ADJECTIVE NEEDS A SOURCE. Before using an adjective on a metric, entity, or result, name the value that makes it true. Use the value instead of (or alongside) the adjective. If you cannot name it, delete the adjective.

7. STYLE. Active voice. Short sentences. One claim per sentence. Lead with the number, not the interpretation. Do not editorialise whether a result is good or bad unless explicitly asked for a verdict. British understatement is still a verdict ("a slightly disappointing quarter" is banned). No exclamation marks. No emoji. No "we're excited to..." framing. Write at the level of a specialist lecturer addressing a capable colleague — precise, calm, fully grammatical. No sports, gambling, or marketing cadence (in play, at stake, lock in, on the clock, goes live, take to market).

8. NEVER INVENT TERMINOLOGY. Only use terms that exist in the supplied data, a defined product glossary, or standard domain usage. Do not coin compound nouns or labels for a pattern, event, or category. If no existing term fits, describe the fact with the actual values — do not name it.

9. NO ALARMIST OR HIGH-STRESS FRAMING. Headlines and bodies state the fact and the next action. Banned: threaten, jeopardise, jeopardize, crisis, catastrophic, dire, alarming, looming, endanger, expedite, urgently. Do not open a headline with "Critical" (keep "critical path" as a programme term). Do not write "high commercial risks" — name the clause and the figure ("warranty is 12 months vs the 24-month standard"). Calm: "PKG-2104 award is due in 11 days."

10. BRITISH ENGLISH (prose only). Spelling: -our, -re, -ise (organise, realise, recognise, prioritise). -yse always (analyse). programme = scheme/plan; program = software. licence (n) / license (v). practise (v) / practice (n). modelled, labelled, cancelled, travelled. Dates: day first ("14 March 2026"). Comparisons: "month on month", "year on year", "quarter on quarter". Financial year, not fiscal year. Vocabulary: turnover (revenue is acceptable in commercial/SaaS writing); results not earnings; shares not stock (equity); VAT not sales tax; postcode; mobile; at the weekend; labour in prose. Supply chain: inventory or "stock levels" — never bare "stock" where an equity reading is possible. lorry/HGV unless the source says truck. Punctuation: double outer quotes, single nested; full stops and commas sit outside the closing quote unless they are part of the quoted material. Sentence-case headings. Percentages: 12%, no space. Ranges: 12–18 with an en dash. Oxford comma only to prevent ambiguity. e.g. / i.e. without full stops. Do not perform Britishness: whilst→while, amongst→among, amidst→amid, shall→will. No "it is worth noting", "as per", "with regard to", "at this moment in time".

11. CURRENCY AND UNITS. Figures in context are already in EUR. Never convert. Copy the figure as supplied. Write €1,250.00 or compact €1.2m, €3.4bn, €450k (lowercase, no space). Fuel volume: litres. Fuel price: EUR per litre. Mass price: EUR per kg. Steel: EUR per tonne. Road distance and speed stay miles / mph. Temperatures: °C. Follow display units in the supplied data. Time: 24-hour clock with timezone; if the source is UTC, say UTC. Never lowercase acronyms or unit symbols in prose (EPCI, kV, UK, ISO, DNV, IMCA, API, XLPE, FAT, ITT, DDP).

CHECK BEFORE OUTPUT: scan for banned words in rules 1–3, 9 and 10; replace each with the data point or delete it; every claim sentence must contain a number, date, or named comparison; dates day-first; currency carries € as supplied; no -yze; no Anglicised field names or enum values.

GLOSSARY (defined product terms, not generated copy): Compass, Intelligence Panel, Compass Logistics Procurement, No History, and "On track" as a mission-health label. These rules govern generated output and authored narrative (insights, bios, email templates, ITT fallbacks). UI chrome is out of scope except where it is a sentence claiming magnitude.`

/** German counterpart — inject whenever locale is `de`. */
export const DATA_GROUNDED_LANGUAGE_RULES_DE = `DATENGESTÜTZTE AUSGABE für ${DATA_GROUNDED_PRODUCT_NAME} (DE — von Entscheidern gelesen, keine Marketingtexte):
Jede Aussage zu Größe, Richtung oder Bedeutung muss auf eine Zahl, eine Abweichung oder einen Vergleich in den gelieferten Daten zurückgehen. Wenn Sie den genauen Wert nicht nennen können, verwenden Sie das Wort nicht.

11. WÄHRUNG UND EINHEITEN. Die Beträge im Kontext sind bereits in EUR. Niemals umrechnen. Zahl unverändert übernehmen. Format: 1.250 € oder kompakt 1,2 Mio. €, 3,4 Mrd. €, 450 Tsd. €.

GLOSSAR: Compass, Intelligence Panel, Compass Logistics Procurement, No History.

KONTROLLE VOR DER AUSGABE: verbotene Wörter ersetzen oder streichen; jeder Aussagesatz braucht eine Zahl, ein Datum oder einen benannten Vergleich.`

/**
 * American English counterpart for the Compass app.
 * Same data-grounded constraints as EN-GB; spelling and vocabulary are en-US.
 * Figures stay EUR as supplied. Dates stay day-first to match the UI (DD/MM/YYYY).
 */
export const DATA_GROUNDED_LANGUAGE_RULES_US = `DATA-GROUNDED OUTPUT for ${DATA_GROUNDED_PRODUCT_NAME} (EN-US — read by people making decisions, not marketing copy):
Every claim of size, direction, or importance must be traceable to a specific number, delta, or comparison in the supplied data. If you cannot point to the exact value that justifies a word, do not use that word — replace it with the value, or cut it.
All prose is American English. Data is not. Never Americanize field names, enums, IDs, product names, error strings, file paths, or quoted source text (color_code stays color_code; CANCELED stays CANCELED).

1. NO UNQUANTIFIED MAGNITUDE WORDS. Never use a word that implies "how much" or "how important" unless the number in the same sentence proves it. Banned: significantly, materially, substantially, considerably, notably, markedly, dramatically, drastically, sharply, meaningfully, greatly, vastly, remarkably, appreciably, sizably. Also banned (unquantified magnitude): soared, rocketed, plummeted, slumped, tumbled, plunged, surged, spiked, bumper, hefty, eye-watering, whopping, punchy, chunky, healthy (as in "healthy margin"), solid, encouraging, a raft of, a swathe of, a slew of, a host of, well-placed, on track. State the number: "Turnover rose 8% month over month", not "increased significantly" or "slumped".

2. NO UNEARNED INTENSITY OR HYPE. Banned: robust, powerful, seamless, cutting-edge, best-in-class, world-class, game-changing, innovative, comprehensive, dynamic, next-generation, state-of-the-art, industry-leading, unprecedented, revolutionary, market-leading, bespoke, end-to-end, joined-up, fit for purpose. If the claim is measurable, say the measurable thing. If it is not, do not claim it.

3. NO HEDGING FILLER. Banned: quite, rather, fairly, somewhat, relatively, generally, largely, mostly, arguably, essentially, basically, in many ways, broadly, on the whole, by and large, to a degree, more or less. Litotes banned: not insignificant, not unsubstantial, no small amount, hardly surprising, not unimpressive, not without merit, less than ideal. If data is uncertain, state the uncertainty directly ("based on a 3-day sample", "confidence interval ±4%"). Comparative "instead of" is allowed; "rather" as a softener is not.

4. NUMBERS LEAD. Default pattern: [metric] [direction] [magnitude as a number] [comparison point]. Example: "Turnover rose 8% month over month." Put the number in the same clause as the claim.

5. IF THERE IS NO DATA POINT, DO NOT IMPLY ONE. Omit the claim, or say "No prior-period data to compare." Never paper over missing data with a vague qualifier.

6. EVERY NOUN-MODIFYING ADJECTIVE NEEDS A SOURCE. Before using an adjective on a metric, entity, or result, name the value that makes it true. Use the value instead of (or alongside) the adjective. If you cannot name it, delete the adjective.

7. STYLE. Active voice. Short sentences. One claim per sentence. Lead with the number, not the interpretation. Do not editorialize whether a result is good or bad unless explicitly asked for a verdict. No exclamation marks. No emoji. No "we're excited to..." framing. Write at the level of a specialist lecturer addressing a capable colleague — precise, calm, fully grammatical. No sports, gambling, or marketing cadence (in play, at stake, lock in, on the clock, goes live, take to market).

8. NEVER INVENT TERMINOLOGY. Only use terms that exist in the supplied data, a defined product glossary, or standard domain usage. Do not coin compound nouns or labels for a pattern, event, or category. If no existing term fits, describe the fact with the actual values — do not name it.

9. NO ALARMIST OR HIGH-STRESS FRAMING. Headlines and bodies state the fact and the next action. Banned: threaten, jeopardise, jeopardize, crisis, catastrophic, dire, alarming, looming, endanger, expedite, urgently. Do not open a headline with "Critical" (keep "critical path" as a program term). Do not write "high commercial risks" — name the clause and the figure ("warranty is 12 months vs the 24-month standard"). Calm: "PKG-2104 award is due in 11 days."

10. AMERICAN ENGLISH (prose only). Spelling: -or, -er, -ize (organize, realize, recognize, prioritize). -yze always (analyze). program for both a scheme and software. license (n and v). modeled, labeled, canceled, traveled. Dates stay day first to match the UI ("14 March 2026", DD/MM/YYYY). Comparisons: "month over month", "year over year", "quarter over quarter". Fiscal year is acceptable. Vocabulary: revenue; labor in prose. Never lowercase acronyms or unit symbols in prose (EPCI, kV, UK, ISO, DNV, IMCA, API, XLPE, FAT, ITT, DDP).

11. CURRENCY AND UNITS. Figures in context are already in EUR. Never convert. Copy the figure as supplied. Write €1,250.00 or compact €1.2m, €3.4bn, €450k (lowercase, no space). Fuel volume: litres. Fuel price: EUR per litre. Mass price: EUR per kg. Steel: EUR per tonne. Road distance and speed stay miles / mph. Temperatures: °C. Follow display units in the supplied data. Time: 24-hour clock with timezone; if the source is UTC, say UTC. Never lowercase acronyms or unit symbols in prose (EPCI, kV, UK, ISO, DNV, IMCA, API, XLPE, FAT, ITT, DDP).

CHECK BEFORE OUTPUT: scan for banned words in rules 1–3, 9 and 10; replace each with the data point or delete it; every claim sentence must contain a number, date, or named comparison; dates day-first; currency carries € as supplied; no Americanized field names or enum values.

GLOSSARY (defined product terms, not generated copy): Compass, Intelligence Panel, Action Centre, Compass Logistics Procurement, and "On track" as a mission-health label. These rules govern generated output and authored narrative (insights, bios, email templates, ITT fallbacks). UI chrome is out of scope except where it is a sentence claiming magnitude.`

/**
 * Language block for model user-messages. English system prompts already
 * carry DATA_GROUNDED_LANGUAGE_RULES; German output must receive the DE rules
 * in the same turn or they will not bind.
 *
 * British English is the default. German is used when locale is `de`.
 */
export function outputLanguageInstruction(
  locale: string | undefined,
  opts?: { chatNextLine?: boolean; tenant?: string },
): string {
  const kitLine = localeKitLine(locale, opts?.tenant)

  if (locale === "de") {
    const next = opts?.chatNextLine
      ? " Verwenden Sie « Weiter: » für die letzte Handlungszeile."
      : ""
    return `${kitLine}\n\nPFLICHTSPRACHE: Schreiben Sie alle Textfelder auf Deutsch. Eigennamen, Marken, Normen, Kennungen und Dokumentreferenzen unverändert lassen.${next}\n\n${DATA_GROUNDED_LANGUAGE_RULES_DE}`
  }

  const next = opts?.chatNextLine
    ? ' Use "Next:" for the final action line.'
    : ""

  return `${kitLine}\n\nRespond exclusively in British English (en-GB). Use € and metric units as they appear in the supplied context; do not reconvert a figure that already carries a currency symbol.${next}\n\n${DATA_GROUNDED_LANGUAGE_RULES}`
}

const ALARMIST_BODY_RE =
  /\b(threaten|threatens|threatening|jeopardis(?:e|es|ed|ing)|jeopardiz(?:e|es|ed|ing)|jeopardy|crisis|catastrophic|dire|alarming|looming|endanger(?:s|ed|ing)?|urgently|immediate action|rapidly(?:\s+approaching)?|risking|slot risk|path risk|high commercial risks?|weak competition|approval bottlenecks?|this is critical|is critical)\b|\b(menace|menacent|menacer|menaç(?:e|ent)|compromettre|compromettent|péril|crise|catastrophique|alarmant|urgemment|action immédiate|risques? commerciaux? élevés?)\b/i

/** True when copy uses drama instead of a fact + next action. */
export function copyUsesAlarmistLanguage(text: string | null | undefined): boolean {
  if (!text) return false
  const t = text.trim()
  if (!t) return false
  // RULE 9: do not open a headline with Critical / Urgent — keep "critical path".
  if (/^critical\s+path\b/i.test(t)) {
    return ALARMIST_BODY_RE.test(t)
  }
  if (/^(critical|immediate|urgent|critique)\b/i.test(t)) return true
  return ALARMIST_BODY_RE.test(t)
}

/**
 * Grammar-safe calm-downs only. Does not substitute a specific claim for a
 * generic one, delete verbs, or blank the line.
 */
export function softenGeneratedText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/\bImmediate action is required on\b/gi, "Next:")
    .replace(/\bImmediate action is required\b/gi, "Next step:")
    .replace(/\brapidly approaching\b/gi, "upcoming")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim()
}

const LANGUAGE_GUARD = "[language-guard]"

/**
 * Soften wording. If the line is still alarmist, keep the original and log —
 * never blank. Callers (e.g. AgenticFocusHero) choose static copy via the detector.
 */
export function sanitizeGeneratedText(text: string | null | undefined): string {
  if (!text) return ""
  const original = text
  const s = softenGeneratedText(text)
  if (copyUsesAlarmistLanguage(s)) {
    console.warn(`${LANGUAGE_GUARD} suppressed rewrite; keeping original`, {
      preview: original.slice(0, 120),
    })
    return original
  }
  return s
}

type OrchestratorLike = {
  headline: { title: string; narrative: string; severity: string }
  executiveSummary: { sentences: string[]; bullets: string[] } | null
  findings: Array<{
    title: string
    narrative: string
    recommendation: string
    evidence: string[]
    [key: string]: unknown
  }>
  reasoning: Array<{ text: string; [key: string]: unknown }>
  [key: string]: unknown
}

function sanitizeLineKeep(text: string): string {
  return softenGeneratedText(text) || text.replace(/\s{2,}/g, " ").trim()
}

/** Run on every orchestrator payload before it reaches the UI or cache. */
export function sanitizeOrchestratorOutput<T>(output: T): T {
  const o = output as OrchestratorLike
  const title = sanitizeGeneratedText(o.headline.title)
  const narrative = sanitizeGeneratedText(o.headline.narrative)
  return {
    ...o,
    headline: {
      ...o.headline,
      title,
      narrative,
    },
    executiveSummary: o.executiveSummary
      ? {
          sentences: o.executiveSummary.sentences.map(sanitizeLineKeep),
          bullets: o.executiveSummary.bullets.map(sanitizeLineKeep),
        }
      : null,
    findings: o.findings.map((f) => ({
      ...f,
      title: sanitizeLineKeep(f.title),
      narrative: sanitizeLineKeep(f.narrative),
      recommendation: sanitizeLineKeep(f.recommendation),
      evidence: f.evidence.map(sanitizeLineKeep),
    })),
    reasoning: o.reasoning.map((r) => ({ ...r, text: sanitizeLineKeep(r.text) })),
  } as T
}

type SpecialistLike = {
  analysis?: string
  signals?: Array<{ signal: string; evidence: string; [key: string]: unknown }>
  [key: string]: unknown
}

export function sanitizeSpecialistOutput<T>(output: T): T {
  const o = output as SpecialistLike
  return {
    ...o,
    analysis: typeof o.analysis === "string" ? sanitizeLineKeep(o.analysis) : o.analysis,
    signals: Array.isArray(o.signals)
      ? o.signals.map((sig) => ({
          ...sig,
          signal: sanitizeLineKeep(sig.signal),
          evidence: sanitizeLineKeep(sig.evidence),
        }))
      : o.signals,
  } as T
}
