import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ActivityReview } from "../entities/activity-review.entity";
import { CheckIn } from "../entities/check-in.entity";
import { Coupon } from "../entities/coupon.entity";
import { CouponClaim } from "../entities/coupon-claim.entity";
import { CouponUsage } from "../entities/coupon-usage.entity";
import { MemberLevel } from "../entities/member-level.entity";
import { MemberPointLog } from "../entities/member-point-log.entity";
import { MemberProfile } from "../entities/member-profile.entity";
import { Order } from "../entities/order.entity";
import { Refund } from "../entities/refund.entity";
import { Registration } from "../entities/registration.entity";
import { Tenant } from "../entities/tenant.entity";
import { User } from "../entities/user.entity";
import { UserWallet } from "../entities/user-wallet.entity";
import { WalletTransaction } from "../entities/wallet-transaction.entity";
import { OrderStatus, PaymentMethod, RegistrationStatus } from "../shared/domain";
import { fenToYuan, yuanToFen } from "../shared/money";
import { levelExpiry, manualLevelOverrideActive, memberLevelScopeKey, memberLevelSnapshot, resolveGrowthLevel } from "../shared/member-level-engine";
import { CharityFundService } from "./charity-fund.service";
import { MemberPointsService } from "./member-points/member-points.service";
import { cumulativePointClawbackTarget } from "../shared/member-point-ledger";
import { ConversionEvent } from "../entities/conversion-event.entity";

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
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    private readonly charityFund: CharityFundService,
    private readonly memberPoints: MemberPointsService,
    private readonly dataSource: DataSource
  ) {}

  async complete(input: CompleteRefundInput) {
    const now = input.now || new Date();
    const refund = input.refund;
    const order = await this.orders.createQueryBuilder("order")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.tenant", "registrationTenant")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .where("order.id = :orderId", { orderId: input.order.id })
      .getOne() || input.order;
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
    await this.charityFund.recordRefundReversal(order, savedRefund, input.actorName || "system");

    const totalRefunded = refundedBefore + amount;
    await this.clawbackOrderPoints(order, savedRefund, totalRefunded);
    order.status = totalRefunded >= Number(order.amount) ? OrderStatus.Refunded : OrderStatus.PartiallyRefunded;
    const savedOrder = await this.orders.save(order);
    if (savedOrder.status === OrderStatus.Refunded && ![RegistrationStatus.CheckedIn, RegistrationStatus.Cancelled].includes(savedOrder.registration.status)) {
      savedOrder.registration.status = RegistrationStatus.Cancelled;
      savedOrder.registration.cancelReason = savedRefund.reason || "订单已退款";
      await this.registrations.save(savedOrder.registration);
      await this.refundRedeemedPoints(savedOrder, "订单全额退款返还积分");
      await this.releaseCoupon(savedOrder, "订单全额退款返还优惠券");
    }
    await this.dataSource.getRepository(ConversionEvent).createQueryBuilder().insert().values({
      type: "refund",
      tenant: this.relationId(savedRefund.tenant || savedOrder.tenant || savedOrder.registration?.tenant || savedOrder.registration?.activity?.tenant || null),
      activity: this.relationId(savedOrder.registration?.activity || null),
      user: this.relationId(savedOrder.registration?.user || null),
      registration: this.relationId(savedOrder.registration || null),
      order: this.relationId(savedOrder),
      channel: this.relationId(savedOrder.registration?.channel || null),
      ticketTypeIdSnapshot: savedOrder.ticketType?.id || null,
      ticketTypeNameSnapshot: savedOrder.ticketType?.name || null,
      channelCodeSnapshot: savedOrder.registration?.attributionChannelCode || savedOrder.registration?.channel?.code || null,
      channelNameSnapshot: savedOrder.registration?.attributionChannelName || savedOrder.registration?.channel?.name || null,
      provinceSnapshot: savedOrder.registration?.attributionProvince || savedOrder.registration?.activity?.locationProvince || null,
      citySnapshot: savedOrder.registration?.attributionCity || savedOrder.registration?.activity?.locationCity || null,
      districtSnapshot: savedOrder.registration?.attributionDistrict || savedOrder.registration?.activity?.locationDistrict || null,
      source: savedOrder.registration?.attributionSource || "refund",
      idempotencyKey: `refund:${savedRefund.id}`,
      amount: Number(savedRefund.amount || 0).toFixed(2),
      clientIp: null,
      userAgent: null,
      payload: { refundNo: savedRefund.refundNo }
    } as any).orIgnore().updateEntity(false).execute();

    return { refund: savedRefund, order: savedOrder, idempotent: false };
  }

  private relationId<T extends { id: number }>(entity: T | null | undefined) { return entity ? ({ id: entity.id } as T) : null; }

  private async returnBalanceRefundIfNeeded(order: Order, refund: Refund, amount: number, actorName: string) {
    if (order.paymentMethod !== PaymentMethod.Balance) return null;
    const idempotencyKey = `refund_return:${refund.id}`;
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(WalletTransaction);
      const existing = await txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return existing;
      const walletRepo = manager.getRepository(UserWallet);
      const user = order.registration.user;
      const tenant = order.tenant || null;
      const tenantScopeKey = tenant?.id ? String(tenant.id) : "platform";
      let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant, tenantScopeKey }));
      const paymentTx = await txRepo.findOne({ where: { idempotencyKey: `balance_pay:${order.id}` } });
      const originalGiftUsedFen = paymentTx ? Math.max(yuanToFen(paymentTx.giftBefore || 0) - yuanToFen(paymentTx.giftAfter || 0), 0) : 0;
      const priorReturns = await txRepo.find({ where: { order: { id: order.id }, type: "refund_return" } });
      const restoredGiftFen = priorReturns.reduce((sum, item) => sum + Math.max(yuanToFen(item.giftAfter || 0) - yuanToFen(item.giftBefore || 0), 0), 0);
      const amountFen = yuanToFen(amount);
      const giftReturnFen = Math.min(Math.max(originalGiftUsedFen - restoredGiftFen, 0), amountFen);
      const cashReturnFen = amountFen - giftReturnFen;
      const beforeFen = yuanToFen(wallet.availableBalance || 0);
      const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
      const afterFen = beforeFen + cashReturnFen;
      const giftAfterFen = giftBeforeFen + giftReturnFen;
      wallet.availableBalance = fenToYuan(afterFen);
      wallet.giftBalance = fenToYuan(giftAfterFen);
      await walletRepo.save(wallet);
      return txRepo.save(txRepo.create({ wallet, user, tenant, order, transactionNo: `BRF${Date.now()}${refund.id}`, direction: "credit", type: "refund_return", amount: amount.toFixed(2), balanceBefore: fenToYuan(beforeFen), balanceAfter: fenToYuan(afterFen), frozenBefore: wallet.frozenBalance || "0.00", frozenAfter: wallet.frozenBalance || "0.00", giftBefore: fenToYuan(giftBeforeFen), giftAfter: fenToYuan(giftAfterFen), frozenGiftBefore: wallet.frozenGiftBalance || "0.00", frozenGiftAfter: wallet.frozenGiftBalance || "0.00", operator: actorName, remark: `余额支付订单退款返还：${refund.refundNo}`, idempotencyKey }));
    });
  }

  private async awardPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string, tenant: Tenant | null) {
    const result = await this.memberPoints.post({ user, tenant, points, sourceType, sourceId, remark, negativePolicy: sourceType.includes("refund") ? "debt" : "reject" });
    await this.ensureMemberProfile(user, tenant);
    return result.log;
  }

  private async clawbackOrderPoints(order: Order, refund: Refund, totalRefunded: number) {
    const tenant = order.tenant || order.registration?.tenant || order.registration?.activity?.tenant || refund.tenant || null;
    const tenantScopeKey = memberLevelScopeKey(tenant);
    const earned = await this.memberPointLogs.findOne({ where: { user: { id: order.registration.user.id }, tenantScopeKey, sourceType: "order_paid", sourceId: String(order.id) } });
    if (!earned || earned.points <= 0) return null;
    const target = cumulativePointClawbackTarget({ earnedPoints: earned.points, paidAmountFen: Number(order.amountFen || yuanToFen(order.amount)), refundedAmountFen: yuanToFen(totalRefunded) });
    const prior = await this.memberPointLogs.createQueryBuilder("log")
      .select("COALESCE(SUM(-COALESCE(NULLIF(log.requestedPoints, 0), log.points)), 0)", "points")
      .where("log.relatedLogId = :earnedLogId", { earnedLogId: earned.id })
      .andWhere("log.sourceType = 'order_refund'")
      .getRawOne<{ points: string }>();
    const delta = Math.max(target - Math.max(Number(prior?.points || 0), 0), 0);
    if (!delta) return null;
    return this.memberPoints.post({
      user: order.registration.user,
      tenant,
      points: -delta,
      sourceType: "order_refund",
      sourceId: refund.refundNo,
      remark: "订单退款扣减消费积分",
      negativePolicy: "debt",
      relatedLog: earned,
      ruleSnapshot: { mode: "cumulative_refund_ratio", earnedPoints: earned.points, paidAmountFen: Number(order.amountFen || yuanToFen(order.amount)) },
      metadata: { targetClawbackPoints: target, refundedAmountFen: yuanToFen(totalRefunded), refundId: refund.id }
    });
  }

  private async refundRedeemedPoints(order: Order, remark: string) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardPoints(order.registration.user, order.pointsUsed, "points_return", order.id, remark, order.tenant || order.registration.activity?.tenant || null);
    order.pointsRefundedAt = new Date();
    await this.orders.save(order);
    return order;
  }

  private async releaseCoupon(order: Order, reason: string) {
    if (!order.coupon) return null;
    return this.dataSource.transaction(async manager => {
      const usageRepo = manager.getRepository(CouponUsage);
      const usage = await usageRepo.findOne({ where: { order: { id: order.id } }, lock: { mode: "pessimistic_write" } });
      if (!usage || usage.status === "released") return usage;
      usage.status = "released"; usage.releasedAt = new Date(); usage.releaseReason = reason; await usageRepo.save(usage);
      const couponRepo = manager.getRepository(Coupon);
      const coupon = await couponRepo.findOne({ where: { id: usage.coupon.id }, lock: { mode: "pessimistic_write" } });
      if (coupon && coupon.usedCount > 0) { coupon.usedCount -= 1; await couponRepo.save(coupon); }
      const claimRepo = manager.getRepository(CouponClaim);
      const claim = await claimRepo.findOne({ where: { coupon: { id: usage.coupon.id }, user: { id: usage.user.id } }, lock: { mode: "pessimistic_write" } });
      if (claim && claim.usedCount > 0) { claim.usedCount -= 1; await claimRepo.save(claim); }
      return usage;
    });
  }

  private async ensureMemberProfile(user: User, tenant: Tenant | null) {
    const tenantScopeKey = memberLevelScopeKey(tenant);
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) profile = await this.memberProfiles.save(this.memberProfiles.create({ user, tenant, tenantScopeKey, level: null, levelSnapshot: null }));
    return this.refreshMemberProfile(user, profile, tenant);
  }

  private async refreshMemberProfile(user: User, profile: MemberProfile | undefined, tenant: Tenant | null) {
    const tenantScopeKey = memberLevelScopeKey(tenant);
    const row = profile || (await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } })) || this.memberProfiles.create({ user, tenant, tenantScopeKey, level: null, levelSnapshot: null });
    const tenantFilter = tenant ? " = :tenantId" : " IS NULL";
    const [registrationCount, checkInCount, reviewCount, paidAmount, pointSum, latestRegistration] = await Promise.all([
      this.registrations.createQueryBuilder("registration").where("registration.userId = :userId", { userId: user.id }).andWhere(`registration.tenantId${tenantFilter}`, { tenantId: tenant?.id }).getCount(),
      this.checkIns.createQueryBuilder("checkin").leftJoin("checkin.registration", "registration").where("registration.userId = :userId", { userId: user.id }).andWhere(`registration.tenantId${tenantFilter}`, { tenantId: tenant?.id }).andWhere("checkin.revokedAt IS NULL").getCount(),
      this.activityReviews.createQueryBuilder("review").leftJoin("review.activity", "activity").where("review.userId = :userId", { userId: user.id }).andWhere(`activity.tenantId${tenantFilter}`, { tenantId: tenant?.id }).getCount(),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere(`o.tenantId${tenantFilter}`, { tenantId: tenant?.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").getRawOne<{ sum: string }>(),
      this.registrations.createQueryBuilder("registration").where("registration.userId = :userId", { userId: user.id }).andWhere(`registration.tenantId${tenantFilter}`, { tenantId: tenant?.id }).orderBy("registration.createdAt", "DESC").getOne()
    ]);
    row.points = Number(pointSum?.sum || 0);
    row.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    row.registrationCount = registrationCount;
    row.checkInCount = checkInCount;
    row.reviewCount = reviewCount;
    row.lastActiveAt = latestRegistration?.createdAt || row.lastActiveAt || user.updatedAt || user.createdAt;
    if (!manualLevelOverrideActive(row.levelSource, row.levelExpiresAt)) {
      const previousLevelId = row.level?.id || null;
      row.level = await this.resolveMemberLevel(row.points, tenant);
      if ((row.level?.id || null) !== previousLevelId) { row.levelStartedAt = new Date(); row.levelExpiresAt = levelExpiry(row.level, row.levelStartedAt); row.levelSource = "refund_recalculation"; row.levelSnapshot = memberLevelSnapshot(row.level); }
    }
    return this.memberProfiles.save(row);
  }

  private async resolveMemberLevel(points: number, tenant: Tenant | null) {
    const levels = await this.memberLevels.find({ where: { enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) }, order: { minGrowth: "DESC" } });
    return resolveGrowthLevel(levels, points) as MemberLevel | null;
  }
}
