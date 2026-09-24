"use client"

import * as React from "react"
import { LocaleProvider, useAppLocale } from "@prosera/i18n/react"
import enFe from "@/app/compass/_i18n/en"
import deFe from "@/app/compass/_i18n/de"
import {
  FE_LOCALE_COOKIE_KEY,
  FE_LOCALE_STORAGE_KEY,
  fourLocaleMessages,
  htmlLangForProduct,
  type ProductId,
} from "./product-locale"

const FE_MESSAGES = fourLocaleMessages(
  enFe as unknown as Record<string, unknown>,
  deFe as unknown as Record<string, unknown>,
)

export function CompassLocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider
      messages={FE_MESSAGES}
      storageKey={FE_LOCALE_STORAGE_KEY}
      defaultLocale="en"
      timeZone="Europe/Berlin"
    >
      {children}
    </LocaleProvider>
  )
}

/** Keep <html lang> and the locale cookie in sync after the kit hydrates. */
export function ProductDocumentLang({ product }: { product: ProductId }) {
  const { locale } = useAppLocale()

  React.useEffect(() => {
    const lang = htmlLangForProduct(product, locale)
    document.documentElement.lang = lang
    document.cookie = `${FE_LOCALE_COOKIE_KEY}=${locale === "de" ? "de" : "en"}; path=/; max-age=31536000; SameSite=Lax`
    const id = window.setTimeout(() => {
      document.documentElement.lang = lang
    }, 0)
    return () => window.clearTimeout(id)
  }, [locale, product])

  return null
}
