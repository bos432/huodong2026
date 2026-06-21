import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminUser } from "../entities/admin-user.entity";
import { CharityAccrualBasis, CharityFundSetting } from "../entities/charity-fund-setting.entity";
import { CharityFundTransaction } from "../entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "../entities/charity-project-disbursement.entity";
import { CharityProject, CharityProjectStatus } from "../entities/charity-project.entity";
import { CharityProjectUpdate } from "../entities/charity-project-update.entity";
import { Order } from "../entities/order.entity";
import { Refund } from "../entities/refund.entity";
import { Tenant } from "../entities/tenant.entity";
import { User } from "../entities/user.entity";
import { charityAccrualAmount, charityBasisAmount, charityReversalAmount, roundMoney } from "./charity-fund-calculator";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type CharitySummaryScope = { tenantId?: number | null };
export type CharitySettingInput = {
  enabled?: boolean;
  ratePercent?: number;
  accrualBasis?: CharityAccrualBasis;
  manualBasisAmount?: number | null;
  userDisplayName?: string;
  publicNote?: string;
  retainOnActivityRefund?: boolean;
  ambassadorThreshold?: number;
  ambassadorTitle?: string;
};
export type CharityProjectInput = {
  title: string;
  targetAmount: number;
  status?: CharityProjectStatus;
  coverUrl?: string | null;
  description?: string | null;
  executedAt?: string | null;
  publicVisible?: boolean;
};
export type CharityDisbursementInput = { amount: number; proofUrl?: string | null; remark?: string | null; publicVisible?: boolean };
export type CharityProjectUpdateInput = { title: string; content: string; proofUrl?: string | null; publicVisible?: boolean; publishedAt?: string | null };

@Injectable()
export class CharityFundService {
  constructor(
    @InjectRepository(CharityFundSetting) private readonly settings: Repository<CharityFundSetting>,
    @InjectRepository(CharityFundTransaction) private readonly transactions: Repository<CharityFundTransaction>,
    @InjectRepository(CharityProject) private readonly projects: Repository<CharityProject>,
    @InjectRepository(CharityProjectDisbursement) private readonly disbursements: Repository<CharityProjectDisbursement>,
    @InjectRepository(CharityProjectUpdate) private readonly projectUpdates: Repository<CharityProjectUpdate>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>
  ) {}

  async publicSummary() {
    const [setting, summary, projects] = await Promise.all([this.ensureSetting(null), this.summary(), this.publicProjects(4)]);
    return { setting: this.publicSetting(setting), ...summary, projects };
  }

  async publicProjects(limit = 20) {
    const rows = await this.projects.find({ where: { publicVisible: true }, order: { createdAt: "DESC" }, take: limit });
    return this.projectViews(rows, true);
  }

  async publicProjectUpdates(projectId: number) {
    const project = await this.projects.findOne({ where: { id: projectId, publicVisible: true } });
    if (!project) throw new NotFoundException("公益项目不存在");
    const [updates, disbursements] = await Promise.all([
      this.projectUpdates.find({ where: { project: { id: projectId }, publicVisible: true }, order: { publishedAt: "DESC", createdAt: "DESC" } }),
      this.disbursements.find({ where: { project: { id: projectId }, publicVisible: true }, order: { createdAt: "DESC" } })
    ]);
    return { project: this.projectView(project), updates: updates.map((row) => this.projectUpdateView(row)), disbursements: disbursements.map((row) => this.disbursementView(row)) };
  }

  async userContribution(user: User) {
    const [setting, contribution, summary, projects, transactions] = await Promise.all([
      this.ensureSetting(null),
      this.userContributionAmount(user.id),
      this.summary(),
      this.publicProjects(3),
      this.userTransactions(user, 1, 5)
    ]);
    return { setting: this.publicSetting(setting), contributionAmount: contribution.toFixed(2), pool: summary, projects, transactions: transactions.items, ambassador: this.ambassadorView(user.id, contribution, setting) };
  }

