"use client"

import * as React from "react"
import { TooltipProvider } from "@/components/ui/prosera/tooltip"
import { AcmeDemoStoreProvider } from "./_store"
import { LayoutShell } from "./_shell"
import { CompassMotionStyles } from "./_components/motion"
import { CompassLocaleProvider, ProductDocumentLang } from "@/lib/compass/prosera-locale-provider"

export default function CompassClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompassLocaleProvider>
      <TooltipProvider>
        <AcmeDemoStoreProvider>
          <ProductDocumentLang product="compass-logistics" />
          <CompassMotionStyles />
          <LayoutShell>{children}</LayoutShell>
        </AcmeDemoStoreProvider>
      </TooltipProvider>
    </CompassLocaleProvider>
  )
}
