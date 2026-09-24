import fs from "node:fs"
const file = "src/app/prototype/future-energy/_store.tsx"
let t = fs.readFileSync(file, "utf8")
t = t.replace(
  /case "operating-loop": return "Action Centre[\s\S]*?default: return "Supply chain management workspace[\s\S]*?"/,
  `case "operating-loop": return "Action Centre — the live tender pipeline for European road-freight sourcing, where packages move through 5 gates (Scoped → Specified → Approved → Issued → Awarded), each with an accountable owner, bid deadline and value target"
    case "tender-studio": return "Tender Management — the ITT drafting workspace: controlled logistics specifications, SLA, qualification and contract terms, plus the multi-agent pipeline that assembles, audits and renders an Invitation to Tender"
    case "bid-evaluation": return "Bid Evaluation — tabulated carrier returns with qualification gates (insurance, due diligence, data integration) and weighted scoring, including matrix, cards and award recommendations"
    default: return "Compass Logistics Procurement workspace covering Action Centre, Tender Management and Bid Evaluation"`,
)
fs.writeFileSync(file, t)
console.log("page context", t.includes("Meridian") ? "still has Meridian" : "Meridian gone")
