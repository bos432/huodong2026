import { describe, expect, it } from "vitest";
import { sanctionApplies, screenGovernedContent } from "./content-governance";

describe("content governance", () => {
  it("rejects or routes matched content to review", () => {
    expect(screenGovernedContent("请加私人联系方式", [{ keyword: "私人联系", matchMode: "contains", action: "review" }]).requiresReview).toBe(true);
    expect(screenGovernedContent("违规内容", [{ keyword: "违规内容", matchMode: "exact", action: "reject" }]).rejected).toBe(true);
  });

  it("masks keyword matches without changing unrelated text", () => {
    expect(screenGovernedContent("联系微信ABC获取资料", [{ keyword: "微信ABC", matchMode: "contains", action: "mask", replacement: "***" }]).text).toBe("联系***获取资料");
  });

  it("applies active sanctions by scope and time", () => {
    const now = new Date("2026-07-13T08:00:00Z");
    expect(sanctionApplies({ status: "active", scope: "forum", startsAt: new Date("2026-07-12T08:00:00Z"), endsAt: new Date("2026-07-14T08:00:00Z") }, "forum", now)).toBe(true);
    expect(sanctionApplies({ status: "active", scope: "community", startsAt: new Date("2026-07-12T08:00:00Z") }, "forum", now)).toBe(false);
  });
});
