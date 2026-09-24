import fs from "node:fs"

function stripBetween(file, startNeedle, endNeedle, insert) {
  const text = fs.readFileSync(file, "utf8")
  const start = text.indexOf(startNeedle)
  const end = text.indexOf(endNeedle, start)
  if (start < 0 || end < 0) {
    console.log("miss", file, { start, end })
    return
  }
  fs.writeFileSync(file, text.slice(0, start) + insert + text.slice(end + endNeedle.length))
  console.log("stripped", file)
}

stripBetween(
  "src/app/prototype/future-energy/_pages/tender-studio.tsx",
  "\n>\n              <h2 className=\"text-[13px] font-semibold text-[var(--color-text-primary)]\">{t(\"tenderStudio.inventoryCheck\")}</h2>",
  "\n          )}\n\n          {/* Drafted tender catalogue */}",
  "\n\n          {/* Drafted tender catalogue */}",
)

stripBetween(
  "src/app/prototype/future-energy/_pages/bid-evaluation.tsx",
  "\n>\n                    <p>\n                      {t(\"tenderStudio.residualLine\"",
  "\n                )}\n              </div>\n              <div className=\"flex flex-wrap gap-1.5\">",
  "\n              </div>\n              <div className=\"flex flex-wrap gap-1.5\">",
)