  async userTransactions(user: User, page = 1, pageSize = 20) {
    const safePage = Math.max(Number(page || 1), 1);
    const safePageSize = Math.min(Math.max(Number(pageSize || 20), 1), 100);
    const builder = this.transactions
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .leftJoinAndSelect("tx.user", "user")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("tx.refund", "refund")
      .where("tx.userId = :userId", { userId: user.id })
      .andWhere("tx.type IN (:...types)", { types: ["charity_accrual", "charity_reversal"] })
      .orderBy("tx.createdAt", "DESC")
      .skip((safePage - 1) * safePageSize)
      .take(safePageSize);
    const [rows, total] = await builder.getManyAndCount();
    return { items: rows.map((row) => this.transactionView(row)), total, page: safePage, pageSize: safePageSize };
  }

  async adminSummary(admin?: AdminContext) {
    return this.summary(this.scope(admin));
  }

  async adminTransactions(admin?: AdminContext, limit = 100) {
    const builder = this.transactions.createQueryBuilder("tx").leftJoinAndSelect("tx.tenant", "tenant").leftJoinAndSelect("tx.user", "user").leftJoinAndSelect("tx.order", "order").leftJoinAndSelect("tx.refund", "refund").orderBy("tx.createdAt", "DESC").take(limit);
    this.applyScope(builder, "tx", admin);
    return builder.getMany();
  }

  async getSetting(admin?: AdminContext) {
    return this.ensureSetting(this.settingTenantId(admin));
  }

  async saveSetting(input: CharitySettingInput, admin?: AdminContext) {
    const setting = await this.ensureSetting(this.settingTenantId(admin));
    const rate = input.ratePercent === undefined ? Number(setting.ratePercent) : Number(input.ratePercent);
    const enabled = input.enabled === undefined ? setting.enabled : Boolean(input.enabled);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new BadRequestException("公益计提比例需在 0-100 之间");
    const basis = input.accrualBasis || setting.accrualBasis || "paid_amount";
    if (!["paid_amount", "original_amount", "manual"].includes(basis)) throw new BadRequestException("公益计提口径不正确");
    setting.enabled = enabled;
    setting.ratePercent = rate.toFixed(2);
    setting.accrualBasis = basis;
    setting.manualBasisAmount = input.manualBasisAmount === undefined || input.manualBasisAmount === null ? null : Math.max(Number(input.manualBasisAmount), 0).toFixed(2);
    setting.userDisplayName = this.cleanText(input.userDisplayName, 80) || setting.userDisplayName || "我的公益贡献";
    setting.publicNote = this.cleanText(input.publicNote, 120) || setting.publicNote || "公益金来自平台订单收入计提，用户无需额外支付。";
    setting.retainOnActivityRefund = input.retainOnActivityRefund === undefined ? setting.retainOnActivityRefund : Boolean(input.retainOnActivityRefund);
    const threshold = input.ambassadorThreshold === undefined ? Number(setting.ambassadorThreshold || 100) : Number(input.ambassadorThreshold);
    setting.ambassadorThreshold = Math.max(Number.isFinite(threshold) ? threshold : 100, 0).toFixed(2);
    setting.ambassadorTitle = this.cleanText(input.ambassadorTitle, 80) || setting.ambassadorTitle || "公益大使";
    return this.settings.save(setting);
  }

  async adminProjects(admin?: AdminContext) {
    const builder = this.projects.createQueryBuilder("project").leftJoinAndSelect("project.tenant", "tenant").orderBy("project.createdAt", "DESC");
    this.applyScope(builder, "project", admin);
    const rows = await builder.getMany();
    return this.projectViews(rows, false);
  }

  async saveProject(input: CharityProjectInput, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTenant(admin);
    const project = id ? await this.projects.findOne({ where: { id } }) : this.projects.create({ tenant });
    if (!project) throw new NotFoundException("公益项目不存在");
    this.assertProjectScope(project, admin);
    const title = this.cleanText(input.title, 120);
    if (!title) throw new BadRequestException("请输入公益项目标题");
    const targetAmount = Number(input.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) throw new BadRequestException("目标金额必须大于 0");
    project.title = title;
    project.targetAmount = targetAmount.toFixed(2);
    project.status = input.status || project.status || "fundraising";
    project.coverUrl = this.cleanText(input.coverUrl, 500) || null;
    project.description = input.description?.trim() || null;
    project.executedAt = input.executedAt ? new Date(input.executedAt) : null;
    project.publicVisible = input.publicVisible === undefined ? project.publicVisible ?? true : Boolean(input.publicVisible);
    if (!id) project.tenant = tenant;
    return this.projectView(await this.projects.save(project));
  }

