import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "apps", "mobile", "src");
const forbidden = [
  { expression: /\bIntl\b/, name: "Intl" },
  { expression: /\.toLocale(?:String|DateString|TimeString)\s*\(/, name: "toLocale*" }
];

function filesAt(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesAt(fullPath);
    return /\.(?:ts|vue)$/.test(entry.name) ? [fullPath] : [];
  });
}

const failures = [];
for (const file of filesAt(sourceRoot)) {
  const content = fs.readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.expression.test(content)) failures.push(`${path.relative(root, file)}: ${rule.name}`);
  }
}

if (failures.length) {
  console.error("Mobile runtime compatibility check failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Mobile runtime compatibility check passed.");
