import fs from "node:fs";
import path from "node:path";

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
const startedAt = Date.now();

function readHeartbeat() {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

while (Date.now() - startedAt <= timeoutMs) {
  const heartbeat = readHeartbeat();
  const timestamp = Date.parse(String(heartbeat?.heartbeatAt || ""));
  const age = Number.isFinite(timestamp) ? Date.now() - timestamp : Number.POSITIVE_INFINITY;
  if (heartbeat?.status === "ready" && age >= 0 && age <= maxAgeMs) {
    console.log(`OK worker ready: ${heartbeat.workerId || heartbeat.pid} heartbeat=${heartbeat.heartbeatAt}`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error(`Worker is not ready within ${timeoutMs}ms: ${file}`);
process.exit(1);
