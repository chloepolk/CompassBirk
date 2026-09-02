"use client"

import * as React from "react"
import { TooltipProvider } from "@/components/ui/prosera/tooltip"
import { AcmeDemoStoreProvider } from "./_store"
import { LayoutShell } from "./_shell"
import { CompassMotionStyles } from "./_components/motion"
import { FutureEnergyLocaleProvider, ProductDocumentLang } from "@/lib/compass/prosera-locale-provider"

export default function FutureEnergyClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <FutureEnergyLocaleProvider>
      <TooltipProvider>
        <AcmeDemoStoreProvider>
          <ProductDocumentLang product="future-energy" />
          <CompassMotionStyles />
          <LayoutShell>{children}</LayoutShell>
        </AcmeDemoStoreProvider>
      </TooltipProvider>
    </FutureEnergyLocaleProvider>
  )
}
