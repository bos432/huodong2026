import { describe, expect, it } from "vitest";
import { configureExternalBusinessWorker, externalWorkerOwnsSchedules, WORKER_DISABLED_SCHEDULE_FLAGS } from "./worker-config";

describe("external business worker configuration", () => {
  it("uses worker role and disables duplicate scheduler loops", () => {
    const env: NodeJS.ProcessEnv = {};
    configureExternalBusinessWorker(env);
    expect(env.APP_PROCESS_ROLE).toBe("worker");
    expect(env.BUSINESS_JOB_WORKER_MODE).toBe("external");
    expect(env.BUSINESS_JOB_WORKER_ENABLED).toBe("true");
    expect(env.NOTIFICATION_SCHEDULE_WORKER_ENABLED).toBe("true");
    for (const key of WORKER_DISABLED_SCHEDULE_FLAGS) {
      expect(env[key]).toBe(key.includes("INTERVAL_MINUTES") ? "0" : "false");
    }
  });

  it("does not replace an explicitly disabled business worker", () => {
    const env: NodeJS.ProcessEnv = { BUSINESS_JOB_WORKER_ENABLED: "false" };
    configureExternalBusinessWorker(env);
    expect(env.BUSINESS_JOB_WORKER_ENABLED).toBe("false");
  });

  it("marks API schedules as disabled when an external worker owns them", () => {
    expect(externalWorkerOwnsSchedules({ BUSINESS_JOB_WORKER_MODE: "external", APP_PROCESS_ROLE: "api" })).toBe(true);
    expect(externalWorkerOwnsSchedules({ BUSINESS_JOB_WORKER_MODE: "external", APP_PROCESS_ROLE: "worker" })).toBe(false);
    expect(externalWorkerOwnsSchedules({ BUSINESS_JOB_WORKER_MODE: "embedded", APP_PROCESS_ROLE: "api" })).toBe(false);
  });
});
