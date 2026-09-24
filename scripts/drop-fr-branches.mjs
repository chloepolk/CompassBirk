import fs from "node:fs"

function rewrite(file, fn) {
  const text = fs.readFileSync(file, "utf8")
  const next = fn(text)
  fs.writeFileSync(file, next)
  console.log("updated", file)
}

rewrite("src/app/prototype/future-energy/_i18n/domain.ts", (t) =>
  t
    .replace(
      `export function localizedTenderPackages(locale: Locale): TenderPackage[] {
  if (locale !== "fr") return TENDER_PACKAGES
  return TENDER_PACKAGES.map((pkg) => ({ ...pkg, ...FR_PACKAGES[pkg.id] }))
}`,
      `export function localizedTenderPackages(_locale: Locale): TenderPackage[] {
  return TENDER_PACKAGES
}`,
    )
    .replace(
      `export function localizedClosedPackages(locale: Locale): ClosedPackage[] {
  if (locale !== "fr") return CLOSED_PACKAGES
  return CLOSED_PACKAGES.map((pkg) => ({ ...pkg, name: FR_CLOSED_NAMES[pkg.id] ?? pkg.name }))
}`,
      `export function localizedClosedPackages(_locale: Locale): ClosedPackage[] {
  return CLOSED_PACKAGES
}`,
    ),
)

rewrite("src/app/prototype/future-energy/_i18n/tender.ts", (t) =>
  t
    .replaceAll('if (locale !== "fr")', "if (true)")
    .replace('if (locale !== "fr") return DOCUMENTS', "if (true) return DOCUMENTS"),
)

rewrite("src/app/prototype/future-energy/_store.tsx", (t) =>
  t.replace('formatTenderQty(req.requestedQty, req.uom, "fr")', 'formatTenderQty(req.requestedQty, req.uom, "de")'),
)

rewrite("src/app/prototype/future-energy/_i18n/legacy.ts", (t) =>
  t.replace(
    `export function localizeLegacyCopy(text: string, locale: Locale): string {
  if (locale !== "fr" || !text) return text`,
    `export function localizeLegacyCopy(text: string, _locale: Locale): string {
  if (!text) return text`,
  ).replace(
    `  const exact = FR[text]
  if (exact) return exact`,
    `  return text
  const exact = FR[text]
  if (exact) return exact`,
  ),
)
