import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { execFileSync } from "node:child_process"

const root = join(import.meta.dirname, "..")
const xlsx = join(root, "docs/compass-logistics/Compass_Logistics_Procurement_Synthetic_Dataset_v1.2.xlsx")
const outDir = join(root, "docs/compass-logistics/_extracted")
const tmp = join(process.env.TEMP || "/tmp", "birk-xlsx-extract")

mkdirSync(outDir, { recursive: true })
mkdirSync(tmp, { recursive: true })

const zip = join(tmp, "wb.zip")
writeFileSync(zip, readFileSync(xlsx))
try {
  execFileSync("tar", ["-xf", zip, "-C", tmp], { stdio: "ignore" })
} catch {
  execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force`], { stdio: "inherit" })
}

function parseXml(xml) {
  return xml
}

function cellRefCol(ref) {
  const letters = ref.match(/^[A-Z]+/)[0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function sheetRows(xml) {
  const rows = []
  const rowRe = /<x:c[^>]*r="([A-Z]+)(\d+)"[^>]*(?:t="([^"]*)")?[^>]*>(?:<x:v>([^<]*)<\/x:v>)?/g
  // also handle no namespace
  const re = /<c[^>]*r="([A-Z]+)(\d+)"[^>]*?(?:t="([^"]*)")?[^>]*>([\s\S]*?)<\/c>/g
  let m
  const cells = []
  const src = xml.replace(/x:/g, "")
  while ((m = re.exec(src))) {
    const col = cellRefCol(m[1] + m[2])
    const row = Number(m[2]) - 1
    const t = m[3] || ""
    const inner = m[4]
    const v = (inner.match(/<v>([^<]*)<\/v>/) || [])[1]
    const is = (inner.match(/<t[^>]*>([^<]*)<\/t>/) || [])[1]
    let value = is ?? v ?? ""
    if (t === "s") value = shared[Number(v)] ?? ""
    else if (t === "inlineStr") value = is ?? ""
    else if (v != null && v !== "" && !Number.isNaN(Number(v)) && t !== "str") {
      value = Number(v)
    }
    cells.push({ row, col, value })
  }
  let maxR = 0, maxC = 0
  for (const c of cells) {
    if (c.row > maxR) maxR = c.row
    if (c.col > maxC) maxC = c.col
  }
  for (let r = 0; r <= maxR; r++) rows[r] = Array(maxC + 1).fill("")
  for (const c of cells) rows[c.row][c.col] = c.value
  return rows
}

let shared = []
try {
  const sst = readFileSync(join(tmp, "xl/sharedStrings.xml"), "utf8")
  const src = sst.replace(/x:/g, "")
  const siRe = /<si>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(src))) {
    const texts = [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(x => x[1])
    shared.push(texts.join(""))
  }
} catch {
  shared = []
}

const wb = readFileSync(join(tmp, "xl/workbook.xml"), "utf8")
const sheets = [...wb.matchAll(/name="([^"]+)"[^>]*r:id="([^"]+)"/g)]
const rels = readFileSync(join(tmp, "xl/_rels/workbook.xml.rels"), "utf8")
const relMap = Object.fromEntries(
  [...rels.matchAll(/<Relationship\b([^>]+)\/>/g)].map((m) => {
    const id = (m[1].match(/\bId="([^"]+)"/) || [])[1]
    const target = (m[1].match(/\bTarget="([^"]+)"/) || [])[1]
    return [id, (target || "").replace(/^\//, "")]
  }),
)

const catalog = {}
for (const [, name, rid] of sheets) {
  const target = relMap[rid]
  if (!target) continue
  const path = join(tmp, target.replace(/^\//, ""))
  const xml = readFileSync(path, "utf8")
  const rows = sheetRows(xml)
  const first = (rows[0] || []).map(h => String(h || "").trim())
  const second = (rows[1] || []).map(h => String(h || "").trim())
  const firstLooksLikeTitle = first.filter(Boolean).length > 0 && new Set(first.filter(Boolean)).size <= 2
  const headerIdx = firstLooksLikeTitle && second.some(h => /_/.test(h) || h.length < 40) ? 1 : 0
  const headers = (rows[headerIdx] || []).map(h => String(h || "").trim())
  const records = rows.slice(headerIdx + 1).filter(r => r.some(c => c !== "" && c != null)).map(r => {
    const o = {}
    headers.forEach((h, i) => {
      if (h) o[h] = r[i] ?? ""
    })
    return o
  })
  catalog[name] = { headers, records, raw: rows.slice(0, 8) }
  writeFileSync(join(outDir, `${name.replace(/\s+/g, "_")}.json`), JSON.stringify({ headers, records }, null, 2))
  console.log(name, "cols:", headers.join(" | "), "rows:", records.length)
}

writeFileSync(join(outDir, "_index.json"), JSON.stringify(Object.fromEntries(
  Object.entries(catalog).map(([k, v]) => [k, { headers: v.headers, rows: v.records.length, sample: v.records[0] }]),
), null, 2))
console.log("wrote", outDir)
