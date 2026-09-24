"use client"

import { useStore } from "../_store"
import { useModuleT, type TranslateFn } from "./index"

/** Translate UI copy for the active Compass locale. */
export function useT(): TranslateFn {
  const { locale } = useStore()
  return useModuleT(locale)
}
