import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(__dirname, "../../../scripts/browser-online-showcase-acceptance.cjs"), "utf8");

describe("browser acceptance role configuration", () => {
  it("supports tenant-specific core role accounts", () => {
    for (const key of ["SHOWCASE_OPS_USERNAME", "SHOWCASE_FINANCE_USERNAME", "SHOWCASE_CHECKIN_USERNAME"]) {
      expect(source).toContain(`process.env.${key}`);
    }
    expect(source).not.toContain('loginAdminUi(browser, "showcase_finance"');
    expect(source).not.toContain('loginAdminUi(browser, "showcase_checkin"');
    expect(source).not.toContain('loginAdminApi("showcase_finance"');
  });

  it("allows local runs to skip unavailable store-only roles explicitly", () => {
    expect(source).toContain("ACCEPTANCE_SKIP_STORE_ROLES");
    expect(source).toContain("已显式跳过店铺负责人和店铺财务角色");
  });

  it("treats an unconfigured optional ad slot as an explicit warning", () => {
    expect(source).toContain("当前租户未配置首页广告位");
    expect(source).toContain("publicAd.resolvedImageUrl");
  });
});
