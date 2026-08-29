import { describe, expect, it } from "vitest";
import { configureExternalBusinessWorker, WORKER_DISABLED_SCHEDULE_FLAGS } from "./worker-config";

describe("external business worker configuration", () => {
  it("uses worker role and disables duplicate scheduler loops", () => {
    const env: NodeJS.ProcessEnv = {};
    configureExternalBusinessWorker(env);
    expect(env.APP_PROCESS_ROLE).toBe("worker");
    expect(env.BUSINESS_JOB_WORKER_MODE).toBe("external");
    expect(env.BUSINESS_JOB_WORKER_ENABLED).toBe("true");
    for (const key of WORKER_DISABLED_SCHEDULE_FLAGS) {
      expect(env[key]).toBe(key.includes("INTERVAL_MINUTES") ? "0" : "false");
    }
  });

  it("does not replace an explicitly disabled business worker", () => {
    const env: NodeJS.ProcessEnv = { BUSINESS_JOB_WORKER_ENABLED: "false" };
    configureExternalBusinessWorker(env);
    expect(env.BUSINESS_JOB_WORKER_ENABLED).toBe("false");
  });
});
