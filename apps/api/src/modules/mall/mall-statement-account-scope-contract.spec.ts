import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mall statement account scope contract", () => {
  const service = readFileSync("src/modules/mall/mall.service.ts", "utf8");
  const entity = readFileSync("src/entities/mall-payment-statement-record.entity.ts", "utf8");
  const controller = readFileSync("src/modules/mall/mall-admin.controller.ts", "utf8");

  it("isolates provider transaction numbers by collection account", () => {
    expect(entity).toContain('@Unique(["provider", "accountScope", "transactionNo"])');
    expect(service).toContain('merchant.paymentMode === "merchant_direct" ? `merchant:${merchant.id}` : `tenant:${tenant.id}:platform`');
  });

  it("does not let a replay drift to another tenant, merchant, or order", () => {
    expect(service).toContain("已归属其他商家，不能重新绑定");
    expect(service).toContain("已归属店铺");
    expect(service).toContain("不能改绑为");
    expect(service).toContain("已关联其他订单，不能重新绑定");
  });

  it("keeps integer-fen snapshots and reports imports separately from updates", () => {
    expect(service).toContain("amountFen: yuanToFen(amount)");
    expect(service).toContain("if (isNew) importedCount += 1;");
    expect(service).toContain("else updatedCount += 1;");
    expect(service).toContain("processedCount: results.length");
  });

  it("synchronizes manual resolution back to the payment ledger", () => {
    expect(service).toContain("transaction.reconciliationStatus = saved.reconciliationStatus");
    expect(service).toContain("transaction.discrepancyType = saved.discrepancyType");
    expect(service).toContain("transaction.remark = saved.resolutionRemark || saved.remark");
  });

  it("sanitizes statement list and provider-fetch responses", () => {
    expect(controller).toContain("return sanitizeMallStatementResponse(await this.service.listPaymentStatements(query, admin))");
    expect(controller).toContain("return sanitizeMallStatementResponse(await this.service.fetchPaymentStatements(dto, admin))");
    for (const field of ["settings", "businessSnapshot", "addressSnapshot", "rawPayload"]) expect(controller).toContain(`"${field}"`);
  });
});
