import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const target = process.argv[2];
if (!target) throw new Error("Usage: node scripts/write-static-version.mjs <dist-dir> [name]");

function gitText(command, fallback) {
  try {
    return execSync(command, { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || fallback;
  } catch {
    return fallback;
  }
}

const outputDir = resolve(repoRoot, target);
const payload = {
  name: process.argv[3] || "static",
  commit: process.env.VITE_BUILD_COMMIT || process.env.BUILD_COMMIT || gitText("git rev-parse --short HEAD", "local"),
  buildTime: process.env.VITE_BUILD_TIME || process.env.BUILD_TIME || new Date().toISOString()
};

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "version.json"), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote static version: ${resolve(outputDir, "version.json")}`);
