import { describe, expect, it } from "vitest";
import { allocateMallAfterSaleAmount, assertMallAfterSaleTransition, nextMallOrderStatusAfterRefund } from "./mall-after-sale-policy";

describe("mall after-sale policy", () => {
  it("allocates the full paid amount without losing cents", () => {
    expect(allocateMallAfterSaleAmount("99.99", [
      { orderItemId: 1, quantity: 1, requestedQuantity: 1, lineAmount: "60.00" },
      { orderItemId: 2, quantity: 2, requestedQuantity: 2, lineAmount: "40.00" }
    ])).toEqual({ orderFen: 9999, refundableFen: 9999, allocations: [{ orderItemId: 1, quantity: 1, refundableFen: 5999 }, { orderItemId: 2, quantity: 2, refundableFen: 4000 }] });
  });

  it("limits a partial request to selected quantities", () => {
    const result = allocateMallAfterSaleAmount("80.00", [
      { orderItemId: 1, quantity: 2, requestedQuantity: 1, lineAmount: "60.00" },
      { orderItemId: 2, quantity: 1, requestedQuantity: 0, lineAmount: "40.00" }
    ]);
    expect(result.refundableFen).toBe(2400);
  });

  it("rejects quantities already occupied by another case", () => {
    expect(() => allocateMallAfterSaleAmount("100.00", [{ orderItemId: 1, quantity: 2, requestedQuantity: 1, occupiedQuantity: 2, lineAmount: "100.00" }])).toThrow("剩余可售后数量");
  });

  it("guards return and exchange transitions", () => {
    expect(() => assertMallAfterSaleTransition("pending", "submit_return")).toThrow();
    expect(() => assertMallAfterSaleTransition("awaiting_buyer_return", "submit_return")).not.toThrow();
    expect(() => assertMallAfterSaleTransition("awaiting_exchange_shipment", "ship_exchange")).not.toThrow();
  });

  it("keeps partially refunded orders in their fulfillment state", () => {
    expect(nextMallOrderStatusAfterRefund({ orderAmountFen: 10000, approvedRefundFen: 5000, shipped: true, completed: false })).toBe("shipped");
    expect(nextMallOrderStatusAfterRefund({ orderAmountFen: 10000, approvedRefundFen: 10000, shipped: true, completed: true })).toBe("refunded");
  });
});