  async addDisbursement(projectId: number, input: CharityDisbursementInput, admin?: AdminContext) {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("公益项目不存在");
    this.assertProjectScope(project, admin);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("拨付金额必须大于 0");
    const summary = await this.summary(this.scope(admin));
    if (Number(summary.availableAmount) + 0.001 < amount) throw new BadRequestException("公益池可用金额不足");
    const operator = admin?.id ? await this.admins.findOne({ where: { id: admin.id } }) : null;
    return this.disbursements.manager.transaction(async (manager) => {
      const disbursement = await manager.save(CharityProjectDisbursement, manager.create(CharityProjectDisbursement, {
        project,
        tenant: project.tenant || null,
        operator,
        amount: amount.toFixed(2),
        proofUrl: this.cleanText(input.proofUrl, 500) || null,
        publicVisible: input.publicVisible === undefined ? true : Boolean(input.publicVisible),
        remark: input.remark?.trim() || null
      }));
      project.disbursedAmount = (Number(project.disbursedAmount || 0) + amount).toFixed(2);
      if (Number(project.disbursedAmount) >= Number(project.targetAmount)) project.status = "completed";
      const savedProject = await manager.save(CharityProject, project);
      await manager.save(CharityFundTransaction, manager.create(CharityFundTransaction, {
        tenant: project.tenant || null,
        user: null,
        order: null,
        refund: null,
        direction: "debit",
        type: "project_disbursement",
        sourceType: "manual",
        sourceTitle: project.title,
        retainedOnRefund: false,
        certificateEligible: false,
        amount: amount.toFixed(2),
        basisAmount: "0.00",
        ratePercent: "0.00",
        operator: admin?.username || "admin",
        remark: input.remark || `公益项目拨付：${project.title}`,
        idempotencyKey: `project_disbursement:${disbursement.id}`
      }));
      return { project: this.projectView(savedProject), disbursement };
    });
  }

  async adminProjectUpdates(projectId: number, admin?: AdminContext) {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("公益项目不存在");
    this.assertProjectScope(project, admin);
    const [updates, disbursements] = await Promise.all([
      this.projectUpdates.find({ where: { project: { id: projectId } }, order: { publishedAt: "DESC", createdAt: "DESC" } }),
      this.disbursements.find({ where: { project: { id: projectId } }, order: { createdAt: "DESC" } })
    ]);
    return { project: this.projectView(project), updates: updates.map((row) => this.projectUpdateView(row)), disbursements: disbursements.map((row) => this.disbursementView(row)) };
  }

