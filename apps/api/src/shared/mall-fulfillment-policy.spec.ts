import { describe, expect, it } from "vitest";
import { resolveMallFulfillmentState } from "./mall-fulfillment-policy";

describe("mall fulfillment policy", () => {
  it("distinguishes unshipped, partial and fully shipped quantities", () => {
    expect(resolveMallFulfillmentState({ totalQuantity: 5, shippedQuantity: 0 }).fulfillmentStatus).toBe("unshipped");
    expect(resolveMallFulfillmentState({ totalQuantity: 5, shippedQuantity: 2, activeShipmentCount: 1 }).fulfillmentStatus).toBe("partial_shipped");
    expect(resolveMallFulfillmentState({ totalQuantity: 5, shippedQuantity: 5, activeShipmentCount: 2 }).fulfillmentStatus).toBe("shipped");
  });

  it("only completes fulfillment after every active package is delivered", () => {
    expect(resolveMallFulfillmentState({ totalQuantity: 5, shippedQuantity: 5, activeShipmentCount: 2, deliveredShipmentCount: 1 }).fullyReceived).toBe(false);
    expect(resolveMallFulfillmentState({ totalQuantity: 5, shippedQuantity: 5, activeShipmentCount: 2, deliveredShipmentCount: 2 })).toMatchObject({ fulfillmentStatus: "received", fullyReceived: true });
  });

  it("clamps invalid and over-reported quantities", () => {
    expect(resolveMallFulfillmentState({ totalQuantity: 3, shippedQuantity: 9, activeShipmentCount: 1, deliveredShipmentCount: 4 })).toMatchObject({ totalQuantity: 3, shippedQuantity: 3, deliveredShipmentCount: 1, fullyReceived: true });
  });
});
