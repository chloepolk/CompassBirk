import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "src")
const SKIP = /node_modules|\.next/

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (SKIP.test(p)) continue
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p)
  }
  return acc
}

const files = walk(root)
let changed = 0
for (const file of files) {
  let s = readFileSync(file, "utf8")
  const orig = s
  s = s.replaceAll('locale === "fr"', 'locale === "de"')
  s = s.replaceAll("locale === 'fr'", "locale === 'de'")
  s = s.replaceAll('loc === "fr"', 'loc === "de"')
  s = s.replaceAll('id: "fr" as const', 'id: "de" as const')
  s = s.replaceAll('label: "FR"', 'label: "DE"')
  s = s.replaceAll('=== "fr" ? "fr"', '=== "de" ? "de"')
  s = s.replaceAll('value === "fr"', 'value === "de"')
  s = s.replaceAll('raw === "fr"', 'raw === "de"')
  s = s.replaceAll('? "fr" : "en"', '? "de" : "en"')
  s = s.replaceAll('=== "fr" ? "fr-FR"', '=== "de" ? "de-DE"')
  s = s.replaceAll('locale === "fr" ? "fr"', 'locale === "de" ? "de"')
  s = s.replaceAll('window.localStorage.getItem("fe-locale") === "fr" ? "fr"', 'window.localStorage.getItem("fe-locale") === "de" ? "de"')
  s = s.replaceAll('getItem("fe-locale") === "fr" ? "fr-FR"', 'getItem("fe-locale") === "de" ? "de-DE"')
  if (s !== orig) {
    writeFileSync(file, s)
    changed += 1
    console.log("updated", file.replace(root, "src"))
  }
}
console.log("files changed", changed)
