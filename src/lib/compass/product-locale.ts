import { type AppLocale, isAppLocale } from "./i18n-kit"

export type ProductId = "compass-logistics"

/** Locales the UI may switch to. */
export const FE_SELECTABLE_LOCALES = ["en", "de"] as const
export type FeSelectableLocale = (typeof FE_SELECTABLE_LOCALES)[number]

export const FE_LOCALE_STORAGE_KEY = "fe-locale"
export const FE_LOCALE_COOKIE_KEY = "fe-locale"

export const FE_GLOSSARY = [
  "Action Centre",
  "Tender Management",
  "Intelligence Panel",
  "Compass Logistics Procurement",
  "No History",
] as const

export function isFeLocale(value: unknown): value is FeSelectableLocale {
  return value === "en" || value === "de"
}

export function asFeLocale(value: unknown): FeSelectableLocale {
  return isFeLocale(value) ? value : "en"
}

export function htmlLangForProduct(_product: ProductId, locale: string): string {
  return locale === "de" ? "de-DE" : "en-GB"
}

export function glossaryForTenant(_tenant?: string): readonly string[] {
  return FE_GLOSSARY
}

export function isAppLocaleOrFe(value: unknown): value is AppLocale {
  return isAppLocale(value)
}
