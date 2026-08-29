import fs from "fs";
import path from "path";

export type WorkerHeartbeatStatus = "ready" | "stopping";

export type WorkerHeartbeat = {
  status: WorkerHeartbeatStatus;
  pid: number;
  workerId: string;
  heartbeatAt: string;
  startedAt: string;
  commit: string;
};

export function workerHeartbeatFile(env: NodeJS.ProcessEnv = process.env) {
  const configured = String(env.WORKER_HEARTBEAT_FILE || "").trim();
  if (configured) return configured;
  const current = process.cwd();
  const projectRoot = fs.existsSync(path.join(current, "apps", "api"))
    ? current
    : fs.existsSync(path.join(current, "..", "apps", "api"))
      ? path.resolve(current, "..")
      : fs.existsSync(path.join(current, "..", "..", "apps", "api"))
        ? path.resolve(current, "..", "..")
        : current;
  return path.resolve(projectRoot, "runtime", "activity-worker-heartbeat.json");
}

export function writeWorkerHeartbeat(value: WorkerHeartbeat, env: NodeJS.ProcessEnv = process.env) {
  const target = workerHeartbeatFile(env);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
  return target;
}

export function readWorkerHeartbeat(env: NodeJS.ProcessEnv = process.env): WorkerHeartbeat | null {
  try {
    return JSON.parse(fs.readFileSync(workerHeartbeatFile(env), "utf8")) as WorkerHeartbeat;
  } catch {
    return null;
  }
}

export function workerHeartbeatAgeMs(value: WorkerHeartbeat | null, now = Date.now()) {
  if (!value?.heartbeatAt) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value.heartbeatAt);
  return Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : Number.POSITIVE_INFINITY;
}

export function isWorkerHeartbeatReady(value: WorkerHeartbeat | null, maxAgeMs = 90_000, now = Date.now()) {
  return value?.status === "ready" && workerHeartbeatAgeMs(value, now) <= maxAgeMs;
}
