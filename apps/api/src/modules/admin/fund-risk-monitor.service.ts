import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { FundRiskAlert } from "../../entities/fund-risk-alert.entity";
import { CourseRefund } from "../../entities/course-refund.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentStatementRecord } from "../../entities/mall-payment-statement-record.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "../../entities/payment-statement-record.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Refund } from "../../entities/refund.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { rediscoverFundRisk, shouldRediscoverFundRisk } from "../../shared/fund-risk-lifecycle";

type Actor = { username?: string; tenantId?: number | null };
type Candidate = { tenantId: number | null; fingerprint: string; type: string; severity: string; title: string; message: string; businessType?: string; businessNo?: string | null; evidence?: Record<string, unknown> };

@Injectable()
export class FundRiskMonitorService {
  constructor(
    @InjectRepository(FundRiskAlert) private readonly alerts: Repository<FundRiskAlert>,
    @InjectRepository(PaymentCallbackLog) private readonly callbacks: Repository<PaymentCallbackLog>,
    @InjectRepository(MallPaymentCallbackLog) private readonly mallCallbacks: Repository<MallPaymentCallbackLog>,
    @InjectRepository(PaymentTransaction) private readonly transactions: Repository<PaymentTransaction>,
    @InjectRepository(MallPaymentTransaction) private readonly mallTransactions: Repository<MallPaymentTransaction>,
    @InjectRepository(PaymentStatementRecord) private readonly statements: Repository<PaymentStatementRecord>,
    @InjectRepository(MallPaymentStatementRecord) private readonly mallStatements: Repository<MallPaymentStatementRecord>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(CourseRefund) private readonly courseRefunds: Repository<CourseRefund>,
    @InjectRepository(MallRefund) private readonly mallRefunds: Repository<MallRefund>,
    @InjectRepository(UserWallet) private readonly wallets: Repository<UserWallet>,
    private readonly dataSource: DataSource
  ) {}

  async scan(actor?: Actor) {
    return this.withScanLock(() => this.scanUnlocked(actor));
  }

  private async scanUnlocked(actor?: Actor) {
    const candidates = await this.detect(actor?.tenantId || null);
    const now = new Date();
    let detectedCount = 0;
    let ignoredResolvedCount = 0;
    for (const item of candidates) {
      const existing = this.alerts.createQueryBuilder("alert").leftJoinAndSelect("alert.tenant", "tenant").where("alert.fingerprint = :fingerprint", { fingerprint: item.fingerprint });
      item.tenantId ? existing.andWhere("alert.tenantId = :tenantId", { tenantId: item.tenantId }) : existing.andWhere("alert.tenantId IS NULL");
      let row = await existing.getOne();
      if (!row) row = this.alerts.create({ tenant: item.tenantId ? ({ id: item.tenantId } as any) : null, fingerprint: item.fingerprint, firstDetectedAt: now, occurrenceCount: 0, status: "open" });
      else if (!shouldRediscoverFundRisk(item.type, row.status)) {
        ignoredResolvedCount += 1;
        continue;
      }
      Object.assign(row, rediscoverFundRisk(row), item, { lastDetectedAt: now });
      await this.alerts.save(row);
      detectedCount += 1;
    }
    return { observedCount: candidates.length, detectedCount, ignoredResolvedCount, openCount: await this.countOpen(actor) };
  }

