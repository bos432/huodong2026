import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("external worker schedule ownership", () => {
  it("guards every API-owned scheduler when the worker is external", () => {
    for (const path of [
      "src/modules/admin/admin.service.ts",
      "src/modules/mall/mall.service.ts",
      "src/modules/reliability/automatic-sms.service.ts",
      "src/modules/reliability/automatic-wechat.service.ts",
      "src/modules/reliability/post-event-automation.service.ts",
      "src/modules/v1/v1.service.ts"
    ]) {
      expect(read(path), path).toContain("externalWorkerOwnsSchedules");
    }
  });

  it("keeps handler registration available to the external worker", () => {
    expect(read("src/modules/reliability/business-job.service.ts")).toContain('processRole !== "worker"');
    expect(read("src/modules/reliability/automatic-sms.service.ts")).toContain('this.businessJobs.register(JOB_TYPE');
    expect(read("src/modules/reliability/automatic-wechat.service.ts")).toContain('this.jobs.register(JOB_TYPE');
  });
});
