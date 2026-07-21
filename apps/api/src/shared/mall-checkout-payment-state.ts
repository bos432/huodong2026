const PAID_LIKE = new Set(["paid", "shipped", "completed", "refund_pending", "refunded"]);

export type MallCheckoutPaymentQueryState = "pending" | "partial" | "success" | "closed";

export function mallCheckoutPaymentQueryState(statuses: string[]): MallCheckoutPaymentQueryState {
  if (!statuses.length) return "pending";
  const paidCount = statuses.filter((status) => PAID_LIKE.has(status)).length;
  if (paidCount === statuses.length) return "success";
  if (paidCount > 0) return "partial";
  if (statuses.every((status) => status === "closed")) return "closed";
  return "pending";
}
