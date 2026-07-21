import { BadRequestException } from "@nestjs/common";
import { yuanToFen } from "./money";

export function assertRefundCapacity(orderAmount: string | number, reservedFen: string | number | null | undefined, requestedAmount: string | number) {
  const orderFen = yuanToFen(orderAmount);
  const requestFen = yuanToFen(requestedAmount);
  const occupiedFen = Number(reservedFen || 0);
  if (!Number.isSafeInteger(occupiedFen) || occupiedFen < 0) throw new BadRequestException("退款占用金额异常");
  if (requestFen <= 0) throw new BadRequestException("退款金额必须大于 0");
  if (occupiedFen + requestFen > orderFen) throw new BadRequestException("退款金额不能超过订单可退金额");
  return { orderFen, occupiedFen, requestFen, remainingFen: orderFen - occupiedFen - requestFen };
}

export function canClaimRefundReview(status: string) {
  if (["processing", "completed"].includes(status)) return "idempotent" as const;
  if (status === "pending") return "claim" as const;
  return "reject" as const;
}

export function resetRefundProviderForRetry<T extends {
  providerRefundNo: string | null;
  providerRefundStatus: string | null;
  providerRefundSyncedAt: Date | null;
  providerRefundPayload: unknown;
  providerRefundFailureReason: string | null;
  providerRefundNextQueryAt: Date | null;
}>(refund: T) {
  refund.providerRefundNo = null;
  refund.providerRefundStatus = null;
  refund.providerRefundSyncedAt = null;
  refund.providerRefundPayload = null;
  refund.providerRefundFailureReason = null;
  refund.providerRefundNextQueryAt = null;
  return refund;
}
