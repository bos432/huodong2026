import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { isWorkerHeartbeatReady, projectRootFrom, readWorkerHeartbeat, workerHeartbeatAgeMs, workerHeartbeatFile, writeWorkerHeartbeat } from "./worker-heartbeat";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("worker heartbeat", () => {
  it("writes atomically and reports a fresh worker as ready", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "activity-worker-"));
    temporaryDirectories.push(directory);
    const env = { WORKER_HEARTBEAT_FILE: path.join(directory, "heartbeat.json") };
    const now = Date.parse("2026-08-25T10:00:00.000Z");
    const heartbeat = { status: "ready" as const, pid: 123, workerId: "worker-a", heartbeatAt: new Date(now).toISOString(), startedAt: new Date(now - 1000).toISOString(), commit: "test" };
    writeWorkerHeartbeat(heartbeat, env);
    const saved = readWorkerHeartbeat(env);
    expect(saved).toEqual(heartbeat);
    expect(workerHeartbeatAgeMs(saved, now)).toBe(0);
    expect(isWorkerHeartbeatReady(saved, 90_000, now)).toBe(true);
  });

  it("treats missing, stopped and stale heartbeats as not ready", () => {
    const missing = { WORKER_HEARTBEAT_FILE: path.join(os.tmpdir(), "activity-worker-missing-heartbeat.json") };
    expect(isWorkerHeartbeatReady(readWorkerHeartbeat(missing))).toBe(false);
    const now = Date.parse("2026-08-25T10:00:00.000Z");
    const stale = { status: "ready" as const, pid: 123, workerId: "worker-a", heartbeatAt: new Date(now - 90_001).toISOString(), startedAt: new Date(now - 1000).toISOString(), commit: "test" };
    expect(isWorkerHeartbeatReady(stale, 90_000, now)).toBe(false);
    expect(isWorkerHeartbeatReady({ ...stale, status: "stopping" }, 90_000, now)).toBe(false);
  });

  it("uses the repository runtime directory when launched from apps/api", () => {
    const previous = process.cwd();
    const repositoryRoot = projectRootFrom(previous);
    expect(projectRootFrom(path.resolve(repositoryRoot, "apps", "api"))).toBe(repositoryRoot);
    expect(path.resolve(repositoryRoot, "runtime", "activity-worker-heartbeat.json")).toBe(workerHeartbeatFile());
  });

  it("normalizes a configured relative path to the repository root", () => {
    const previous = process.cwd();
    expect(workerHeartbeatFile({ WORKER_HEARTBEAT_FILE: "runtime/local-worker.json" })).toBe(path.resolve(projectRootFrom(previous), "runtime", "local-worker.json"));
  });
});
