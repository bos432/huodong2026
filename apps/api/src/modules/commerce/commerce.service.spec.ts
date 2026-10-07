import { describe, expect, it } from "vitest";
import { CommerceService } from "./commerce.service";

describe("CommerceService", () => {
  it("maps public order state without exposing provider credentials", () => {
    const service = new CommerceService();
    const result = service.toPublicOrderSummary({
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
      paymentCredential: "must-not-leak",
      providerPrivateKey: "must-not-leak"
    } as any, {
      toTicketType: (value) => value ? { id: value.id, name: value.name } : null,
      toCoupon: () => null,
      toMemberLevel: () => null
    });

    expect(result).toMatchObject({ id: 31, orderNo: "MP202610020001", amountFen: 9900, status: "paid", ticketType: { id: 5, name: "标准票" } });
    expect(result).not.toHaveProperty("paymentCredential");
    expect(result).not.toHaveProperty("providerPrivateKey");
  });
});
