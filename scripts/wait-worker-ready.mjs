import fs from "node:fs";
import path from "node:path";
import { releaseIdentifiersMatch } from "./release-metadata.mjs";

const cwd = process.cwd();
const projectRoot = fs.existsSync(path.resolve(cwd, "apps/api"))
  ? cwd
  : fs.existsSync(path.resolve(cwd, "../apps/api"))
    ? path.resolve(cwd, "..")
    : fs.existsSync(path.resolve(cwd, "../../apps/api"))
      ? path.resolve(cwd, "../..")
      : cwd;
const file = process.env.WORKER_HEARTBEAT_FILE || path.resolve(projectRoot, "runtime", "activity-worker-heartbeat.json");
const timeoutMs = Number(process.env.WORKER_READY_TIMEOUT_MS || 30_000);
const maxAgeMs = Number(process.env.WORKER_HEARTBEAT_MAX_AGE_MS || 90_000);
const expectedCommit = String(process.env.WORKER_EXPECTED_COMMIT || "").trim();
const startedAt = Date.now();

function readHeartbeat() {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

while (Date.now() - startedAt <= timeoutMs) {
  const heartbeat = readHeartbeat();
  const timestamp = Date.parse(String(heartbeat?.heartbeatAt || ""));
  const age = Number.isFinite(timestamp) ? Date.now() - timestamp : Number.POSITIVE_INFINITY;
  const commitMatches = !expectedCommit || releaseIdentifiersMatch(heartbeat?.commit, expectedCommit);
  if (heartbeat?.status === "ready" && age >= 0 && age <= maxAgeMs && commitMatches) {
    console.log(`OK worker ready: ${heartbeat.workerId || heartbeat.pid} heartbeat=${heartbeat.heartbeatAt}`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const lastHeartbeat = readHeartbeat();
const commitMessage = expectedCommit
  ? ` release.commit=${String(lastHeartbeat?.commit || "missing").trim() || "missing"}, expected=${expectedCommit}`
  : "";
console.error(`Worker is not ready within ${timeoutMs}ms: ${file}${commitMessage}`);
process.exit(1);
