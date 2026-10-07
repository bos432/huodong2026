import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("activity registration order idempotency contract", () => {
  const source = readFileSync("src/modules/public/public.service.ts", "utf8");
  const method = source.slice(source.indexOf("async register("), source.indexOf("async mockPay("));

  it("reuses a live unpaid registration order for the same ticket", () => {
    expect(method).toContain("findRegistrationOrder(existing.id)");
    expect(method).toContain("existingOrder.status === OrderStatus.PendingPayment");
    expect(method).toContain("existingOrder.ticketType?.id === (dto.ticketTypeId || null)");
    expect(method).toContain("idempotent: true");
  });

  it("does not send registration notifications again for an idempotent retry", () => {
    expect(method).toContain("if (transactionResult.reused)");
    expect(method).toContain("return { registration: this.publicRegistration(transactionResult.registration)");
  });
});
