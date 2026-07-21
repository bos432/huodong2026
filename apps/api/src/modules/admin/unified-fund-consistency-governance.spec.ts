import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("unified fund consistency governance", () => {
  const adminService = readFileSync("src/modules/admin/admin.service.ts", "utf8");
  const mallService = readFileSync("src/modules/mall/mall.service.ts", "utf8");
  const migration = readFileSync("src/migrations/1783830000000-BackfillMallOfflinePaymentTransactions.ts", "utf8");

  it("records offline mall collections in the payment ledger", () => {
    expect(mallService).toContain('provider: "offline", paymentMethod: PaymentMethod.Offline');
    expect(mallService).toContain('remark: "后台确认商城线下收款"');
    expect(migration).toContain("历史线下收款流水补录");
    expect(migration).toContain("NOT EXISTS");
  });

  it("uses aggregate ledger queries instead of per-order payment lookups", () => {
    expect(adminService).toContain('groupBy("payment.orderId")');
    expect(adminService).toContain('groupBy("refund.orderId")');
    expect(adminService).not.toContain('for (const order of await activityOrders.getMany())');
    expect(adminService).not.toContain('for (const order of await mallOrders.getMany())');
  });

  it("includes settlement adjustments in payable consistency", () => {
    expect(adminService).toContain("const adjustmentFen = yuanToFen(settlement.adjustmentAmount);");
    expect(adminService).toContain("- serviceFeeFen + adjustmentFen");
  });
});
