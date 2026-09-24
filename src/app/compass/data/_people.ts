/* ------------------------------------------------------------------ */
/*  Employee directory — Compass Logistics Procurement roster.      */
/* ------------------------------------------------------------------ */

export type EmployeeDepartment = "Supply Chain" | "Quality" | "Legal" | "Project"

export interface Employee {
  id: string
  name: string
  role: string
  email: string
  department: EmployeeDepartment
}

export const EMPLOYEES: Employee[] = [
  {
    id: "james-calder",
    name: "Daniel Hoffmann",
    role: "Senior Project SCM Manager",
    email: "d.hoffmann@compass.example",
    department: "Supply Chain",
  },
  {
    id: "fiona-drummond",
    name: "Claire Bennett",
    role: "SCM Director",
    email: "c.bennett@compass.example",
    department: "Supply Chain",
  },
  {
    id: "priya-raghavan",
    name: "Anaya Kapoor",
    role: "Package Manager — Cables",
    email: "a.kapoor@compass.example",
    department: "Supply Chain",
  },
  {
    id: "tom-whitcombe",
    name: "Lucas Meyer",
    role: "Package Manager — Structures",
    email: "l.meyer@compass.example",
    department: "Supply Chain",
  },
  {
    id: "ingrid-solberg",
    name: "Hanne Larsen",
    role: "Lead Quality Engineer",
    email: "h.larsen@compass.example",
    department: "Quality",
  },
  {
    id: "alistair-finch",
    name: "Julian Wexford",
    role: "Senior Contracts Counsel",
    email: "j.wexford@compass.example",
    department: "Legal",
  },
  {
    id: "marcus-oyelaran",
    name: "Idris Bello",
    role: "Commercial Manager",
    email: "i.bello@compass.example",
    department: "Supply Chain",
  },
  {
    id: "elena-marchetti",
    name: "Sofia Ricci",
    role: "Vessel & Marine Assurance Lead",
    email: "s.ricci@compass.example",
    department: "Project",
  },
  {
    id: "sophie-nakamura",
    name: "Mei Tanaka",
    role: "Cost & Estimating Analyst",
    email: "m.tanaka@compass.example",
    department: "Supply Chain",
  },
  {
    id: "derek-boyle",
    name: "Owen Doyle",
    role: "Expediting & Logistics Lead",
    email: "o.doyle@compass.example",
    department: "Supply Chain",
  },
  {
    id: "rachel-ashworth",
    name: "Vanessa Cole",
    role: "Project Director",
    email: "v.cole@compass.example",
    department: "Project",
  },
  {
    id: "helen-voss",
    name: "Lena Vogt",
    role: "Cable Engineering Lead",
    email: "l.vogt@compass.example",
    department: "Project",
  },
  {
    id: "owen-brennan",
    name: "Ciaran Walsh",
    role: "Structural QA Lead",
    email: "c.walsh@compass.example",
    department: "Quality",
  },
  {
    id: "nadia-khatri",
    name: "Samira Qureshi",
    role: "Structural Engineering Lead",
    email: "s.qureshi@compass.example",
    department: "Project",
  },
  {
    id: "lars-holm",
    name: "Erik Nilsen",
    role: "Cathodic Protection QA Lead",
    email: "e.nilsen@compass.example",
    department: "Quality",
  },
  {
    id: "yasmin-okeke",
    name: "Zainab Adeyemi",
    role: "Cathodic Protection Engineer",
    email: "z.adeyemi@compass.example",
    department: "Project",
  },
  {
    id: "mateo-ruiz",
    name: "Diego Vargas",
    role: "Subsea Quality Lead",
    email: "d.vargas@compass.example",
    department: "Quality",
  },
  {
    id: "claire-penrose",
    name: "Elise Moreau",
    role: "Subsea Engineering Lead",
    email: "e.moreau@compass.example",
    department: "Project",
  },
  {
    id: "henrik-dahl",
    name: "Anders Berg",
    role: "Skagen Package Manager",
    email: "a.berg@compass.example",
    department: "Supply Chain",
  },
  {
    id: "catherine-ward",
    name: "Judith Hale",
    role: "NorthBank Project Director",
    email: "j.hale@compass.example",
    department: "Project",
  },
]

const ROLE_ALIASES: Record<string, string> = {
  "SCM Manager": "Senior Project SCM Manager",
  "Contracts Lead": "Senior Contracts Counsel",
  "Quality Lead": "Lead Quality Engineer",
  "Marine Assurance Lead": "Vessel & Marine Assurance Lead",
  "Procurement user": "Senior Project SCM Manager",
}

function normalizeRole(role: string): string {
  return ROLE_ALIASES[role] ?? role
}

export interface AssignRecommendation {
  employeeId: string
  reasoning: string
}

