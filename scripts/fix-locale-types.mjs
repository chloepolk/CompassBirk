import fs from "node:fs"

const files = [
  [
    "src/app/prototype/future-energy/_components/hub/portfolio-ledger.tsx",
    (t) => {
      if (!t.includes("type { Locale }") && !t.includes("type { Locale,")) {
        t = t.replace(
          `import { formatCompactEur, formatMultiple } from "../../_i18n/currency"`,
          `import { formatCompactEur, formatMultiple } from "../../_i18n/currency"
import type { Locale } from "../../_i18n"`,
        )
      }
      return t.replace('locale: "en" | "fr" = "en"', 'locale: Locale = "en"')
    },
  ],
  [
    "src/app/prototype/future-energy/_components/hub/action-completion-timeline.tsx",
    (t) => t.replaceAll('"en" | "fr"', "Locale"),
  ],
  [
    "src/app/prototype/future-energy/_components/hub/bidder-notify-modal.tsx",
    (t) => t.replaceAll('"en" | "fr"', "Locale"),
  ],
]

for (const [file, fn] of files) {
  const next = fn(fs.readFileSync(file, "utf8"))
  fs.writeFileSync(file, next)
  console.log("fixed", file)
}
