import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.vue", import.meta.url), "utf8");

describe("city journal entry", () => {
  it("opens the dedicated challenge detail route with the tenant context", () => {
    expect(source).toContain("/pages/checkin/detail?id=");
    expect(source).toContain("withTenantCode(");
    expect(source).not.toContain("/pages/activity/detail?id=${id}");
  });

  it("describes account saving without claiming activity participation", () => {
    expect(source).toContain("登录后将文字和照片收进自己的账号");
    expect(source).toContain("不会生成真实活动记录");
    expect(source).not.toContain("完成进度会保存在当前设备");
  });
});
