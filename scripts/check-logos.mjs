import fs from "fs"

for (const f of ["logo-light.svg", "logo-dark.svg"]) {
  const s = fs.readFileSync(`public/future-energy/${f}`, "utf8")
  const id = (s.match(/id="[^"]*Logo"/) || [])[0]
  const fills = [...s.matchAll(/fill="([^"]+)"/g)].map((m) => m[1])
  console.log(f, id, fills)
}
