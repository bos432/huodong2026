import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActivityReview } from "../entities/activity-review.entity";
import { CheckIn } from "../entities/check-in.entity";
import { MemberLevel } from "../entities/member-level.entity";
import { MemberPointLog } from "../entities/member-point-log.entity";
import { MemberProfile } from "../entities/member-profile.entity";
import { Order } from "../entities/order.entity";
import { Refund } from "../entities/refund.entity";
import { Registration } from "../entities/registration.entity";
import { User } from "../entities/user.entity";
import { UserWallet } from "../entities/user-wallet.entity";
import { WalletTransaction } from "../entities/wallet-transaction.entity";
import { OrderStatus, PaymentMethod, RegistrationStatus } from "../shared/domain";

export type CompleteRefundInput = {
  refund: Refund;
  order: Order;
  actorName?: string | null;
  remark?: string | null;
  now?: Date;
};

@Injectable()
export class RefundCompletionService {
  constructor(
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(ActivityReview) private readonly activityReviews: Repository<ActivityReview>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>
  ) {}

  async complete(input: CompleteRefundInput) {
    const now = input.now || new Date();
    const refund = input.refund;
    const order = input.order;
    const amount = Number(refund.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("退款金额必须大于 0");
    if (refund.status === "completed") return { refund, order, idempotent: true };

    const completedRefunds = await this.refunds.find({ where: { order: { id: order.id }, status: "completed" } });
    const refundedBefore = completedRefunds.filter((item) => item.id !== refund.id).reduce((sum, item) => sum + Number(item.amount), 0);
    if (refundedBefore + amount - Number(order.amount) > 0.001) throw new BadRequestException("退款金额不能超过订单实付金额");

    refund.status = "completed";
    refund.reviewedBy = input.actorName || refund.reviewedBy || "system";
    refund.reviewRemark = input.remark || refund.reviewRemark || null;
    refund.reviewedAt = refund.reviewedAt || now;
    refund.completedAt = now;
    refund.providerRefundNextQueryAt = null;
    refund.providerRefundFailureReason = null;
    const savedRefund = await this.refunds.save(refund);
    await this.returnBalanceRefundIfNeeded(order, savedRefund, amount, input.actorName || "system");

    await this.awardPoints(order.registration.user, -Math.floor(amount), "order_refund", savedRefund.refundNo, "订单退款扣减积分");

    const totalRefunded = refundedBefore + amount;
    order.status = totalRefunded >= Number(order.amount) ? OrderStatus.Refunded : OrderStatus.PartiallyRefunded;
    const savedOrder = await this.orders.save(order);
    if (savedOrder.status === OrderStatus.Refunded && ![RegistrationStatus.CheckedIn, RegistrationStatus.Cancelled].includes(savedOrder.registration.status)) {
      savedOrder.registration.status = RegistrationStatus.Cancelled;
      savedOrder.registration.cancelReason = savedRefund.reason || "订单已退款";
      await this.registrations.save(savedOrder.registration);
      await this.refundRedeemedPoints(savedOrder, "订单全额退款返还积分");
    }

    return { refund: savedRefund, order: savedOrder, idempotent: false };
  }

  private async returnBalanceRefundIfNeeded(order: Order, refund: Refund, amount: number, actorName: string) {
    if (order.paymentMethod !== PaymentMethod.Balance) return null;
    const idempotencyKey = `refund_return:${refund.id}`;
    const existing = await this.walletTransactions.findOne({ where: { idempotencyKey } });
    if (existing) return existing;
    const user = order.registration.user;
    const tenant = order.tenant || null;
    const tenantScopeKey = tenant?.id ? String(tenant.id) : "platform";
    let wallet = await this.userWallets.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!wallet) wallet = await this.userWallets.save(this.userWallets.create({ user, tenant, tenantScopeKey }));
    const before = Number(wallet.availableBalance);
    const after = before + amount;
    wallet.availableBalance = after.toFixed(2);
    await this.userWallets.save(wallet);
    return this.walletTransactions.save(this.walletTransactions.create({
      wallet,
      user,
      tenant,
      order,
      transactionNo: `BRF${Date.now()}${refund.id}`,
      direction: "credit",
      type: "refund_return",
      amount: amount.toFixed(2),
      balanceBefore: before.toFixed(2),
      balanceAfter: after.toFixed(2),
      operator: actorName,
      remark: `余额支付订单退款返还：${refund.refundNo}`,
      idempotencyKey
    }));
  }

  private async awardPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string) {
    const key = String(sourceId);
    const exists = await this.memberPointLogs.findOne({ where: { sourceType, sourceId: key } });
    if (exists) return exists;
    const log = await this.memberPointLogs.save(this.memberPointLogs.create({ user, points, type: points >= 0 ? "earn" : "deduct", sourceType, sourceId: key, remark }));
    await this.ensureMemberProfile(user);
    return log;
  }

  private async refundRedeemedPoints(order: Order, remark: string) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardPoints(order.registration.user, order.pointsUsed, "points_return", order.id, remark);
    order.pointsRefundedAt = new Date();
    await this.orders.save(order);
    return order;
  }

  private async ensureMemberProfile(user: User) {
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = await this.memberProfiles.save(this.memberProfiles.create({ user, level: null }));
    return this.refreshMemberProfile(user, profile);
  }

  private async refreshMemberProfile(user: User, profile?: MemberProfile) {
    const row = profile || (await this.memberProfiles.findOne({ where: { user: { id: user.id } } })) || this.memberProfiles.create({ user, level: null });
    const [registrationCount, checkInCount, reviewCount, paidAmount, pointSum, latestRegistration] = await Promise.all([
      this.registrations.count({ where: { user: { id: user.id } } }),
      this.checkIns.count({ where: { registration: { user: { id: user.id } } } }),
      this.activityReviews.count({ where: { user: { id: user.id } } }),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).getRawOne<{ sum: string }>(),
      this.registrations.findOne({ where: { user: { id: user.id } }, order: { createdAt: "DESC" } })
    ]);
    row.points = Number(pointSum?.sum || 0);
    row.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    row.registrationCount = registrationCount;
    row.checkInCount = checkInCount;
    row.reviewCount = reviewCount;
    row.lastActiveAt = latestRegistration?.createdAt || row.lastActiveAt || user.updatedAt || user.createdAt;
    row.level = await this.resolveMemberLevel(row.points);
    return this.memberProfiles.save(row);
  }

  private async resolveMemberLevel(points: number) {
    const levels = await this.memberLevels.find({ where: { enabled: true }, order: { minPoints: "DESC" } });
    return levels.find((level) => points >= level.minPoints) || null;
  }
}
