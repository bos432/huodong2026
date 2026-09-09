import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mall referral commission boundary", () => {
  const controller = readFileSync("src/modules/mall/mall-public.controller.ts", "utf8");
  const service = readFileSync("src/modules/mall/mall.service.ts", "utf8");
  const method = service.match(/async myMallReferralCommissions[\s\S]+?\n  }\n\n  async favoriteStatus/)?.[0] || "";
  const commissionCreation = service.match(/private async createMallCommissionForOrder[\s\S]+?\n  }\n\n  private async voidMallCommission/)?.[0] || "";

  it("requires the current user for the public referral income endpoint", () => {
    expect(controller).toContain('@Get("me/mall/referral-commissions")');
    expect(controller).toContain("requireUserFromAuthorization(req.headers?.authorization)");
  });

  it("scopes referral income to tenant and current promoter without buyer fields", () => {
    expect(method).toContain('where("tenant.id = :tenantId"');
    expect(method).toContain('andWhere("promoterUser.id = :userId"');
    expect(method).not.toContain("buyer");
    expect(method).not.toContain("phone");
    expect(method).not.toContain("address");
  });

  it("never walks an agent hierarchy or assigns merchant agents by default", () => {
    expect(commissionCreation).not.toContain("parentAgent");
    expect(commissionCreation).not.toContain("order.merchant?.agent");
    expect(commissionCreation).toContain("distributionLevel: 1");
  });
});
