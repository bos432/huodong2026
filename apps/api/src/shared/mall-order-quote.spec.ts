import { describe, expect, it } from "vitest";
import { comparableMallOrderQuote, signMallOrderQuote, verifyMallOrderQuote } from "./mall-order-quote";

const payload = { version: 1 as const, tenantId: 2, userId: 3, issuedAt: 1000, expiresAt: 5000, items: [{ skuId: 9, quantity: 2, unitPrice: "19.90", productVersion: 4, flashSaleId: null, groupBuyId: null }], couponCode: null, promotionCode: "SHOP-9", pointsUsed: 0, goodsAmount: "39.80", discountAmount: "0.00", freightAmount: "8.00", payableAmount: "47.80", allocations: [{ merchantId: 5, goodsFen: 3980, freightFen: 800, discountFen: 0, payableFen: 4780 }] };

describe("mall order quote token", () => {
  it("signs and verifies an order quote", () => {
    expect(verifyMallOrderQuote(signMallOrderQuote(payload, "secret"), "secret", 2000)).toEqual(payload);
  });

  it("rejects tampered and expired quotes", () => {
    const token = signMallOrderQuote(payload, "secret");
    expect(() => verifyMallOrderQuote(`${token}x`, "secret", 2000)).toThrow("invalid_quote_token");
    expect(() => verifyMallOrderQuote(token, "secret", 6000)).toThrow("expired_quote_token");
  });

  it("compares quote business data without timestamps", () => {
    expect(comparableMallOrderQuote({ ...payload, issuedAt: 2000, expiresAt: 9000 })).toEqual(comparableMallOrderQuote(payload));
    expect(comparableMallOrderQuote({ ...payload, promotionCode: "SHOP-10" })).not.toEqual(comparableMallOrderQuote(payload));
  });
});
