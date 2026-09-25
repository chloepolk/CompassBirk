"use client"

import * as React from "react"
import CompassClientLayout from "@/app/compass/client-layout"
import { useStore } from "@/app/compass/_store"
import { OperatingLoopPage } from "@/app/compass/_pages/operating-loop"
import { TenderStudioPage } from "@/app/compass/_pages/tender-studio"
import { BidEvaluationPage } from "@/app/compass/_pages/bid-evaluation"
import { Vendor360Page } from "@/app/compass/_pages/vendor-360"
import { PerformancePage } from "@/app/compass/_pages/performance"
import { InboxPage } from "@/app/compass/_pages/inbox"
import { AwardPage } from "@/app/compass/_pages/award"

function CompassPage() {
  const { activePage } = useStore()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-xl bg-muted/40" />
        <div className="h-12 rounded-lg bg-muted/30" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-muted/30" />)}
        </div>
        <div className="h-64 rounded-lg bg-muted/30" />
      </div>
    )
  }

  switch (activePage) {
    case "tender-studio":
      return <TenderStudioPage />
    case "bid-evaluation":
      return <BidEvaluationPage />
    case "vendor-360":
      return <Vendor360Page />
    case "performance":
      return <PerformancePage />
    case "inbox":
      return <InboxPage />
    case "award":
      return <AwardPage />
    default:
      return <OperatingLoopPage />
  }
}

export default function Home() {
  return (
    <CompassClientLayout>
      <CompassPage />
    </CompassClientLayout>
  )
}
