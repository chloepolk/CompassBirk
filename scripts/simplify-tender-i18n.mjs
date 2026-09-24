import fs from "node:fs"
const file = "src/app/prototype/future-energy/_i18n/tender.ts"
let t = fs.readFileSync(file, "utf8")
t = t.replace(
  /export function resolveLocalizedQuantity[\s\S]*?\n\}/,
  `export function resolveLocalizedQuantity(prompt: string, baseSpec: ComponentSpec, _locale: Locale): string {
  const match = prompt.match(/([\\d,]+(?:\\.\\d+)?)\\s*(metres|meters|m\\b|units?|lanes?|shipments?|off\\b|sets?|pcs)/i)
  if (!match) return baseSpec.defaultQuantity
  const unit = match[2].toLowerCase().startsWith("lane")
    ? "lanes"
    : match[2].toLowerCase().startsWith("ship")
      ? "shipments"
      : match[2].toLowerCase().startsWith("m")
        ? "metres"
        : "units"
  return \`\${match[1]} \${unit}\`
}`,
)
t = t.replace(
  /export function localizedDocuments\(locale: Locale\): S7Document\[] \{[\s\S]*?\n\}/,
  `export function localizedDocuments(_locale: Locale): S7Document[] {
  return DOCUMENTS
}`,
)
t = t.replace(
  /export function localizeQuantity\(quantity: string, locale: Locale\): string \{[\s\S]*?\n\}/,
  `export function localizeQuantity(quantity: string, _locale: Locale): string {
  return quantity
}`,
)
fs.writeFileSync(file, t)
console.log("simplified tender i18n")
