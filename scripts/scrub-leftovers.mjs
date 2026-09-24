import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}
function write(rel, text) {
  fs.writeFileSync(path.join(ROOT, rel), text)
  console.log("wrote", rel)
}

// --- tenders: drop involvesVessel ---
{
  let t = read("src/app/compass/data/_tenders.ts")
  t = t.replace(/\n  involvesVessel: boolean/, "")
  t = t.replace(/\n    involvesVessel: false,/g, "")
  write("src/app/compass/data/_tenders.ts", t)
}

// --- APIs: drop vessel/charter ---
{
  let t = read("src/app/api/compass/scope/route.ts")
  t = t.replace(
    `\nVessel operations involved: \${spec.involvesVessel ? "yes — charter flow-downs apply" : "no"}`,
    "",
  )
  write("src/app/api/compass/scope/route.ts", t)
}
{
  let t = read("src/app/api/compass/specialist/legal/route.ts")
  t = t.replace(/\n    const charter = documentById\("supplytime-2026-charter"\)/, "")
  t = t.replace(
    `Vessel / offshore installation operations involved: \${spec.involvesVessel ? "YES — charter flow-downs apply" : "NO — standard procurement terms only"}.\n\n`,
    "",
  )
  t = t.replace(
    `\${spec.involvesVessel ? \`\\nEXECUTED CHARTER PARTY (source of truth for flow-downs):\\n\${charter?.fullText ?? ""}\` : ""}\n\n`,
    "",
  )
  t = t.replace(
    "Assemble Section 4.0 Commercial & Maritime Legal Terms.",
    "Assemble Section 4.0 Commercial & Legal Terms.",
  )
  write("src/app/api/compass/specialist/legal/route.ts", t)
}
{
  let t = read("src/app/api/compass/audit/route.ts")
  t = t.replace(/\n    const charter = documentById\("supplytime-2026-charter"\)/, "")
  t = t.replace(
    `\${spec.involvesVessel ? \`\\n[4] \${charter?.docRef}:\\n\${charter?.fullText ?? ""}\` : ""}\n\n`,
    "",
  )
  write("src/app/api/compass/audit/route.ts", t)
}

// --- data-grounded language ---
{
  let t = read("src/lib/compass/data-grounded-language.ts")
  t = t.replace("BluePilot and any Compass-generated copy", "Compass-generated copy")
  t = t.replace('export const DATA_GROUNDED_PRODUCT_NAME = "BluePilot"', 'export const DATA_GROUNDED_PRODUCT_NAME = "Compass"')
  t = t.replace("every BluePilot / specialist", "every Compass / specialist")
  t = t.replace(/GLOSSARY \(defined product terms, not generated copy\): BluePilot, /g, "GLOSSARY (defined product terms, not generated copy): Compass, ")
  t = t.replace("GLOSSAR: BluePilot, Intelligence Panel", "GLOSSAR: Compass, Intelligence Panel")
  const frStart = t.indexOf("/** @deprecated Kept so language-contract checks")
  const frEnd = t.indexOf("/**\n * American English counterpart")
  if (frStart >= 0 && frEnd > frStart) {
    t = t.slice(0, frStart) + t.slice(frEnd)
  }
  write("src/lib/compass/data-grounded-language.ts", t)
}

// --- award governance: drop FR block, retitle impact ---
{
  let t = read("src/lib/compass/award-governance.ts")
  t = t.replace('bluePilotImpact: "BluePilot impact"', 'bluePilotImpact: "Compass impact"')
  const frStart = t.indexOf("  fr: {")
  const frEnd = t.indexOf("} as const")
  if (frStart >= 0 && frEnd > frStart) {
    t = t.slice(0, frStart).replace(/,\n$/, "\n") + t.slice(frEnd)
    t = t.replace(/,\n} as const/, "\n} as const")
  }
  t = t.replace(
    'locale === "de" ? `${abs} au-dessus de l’offre recommandée`',
    'locale === "de" ? `${abs} über dem empfohlenen Angebot`',
  )
  t = t.replace(
    'locale === "de" ? `${abs} en dessous de l’offre recommandée`',
    'locale === "de" ? `${abs} unter dem empfohlenen Angebot`',
  )
  t = t.replace(
    'locale === "de" ? "même prix que l’offre recommandée"',
    'locale === "de" ? "gleicher Preis wie das empfohlene Angebot"',
  )
  write("src/lib/compass/award-governance.ts", t)
}

