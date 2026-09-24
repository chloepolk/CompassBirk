"use client"

import * as React from "react"
import Home from "../page"

/** Hidden operator harness. Never labelled as a product stage. */
export default function OperatorPage() {
  React.useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get("operator") !== "1") {
      url.searchParams.set("operator", "1")
      window.history.replaceState({}, "", url)
    }
  }, [])
  return <Home />
}
