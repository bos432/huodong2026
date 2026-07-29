import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("member registration refund consistency guard", () => {
  const service = readFileSync("src/modules/public/public.service.ts", "utf8");
  const page = readFileSync("../mobile/src/pages/user/registration.vue", "utf8");
  const method = service.slice(
    service.indexOf("async requestRegistrationRefund("),
    service.indexOf("async cancelRegistration(")
  );

  it("serializes refund creation on the activity order and reuses an active request", () => {
    expect(method).toContain("this.dataSource.transaction");
    expect(method).toContain('lock: { mode: "pessimistic_write" }');
    expect(method).toContain("const pendingRefund = refunds.find");
    expect(method).toContain("idempotent: true");
    expect(method).toContain("idempotent: false");
    expect(method.indexOf("pessimistic_write")).toBeLessThan(method.indexOf("refundRepo.save"));
  });

  it("refreshes server truth when the detail page returns to the foreground", () => {
    expect(page).toContain('import { onShow } from "@dcloudio/uni-app"');
    expect(page).toContain("onShow(async () =>");
    expect(page).toContain("Promise.allSettled([load(), loadDecoration(), loadFeatureGates(true)])");
    expect(page).toContain("createTenantLoadGuard");
    expect(page).toContain("loadGuard.isCurrent(loadToken)");
    expect(page).toContain('const contextKey = `${loadToken.tenantCode}:${id}`');
  });

  it("returns and displays the latest activity refund in the member order list", () => {
    expect(service).toContain('addSelect("refund.orderId", "orderId")');
    expect(service).toContain("latestRefundByOrder");
    expect(service).toContain("latestRefund:");
    expect(page).toContain("退款申请处理中");
    const ordersPage = readFileSync("../mobile/src/pages/user/orders.vue", "utf8");
    expect(ordersPage).toContain("row.latestRefund");
    expect(ordersPage).toContain('return "退款处理中"');
    expect(ordersPage).toContain("退款申请处理中，申请金额");
    expect(ordersPage).toContain('{ key: "pending", label: "待处理" }');
    expect(ordersPage).toContain('{ key: "upcoming", label: "待参与" }');
    expect(ordersPage).toContain('item.status.endsWith("refund_completed")');
  });

  it("locks confirmation-stage and payment actions before users can repeat them", () => {
    expect(page).toContain("const paymentBusy = computed");
    expect(page).toContain("cancelling.value = true");
    expect(page).toContain("refunding.value = true");
    expect(page).toContain("paymentClosing.value = true");
    expect(page).toContain("assertActionContext(context)");
  });
});
