import fs from "node:fs";
import path from "node:path";

const roots = [
  "apps/admin/src",
  "apps/api/src",
  "apps/mobile/src",
  "packages/shared/src"
];

const extensions = new Set([".js", ".json", ".mjs", ".ts", ".tsx", ".vue"]);
const copyChecks = [
  {
    label: "high-risk charity wording",
    phrases: ["公开募捐", "捐款认领", "募捐目标", "用户捐赠认领"]
  },
  {
    label: "incorrect brand wording",
    phrases: ["电召", "七维文化", "奇外"]
  }
];
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;
    const source = fs.readFileSync(fullPath, "utf8");
    for (const check of copyChecks) {
      for (const phrase of check.phrases) {
        if (source.includes(phrase)) failures.push(`${fullPath} contains ${check.label}: ${phrase}`);
      }
    }
  }
}

for (const root of roots) walk(root);

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   copy risk guard found no high-risk fundraising wording or incorrect brand wording.");
}
