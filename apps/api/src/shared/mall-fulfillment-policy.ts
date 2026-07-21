import { MallOrderFulfillmentStatus } from "../entities/mall-order.entity";

function nonNegativeInteger(value: unknown) {
  const number = Math.trunc(Number(value || 0));
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

export function resolveMallFulfillmentState(input: { totalQuantity: number; shippedQuantity: number; activeShipmentCount?: number; deliveredShipmentCount?: number }) {
  const totalQuantity = nonNegativeInteger(input.totalQuantity);
  const shippedQuantity = Math.min(nonNegativeInteger(input.shippedQuantity), totalQuantity);
  const activeShipmentCount = nonNegativeInteger(input.activeShipmentCount);
  const deliveredShipmentCount = Math.min(nonNegativeInteger(input.deliveredShipmentCount), activeShipmentCount);
  let fulfillmentStatus: MallOrderFulfillmentStatus = "unshipped";
  if (shippedQuantity > 0 && shippedQuantity < totalQuantity) fulfillmentStatus = "partial_shipped";
  if (totalQuantity > 0 && shippedQuantity >= totalQuantity) fulfillmentStatus = activeShipmentCount > 0 && deliveredShipmentCount >= activeShipmentCount ? "received" : "shipped";
  return {
    totalQuantity,
    shippedQuantity,
    activeShipmentCount,
    deliveredShipmentCount,
    fulfillmentStatus,
    fullyShipped: totalQuantity > 0 && shippedQuantity >= totalQuantity,
    fullyReceived: totalQuantity > 0 && shippedQuantity >= totalQuantity && activeShipmentCount > 0 && deliveredShipmentCount >= activeShipmentCount
  };
}
