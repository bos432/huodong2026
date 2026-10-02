import { Order } from "../../entities/order.entity";

export type PublicOrderMapperDependencies = {
  toTicketType: (ticketType: Order["ticketType"]) => unknown;
  toCoupon: (coupon: Order["coupon"]) => unknown;
  toMemberLevel: (level: Order["memberLevel"]) => unknown;
};

/** Maps an order to the public/member contract without provider credentials. */
export function toPublicOrderSummary(order: Order | null | undefined, dependencies: PublicOrderMapperDependencies) {
  if (!order) return null;
  return {
    id: order.id,
    orderNo: order.orderNo,
    amount: order.amount,
    amountFen: Number(order.amountFen || 0),
    originalAmount: order.originalAmount,
    discountAmount: order.discountAmount,
    memberDiscountAmount: order.memberDiscountAmount,
    pointsUsed: order.pointsUsed,
    pointsDiscountAmount: order.pointsDiscountAmount,
    paymentMethod: order.paymentMethod,
    status: order.status,
    transactionNo: order.transactionNo,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
    closedAt: order.closedAt,
    closeReason: order.closeReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    ticketType: dependencies.toTicketType(order.ticketType),
    coupon: dependencies.toCoupon(order.coupon),
    memberLevel: dependencies.toMemberLevel(order.memberLevel)
  };
}
