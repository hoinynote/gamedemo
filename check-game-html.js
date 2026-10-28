const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate HTML IDs: ${duplicates.join(", ")}`);
for (const id of ["auth-screen", "start-button", "local-preview-button", "menu-screen", "sign-out-button"]) {
  if (!ids.includes(id)) throw new Error(`Missing required HTML ID: ${id}`);
}
console.log(`Validated ${ids.length} unique HTML IDs.`);
