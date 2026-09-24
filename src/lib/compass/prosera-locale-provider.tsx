"use client"

import * as React from "react"
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "./i18n-kit"
import {
  FE_LOCALE_COOKIE_KEY,
  FE_LOCALE_STORAGE_KEY,
  htmlLangForProduct,
  type ProductId,
} from "./product-locale"

type LocaleContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

function readStoredLocale(storageKey: string, fallback: AppLocale): AppLocale {
  if (typeof window === "undefined") return fallback
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (isAppLocale(stored)) return stored
  } catch {
    /* ignore */
  }
  return fallback
}

function LocaleProvider({
  children,
  storageKey = FE_LOCALE_STORAGE_KEY,
  defaultLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode
  storageKey?: string
  defaultLocale?: AppLocale
}) {
  const [locale, setLocaleState] = React.useState<AppLocale>(defaultLocale)

  React.useEffect(() => {
    const stored = readStoredLocale(storageKey, defaultLocale)
    setLocaleState(stored)
    document.documentElement.lang = htmlLangForProduct("compass-logistics", stored)
  }, [storageKey, defaultLocale])

  const setLocale = React.useCallback(
    (next: AppLocale) => {
      setLocaleState(next)
      document.documentElement.lang = htmlLangForProduct("compass-logistics", next)
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  )

  const value = React.useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useAppLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useAppLocale must be used within CompassLocaleProvider")
  }
  return ctx
}

export function CompassLocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider storageKey={FE_LOCALE_STORAGE_KEY} defaultLocale="en">
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