const PRIMARY_REASONS: Record<string, string> = {
  "Senior Project SCM Manager":
    "Daniel owns the European road-freight tender pipeline — event sequencing, ITT issue and award recommendations route through him.",
  "SCM Director":
    "Approval authority sits with Claire — ITT issue, deviations from standard terms, and award decisions above delegated limits need her sign-off.",
  "Package Manager — Cables":
    "Cable-scope packages route to Anaya — she owns supplier engagement, clarifications and bid tabulation for array cable and cable accessories.",
  "Package Manager — Structures":
    "Fabrication packages route to Lucas — he manages yard slots, fabrication surveillance and structural package delivery.",
  "Lead Quality Engineer":
    "Hanne maps QA-MAN-2026-EPCI obligations onto each package — standards applicability, ITP review and FAT witness planning are hers.",
  "Senior Contracts Counsel":
    "Julian owns liability and indemnity language — knock-for-knock terms, charter flow-downs and any deviation from S7-SCM-TC-2026.",
  "Commercial Manager":
    "Idris runs the commercial evaluation — pricing schedules, bid normalisation and savings attribution against package budgets.",
  "Vessel & Marine Assurance Lead":
    "Sofia covers everything vessel-side — charter interfaces, marine warranty surveyor requirements and DP assurance for installation scopes.",
  "Cost & Estimating Analyst":
    "Mei holds the should-cost models — budget baselines and bid-versus-estimate variance analysis come from her desk.",
  "Expediting & Logistics Lead":
    "Owen tracks supplier milestones after award — expediting, shipping documentation and DDP delivery into the mobilisation port.",
  "Project Director":
    "Vanessa is the programme-level escalation point when a package threatens the installation schedule.",
  "Cable Engineering Lead":
    "Lena owns 66 kV electrical compatibility — conductor metal, termination and loss checks sit with cable engineering.",
  "Structural QA Lead":
    "Ciaran owns flange inspection close-out before a transition-piece match can be approved from inventory.",
  "Structural Engineering Lead":
    "Samira owns geometry and transfer decisions on spare structural items that are not an exact match.",
  "Cathodic Protection QA Lead":
    "Erik owns batch-release evidence for sacrificial anodes before they can be counted as usable.",
  "Cathodic Protection Engineer":
    "Zainab recalculates design life when anode mass differs from the specified 225 kg unit.",
  "Subsea Quality Lead":
    "Diego reviews certificates and preservation records on J-tube seals before inventory use is approved.",
  "Subsea Engineering Lead":
    "Elise confirms adaptor and centralizer fit when J-tube inside diameter differs from the specified 375 mm.",
  "Skagen Package Manager":
    "Anders reviews whether reserved capacity on an incumbent contract can transfer into the new event.",
  "NorthBank Project Director":
    "Judith owns NorthBank repair-contingency stock and must record whether a reserved lot can be released.",
}

const RELATED_ASSIGN: Record<string, { role: string; reason: string }> = {
  "Senior Project SCM Manager": {
    role: "SCM Director",
    reason:
      "Claire's approval is needed before the ITT can issue — routing to her early keeps the 21-day tender window intact.",
  },
  "Package Manager — Cables": {
    role: "Lead Quality Engineer",
    reason:
      "Hanne should confirm the standards applicability before the technical scope is locked — cable packages carry API Spec 17J cross-references.",
  },
  "Package Manager — Structures": {
    role: "Lead Quality Engineer",
    reason:
      "Structural packages need Hanne's EN 10204 traceability and NORSOK coating requirements confirmed before the ITT issues.",
  },
  "Vessel & Marine Assurance Lead": {
    role: "Senior Contracts Counsel",
    reason:
      "Vessel-adjacent scopes need Julian's review — charter knock-for-knock terms must flow down without contradiction.",
  },
  "Commercial Manager": {
    role: "Cost & Estimating Analyst",
    reason:
      "Mei's should-cost model is the baseline for bid normalisation — pair her with Idris before tabulation starts.",
  },
  "SCM Director": {
    role: "Project Director",
    reason:
      "Vanessa should be sighted where the package affects the installation schedule or programme-level commitments.",
  },
}

const FALLBACK_REASON =
  "No assigned owner for this role in the directory — Daniel is the default lead for cross-package logistics actions."

/** Compass assignee recommendations for a package's accountable role. */
export function getAssignRecommendations(ownerRole: string): AssignRecommendation[] {
  const role = normalizeRole(ownerRole)
  const recs: AssignRecommendation[] = []
  const primary = EMPLOYEES.find((e) => e.role === role)

  if (primary) {
    recs.push({
      employeeId: primary.id,
      reasoning: PRIMARY_REASONS[role] ?? `Compass recommends ${primary.name} as the accountable owner for this action.`,
    })
  }

  const related = RELATED_ASSIGN[role]
  if (related) {
    const secondary = EMPLOYEES.find((e) => e.role === related.role)
    if (secondary && secondary.id !== primary?.id) {
      recs.push({ employeeId: secondary.id, reasoning: related.reason })
    }
  }

  if (!primary) {
    const fallback = EMPLOYEES.find((e) => e.role === "Senior Project SCM Manager")
    if (fallback) {
      recs.push({ employeeId: fallback.id, reasoning: FALLBACK_REASON })
    }
  }

  return recs
}

export function employeeByRole(role: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.role === normalizeRole(role))
}

export function employeeById(id: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.id === id)
}

export function employeeByName(name: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.name === name)
}

export function filterEmployees(query: string): Employee[] {
  const q = query.trim().toLowerCase()
  if (!q) return EMPLOYEES
  return EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q),
  )
}
