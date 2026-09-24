export const APP_LOCALES = ["en", "fr", "de", "es"] as const
export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "en"

export type LocaleMessageMap<T = Record<string, unknown>> = Record<AppLocale, T>

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "en" || value === "fr" || value === "de" || value === "es"
}

export type ChatLanguageOptions = {
  glossary?: readonly string[]
}

/** Prompt line so model replies match the UI locale and keep product names intact. */
export function chatLanguageInstruction(
  locale: AppLocale,
  options: ChatLanguageOptions = {},
): string {
  const glossaryList = [...new Set((options.glossary ?? []).filter(Boolean))].join(", ")
  const glossary = glossaryList
    ? ` Keep these product terms unchanged: ${glossaryList}.`
    : ""

  if (locale === "de") {
    return `The user has the interface set to German (Germany). Respond entirely in natural, conversational German.${glossary}`
  }
  if (locale === "fr") {
    return `The user has the interface set to French (France). Respond entirely in natural, conversational French.${glossary}`
  }
  if (locale === "es") {
    return `The user has the interface set to Spanish (Spain). Respond entirely in natural, conversational Spanish.${glossary}`
  }
  return `The user has the interface set to English. Respond entirely in natural, conversational British English.${glossary}`
}
