import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PM2 worker deployment contract", () => {
  it("defines separate API and activity-worker processes with safe role defaults", async () => {
    const configPath = path.resolve(process.cwd(), "../../deploy/ecosystem.activity.cjs");
    const config = (await import(configPath)).default || (await import(configPath));
    const apps = Array.isArray(config.apps) ? config.apps : [];
    const api = apps.find((item: { name?: string }) => item.name === "activity-api");
    const worker = apps.find((item: { name?: string }) => item.name === "activity-worker");

    expect(api).toMatchObject({ name: "activity-api", script: "apps/api/dist/main.js" });
    expect(worker).toMatchObject({ name: "activity-worker", script: "apps/api/dist/worker.js" });
    expect(api.env).toMatchObject({ APP_PROCESS_ROLE: "api", BUSINESS_JOB_WORKER_MODE: "external", BUSINESS_JOB_WORKER_ENABLED: "false" });
    expect(worker.env).toMatchObject({ APP_PROCESS_ROLE: "worker", BUSINESS_JOB_WORKER_MODE: "external", BUSINESS_JOB_WORKER_ENABLED: "true" });
    expect(worker.env.WORKER_HEARTBEAT_FILE).toBe("runtime/activity-worker-heartbeat.json");
    expect(worker.port).toBeUndefined();
  });
});
