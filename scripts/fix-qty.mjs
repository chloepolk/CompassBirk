import fs from "node:fs"
const file = "src/app/prototype/future-energy/_i18n/tender.ts"
let t = fs.readFileSync(file, "utf8")
t = t.replace(
  `    const match = prompt.match(/([\\d,]+(?:\\.\\d+)?)\\s*(metres|meters|m\\b|units?|off\\b|sets?|pcs)/i)
    return match ? \`\${match[1]} \${match[2].toLowerCase().startsWith("m") ? "metres" : "units"}\` : baseSpec.defaultQuantity`,
  `    const match = prompt.match(/([\\d,]+(?:\\.\\d+)?)\\s*(metres|meters|m\\b|units?|lanes?|shipments?|off\\b|sets?|pcs)/i)
    if (!match) return baseSpec.defaultQuantity
    const unit = match[2].toLowerCase().startsWith("lane")
      ? "lanes"
      : match[2].toLowerCase().startsWith("ship")
        ? "shipments"
        : match[2].toLowerCase().startsWith("m")
          ? "metres"
          : "units"
    return \`\${match[1]} \${unit}\``,
)
fs.writeFileSync(file, t)
console.log("qty ok", t.includes("lanes?"))
