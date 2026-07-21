import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const requested = process.argv[2];

function candidateVersion(name) {
  const match = name.match(/^candidate-\d{8}-r(\d+)$/);
  return match ? Number(match[1]) : -1;
}

function latestSource() {
  const delivery = path.join(root, "delivery");
  const candidate = fs.readdirSync(delivery, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && candidateVersion(entry.name) >= 0 && fs.existsSync(path.join(delivery, entry.name, "source")))
    .sort((a, b) => candidateVersion(b.name) - candidateVersion(a.name))[0];
  if (!candidate) throw new Error("No candidate source tree found.");
  return path.join(delivery, candidate.name, "source");
}

const sourceDir = requested ? path.resolve(root, requested) : latestSource();
if (!fs.existsSync(path.join(sourceDir, "package.json"))) throw new Error(`Invalid candidate source tree: ${sourceDir}`);
if (fs.existsSync(path.join(sourceDir, "deploy", ".env.production"))) throw new Error("Candidate source must not contain deploy/.env.production");

const command = process.platform === "win32" ? "cmd.exe" : "npm";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run test:preflight-guards"] : ["run", "test:preflight-guards"];
const result = spawnSync(command, args, {
  cwd: sourceDir,
  env: { ...process.env, PREFLIGHT_ALLOW_ENV_TEMPLATE_ONLY: "true" },
  encoding: "utf8",
  windowsHide: true,
  stdio: "inherit"
});
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status || 1;
else console.log(`OK   candidate source preflight passed: ${path.relative(root, sourceDir).replace(/\\/g, "/")}`);
