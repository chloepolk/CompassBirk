import fs from "fs"
import path from "path"

const ROOT = process.cwd()

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  fs.cpSync(from, to, { recursive: true, force: true })
}

function rewriteFile(file, fn) {
  if (!fs.existsSync(file)) return
  const before = fs.readFileSync(file, "utf8")
  const after = fn(before)
  if (after !== before) fs.writeFileSync(file, after)
}

function rewriteTree(dir, fn) {
  for (const file of walk(dir)) {
    if (!/\.(ts|tsx|js|mjs|md|json)$/.test(file)) continue
    rewriteFile(file, fn)
  }
}

const srcFrom = path.join(ROOT, "src/app/prototype/future-energy")
const srcTo = path.join(ROOT, "src/app/compass")
const apiFrom = path.join(ROOT, "src/app/api/future-energy")
const apiTo = path.join(ROOT, "src/app/api/compass")

if (!fs.existsSync(srcFrom)) throw new Error("source app missing")
copyDir(srcFrom, srcTo)
if (fs.existsSync(apiFrom)) copyDir(apiFrom, apiTo)

const nestedData = path.join(srcTo, "data", "future-energy")
const dataDest = path.join(srcTo, "data")
if (fs.existsSync(nestedData)) {
  for (const name of fs.readdirSync(nestedData)) {
    fs.renameSync(path.join(nestedData, name), path.join(dataDest, name))
  }
  fs.rmSync(nestedData, { recursive: true, force: true })
}

function rewritePaths(text) {
  return text
    .replaceAll("@/app/prototype/future-energy/data/future-energy/", "@/app/compass/data/")
    .replaceAll("@/app/prototype/future-energy/", "@/app/compass/")
    .replaceAll("../data/future-energy/", "../data/")
    .replaceAll("./data/future-energy/", "./data/")
    .replaceAll("data/future-energy/", "data/")
    .replaceAll("/api/future-energy", "/api/compass")
    .replaceAll('tenant: "future-energy"', 'tenant: "compass-logistics"')
    .replaceAll('tenant="future-energy"', 'tenant="compass-logistics"')
}

rewriteTree(srcTo, rewritePaths)
rewriteTree(apiTo, rewritePaths)

const externals = [
  "src/app/page.tsx",
  "src/app/operator/page.tsx",
  "src/lib/compass/prosera-locale-provider.tsx",
  "src/components/ui/prosera/flight-path.tsx",
  "src/components/ActionCard.tsx",
  ...walk(path.join(ROOT, "src/app/api/acme")).map((f) => path.relative(ROOT, f)),
]
for (const rel of externals) {
  rewriteFile(path.join(ROOT, rel), rewritePaths)
}

console.log("copied app → src/app/compass")
console.log("copied api → src/app/api/compass")
console.log("flattened data/future-energy → data/")