// --- store error strings ---
{
  let t = read("src/app/compass/_store.tsx")
  t = t.replace(
    '"BluePilot indisponible â€” configurez OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY dans Vercel"',
    '"Compass nicht verfügbar — OPENAI_API_KEY, GEMINI_API_KEY oder ANTHROPIC_API_KEY konfigurieren"',
  )
  t = t.replace(
    '"BluePilot unavailable â€” configure OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY in Vercel"',
    '"Compass unavailable — configure OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY"',
  )
  t = t.replace(
    '"Ã‰chec de lâ€™orchestration BluePilot â€” utilisation de lâ€™analyse statique"',
    '"Compass-Orchestrierung fehlgeschlagen — statische Analyse wird verwendet"',
  )
  t = t.replace(
    '"BluePilot orchestration failed â€” using static analysis"',
    '"Compass orchestration failed — using static analysis"',
  )
  t = t.replace('console.warn("[BluePilot] Verifier error:"', 'console.warn("[Compass] Verifier error:"')
  t = t.replace('"Erreur du pipeline BluePilot"', '"Fehler in der Compass-Pipeline"')
  t = t.replace(
    '"Impossible de se connecter Ã  BluePilot. Veuillez rÃ©essayer."',
    '"Verbindung zu Compass nicht möglich. Bitte erneut versuchen."',
  )
  t = t.replace('"Unable to connect to BluePilot. Please try again."', '"Unable to connect to Compass. Please try again."')
  write("src/app/compass/_store.tsx", t)
}

// --- people / prompts / bid-scoring comments ---
{
  let t = read("src/app/compass/data/_people.ts")
  t = t.replace("/** BluePilot assignee recommendations", "/** Compass assignee recommendations")
  t = t.replace("`BluePilot recommends ${primary.name}", "`Compass recommends ${primary.name}")
  write("src/app/compass/data/_people.ts", t)
}
{
  let t = read("src/app/compass/agents/_prompts.ts")
  t = t.replace("BluePilot for Compass Logistics Procurement", "Compass Logistics Procurement")
  t = t.replace(
    '"involvesVessel", "savingsTarget", "techCompliancePts"). Translate them into business language ("vessel-side scope", "savings target", "technical conformity points")',
    '"savingsTarget", "techCompliancePts"). Translate them into business language ("savings target", "technical conformity points")',
  )
  write("src/app/compass/agents/_prompts.ts", t)
}
{
  let t = read("src/app/compass/data/_bid-scoring.ts")
  t = t.replace("ITT-MER-SCM-2101 model", "RFP-2026-001 model")
  write("src/app/compass/data/_bid-scoring.ts", t)
}

// --- examples BluePilot in kit prompts (generic Northwind) ---
{
  let t = read("src/lib/compass/example-domain.ts")
  t = t.replace(/You are BluePilot/g, "You are Compass")
  t = t.replace("You are BluePilot's scenario", "You are Compass's scenario")
  write("src/lib/compass/example-domain.ts", t)
}

// --- engine console tags ---
{
  let t = read("src/lib/compass/engine/llm.ts")
  t = t.replaceAll("[BluePilot]", "[Compass]")
  t = t.replaceAll("[BluePilot Chat]", "[Compass Chat]")
  t = t.replaceAll("[BluePilot Agent Error]", "[Compass Agent Error]")
  write("src/lib/compass/engine/llm.ts", t)
}

console.log("scrub-leftovers pass 1 done")