  async list(query: { status?: string; type?: string; tenantId?: string }, actor?: Actor) {
    const allowedStatuses = ["open", "acknowledged", "resolved"];
    const allowedTypes = ["duplicate_payment", "callback_failed", "payment_mismatch", "statement_mismatch", "refund_failed", "negative_wallet"];
    if (query.status && !allowedStatuses.includes(query.status)) throw new BadRequestException("告警状态筛选不正确");
    if (query.type && !allowedTypes.includes(query.type)) throw new BadRequestException("告警类型筛选不正确");
    if (!actor?.tenantId && query.tenantId && (!/^\d+$/.test(query.tenantId) || Number(query.tenantId) <= 0)) throw new BadRequestException("商家编号不正确");
    const builder = this.alerts.createQueryBuilder("alert").leftJoinAndSelect("alert.tenant", "tenant").orderBy("alert.lastDetectedAt", "DESC").take(500);
    const tenantId = actor?.tenantId || Number(query.tenantId || 0) || null;
    if (tenantId) builder.andWhere("alert.tenantId = :tenantId", { tenantId });
    if (query.status) builder.andWhere("alert.status = :status", { status: query.status });
    if (query.type) builder.andWhere("alert.type = :type", { type: query.type });
    return builder.getMany();
  }

  async handle(id: number, dto: { action?: string; remark?: string }, actor?: Actor) {
    const action = String(dto.action || "");
    const remark = String(dto.remark || "").trim();
    if (!["acknowledged", "resolved", "open"].includes(action)) throw new BadRequestException("告警处理动作不正确");
    if (action === "resolved" && !remark) throw new BadRequestException("解决告警必须填写处理依据");
    if (remark.length > 500) throw new BadRequestException("处理依据不能超过500个字符");
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FundRiskAlert);
      const builder = repository.createQueryBuilder("alert").leftJoinAndSelect("alert.tenant", "tenant").setLock("pessimistic_write").where("alert.id = :id", { id });
      if (actor?.tenantId) builder.andWhere("alert.tenantId = :tenantId", { tenantId: actor.tenantId });
      const row = await builder.getOne();
      if (!row) throw new NotFoundException("资金告警不存在");
      if (row.status === action) return Object.assign(row, { operationApplied: false });
      const allowedTransitions: Record<string, string[]> = {
        open: ["acknowledged", "resolved"],
        acknowledged: ["open", "resolved"],
        resolved: ["open"]
      };
      if (!allowedTransitions[row.status]?.includes(action)) throw new BadRequestException("告警状态已变化，请刷新后重试");
      row.status = action;
      row.handledBy = actor?.username || "system";
      row.handledAt = new Date();
      row.handlingRemark = remark || (action === "open" ? "人工重新打开" : "已确认并跟进");
      const saved = await repository.save(row);
      return Object.assign(saved, { operationApplied: true });
    });
  }

  private async withScanLock<T>(work: () => Promise<T>) {
    const queryRunner = this.dataSource.createQueryRunner();
    const lockKey = "fund-risk:scan";
    await queryRunner.connect();
    let acquired = false;
    try {
      const rows = await queryRunner.query("SELECT GET_LOCK(?, 10) AS acquired", [lockKey]);
      acquired = Number(rows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new ConflictException("资金异常扫描正在执行，请稍后重试");
      return await work();
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?) AS released", [lockKey]);
      await queryRunner.release();
    }
  }

  private countOpen(actor?: Actor) {
    const builder = this.alerts.createQueryBuilder("alert").where("alert.status IN (:...statuses)", { statuses: ["open", "acknowledged"] });
    if (actor?.tenantId) builder.andWhere("alert.tenantId = :tenantId", { tenantId: actor.tenantId });
    return builder.getCount();
  }

  private async detect(tenantId: number | null): Promise<Candidate[]> {
    const scope = (alias: string) => tenantId ? `${alias}.tenantId = ${Number(tenantId)} AND ` : "";
    const [failedCallbacks, failedMallCallbacks, paymentDiffs, coursePaymentDiffs, mallPaymentDiffs, statementDiffs, mallStatementDiffs, failedRefunds, failedCourseRefunds, failedMallRefunds, negativeWallets, duplicatePayments, duplicateCoursePayments, duplicateMallPayments] = await Promise.all([
      this.callbacks.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.resultStatus = 'failed'`).take(200).getMany(),
      this.mallCallbacks.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.resultStatus = 'failed'`).take(200).getMany(),
      this.transactions.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.businessType = 'activity' AND row.reconciliationStatus = 'pending'`).take(200).getMany(),
      this.transactions.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.businessType = 'course' AND row.reconciliationStatus = 'pending'`).take(200).getMany(),
      this.mallTransactions.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.reconciliationStatus = 'pending'`).take(200).getMany(),
      this.statements.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.reconciliationStatus = 'pending'`).take(200).getMany(),
      this.mallStatements.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.reconciliationStatus = 'pending'`).take(200).getMany(),
      this.refunds.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.status = 'failed'`).take(200).getMany(),
      this.courseRefunds.createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("order.course", "course").leftJoinAndSelect("course.tenant", "tenant").where(`${tenantId ? `course.tenantId = ${Number(tenantId)} AND ` : ""}row.status = 'failed'`).take(200).getMany(),
      this.mallRefunds.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}row.status = 'failed'`).take(200).getMany(),
      this.wallets.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").where(`${scope("row")}(row.availableBalanceFen < 0 OR row.frozenBalanceFen < 0 OR row.giftBalanceFen < 0 OR row.frozenGiftBalanceFen < 0)`).take(200).getMany(),
      this.transactions.createQueryBuilder("row").select("row.orderId", "orderId").addSelect("row.tenantId", "tenantId").addSelect("COUNT(*)", "paymentCount").where(`${scope("row")}row.businessType = 'activity' AND row.orderId IS NOT NULL AND row.status = 'success'`).groupBy("row.orderId").addGroupBy("row.tenantId").having("COUNT(*) > 1").limit(200).getRawMany(),
      this.transactions.createQueryBuilder("row").select("row.businessOrderNo", "businessOrderNo").addSelect("row.tenantId", "tenantId").addSelect("COUNT(*)", "paymentCount").where(`${scope("row")}row.businessType = 'course' AND row.businessOrderNo IS NOT NULL AND row.status = 'success'`).groupBy("row.businessOrderNo").addGroupBy("row.tenantId").having("COUNT(*) > 1").limit(200).getRawMany(),
      this.mallTransactions.createQueryBuilder("row").select("row.orderId", "orderId").addSelect("row.tenantId", "tenantId").addSelect("COUNT(*)", "paymentCount").where(`${scope("row")}row.status = 'success'`).groupBy("row.orderId").addGroupBy("row.tenantId").having("COUNT(*) > 1").limit(200).getRawMany()
    ]);
    return [
      ...failedCallbacks.map(r => this.candidate(r.tenant?.id, `callback:activity:${r.id}`, "callback_failed", "critical", "活动支付回调失败", r.resultMessage || "支付回调处理失败", "activity_payment", r.orderNo, { callbackId: r.id, transactionNo: r.transactionNo })),
      ...failedMallCallbacks.map(r => this.candidate(r.tenant?.id, `callback:mall:${r.id}`, "callback_failed", "critical", "商城支付回调失败", r.resultMessage || "商城支付回调处理失败", "mall_payment", r.orderNo, { callbackId: r.id, transactionNo: r.transactionNo })),
      ...paymentDiffs.map(r => this.candidate(r.tenant?.id, `reconcile:activity:${r.id}`, "payment_mismatch", "high", "活动支付账实差异", r.remark || "支付流水待勾兑", "activity_payment", r.businessOrderNo, { transactionNo: r.transactionNo, discrepancyType: r.discrepancyType })),
      ...coursePaymentDiffs.map(r => this.candidate(r.tenant?.id, `reconcile:course:${r.id}`, "payment_mismatch", "high", "课程支付账实差异", r.remark || "课程支付流水待勾兑", "course_payment", r.businessOrderNo, { transactionNo: r.transactionNo, discrepancyType: r.discrepancyType })),
      ...mallPaymentDiffs.map(r => this.candidate(r.tenant?.id, `reconcile:mall:${r.id}`, "payment_mismatch", "high", "商城支付账实差异", r.remark || "商城支付流水待勾兑", "mall_payment", r.businessOrderNo, { transactionNo: r.transactionNo, discrepancyType: r.discrepancyType })),
      ...statementDiffs.map(r => this.candidate(r.tenant?.id, `statement:activity:${r.id}`, "statement_mismatch", "high", "活动渠道账单差异", r.remark || "渠道账单待处理", "activity_statement", r.orderNo, { statementId: r.id, transactionNo: r.transactionNo })),
      ...mallStatementDiffs.map(r => this.candidate(r.tenant?.id, `statement:mall:${r.id}`, "statement_mismatch", "high", "商城渠道账单差异", r.remark || "商城渠道账单待处理", "mall_statement", r.orderNo, { statementId: r.id, transactionNo: r.transactionNo })),
      ...failedRefunds.map(r => this.candidate(r.tenant?.id, `refund:activity:${r.id}`, "refund_failed", "critical", "活动退款失败", r.providerRefundFailureReason || "退款服务商处理失败", "activity_refund", r.refundNo, { refundId: r.id, retryCount: r.providerRefundRetryCount })),
      ...failedCourseRefunds.map(r => this.candidate(r.order.course.tenant?.id, `refund:course:${r.id}`, "refund_failed", "critical", "课程退款失败", r.failureReason || "课程退款服务商处理失败", "course_refund", r.refundNo, { refundId: r.id, orderId: r.order.id, courseId: r.order.course.id })),
      ...failedMallRefunds.map(r => this.candidate(r.tenant?.id, `refund:mall:${r.id}`, "refund_failed", "critical", "商城退款失败", r.providerRefundFailureReason || "商城退款服务商处理失败", "mall_refund", r.refundNo, { refundId: r.id, retryCount: r.providerRefundRetryCount })),
      ...negativeWallets.map(r => this.candidate(r.tenant?.id, `wallet:negative:${r.id}`, "negative_wallet", "critical", "会员钱包出现负余额", `钱包 ${r.id} 存在负数资金字段`, "wallet", String(r.id), { userId: r.user?.id, availableBalanceFen: r.availableBalanceFen, frozenBalanceFen: r.frozenBalanceFen, giftBalanceFen: r.giftBalanceFen, frozenGiftBalanceFen: r.frozenGiftBalanceFen })),
      ...duplicatePayments.map(r => this.candidate(Number(r.tenantId) || undefined, `payment:duplicate:activity:${r.orderId}`, "duplicate_payment", "critical", "活动订单疑似重复支付", `同一订单存在 ${r.paymentCount} 条成功支付流水`, "activity_payment", String(r.orderId), { orderId: Number(r.orderId), paymentCount: Number(r.paymentCount) })),
      ...duplicateCoursePayments.map(r => this.candidate(Number(r.tenantId) || undefined, `payment:duplicate:course:${r.businessOrderNo}`, "duplicate_payment", "critical", "课程订单疑似重复支付", `同一课程订单存在 ${r.paymentCount} 条成功支付流水`, "course_payment", String(r.businessOrderNo), { orderNo: String(r.businessOrderNo), paymentCount: Number(r.paymentCount) })),
      ...duplicateMallPayments.map(r => this.candidate(Number(r.tenantId) || undefined, `payment:duplicate:mall:${r.orderId}`, "duplicate_payment", "critical", "商城订单疑似重复支付", `同一商城订单存在 ${r.paymentCount} 条成功支付流水`, "mall_payment", String(r.orderId), { orderId: Number(r.orderId), paymentCount: Number(r.paymentCount) }))
    ];
  }

  private candidate(tenantId: number | undefined, fingerprint: string, type: string, severity: string, title: string, message: string, businessType: string, businessNo: string | null, evidence: Record<string, unknown>): Candidate {
    return { tenantId: tenantId || null, fingerprint, type, severity, title, message, businessType, businessNo, evidence };
  }
}
