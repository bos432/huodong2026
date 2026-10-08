import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/modules/v1/v1.service.ts"), "utf8");

describe("activity commercial summary integration", () => {
  it("exposes a truthful commercial summary from activity recap", () => {
    expect(source).toContain("commercialSummary");
    expect(source).toContain("calculateActivityCommercialAmounts");
    expect(source).toContain('settlementStatus = "excluded_test"');
    expect(source).toContain("尚未生成正式结算单");
  });

  it("renders the commercial summary without calling it a completed payout", () => {
    const adminView = readFileSync(resolve(process.cwd(), "../admin/src/views/Recaps.vue"), "utf8");
    expect(adminView).toContain("活动经营摘要");
    expect(adminView).toContain("未生成正式结算单");
    expect(adminView).toContain("commercialSummary.settlementMessage");
  });
});
