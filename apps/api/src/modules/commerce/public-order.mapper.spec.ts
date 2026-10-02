import { describe, expect, it } from "vitest";
import { toPublicOrderSummary } from "./public-order.mapper";

describe("toPublicOrderSummary", () => {
  it("keeps order decision fields and excludes payment credentials", () => {
    const result = toPublicOrderSummary({
      id: 31,
      orderNo: "MP202610020001",
      amount: "99.00",
      amountFen: 9900,
      originalAmount: "129.00",
      discountAmount: "30.00",
      memberDiscountAmount: "0.00",
      pointsUsed: 0,
      pointsDiscountAmount: "0.00",
      paymentMethod: "wechat",
      status: "paid",
      transactionNo: "WX-31",
      paidAt: new Date("2026-10-02T02:00:00.000Z"),
      expiresAt: null,
      closedAt: null,
      closeReason: null,
      createdAt: new Date("2026-10-02T01:00:00.000Z"),
      updatedAt: new Date("2026-10-02T02:00:00.000Z"),
      ticketType: { id: 5, name: "标准票" },
      coupon: { id: 6, code: "WELCOME", name: "新客券" },
      memberLevel: { id: 2, name: "同行" },
      paymentCredential: "must-not-leak",
      providerPrivateKey: "must-not-leak"
    } as any, {
      toTicketType: (value) => value ? { id: value.id, name: value.name } : null,
      toCoupon: (value) => value ? { id: value.id, code: value.code } : null,
      toMemberLevel: (value) => value ? { id: value.id, name: value.name } : null
    });

    expect(result).toMatchObject({
      id: 31,
      orderNo: "MP202610020001",
      amount: "99.00",
      amountFen: 9900,
      status: "paid",
      ticketType: { id: 5, name: "标准票" },
      coupon: { id: 6, code: "WELCOME" },
      memberLevel: { id: 2, name: "同行" }
    });
    expect(result).not.toHaveProperty("paymentCredential");
    expect(result).not.toHaveProperty("providerPrivateKey");
  });

  it("returns null for a missing order", () => {
    expect(toPublicOrderSummary(null, { toTicketType: () => null, toCoupon: () => null, toMemberLevel: () => null })).toBeNull();
  });
});
