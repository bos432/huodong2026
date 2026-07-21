import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const target = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null;
if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  throw new Error("Usage: node scripts/generate-delivery-manifest.mjs <candidate-directory>");
}

function listFiles(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile() && entry.name !== "MANIFEST.txt") files.push(absolute);
    }
  }
  return files.sort((a, b) => a.localeCompare(b, "en"));
}

const lines = listFiles(target).map((file) => {
  const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
  const relative = path.relative(target, file).replace(/\\/g, "/");
  return `${hash}  ${relative}`;
});

const manifestPath = path.join(target, "MANIFEST.txt");
fs.writeFileSync(manifestPath, `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ status: "ok", manifest: manifestPath, files: lines.length }, null, 2));
