import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve("apps/mobile/dist/build/mp-weixin");
const files = {};
function visit(relative = "") {
  for (const item of readdirSync(join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw new Error("Release may not include symlinks");
    if (item.isDirectory()) visit(name);
    else if (item.isFile() && name !== "release-manifest.json") files[name] = createHash("sha256").update(readFileSync(join(root, name))).digest("hex");
  }
}
visit();
const manifest = JSON.stringify({ files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + "\n";
writeFileSync(join(root, "release-manifest.json"), manifest);
console.log(JSON.stringify({ files: Object.keys(files).length, manifestSha256: createHash("sha256").update(manifest).digest("hex") }));
