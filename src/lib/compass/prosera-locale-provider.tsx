"use client"

import * as React from "react"
import { LocaleProvider, useAppLocale } from "@prosera/i18n/react"
import enFe from "@/app/prototype/future-energy/_i18n/en"
import frFe from "@/app/prototype/future-energy/_i18n/fr"
import pcEn from "@/messages/prosera-compass/en.json"
import {
  FE_LOCALE_COOKIE_KEY,
  FE_LOCALE_STORAGE_KEY,
  PC_LOCALE_STORAGE_KEY,
  fourLocaleMessages,
  htmlLangForProduct,
  type ProductId,
} from "./product-locale"

const FE_MESSAGES = fourLocaleMessages(
  enFe as unknown as Record<string, unknown>,
  frFe as unknown as Record<string, unknown>,
)
const PC_MESSAGES = fourLocaleMessages(pcEn as Record<string, unknown>)

export function FutureEnergyLocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider
      messages={FE_MESSAGES}
      storageKey={FE_LOCALE_STORAGE_KEY}
      defaultLocale="en"
      timeZone="Europe/Amsterdam"
    >
      {children}
    </LocaleProvider>
  )
}

export function CompassLocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider
      messages={PC_MESSAGES}
      storageKey={PC_LOCALE_STORAGE_KEY}
      defaultLocale="en"
      timeZone="America/New_York"
    >
      {children}
    </LocaleProvider>
  )
}

/** Keep <html lang> and the FE cookie in sync after the kit hydrates. */
export function ProductDocumentLang({ product }: { product: ProductId }) {
  const { locale } = useAppLocale()

  React.useEffect(() => {
    const lang = htmlLangForProduct(product, locale)
    document.documentElement.lang = lang
    if (product === "future-energy") {
      document.cookie = `${FE_LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`
    }
    // Kit LocaleProvider also writes document.lang ("en" / "fr") in a parent
    // effect; re-assert the BCP-47 tag after that commit.
    const id = window.setTimeout(() => {
      document.documentElement.lang = lang
    }, 0)
    return () => window.clearTimeout(id)
  }, [locale, product])

  return null
}
