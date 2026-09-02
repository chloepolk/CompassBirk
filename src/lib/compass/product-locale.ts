import {
  type AppLocale,
  type LocaleMessageMap,
  isAppLocale,
} from "@prosera/i18n/core"

export type ProductId = "future-energy" | "prosera-compass"

/** Locales the UI may switch to. Kit still types en/fr/de/es. */
export const FE_SELECTABLE_LOCALES = ["en", "fr"] as const
export type FeSelectableLocale = (typeof FE_SELECTABLE_LOCALES)[number]

export const FE_LOCALE_STORAGE_KEY = "fe-locale"
export const FE_LOCALE_COOKIE_KEY = "fe-locale"
export const PC_LOCALE_STORAGE_KEY = "pc-locale"

export const FE_GLOSSARY = [
  "Action Centre",
  "Tender Management",
  "Intelligence Panel",
  "Future Energy",
] as const

export const PC_GLOSSARY = [
  "Action Center",
  "Tender Management",
  "Intelligence Panel",
] as const

export function isFeLocale(value: unknown): value is FeSelectableLocale {
  return value === "en" || value === "fr"
}

export function asFeLocale(value: unknown): FeSelectableLocale {
  return isFeLocale(value) ? value : "en"
}

/** Kit catalogs require all four keys; unused locales reuse English. */
export function fourLocaleMessages<T extends Record<string, unknown>>(
  en: T,
  fr: T = en,
): LocaleMessageMap<T> {
  return { en, fr, de: en, es: en }
}

export function htmlLangForProduct(product: ProductId, locale: string): string {
  if (product === "prosera-compass") return "en-US"
  return locale === "fr" ? "fr-FR" : "en-GB"
}

export function glossaryForTenant(tenant: string | undefined): readonly string[] {
  return tenant === "future-energy" ? FE_GLOSSARY : PC_GLOSSARY
}

export function isAppLocaleOrFe(value: unknown): value is AppLocale {
  return isAppLocale(value)
}
