import { sameMoneyAmount } from "./money";

export type MallStatementOrderSnapshot = { amount: string | number; status: string };

export function reconcileMallStatement(
  statement: { amount: string | number; orderNo: string | null },
  order: MallStatementOrderSnapshot | null
) {
  if (!order) {
    return {
      status: "pending",
      discrepancyType: "unknown_order",
      remark: statement.orderNo ? "渠道账单订单号未匹配到商城订单" : "渠道账单缺少订单号"
    };
  }
  if (!sameMoneyAmount(statement.amount, order.amount)) {
    return { status: "pending", discrepancyType: "amount_mismatch", remark: "渠道账单金额与商城订单金额不一致" };
  }
  if (!["paid", "shipped", "completed", "refund_pending", "refunded"].includes(order.status)) {
    return { status: "pending", discrepancyType: "order_status_mismatch", remark: "渠道账单已支付但商城订单不是已支付状态" };
  }
  return { status: "matched", discrepancyType: null, remark: "渠道账单与商城订单匹配" };
}
