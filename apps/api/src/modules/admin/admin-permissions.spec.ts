import { describe, expect, it } from "vitest";
import { resolveAdminRoutePermission } from "./admin-permissions";

describe("admin route permissions", () => {
  it("maps refund review routes to refund permission before generic approve routes", () => {
    expect(resolveAdminRoutePermission("POST", "refunds/:id/approve")).toBe("order.refund");
    expect(resolveAdminRoutePermission("POST", "refunds/:id/reject")).toBe("order.refund");
  });

  it("keeps activity review routes mapped to activity approval", () => {
    expect(resolveAdminRoutePermission("POST", "activities/:id/approve")).toBe("activity.approve");
    expect(resolveAdminRoutePermission("POST", "activities/:id/reject")).toBe("activity.approve");
  });

  it("maps agent settlement review routes before generic approve routes", () => {
    expect(resolveAdminRoutePermission("POST", "agent-settlements/:id/approve")).toBe("agent_settlement.manage");
    expect(resolveAdminRoutePermission("POST", "/api/admin/agent-settlements/:id/reject")).toBe("agent_settlement.manage");
    expect(resolveAdminRoutePermission("POST", "/api/admin/agent-settlements/:id/mark-paid")).toBe("agent_settlement.pay");
  });

  it("maps course order collection and offline confirmation to order permissions", () => {
    expect(resolveAdminRoutePermission("GET", "course-orders")).toBe("order.view");
    expect(resolveAdminRoutePermission("POST", "course-orders/:id/confirm-offline-payment")).toBe("order.manage");
  });

  it("maps support search to support view permission", () => {
    expect(resolveAdminRoutePermission("GET", "support/search")).toBe("support.view");
  });

  it("maps mall merchant payment accounts to mall payment permission", () => {
    expect(resolveAdminRoutePermission("GET", "mall/accessible-merchants")).toBe("mall.merchant.view");
    expect(resolveAdminRoutePermission("GET", "mall/payment-merchants")).toBe("mall.payment.manage");
    expect(resolveAdminRoutePermission("GET", "mall/merchant-payment-accounts")).toBe("mall.payment.manage");
    expect(resolveAdminRoutePermission("POST", "mall/merchant-payment-accounts")).toBe("mall.payment.manage");
    expect(resolveAdminRoutePermission("PATCH", "mall/merchant-payment-accounts/:id")).toBe("mall.payment.manage");
  });

  it("maps mall product audit routes to mall product audit permission", () => {
    expect(resolveAdminRoutePermission("GET", "mall/product-audits")).toBe("mall.product.audit");
    expect(resolveAdminRoutePermission("POST", "mall/products/:id/approve")).toBe("mall.product.audit");
    expect(resolveAdminRoutePermission("POST", "mall/products/:id/reject")).toBe("mall.product.audit");
  });

  it("maps mall finance, settlement, and marketing routes to operator-friendly permissions", () => {
    expect(resolveAdminRoutePermission("GET", "mall/settlements")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/settlements/export")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("POST", "mall/settlements/generate")).toBe("mall.settlement.manage");
    expect(resolveAdminRoutePermission("GET", "mall/payment-transactions")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/payment-callback-logs")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/refund-logs")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/commissions")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("POST", "mall/commissions/batch-settle")).toBe("mall.settlement.manage");
    expect(resolveAdminRoutePermission("GET", "mall/promotion-codes")).toBe("mall.product.manage");
    expect(resolveAdminRoutePermission("GET", "mall/group-buy-records")).toBe("mall.product.manage");
    expect(resolveAdminRoutePermission("GET", "mall/reviews")).toBe("mall.review.manage");
    expect(resolveAdminRoutePermission("PATCH", "mall/reviews/:id")).toBe("mall.review.manage");
  });
});