  async saveProjectUpdate(projectId: number, input: CharityProjectUpdateInput, id?: number, admin?: AdminContext) {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("公益项目不存在");
    this.assertProjectScope(project, admin);
    const update = id ? await this.projectUpdates.findOne({ where: { id, project: { id: projectId } } }) : this.projectUpdates.create({ project });
    if (!update) throw new NotFoundException("公益项目动态不存在");
    const title = this.cleanText(input.title, 120);
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!title) throw new BadRequestException("请输入动态标题");
    if (!content) throw new BadRequestException("请输入动态内容");
    update.project = project;
    update.title = title;
    update.content = content;
    update.proofUrl = this.cleanText(input.proofUrl, 500) || null;
    update.publicVisible = input.publicVisible === undefined ? update.publicVisible ?? true : Boolean(input.publicVisible);
    update.publishedAt = input.publishedAt ? this.parseDate(input.publishedAt) : update.publishedAt || new Date();
    return this.projectUpdateView(await this.projectUpdates.save(update));
  }

  async recordOrderAccrual(order: Order, operator = "system") {
    if (!order?.id || Number(order.amount) <= 0) return null;
    const key = `charity_accrual:${order.id}`;
    const existing = await this.findTransactionByKey(key);
    if (existing) return existing;
    const setting = await this.effectiveSetting(order.tenant || null);
    if (!setting.enabled || Number(setting.ratePercent) <= 0) return null;
    const basisAmount = this.orderBasisAmount(order, setting);
    const amount = charityAccrualAmount({ paidAmount: Number(order.amount || 0), originalAmount: Number(order.originalAmount || order.amount || 0), manualBasisAmount: Number(setting.manualBasisAmount || 0), ratePercent: Number(setting.ratePercent), accrualBasis: setting.accrualBasis });
    if (amount <= 0) return null;
    return this.transactions.save(this.transactions.create({
      tenant: order.tenant || null,
      user: order.registration?.user || null,
      order,
      refund: null,
      direction: "credit",
      type: "charity_accrual",
      sourceType: "activity_order",
      sourceTitle: order.registration?.activity?.title || order.orderNo,
      retainedOnRefund: false,
      certificateEligible: true,
      amount: amount.toFixed(2),
      basisAmount: basisAmount.toFixed(2),
      ratePercent: Number(setting.ratePercent).toFixed(2),
      operator,
      remark: `订单公益金计提：${order.orderNo}`,
      idempotencyKey: key
    }));
  }

  async recordRefundReversal(order: Order, refund: Refund, operator = "system") {
    if (this.isRetainedCharityRefund(refund)) return this.markRefundRetained(order, refund, operator);
    if (!order?.id || !refund?.id || Number(refund.amount) <= 0) return null;
    const key = `charity_reversal:${refund.id}`;
    const existing = await this.findTransactionByKey(key);
    if (existing) return existing;
    const accrual = await this.findTransactionByKey(`charity_accrual:${order.id}`);
    if (!accrual) return null;
    const amount = charityReversalAmount(Number(accrual.amount), Number(refund.amount), Number(order.amount));
    if (amount <= 0) return null;
    return this.transactions.save(this.transactions.create({
      tenant: order.tenant || null,
      user: order.registration?.user || null,
      order,
      refund,
      direction: "debit",
      type: "charity_reversal",
      sourceType: "activity_order",
      sourceTitle: order.registration?.activity?.title || order.orderNo,
      retainedOnRefund: false,
      certificateEligible: false,
      amount: amount.toFixed(2),
      basisAmount: Number(refund.amount).toFixed(2),
      ratePercent: accrual.ratePercent,
      operator,
      remark: `订单退款公益金冲回：${refund.refundNo}`,
      idempotencyKey: key
    }));
  }

  async previewRetainedActivityRefund(order: Order) {
    const setting = await this.effectiveSetting(order.tenant || null);
    const accrual = await this.accrualForOrder(order);
    const charityAmount = Number(accrual?.amount || 0) || charityAccrualAmount({ paidAmount: Number(order.amount || 0), originalAmount: Number(order.originalAmount || order.amount || 0), manualBasisAmount: Number(setting.manualBasisAmount || 0), ratePercent: Number(setting.ratePercent), accrualBasis: setting.accrualBasis });
    const refundAmount = roundMoney(Math.max(Number(order.amount || 0) - charityAmount, 0));
    return {
      enabled: Boolean(setting.enabled && setting.retainOnActivityRefund && charityAmount > 0),
      charityAmount: charityAmount.toFixed(2),
      refundAmount: refundAmount.toFixed(2),
      ratePercent: Number(setting.ratePercent).toFixed(2),
      retainOnActivityRefund: Boolean(setting.retainOnActivityRefund)
    };
  }

  async retainedActivityRefundAmount(order: Order) {
    const preview = await this.previewRetainedActivityRefund(order);
    return Number(preview.refundAmount);
  }

  private async summary(scope: CharitySummaryScope = {}) {
    const builder = this.transactions.createQueryBuilder("tx");
    if (scope.tenantId) builder.where("tx.tenantId = :tenantId", { tenantId: scope.tenantId });
    const rows = await builder
      .select("COALESCE(SUM(CASE WHEN tx.direction = 'credit' THEN tx.amount ELSE 0 END), 0)", "totalAccrued")
      .addSelect("COALESCE(SUM(CASE WHEN tx.type = 'charity_reversal' THEN tx.amount ELSE 0 END), 0)", "totalReversed")
      .addSelect("COALESCE(SUM(CASE WHEN tx.type = 'project_disbursement' THEN tx.amount ELSE 0 END), 0)", "totalDisbursed")
      .addSelect("COUNT(DISTINCT tx.userId)", "participantCount")
      .getRawOne<{ totalAccrued: string; totalReversed: string; totalDisbursed: string; participantCount: string }>();
    const totalAccrued = Number(rows?.totalAccrued || 0);
    const totalReversed = Number(rows?.totalReversed || 0);
    const totalDisbursed = Number(rows?.totalDisbursed || 0);
    return {
      totalAccrued: totalAccrued.toFixed(2),
      totalReversed: totalReversed.toFixed(2),
      totalDisbursed: totalDisbursed.toFixed(2),
      availableAmount: Math.max(totalAccrued - totalReversed - totalDisbursed, 0).toFixed(2),
      participantCount: Number(rows?.participantCount || 0)
    };
  }

  private async userContributionAmount(userId: number) {
    const row = await this.transactions
      .createQueryBuilder("tx")
      .select("COALESCE(SUM(CASE WHEN tx.direction = 'credit' THEN tx.amount ELSE -tx.amount END), 0)", "sum")
      .where("tx.userId = :userId", { userId })
      .andWhere("tx.type IN (:...types)", { types: ["charity_accrual", "charity_reversal"] })
      .getRawOne<{ sum: string }>();
    return Math.max(Number(row?.sum || 0), 0);
  }

  private async accrualForOrder(order: Order) {
    if (!order?.id) return null;
    return this.findTransactionByKey(`charity_accrual:${order.id}`);
  }

  private findTransactionByKey(idempotencyKey: string) {
    return this.transactions
      .createQueryBuilder("tx")
      .where("tx.idempotencyKey = :idempotencyKey", { idempotencyKey })
      .getOne();
  }

  private async markRefundRetained(order: Order, refund: Refund, operator = "system") {
    const accrual = await this.accrualForOrder(order);
    if (!accrual) return null;
    if (accrual.retainedOnRefund) return accrual;
    accrual.retainedOnRefund = true;
    accrual.remark = accrual.remark || `订单公益金计提：${order.orderNo}`;
    accrual.operator = operator || accrual.operator;
    return this.transactions.save(accrual);
  }

  private isRetainedCharityRefund(refund: Refund) {
    return String(refund.reason || "").includes("[charity_retained]");
  }

  private async effectiveSetting(tenant: Tenant | null) {
    const tenantSetting = tenant?.id ? await this.settings.findOne({ where: { tenant: { id: tenant.id } } }) : null;
    return tenantSetting || this.ensureSetting(null);
  }

  private async ensureSetting(tenantId: number | null) {
    let setting = tenantId
      ? await this.settings.findOne({ where: { tenant: { id: tenantId } } })
      : await this.settings.createQueryBuilder("setting").leftJoinAndSelect("setting.tenant", "tenant").where("setting.tenantId IS NULL").getOne();
    if (setting) return setting;
    const tenant = tenantId ? await this.tenants.findOne({ where: { id: tenantId } }) : null;
    setting = await this.settings.save(this.settings.create({ tenant: tenant || null }));
    return setting;
  }

  private orderBasisAmount(order: Order, setting: CharityFundSetting) {
    return charityBasisAmount({ paidAmount: Number(order.amount || 0), originalAmount: Number(order.originalAmount || order.amount || 0), manualBasisAmount: Number(setting.manualBasisAmount || 0), ratePercent: Number(setting.ratePercent), accrualBasis: setting.accrualBasis });
  }

  private async projectViews(projects: CharityProject[], publicOnly: boolean) {
    const ids = projects.map((row) => row.id);
    if (!ids.length) return [];
    const [updates, disbursements] = await Promise.all([
      this.projectUpdates.createQueryBuilder("update").leftJoinAndSelect("update.project", "project").where("update.projectId IN (:...ids)", { ids }).andWhere(publicOnly ? "update.publicVisible = :visible" : "1=1", { visible: true }).orderBy("update.publishedAt", "DESC").addOrderBy("update.createdAt", "DESC").getMany(),
      this.disbursements.createQueryBuilder("disbursement").leftJoinAndSelect("disbursement.project", "project").leftJoinAndSelect("disbursement.operator", "operator").where("disbursement.projectId IN (:...ids)", { ids }).andWhere(publicOnly ? "disbursement.publicVisible = :visible" : "1=1", { visible: true }).orderBy("disbursement.createdAt", "DESC").getMany()
    ]);
    return projects.map((project) => ({
      ...this.projectView(project),
      updates: updates.filter((row: any) => row.project?.id === project.id).slice(0, 3).map((row) => this.projectUpdateView(row)),
      disbursements: disbursements.filter((row: any) => row.project?.id === project.id).slice(0, 5).map((row) => this.disbursementView(row))
    }));
  }

  private projectView(project: CharityProject) {
    const target = Number(project.targetAmount || 0);
    const disbursed = Number(project.disbursedAmount || 0);
    return {
      ...project,
      progressPercent: target > 0 ? Math.min(Number(((disbursed / target) * 100).toFixed(2)), 100) : 0
    };
  }

  private projectUpdateView(row: CharityProjectUpdate) {
    return { ...row, project: row.project ? { id: row.project.id, title: row.project.title } : null };
  }

  private disbursementView(row: CharityProjectDisbursement) {
    return { ...row, project: row.project ? { id: row.project.id, title: row.project.title } : null, operator: row.operator ? { id: row.operator.id, username: row.operator.username } : null };
  }

  private transactionView(tx: CharityFundTransaction) {
    const order = tx.order;
    const refund = tx.refund;
    const paidAmount = Number(order?.amount || 0);
    const amount = Number(tx.amount || 0);
    const retained = Boolean(tx.retainedOnRefund);
    return {
      ...tx,
      sourceTitle: tx.sourceTitle || order?.registration?.activity?.title || order?.orderNo || "公益流水",
      paidAmount: paidAmount.toFixed(2),
      charityAmount: amount.toFixed(2),
      refundAmount: retained ? Math.max(paidAmount - amount, 0).toFixed(2) : refund ? Number(refund.amount || 0).toFixed(2) : "0.00",
      orderNo: order?.orderNo || null,
      activityTitle: order?.registration?.activity?.title || null,
      refundStatus: refund?.status || (retained ? "retained" : null)
    };
  }

  private ambassadorView(userId: number, contribution: number, setting: CharityFundSetting) {
    const threshold = Number(setting.ambassadorThreshold || 0);
    const eligible = threshold > 0 && contribution + 0.001 >= threshold;
    return {
      eligible,
      title: setting.ambassadorTitle || "公益大使",
      threshold: threshold.toFixed(2),
      number: eligible ? `No.${String(userId).padStart(6, "0")}` : null
    };
  }

  private publicSetting(setting: CharityFundSetting) {
    return { enabled: setting.enabled, ratePercent: setting.ratePercent, userDisplayName: setting.userDisplayName, publicNote: setting.publicNote, retainOnActivityRefund: setting.retainOnActivityRefund, ambassadorThreshold: setting.ambassadorThreshold, ambassadorTitle: setting.ambassadorTitle };
  }

  private scope(admin?: AdminContext): CharitySummaryScope {
    return admin?.tenantId ? { tenantId: admin.tenantId } : {};
  }

  private settingTenantId(admin?: AdminContext) {
    return admin?.tenantId || null;
  }

  private applyScope(builder: any, alias: string, admin?: AdminContext) {
    if (admin?.tenantId) builder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: admin.tenantId });
  }

  private async adminTenant(admin?: AdminContext) {
    return admin?.tenantId ? await this.tenants.findOne({ where: { id: admin.tenantId } }) : null;
  }

  private assertProjectScope(project: CharityProject, admin?: AdminContext) {
    if (admin?.tenantId && project.tenant?.id !== admin.tenantId) throw new NotFoundException("公益项目不存在");
  }

  private cleanText(value: unknown, maxLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    return text.slice(0, maxLength);
  }

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("日期格式不正确");
    return date;
  }

  private roundMoney(value: number) {
    return roundMoney(value);
  }
}
