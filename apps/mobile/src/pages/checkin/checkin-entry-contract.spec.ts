import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.vue", import.meta.url), "utf8");

describe("demo check-in entry", () => {
  it("opens the dedicated challenge detail route with the tenant context", () => {
    expect(source).toContain("/pages/checkin/detail?id=");
    expect(source).toContain("withTenantCode(");
    expect(source).not.toContain("/pages/activity/detail?id=${id}");
  });

  it("keeps the demo state explicit and locally testable", () => {
    expect(source).toContain("当前为本地演示任务");
    expect(source).toContain("完成进度会保存在当前设备");
  });
});
