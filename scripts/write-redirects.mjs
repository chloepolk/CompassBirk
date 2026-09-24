import fs from "fs"
import path from "path"

const ROOT = process.cwd()

function rm(rel) {
  const p = path.join(ROOT, rel)
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
}

rm("src/app/prototype/future-energy")
rm("src/app/api/future-energy")

function write(rel, contents) {
  const p = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, contents)
}

write(
  "src/app/prototype/page.tsx",
  `import { redirect } from "next/navigation"

export default function PrototypeRedirect() {
  redirect("/")
}
`,
)

write(
  "src/app/prototype/future-energy/page.tsx",
  `import { redirect } from "next/navigation"

export default function LegacyPrototypeRedirect() {
  redirect("/")
}
`,
)

write(
  "src/app/compass/page.tsx",
  `import { redirect } from "next/navigation"

export default function CompassAliasRedirect() {
  redirect("/")
}
`,
)

write(
  "src/app/api/future-energy/[...path]/route.ts",
  `import { NextRequest } from "next/server"

function forward(req: NextRequest, path: string[]) {
  const url = req.nextUrl.clone()
  url.pathname = "/api/compass/" + path.join("/")
  return Response.redirect(url, 307)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path)
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path)
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path)
}
`,
)

if (fs.existsSync(path.join(ROOT, "docs/future-energy/Future_Energy_Procurement_Demand_Validation_Requirements.txt"))) {
  rm("docs/future-energy/Future_Energy_Procurement_Demand_Validation_Requirements.txt")
}

console.log("old impl removed; redirects written")
