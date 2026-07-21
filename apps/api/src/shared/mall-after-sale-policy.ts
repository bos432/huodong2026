import { yuanToFen } from "./money";

export type MallAfterSaleType = "refund_only" | "return_refund" | "exchange";
export type MallAfterSaleStatus =
  | "pending"
  | "awaiting_buyer_return"
  | "returning"
  | "awaiting_merchant_receipt"
  | "awaiting_exchange_shipment"
  | "exchange_shipped"
  | "platform_intervening"
  | "processing"
  | "approved"
  | "rejected"
  | "failed"
  | "cancelled";

export type MallAfterSaleAllocationInput = {
  orderItemId: number;
  quantity: number;
  requestedQuantity: number;
  occupiedQuantity?: number;
  lineAmount: string | number;
};

export function assertMallAfterSaleTransition(status: MallAfterSaleStatus, action: string) {
  const allowed: Record<string, MallAfterSaleStatus[]> = {
    approve_refund: ["pending", "platform_intervening"],
    approve_return: ["pending", "platform_intervening"],
    approve_exchange: ["pending", "platform_intervening"],
    reject: ["pending", "platform_intervening"],
    submit_return: ["awaiting_buyer_return"],
    receive_return: ["returning", "awaiting_merchant_receipt"],
    ship_exchange: ["awaiting_exchange_shipment"],
    request_intervention: ["pending", "awaiting_buyer_return", "returning", "awaiting_merchant_receipt", "awaiting_exchange_shipment", "exchange_shipped", "failed"],
    cancel: ["pending", "awaiting_buyer_return"]
  };
  if (!allowed[action]?.includes(status)) throw new Error(`当前售后状态 ${status} 不能执行 ${action}`);
}

export function allocateMallAfterSaleAmount(orderAmount: string | number, lines: MallAfterSaleAllocationInput[]) {
  const orderFen = yuanToFen(orderAmount);
  if (orderFen <= 0) throw new Error("订单可售后金额必须大于 0");
  if (!lines.length) throw new Error("请至少选择一个售后商品");
  if (!lines.some((line) => line.requestedQuantity > 0)) throw new Error("请至少选择一个售后商品");
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error("订单商品数量不正确");
    if (!Number.isInteger(line.requestedQuantity) || line.requestedQuantity < 0) throw new Error("售后商品数量不能小于 0");
    const occupied = Math.max(Math.trunc(Number(line.occupiedQuantity || 0)), 0);
    if (line.requestedQuantity + occupied > line.quantity) throw new Error("售后商品数量不能超过剩余可售后数量");
  }

  const lineFens = lines.map((line) => yuanToFen(line.lineAmount));
  const goodsFen = lineFens.reduce((sum, value) => sum + value, 0);
  if (goodsFen <= 0) throw new Error("订单商品金额不正确");

  const exact = lines.map((line, index) => {
    const fullLineOrderFen = orderFen * lineFens[index] / goodsFen;
    const requestedFen = fullLineOrderFen * line.requestedQuantity / line.quantity;
    return { line, index, requestedFen, floorFen: Math.floor(requestedFen), remainder: requestedFen - Math.floor(requestedFen) };
  });
  const selectedAll = lines.every((line) => line.requestedQuantity === line.quantity && !line.occupiedQuantity);
  const targetFen = selectedAll ? orderFen : Math.min(orderFen, Math.floor(exact.reduce((sum, row) => sum + row.requestedFen, 0)));
  let remainderFen = targetFen - exact.reduce((sum, row) => sum + row.floorFen, 0);
  const ranked = [...exact].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const row of ranked) {
    if (remainderFen <= 0) break;
    row.floorFen += 1;
    remainderFen -= 1;
  }
  const allocations = exact.sort((a, b) => a.index - b.index).filter((row) => row.line.requestedQuantity > 0).map((row) => ({
    orderItemId: row.line.orderItemId,
    quantity: row.line.requestedQuantity,
    refundableFen: row.floorFen
  }));
  return { orderFen, refundableFen: allocations.reduce((sum, row) => sum + row.refundableFen, 0), allocations };
}

export function nextMallOrderStatusAfterRefund(input: { orderAmountFen: number; approvedRefundFen: number; shipped: boolean; completed: boolean }) {
  if (input.approvedRefundFen >= input.orderAmountFen) return "refunded" as const;
  if (input.completed) return "completed" as const;
  return input.shipped ? "shipped" as const : "paid" as const;
}
