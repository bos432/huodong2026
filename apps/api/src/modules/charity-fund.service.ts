import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { DataSource, Repository } from "typeorm";
import { AdminUser } from "../entities/admin-user.entity";
import { CharityFundAccount } from "../entities/charity-fund-account.entity";
import { CharityAccrualBasis, CharityFundSetting } from "../entities/charity-fund-setting.entity";
import { CharityFundTransaction } from "../entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "../entities/charity-project-disbursement.entity";
import { CharityProjectEvent } from "../entities/charity-project-event.entity";
import { CharityProject, CharityProjectStatus } from "../entities/charity-project.entity";
import { CharityProjectUpdate } from "../entities/charity-project-update.entity";
import { Order } from "../entities/order.entity";
import { Refund } from "../entities/refund.entity";
import { Tenant } from "../entities/tenant.entity";
import { User } from "../entities/user.entity";
import { cappedCharityReversalFen, hasSeparatedCharityActors } from "../shared/charity-fund-governance";
import { charityLedgerBusinessKey, charityLedgerEntryHash } from "../shared/charity-ledger-hash";
import { charityContributionCertificateNo, charityContributionCertificateStatus, isCharityContributionCertificateEligible, maskCharityContributionHolder } from "../shared/charity-contribution-certificate";
import { maskPhone } from "../shared/data-masking";
import { fenToYuan, yuanToFen } from "../shared/money";
import { charityAccrualAmount, charityBasisAmount, charityReversalAmount, roundMoney } from "./charity-fund-calculator";
import { renderCharityContributionSvg } from "../shared/certificate-svg";
import { CredentialTemplateService } from "./credential-templates/credential-template.service";

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
export type CharityDisbursementInput = { amount: number; proofUrl?: string | null; remark?: string | null; publicVisible?: boolean; stageNo?: number; businessKey: string };
export type CharityDisbursementReviewInput = { decision: "approve" | "reject"; remark: string; businessKey: string };
export type CharityDisbursementPayInput = { paidReference?: string | null; proofUrl?: string | null; remark?: string | null; businessKey: string };
export type CharityDisbursementCancelInput = { remark: string; businessKey: string };
export type CharityProjectUpdateInput = { title: string; content: string; proofUrl?: string | null; publicVisible?: boolean; publishedAt?: string | null };
export type CharityProjectReviewInput = { decision: "approve" | "reject"; remark: string; businessKey: string };
export type CharityProjectActionInput = { action: "submit" | "start_execution" | "submit_acceptance" | "complete" | "archive"; remark?: string | null; businessKey: string };
type CharityLedgerEntryInput = {
  tenant: Tenant | null;
  user?: User | null;
  order?: Order | null;
  refund?: Refund | null;
  project?: CharityProject | null;
  disbursement?: CharityProjectDisbursement | null;
  direction: CharityFundTransaction["direction"];
  type: CharityFundTransaction["type"];
  sourceType: CharityFundTransaction["sourceType"];
  sourceTitle?: string | null;
  amountFen: number;
  basisAmountFen?: number;
  ratePercent?: string;
  operator?: string | null;
  remark?: string | null;
  idempotencyKey: string;
  retainedOnRefund?: boolean;
  certificateEligible?: boolean;
  businessSnapshot?: Record<string, unknown> | null;
  releaseReservedFen?: number;
};

@Injectable()
export class CharityFundService {
  constructor(
    @InjectRepository(CharityFundSetting) private readonly settings: Repository<CharityFundSetting>,
    @InjectRepository(CharityFundAccount) private readonly accounts: Repository<CharityFundAccount>,
    @InjectRepository(CharityFundTransaction) private readonly transactions: Repository<CharityFundTransaction>,
    @InjectRepository(CharityProject) private readonly projects: Repository<CharityProject>,
    @InjectRepository(CharityProjectDisbursement) private readonly disbursements: Repository<CharityProjectDisbursement>,
    @InjectRepository(CharityProjectEvent) private readonly projectEvents: Repository<CharityProjectEvent>,
    @InjectRepository(CharityProjectUpdate) private readonly projectUpdates: Repository<CharityProjectUpdate>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    private readonly dataSource: DataSource,
    private readonly credentialTemplates: CredentialTemplateService
  ) {}

  async publicSummary() {
    const [setting, summary, projects, integrity, fundEntries] = await Promise.all([this.ensureSetting(null), this.summary(), this.publicProjects(4), this.ledgerIntegrity({}), this.publicFundEntries(20)]);
    return { setting: this.publicSetting(setting), ...summary, ledgerIntegrity: { consistent: integrity.consistent, checkedEntries: integrity.checkedEntries, legacyEntries: integrity.legacyEntries }, projects, fundEntries };
  }

  async publicProjects(limit = 20) {
    const rows = await this.projects.createQueryBuilder("project").leftJoinAndSelect("project.tenant", "tenant").where("project.publicVisible = :visible", { visible: true }).andWhere("project.status IN (:...statuses)", { statuses: ["approved", "fundraising", "pending_execution", "executing", "pending_acceptance", "completed", "archived"] }).orderBy("project.createdAt", "DESC").take(limit).getMany();
    return this.projectViews(rows, true);
  }

  async publicFundEntries(limit = 20) {
    const rows = await this.transactions.createQueryBuilder("tx")
      .leftJoinAndSelect("tx.project", "project")
      .leftJoinAndSelect("tx.disbursement", "disbursement")
      .where("tx.type <> :disbursementType OR (disbursement.status = :paidStatus AND disbursement.publicVisible = :visible AND project.publicVisible = :visible AND project.status IN (:...publicProjectStatuses))", { disbursementType: "project_disbursement", paidStatus: "paid", visible: true, publicProjectStatuses: ["approved", "fundraising", "pending_execution", "executing", "pending_acceptance", "completed", "archived"] })
      .orderBy("tx.createdAt", "DESC")
      .take(Math.min(Math.max(Number(limit || 20), 1), 100))
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      type: row.type,
      sourceType: row.sourceType,
      sourceTitle: row.type === "project_disbursement" ? row.project?.title || "公益项目拨付" : row.sourceType === "activity_order" ? "活动订单资金计提" : "公益资金流水",
      amount: row.type === "charity_retention" ? fenToYuan(Number(row.businessSnapshot?.retainedAmountFen || 0)) : row.amount,
      ledgerAmount: row.amount,
      ratePercent: row.ratePercent,
      retainedOnRefund: row.retainedOnRefund,
      project: row.project ? { projectNo: row.project.projectNo, title: row.project.title } : null,
      proofUrl: row.type === "project_disbursement" ? row.disbursement?.proofUrl || null : null,
      paidReference: row.type === "project_disbursement" ? this.maskReference(row.disbursement?.paidReference) : null,
      createdAt: row.createdAt
    }));
  }

  async publicProjectUpdates(projectId: number) {
    const project = await this.projects.createQueryBuilder("project").where("project.id = :projectId", { projectId }).andWhere("project.publicVisible = :visible", { visible: true }).andWhere("project.status IN (:...statuses)", { statuses: ["approved", "fundraising", "pending_execution", "executing", "pending_acceptance", "completed", "archived"] }).getOne();
    if (!project) throw new NotFoundException("公益项目不存在");
    const [updates, disbursements] = await Promise.all([
      this.projectUpdates.find({ where: { project: { id: projectId }, publicVisible: true }, order: { publishedAt: "DESC", createdAt: "DESC" } }),
      this.disbursements.find({ where: { project: { id: projectId }, publicVisible: true, status: "paid" }, order: { createdAt: "DESC" } })
    ]);
    return { project: this.publicProjectView(project), updates: updates.map((row) => this.projectUpdateView(row)), disbursements: disbursements.map((row) => this.publicDisbursementView(row)) };
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
      .andWhere("tx.type IN (:...types)", { types: ["charity_accrual", "charity_reversal", "charity_retention"] })
      .orderBy("tx.createdAt", "DESC")
      .skip((safePage - 1) * safePageSize)
      .take(safePageSize);
    const [rows, total] = await builder.getManyAndCount();
    return { items: rows.map((row) => this.transactionView(row)), total, page: safePage, pageSize: safePageSize };
  }

  async adminSummary(admin?: AdminContext) {
    const scope = this.scope(admin);
    const [summary, ledgerIntegrity] = await Promise.all([this.summary(scope), this.ledgerIntegrity(scope)]);
    return { ...summary, ledgerIntegrity };
  }

  async userContributionCertificate(user: User, transactionId: number) {
    const tx = await this.contributionCertificateTransaction(transactionId, user.id);
    const template = await this.credentialTemplates.ensureCharitySnapshot(tx);
    const view = await this.contributionCertificateView(tx, false);
    return renderCharityContributionSvg({ ...view, holderName: user.nickname || user.phone || `用户${user.id}`, template: template.config });
  }

  async verifyContributionCertificate(certificateNo: string) {
    const tx = await this.contributionCertificateByNo(certificateNo);
    const template = await this.credentialTemplates.ensureCharitySnapshot(tx);
    const view = await this.contributionCertificateView(tx, template.config.publicHolderMode !== "full", template.config.publicHolderMode === "hidden");
    return {
      certificateNo: view.certificateNo,
      name: "公益贡献凭证",
      holderName: view.holderName,
      contributionAmount: view.contributionAmount.toFixed(2),
      sourceTitle: view.sourceTitle,
      orderNo: view.orderNo,
      issuedAt: view.issuedAt,
      status: view.status,
      statement: template.config.statement,
      verify: { valid: view.status !== "reversed", adjusted: view.status === "adjusted" }
    };
  }

  async contributionCertificateImage(certificateNo: string) {
    const tx = await this.contributionCertificateByNo(certificateNo);
    const template = await this.credentialTemplates.ensureCharitySnapshot(tx);
    const view = await this.contributionCertificateView(tx, template.config.publicHolderMode !== "full", template.config.publicHolderMode === "hidden");
    return renderCharityContributionSvg({ ...view, template: template.config });
  }

  async adminContributionCertificateImage(transactionId: number, admin?: AdminContext) {
    const tx = await this.contributionCertificateTransaction(transactionId, undefined, admin);
    const template = await this.credentialTemplates.ensureCharitySnapshot(tx);
    const view = await this.contributionCertificateView(tx, false);
    return renderCharityContributionSvg({ ...view, template: template.config });
  }

  async adminTransactions(admin?: AdminContext, limit = 100) {
    const builder = this.transactions.createQueryBuilder("tx").leftJoinAndSelect("tx.account", "account").leftJoinAndSelect("tx.tenant", "tenant").leftJoinAndSelect("tx.user", "user").leftJoinAndSelect("tx.order", "order").leftJoinAndSelect("tx.refund", "refund").leftJoinAndSelect("tx.project", "project").leftJoinAndSelect("tx.disbursement", "disbursement").orderBy("tx.createdAt", "DESC").take(limit);
    this.applyScope(builder, "tx", admin);
    return (await builder.getMany()).map((row) => this.adminTransactionView(row));
  }

  async adminTransactionsPage(admin: AdminContext | undefined, options: { page?: number; pageSize?: number; keyword?: string; type?: string; sourceType?: string }) {
    const page = Math.max(Number(options.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(options.pageSize || 20), 1), 100);
    const builder = this.transactions.createQueryBuilder("tx")
      .leftJoinAndSelect("tx.account", "account")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .leftJoinAndSelect("tx.user", "user")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("tx.refund", "refund")
      .leftJoinAndSelect("tx.project", "project")
      .leftJoinAndSelect("tx.disbursement", "disbursement")
      .orderBy("tx.createdAt", "DESC");
    this.applyScope(builder, "tx", admin);
    const keyword = String(options.keyword || "").trim();
    if (keyword) builder.andWhere("(order.orderNo LIKE :keyword OR tx.sourceTitle LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR tx.remark LIKE :keyword)", { keyword: `%${keyword}%` });
    if (options.type) builder.andWhere("tx.type = :type", { type: options.type });
    if (options.sourceType) builder.andWhere("tx.sourceType = :sourceType", { sourceType: options.sourceType });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.adminTransactionView(row)), total, page, pageSize };
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
    const applicant = admin?.id ? await this.admins.findOne({ where: { id: admin.id } }) : null;
    const project = id ? await this.projects.findOne({ where: { id } }) : this.projects.create({ tenant, projectNo: this.nextCharityProjectNo(), applicant, reviewer: null, status: "draft", submitBusinessKey: null, reviewBusinessKey: null, submittedAt: null, reviewedAt: null, reviewRemark: null, applicationSnapshot: null });
    if (!project) throw new NotFoundException("公益项目不存在");
    this.assertProjectScope(project, admin);
    const title = this.cleanText(input.title, 120);
    if (!title) throw new BadRequestException("请输入公益项目标题");
    const targetAmount = Number(input.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) throw new BadRequestException("目标金额必须大于 0");
    const coverUrl = this.cleanText(input.coverUrl, 500) || null;
    const description = input.description?.trim() || null;
    if (id && !["draft", "rejected"].includes(project.status)) {
      if (project.title !== title || yuanToFen(project.targetAmount) !== yuanToFen(targetAmount.toFixed(2)) || project.coverUrl !== coverUrl || project.description !== description) throw new BadRequestException("项目提交审核后不能直接修改标题、目标、封面或说明，请归档后新建项目或通过正式变更流程处理");
    } else {
      project.title = title;
      project.targetAmount = targetAmount.toFixed(2);
      project.coverUrl = coverUrl;
      project.description = description;
    }
    if (!id) project.status = "draft";
    if (!id || ["draft", "rejected"].includes(project.status)) project.executedAt = input.executedAt ? this.parseDate(input.executedAt) : null;
    project.publicVisible = input.publicVisible === undefined ? project.publicVisible ?? true : Boolean(input.publicVisible);
    if (!id) {
      project.tenant = tenant;
      project.applicant = applicant;
    }
    const saved = await this.projects.save(project);
    if (!id) await this.saveProjectEvent(this.dataSource.manager, saved, { businessKey: `charity-project-created:${saved.projectNo}`, action: "created", fromStatus: null, toStatus: "draft", admin, remark: "创建公益项目草稿" });
    return this.projectView(saved);
  }

  async actionProject(id: number, input: CharityProjectActionInput, admin?: AdminContext) {
    if (!admin?.id) throw new BadRequestException("公益项目操作必须记录管理员");
    const businessKey = this.normalizeCharityBusinessKey(input.businessKey, "项目操作业务键");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CharityProject);
      const project = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!project) throw new NotFoundException("公益项目不存在");
      this.assertProjectScope(project, admin);
      const replay = await manager.getRepository(CharityProjectEvent).findOne({ where: { businessKey } });
      if (replay) {
        if (replay.project.id !== project.id) throw new BadRequestException("项目操作业务键已被其他项目使用");
        return this.projectView(project);
      }
      const operator = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!operator) throw new BadRequestException("项目操作人不存在或已停用");
      const fromStatus = project.status;
      const transitions: Record<CharityProjectActionInput["action"], { from: CharityProjectStatus[]; to: CharityProjectStatus }> = {
        submit: { from: ["draft", "rejected"], to: "pending_review" },
        start_execution: { from: ["approved", "fundraising", "pending_execution"], to: "executing" },
        submit_acceptance: { from: ["executing"], to: "pending_acceptance" },
        complete: { from: ["pending_acceptance"], to: "completed" },
        archive: { from: ["completed"], to: "archived" }
      };
      const transition = transitions[input.action];
      if (!transition.from.includes(project.status)) throw new BadRequestException(`项目当前状态 ${project.status} 不能执行 ${input.action}`);
      project.status = transition.to;
      if (input.action === "submit") {
        project.applicant = operator;
        project.submitBusinessKey = businessKey;
        project.submittedAt = new Date();
        project.reviewer = null;
        project.reviewBusinessKey = null;
        project.reviewedAt = null;
        project.reviewRemark = null;
        project.applicationSnapshot = { projectNo: project.projectNo, title: project.title, targetAmount: project.targetAmount, description: project.description, coverUrl: project.coverUrl, publicVisible: project.publicVisible, submittedByAdminId: operator.id };
      }
      if (input.action === "complete") project.executedAt = project.executedAt || new Date();
      const saved = await repo.save(project);
      await this.saveProjectEvent(manager, saved, { businessKey, action: input.action, fromStatus, toStatus: saved.status, admin, remark: input.remark || null });
      return this.projectView(saved);
    });
  }

  async reviewProject(id: number, input: CharityProjectReviewInput, admin?: AdminContext) {
    if (!admin?.id) throw new BadRequestException("公益项目审核必须记录审核人");
    const businessKey = this.normalizeCharityBusinessKey(input.businessKey, "项目审核业务键");
    const remark = this.cleanText(input.remark, 500);
    if (!remark) throw new BadRequestException("请填写项目审核意见");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CharityProject);
      const project = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!project) throw new NotFoundException("公益项目不存在");
      this.assertProjectScope(project, admin);
      const replay = await manager.getRepository(CharityProjectEvent).findOne({ where: { businessKey } });
      if (replay) {
        if (replay.project.id !== project.id) throw new BadRequestException("项目审核业务键已被其他项目使用");
        return this.projectView(project);
      }
      if (project.status !== "pending_review") throw new BadRequestException("只有待审核公益项目可以复核");
      if (project.applicant?.id === admin.id) throw new BadRequestException("项目申请人与审核人必须是不同管理员");
      const reviewer = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!reviewer) throw new BadRequestException("项目审核人不存在或已停用");
      const fromStatus = project.status;
      project.status = input.decision === "approve" ? "approved" : "rejected";
      project.reviewer = reviewer;
      project.reviewBusinessKey = businessKey;
      project.reviewedAt = new Date();
      project.reviewRemark = remark;
      const saved = await repo.save(project);
      await this.saveProjectEvent(manager, saved, { businessKey, action: input.decision === "approve" ? "review_approved" : "review_rejected", fromStatus, toStatus: saved.status, admin, remark });
      return this.projectView(saved);
    });
  }

  async addDisbursement(projectId: number, input: CharityDisbursementInput, admin?: AdminContext) {
    if (!admin?.id) throw new BadRequestException("拨款申请必须记录提交人");
    const amountFen = yuanToFen(Number(input.amount).toFixed(2));
    if (amountFen <= 0) throw new BadRequestException("拨付金额必须大于 0");
    const businessKey = this.normalizeCharityBusinessKey(input.businessKey, "拨款申请业务键");
    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(CharityProject);
      const project = await projectRepo.findOne({ where: { id: projectId }, lock: { mode: "pessimistic_write" } });
      if (!project) throw new NotFoundException("公益项目不存在");
      this.assertProjectScope(project, admin);
      if (!["approved", "fundraising", "pending_execution", "executing"].includes(project.status)) throw new BadRequestException("只有已审核且未结项的公益项目可以申请拨款");
      const repo = manager.getRepository(CharityProjectDisbursement);
      const replay = await repo.findOne({ where: { businessKey } });
      if (replay) {
        if (replay.project.id !== project.id) throw new BadRequestException("拨款申请业务键已被其他项目使用");
        return { project: this.projectView(project), disbursement: this.disbursementView(replay) };
      }
      if (await manager.getRepository(CharityProjectEvent).findOne({ where: { businessKey } })) throw new BadRequestException("拨款申请业务键已被其他操作使用");
      const committed = await repo.createQueryBuilder("disbursement")
        .select("COALESCE(SUM(disbursement.amountFen), 0)", "sum")
        .where("disbursement.projectId = :projectId", { projectId })
        .andWhere("disbursement.status IN (:...statuses)", { statuses: ["pending_review", "approved", "paid"] })
        .getRawOne<{ sum: string }>();
      const targetFen = yuanToFen(project.targetAmount);
      if (Number(committed?.sum || 0) + amountFen > targetFen) throw new BadRequestException(`拨款申请超过项目预算，剩余可申请 ${fenToYuan(Math.max(targetFen - Number(committed?.sum || 0), 0))} 元`);
      const requester = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!requester) throw new BadRequestException("拨款申请人不存在或已停用");
      const disbursement = await repo.save(repo.create({
        businessKey,
        project,
        tenant: project.tenant || null,
        operator: requester,
        requestedBy: requester,
        reviewedBy: null,
        paidBy: null,
        cancelledBy: null,
        stageNo: Math.max(Number(input.stageNo || 1), 1),
        status: "pending_review",
        amount: fenToYuan(amountFen),
        amountFen,
        proofUrl: this.cleanText(input.proofUrl, 500) || null,
        publicVisible: input.publicVisible === undefined ? true : Boolean(input.publicVisible),
        remark: input.remark?.trim() || null,
        reviewRemark: null,
        reviewBusinessKey: null,
        paidReference: null,
        paidRemark: null,
        payBusinessKey: null,
        reviewedAt: null,
        paidAt: null,
        cancelledAt: null,
        cancelRemark: null,
        cancelBusinessKey: null,
        requestSnapshot: { projectId: project.id, projectTitle: project.title, targetAmount: project.targetAmount, committedAmountFen: Number(committed?.sum || 0), amountFen, stageNo: Math.max(Number(input.stageNo || 1), 1) }
      }));
      await this.saveProjectEvent(manager, project, { businessKey, action: "disbursement_requested", fromStatus: project.status, toStatus: project.status, admin, remark: disbursement.remark, extraSnapshot: { disbursementId: disbursement.id, amountFen, stageNo: disbursement.stageNo, disbursementStatus: disbursement.status } });
      return { project: this.projectView(project), disbursement: this.disbursementView(disbursement) };
    });
  }

  async reviewDisbursement(id: number, input: CharityDisbursementReviewInput, admin?: AdminContext) {
    if (!admin?.id) throw new BadRequestException("拨款复核必须记录审核人");
    const businessKey = this.normalizeCharityBusinessKey(input.businessKey, "拨款复核业务键");
    const remark = this.cleanText(input.remark, 500);
    if (!remark) throw new BadRequestException("请填写拨款复核意见");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CharityProjectDisbursement);
      const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("公益拨款申请不存在");
      this.assertProjectScope(row.project, admin);
      const eventReplay = await manager.getRepository(CharityProjectEvent).findOne({ where: { businessKey } });
      if (eventReplay) {
        if (Number(eventReplay.snapshot?.disbursementId || 0) !== row.id || eventReplay.action !== `disbursement_review_${input.decision}`) throw new BadRequestException("拨款复核业务键已被其他操作使用");
        return this.disbursementView(row);
      }
      if (row.reviewBusinessKey) throw new BadRequestException("该拨款申请已完成复核");
      if (row.status !== "pending_review") throw new BadRequestException("只有待复核拨款申请可以审核");
      if (row.requestedBy?.id === admin.id) throw new BadRequestException("拨款申请人与复核人必须是不同管理员");
      const reviewer = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!reviewer) throw new BadRequestException("拨款复核人不存在或已停用");
      if (input.decision === "approve") {
        const account = await this.lockedCharityAccount(manager, row.tenant || null);
        const availableFen = Number(account.balanceFen || 0) - Number(account.reservedFen || 0);
        if (availableFen < Number(row.amountFen || 0)) throw new BadRequestException(`公益池可用金额不足，当前可审批 ${fenToYuan(Math.max(availableFen, 0))} 元`);
        account.reservedFen = Number(account.reservedFen || 0) + Number(row.amountFen || 0);
        await manager.getRepository(CharityFundAccount).save(account);
        row.status = "approved";
      } else {
        row.status = "rejected";
      }
      row.reviewedBy = reviewer;
      row.reviewedAt = new Date();
      row.reviewRemark = remark;
      row.reviewBusinessKey = businessKey;
      const saved = await repo.save(row);
      await this.saveProjectEvent(manager, row.project, { businessKey, action: `disbursement_review_${input.decision}`, fromStatus: row.project.status, toStatus: row.project.status, admin, remark, extraSnapshot: { disbursementId: row.id, amountFen: Number(row.amountFen || 0), stageNo: row.stageNo, disbursementStatus: saved.status } });
      return this.disbursementView(saved);
    });
  }

  async payDisbursement(id: number, input: CharityDisbursementPayInput, admin?: AdminContext) {
    if (!admin?.id) throw new BadRequestException("拨款付款必须记录付款人");
    const businessKey = this.normalizeCharityBusinessKey(input.businessKey, "拨款付款业务键");
    const paidReference = this.cleanText(input.paidReference, 120) || null;
    const proofUrl = this.cleanText(input.proofUrl, 500) || null;
    if (!paidReference && !proofUrl) throw new BadRequestException("请填写付款流水号或上传付款凭证");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CharityProjectDisbursement);
      const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("公益拨款申请不存在");
      this.assertProjectScope(row.project, admin);
      const eventReplay = await manager.getRepository(CharityProjectEvent).findOne({ where: { businessKey } });
      if (eventReplay) {
        if (Number(eventReplay.snapshot?.disbursementId || 0) !== row.id || eventReplay.action !== "disbursement_paid") throw new BadRequestException("拨款付款业务键已被其他操作使用");
        return { project: this.projectView(row.project), disbursement: this.disbursementView(row) };
      }
      if (row.payBusinessKey) throw new BadRequestException("该拨款申请已完成付款");
      if (row.status !== "approved") throw new BadRequestException("只有已复核拨款申请可以付款");
      const payer = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!payer) throw new BadRequestException("拨款付款人不存在或已停用");
      if (!hasSeparatedCharityActors(row.requestedBy?.id, row.reviewedBy?.id, payer.id)) throw new BadRequestException("拨款申请人、复核人和付款人必须为三个不同管理员");
      const projectRepo = manager.getRepository(CharityProject);
      const project = await projectRepo.findOne({ where: { id: row.project.id }, lock: { mode: "pessimistic_write" } });
      if (!project) throw new NotFoundException("公益项目不存在");
      const amountFen = Number(row.amountFen || 0);
      await this.appendLedgerEntry(manager, {
        tenant: row.tenant || null,
        project,
        disbursement: row,
        direction: "debit",
        type: "project_disbursement",
        sourceType: "charity_project",
        sourceTitle: project.title,
        amountFen,
        operator: admin.username || "finance",
        remark: input.remark || row.remark || `公益项目第 ${row.stageNo} 阶段拨款`,
        idempotencyKey: charityLedgerBusinessKey("charity-pay", businessKey),
        certificateEligible: false,
        releaseReservedFen: amountFen,
        businessSnapshot: { projectId: project.id, projectTitle: project.title, disbursementId: row.id, stageNo: row.stageNo, reviewBusinessKey: row.reviewBusinessKey, paidReference, proofUrl }
      });
      row.status = "paid";
      row.paidBy = payer;
      row.operator = payer;
      row.paidAt = new Date();
      row.paidReference = paidReference;
      row.proofUrl = proofUrl || row.proofUrl;
      row.paidRemark = input.remark?.trim() || null;
      row.payBusinessKey = businessKey;
      const paidFen = yuanToFen(project.disbursedAmount) + amountFen;
      project.disbursedAmount = fenToYuan(paidFen);
      project.status = paidFen >= yuanToFen(project.targetAmount) ? "pending_acceptance" : "executing";
      await projectRepo.save(project);
      const saved = await repo.save(row);
      await this.saveProjectEvent(manager, project, { businessKey, action: "disbursement_paid", fromStatus: row.project.status, toStatus: project.status, admin, remark: row.paidRemark || row.remark, extraSnapshot: { disbursementId: row.id, amountFen, stageNo: row.stageNo, disbursementStatus: saved.status, paidReference: this.maskReference(paidReference), proofUrl: row.proofUrl } });
      return { project: this.projectView(project), disbursement: this.disbursementView(saved) };
    });
  }

  async cancelDisbursement(id: number, input: CharityDisbursementCancelInput, admin?: AdminContext) {
    if (!admin?.id) throw new BadRequestException("取消拨款必须记录操作人");
    const businessKey = this.normalizeCharityBusinessKey(input.businessKey, "拨款取消业务键");
    const remark = this.cleanText(input.remark, 500);
    if (!remark) throw new BadRequestException("请填写取消拨款原因");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CharityProjectDisbursement);
      const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("公益拨款申请不存在");
      this.assertProjectScope(row.project, admin);
      const eventReplay = await manager.getRepository(CharityProjectEvent).findOne({ where: { businessKey } });
      if (eventReplay) {
        if (Number(eventReplay.snapshot?.disbursementId || 0) !== row.id || eventReplay.action !== "disbursement_cancelled") throw new BadRequestException("拨款取消业务键已被其他操作使用");
        return this.disbursementView(row);
      }
      if (!["pending_review", "approved"].includes(row.status)) throw new BadRequestException("只有待复核或已复核未付款的拨款可以取消");
      const canceller = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!canceller) throw new BadRequestException("取消拨款操作人不存在或已停用");
      if (row.status === "approved") {
        const account = await this.lockedCharityAccount(manager, row.tenant || null);
        const amountFen = Number(row.amountFen || 0);
        if (Number(account.reservedFen || 0) < amountFen) throw new BadRequestException("公益资金冻结额度不足，禁止取消并需先核对账务");
        account.reservedFen = Number(account.reservedFen || 0) - amountFen;
        await manager.getRepository(CharityFundAccount).save(account);
      }
      row.status = "cancelled";
      row.cancelledBy = canceller;
      row.cancelledAt = new Date();
      row.cancelRemark = remark;
      row.cancelBusinessKey = businessKey;
      const saved = await repo.save(row);
      await this.saveProjectEvent(manager, row.project, { businessKey, action: "disbursement_cancelled", fromStatus: row.project.status, toStatus: row.project.status, admin, remark, extraSnapshot: { disbursementId: row.id, amountFen: Number(row.amountFen || 0), stageNo: row.stageNo, disbursementStatus: saved.status } });
      return this.disbursementView(saved);
    });
  }

  async adminProjectUpdates(projectId: number, admin?: AdminContext) {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("公益项目不存在");
    this.assertProjectScope(project, admin);
    const [updates, disbursements, events] = await Promise.all([
      this.projectUpdates.find({ where: { project: { id: projectId } }, order: { publishedAt: "DESC", createdAt: "DESC" } }),
      this.disbursements.find({ where: { project: { id: projectId } }, order: { createdAt: "DESC" } }),
      this.projectEvents.find({ where: { project: { id: projectId } }, order: { createdAt: "ASC", id: "ASC" } })
    ]);
    return { project: this.projectView(project), updates: updates.map((row) => this.projectUpdateView(row)), disbursements: disbursements.map((row) => this.disbursementView(row)), events: events.map((row) => this.projectEventView(row)) };
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
    const setting = await this.effectiveSetting(order.tenant || null);
    if (!setting.enabled || Number(setting.ratePercent) <= 0) return null;
    const basisAmount = this.orderBasisAmount(order, setting);
    const amount = charityAccrualAmount({ paidAmount: Number(order.amount || 0), originalAmount: Number(order.originalAmount || order.amount || 0), manualBasisAmount: Number(setting.manualBasisAmount || 0), ratePercent: Number(setting.ratePercent), accrualBasis: setting.accrualBasis });
    if (amount <= 0) return null;
    return this.dataSource.transaction((manager) => this.appendLedgerEntry(manager, {
      tenant: order.tenant || null,
      user: order.registration?.user || null,
      order,
      refund: null,
      direction: "credit",
      type: "charity_accrual",
      sourceType: "activity_order",
      sourceTitle: order.registration?.activity?.title || order.orderNo,
      amountFen: yuanToFen(amount.toFixed(2)),
      basisAmountFen: yuanToFen(basisAmount.toFixed(2)),
      ratePercent: Number(setting.ratePercent).toFixed(2),
      operator,
      remark: `订单公益金计提：${order.orderNo}`,
      idempotencyKey: key,
      certificateEligible: true,
      businessSnapshot: { orderId: order.id, orderNo: order.orderNo, paidAmount: order.amount, originalAmount: order.originalAmount, accrualBasis: setting.accrualBasis, ratePercent: setting.ratePercent }
    }));
  }

  async recordRefundReversal(order: Order, refund: Refund, operator = "system") {
    if (this.isRetainedCharityRefund(refund)) return this.recordRefundRetention(order, refund, operator);
    if (!order?.id || !refund?.id || Number(refund.amount) <= 0) return null;
    const key = `charity_reversal:${refund.id}`;
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(CharityFundTransaction);
      const replay = await txRepo.findOne({ where: { idempotencyKey: key }, loadEagerRelations: false });
      if (replay) return replay;
      await this.lockedCharityAccount(manager, order.tenant || null);
      const accrual = await txRepo.findOne({ where: { idempotencyKey: `charity_accrual:${order.id}` }, loadEagerRelations: false });
      if (!accrual) return null;
      const requestedFen = yuanToFen(charityReversalAmount(Number(accrual.amount), Number(refund.amount), Number(order.amount)).toFixed(2));
      const reversed = await txRepo.createQueryBuilder("tx")
        .select("COALESCE(SUM(tx.amountFen), 0)", "sum")
        .where("tx.orderId = :orderId", { orderId: order.id })
        .andWhere("tx.type = :type", { type: "charity_reversal" })
        .getRawOne<{ sum: string }>();
      const amountFen = cappedCharityReversalFen(Number(accrual.amountFen || yuanToFen(accrual.amount)), Number(reversed?.sum || 0), requestedFen);
      if (amountFen <= 0) return null;
      return this.appendLedgerEntry(manager, {
        tenant: order.tenant || null,
        user: order.registration?.user || null,
        order,
        refund,
        direction: "debit",
        type: "charity_reversal",
        sourceType: "activity_order",
        sourceTitle: order.registration?.activity?.title || order.orderNo,
        amountFen,
        basisAmountFen: yuanToFen(Number(refund.amount).toFixed(2)),
        ratePercent: accrual.ratePercent,
        operator,
        remark: `订单退款公益金冲回：${refund.refundNo}`,
        idempotencyKey: key,
        certificateEligible: false,
        businessSnapshot: { orderId: order.id, orderNo: order.orderNo, refundId: refund.id, refundNo: refund.refundNo, refundAmount: refund.amount, accrualTransactionId: accrual.id, reversedBeforeFen: Number(reversed?.sum || 0), requestedFen }
      });
    });
  }

  private async recordRefundRetention(order: Order, refund: Refund, operator = "system") {
    if (!order?.id || !refund?.id) return null;
    const accrual = await this.accrualForOrder(order);
    if (!accrual) return null;
    return this.dataSource.transaction((manager) => this.appendLedgerEntry(manager, {
      tenant: order.tenant || null,
      user: order.registration?.user || null,
      order,
      refund,
      direction: "credit",
      type: "charity_retention",
      sourceType: "activity_order",
      sourceTitle: order.registration?.activity?.title || order.orderNo,
      amountFen: 0,
      basisAmountFen: yuanToFen(Number(refund.amount || 0).toFixed(2)),
      ratePercent: accrual.ratePercent,
      operator,
      remark: `订单退款保留原公益计提：${refund.refundNo}`,
      idempotencyKey: `charity_retention:${refund.id}`,
      retainedOnRefund: true,
      certificateEligible: false,
      businessSnapshot: { orderId: order.id, orderNo: order.orderNo, refundId: refund.id, refundNo: refund.refundNo, refundAmount: refund.amount, accrualTransactionId: accrual.id, retainedAmountFen: Number(accrual.amountFen || yuanToFen(accrual.amount)) }
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

  private charityAccountScopeKey(tenant: Tenant | null) {
    return tenant?.id ? `tenant:${tenant.id}` : "platform";
  }

  private normalizeCharityBusinessKey(value: unknown, label: string) {
    const key = String(value || "").trim();
    if (!/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new BadRequestException(`${label}格式不正确，仅支持 8-160 位字母、数字、冒号、下划线和短横线`);
    return key;
  }

  private nextCharityProjectNo() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `CP${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  private async saveProjectEvent(manager: Pick<DataSource["manager"], "getRepository">, project: CharityProject, input: { businessKey: string; action: string; fromStatus: string | null; toStatus: string; admin?: AdminContext; remark?: string | null; extraSnapshot?: Record<string, unknown> }) {
    const repo = manager.getRepository(CharityProjectEvent);
    const replay = await repo.findOne({ where: { businessKey: input.businessKey } });
    if (replay) {
      if (replay.project.id !== project.id) throw new BadRequestException("项目事件业务键已被其他项目使用");
      return replay;
    }
    const operator = input.admin?.id ? await manager.getRepository(AdminUser).findOne({ where: { id: input.admin.id } }) : null;
    return repo.save(repo.create({ tenant: project.tenant || null, project, operator, businessKey: input.businessKey, action: input.action, fromStatus: input.fromStatus, toStatus: input.toStatus, remark: input.remark || null, snapshot: { projectNo: project.projectNo, title: project.title, targetAmount: project.targetAmount, disbursedAmount: project.disbursedAmount, status: project.status, publicVisible: project.publicVisible, ...(input.extraSnapshot || {}) } }));
  }

  private async lockedCharityAccount(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant | null) {
    const repo = manager.getRepository(CharityFundAccount);
    const scopeKey = this.charityAccountScopeKey(tenant);
    let account = await repo.findOne({ where: { scopeKey }, lock: { mode: "pessimistic_write" } });
    if (!account) {
      try {
        await repo.save(repo.create({ scopeKey, tenant, balanceFen: 0, reservedFen: 0, totalCreditFen: 0, totalDebitFen: 0, ledgerHeadHash: null, ledgerSequence: 0 }));
      } catch {
        // A concurrent creator may have inserted the unique scope row first.
      }
      account = await repo.findOne({ where: { scopeKey }, lock: { mode: "pessimistic_write" } });
    }
    if (!account) throw new BadRequestException("公益资金账户初始化失败");
    return account;
  }

  private async appendLedgerEntry(manager: Pick<DataSource["manager"], "getRepository">, input: CharityLedgerEntryInput) {
    if (!Number.isSafeInteger(input.amountFen) || input.amountFen < 0) throw new BadRequestException("公益流水金额必须是非负整数分");
    const txRepo = manager.getRepository(CharityFundTransaction);
    const replay = await txRepo.findOne({ where: { idempotencyKey: input.idempotencyKey }, loadEagerRelations: false });
    if (replay) return replay;
    const account = await this.lockedCharityAccount(manager, input.tenant);
    const lockedReplay = await txRepo.findOne({ where: { idempotencyKey: input.idempotencyKey }, loadEagerRelations: false });
    if (lockedReplay) return lockedReplay;
    const beforeFen = Number(account.balanceFen || 0);
    const reservedBeforeFen = Number(account.reservedFen || 0);
    const releaseReservedFen = Number(input.releaseReservedFen || 0);
    if (!Number.isSafeInteger(releaseReservedFen) || releaseReservedFen < 0 || releaseReservedFen > reservedBeforeFen) throw new BadRequestException("公益资金冻结额度不一致");
    const reservedAfterFen = reservedBeforeFen - releaseReservedFen;
    const afterFen = input.direction === "credit" ? beforeFen + input.amountFen : beforeFen - input.amountFen;
    if (!Number.isSafeInteger(beforeFen) || !Number.isSafeInteger(afterFen)) throw new BadRequestException("公益资金余额超过安全范围");
    if (afterFen < reservedAfterFen) throw new BadRequestException(`公益池可用金额不足，当前可用 ${fenToYuan(Math.max(beforeFen - reservedBeforeFen, 0))} 元`);
    const sequence = Number(account.ledgerSequence || 0) + 1;
    const sourceId = input.disbursement?.id || input.project?.id || input.refund?.id || input.order?.id || null;
    const previousHash = account.ledgerHeadHash || null;
    const entryHash = charityLedgerEntryHash({ previousHash, scopeKey: account.scopeKey, sequence, businessKey: input.idempotencyKey, direction: input.direction, type: input.type, amountFen: input.amountFen, balanceBeforeFen: beforeFen, balanceAfterFen: afterFen, sourceType: input.sourceType, sourceId: sourceId ? String(sourceId) : null });
    const transaction = await txRepo.save(txRepo.create({
      account,
      tenant: input.tenant,
      user: input.user || null,
      order: input.order || null,
      refund: input.refund || null,
      project: input.project || null,
      disbursement: input.disbursement || null,
      direction: input.direction,
      type: input.type,
      sourceType: input.sourceType,
      sourceTitle: input.sourceTitle || null,
      retainedOnRefund: Boolean(input.retainedOnRefund),
      certificateEligible: input.certificateEligible !== false,
      amount: fenToYuan(input.amountFen),
      amountFen: input.amountFen,
      balanceBeforeFen: beforeFen,
      balanceAfterFen: afterFen,
      ledgerSequence: sequence,
      previousHash,
      entryHash,
      ledgerVersion: "charity_ledger_v2",
      businessSnapshot: { ...(input.businessSnapshot || {}), reservedBeforeFen, reservedAfterFen },
      basisAmount: fenToYuan(input.basisAmountFen || 0),
      ratePercent: input.ratePercent || "0.00",
      operator: input.operator || null,
      remark: input.remark || null,
      idempotencyKey: input.idempotencyKey
    }));
    account.balanceFen = afterFen;
    account.reservedFen = reservedAfterFen;
    account.totalCreditFen = Number(account.totalCreditFen || 0) + (input.direction === "credit" ? input.amountFen : 0);
    account.totalDebitFen = Number(account.totalDebitFen || 0) + (input.direction === "debit" ? input.amountFen : 0);
    account.ledgerSequence = sequence;
    account.ledgerHeadHash = entryHash;
    await manager.getRepository(CharityFundAccount).save(account);
    return transaction;
  }

  private async summary(scope: CharitySummaryScope = {}) {
    const builder = this.transactions.createQueryBuilder("tx");
    if (scope.tenantId) builder.where("tx.tenantId = :tenantId", { tenantId: scope.tenantId });
    const rows = await builder
      .select("COALESCE(SUM(CASE WHEN tx.type = 'charity_reversal' THEN tx.amountFen ELSE 0 END), 0)", "totalReversedFen")
      .addSelect("COALESCE(SUM(CASE WHEN tx.type = 'project_disbursement' THEN tx.amountFen ELSE 0 END), 0)", "totalDisbursedFen")
      .addSelect("COUNT(DISTINCT tx.userId)", "participantCount")
      .getRawOne<{ totalReversedFen: string; totalDisbursedFen: string; participantCount: string }>();
    const accountBuilder = this.accounts.createQueryBuilder("account");
    if (scope.tenantId) accountBuilder.where("account.tenantId = :tenantId", { tenantId: scope.tenantId });
    const accountRows = await accountBuilder
      .select("COALESCE(SUM(account.totalCreditFen), 0)", "totalCreditFen")
      .addSelect("COALESCE(SUM(account.totalDebitFen), 0)", "totalDebitFen")
      .addSelect("COALESCE(SUM(account.balanceFen), 0)", "balanceFen")
      .addSelect("COALESCE(SUM(account.reservedFen), 0)", "reservedFen")
      .addSelect("COUNT(account.id)", "accountCount")
      .addSelect("COALESCE(SUM(account.ledgerSequence), 0)", "ledgerEntries")
      .getRawOne<{ totalCreditFen: string; totalDebitFen: string; balanceFen: string; reservedFen: string; accountCount: string; ledgerEntries: string }>();
    const balanceFen = Number(accountRows?.balanceFen || 0);
    const reservedFen = Number(accountRows?.reservedFen || 0);
    return {
      totalAccrued: fenToYuan(Number(accountRows?.totalCreditFen || 0)),
      totalReversed: fenToYuan(Number(rows?.totalReversedFen || 0)),
      totalDisbursed: fenToYuan(Number(rows?.totalDisbursedFen || 0)),
      totalDebit: fenToYuan(Number(accountRows?.totalDebitFen || 0)),
      fundBalanceAmount: fenToYuan(balanceFen),
      reservedAmount: fenToYuan(reservedFen),
      availableAmount: fenToYuan(Math.max(balanceFen - reservedFen, 0)),
      participantCount: Number(rows?.participantCount || 0),
      accountCount: Number(accountRows?.accountCount || 0),
      ledgerEntries: Number(accountRows?.ledgerEntries || 0)
    };
  }

  private async ledgerIntegrity(scope: CharitySummaryScope) {
    const accountBuilder = this.accounts.createQueryBuilder("account").orderBy("account.id", "ASC");
    if (scope.tenantId) accountBuilder.where("account.tenantId = :tenantId", { tenantId: scope.tenantId });
    const accounts = await accountBuilder.getMany();
    if (!accounts.length) return { consistent: true, accountCount: 0, checkedEntries: 0, legacyEntries: 0, issues: [] as string[] };
    const rows = await this.transactions.createQueryBuilder("tx")
      .leftJoinAndSelect("tx.account", "account")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("tx.refund", "refund")
      .leftJoinAndSelect("tx.project", "project")
      .leftJoinAndSelect("tx.disbursement", "disbursement")
      .where("tx.accountId IN (:...accountIds)", { accountIds: accounts.map((account) => account.id) })
      .andWhere("tx.ledgerVersion = :version", { version: "charity_ledger_v2" })
      .orderBy("tx.accountId", "ASC")
      .addOrderBy("tx.ledgerSequence", "ASC")
      .getMany();
    const legacyEntries = await this.transactions.createQueryBuilder("tx")
      .where("tx.accountId IN (:...accountIds)", { accountIds: accounts.map((account) => account.id) })
      .andWhere("tx.ledgerVersion <> :version", { version: "charity_ledger_v2" })
      .getCount();
    const issues: string[] = [];
    for (const account of accounts) {
      const accountRows = rows.filter((row) => row.account?.id === account.id);
      let previousHash: string | null = null;
      let previousSequence = 0;
      for (const row of accountRows) {
        const sequence = Number(row.ledgerSequence || 0);
        const sourceId = row.disbursement?.id || row.project?.id || row.refund?.id || row.order?.id || null;
        const expected = charityLedgerEntryHash({ previousHash, scopeKey: account.scopeKey, sequence, businessKey: row.idempotencyKey, direction: row.direction, type: row.type, amountFen: Number(row.amountFen || 0), balanceBeforeFen: Number(row.balanceBeforeFen || 0), balanceAfterFen: Number(row.balanceAfterFen || 0), sourceType: row.sourceType, sourceId: sourceId ? String(sourceId) : null });
        if (row.previousHash !== previousHash || row.entryHash !== expected) issues.push(`account:${account.id}:transaction:${row.id}:hash`);
        if (previousSequence && sequence !== previousSequence + 1) issues.push(`account:${account.id}:transaction:${row.id}:sequence`);
        previousHash = row.entryHash;
        previousSequence = sequence;
      }
      if (accountRows.length && account.ledgerHeadHash !== previousHash) issues.push(`account:${account.id}:head`);
      if (accountRows.length && Number(accountRows[accountRows.length - 1].balanceAfterFen || 0) !== Number(account.balanceFen || 0)) issues.push(`account:${account.id}:balance`);
    }
    return { consistent: issues.length === 0, accountCount: accounts.length, checkedEntries: rows.length, legacyEntries, issues: issues.slice(0, 20) };
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
      this.disbursements.createQueryBuilder("disbursement").leftJoinAndSelect("disbursement.project", "project").leftJoinAndSelect("disbursement.operator", "operator").leftJoinAndSelect("disbursement.requestedBy", "requestedBy").leftJoinAndSelect("disbursement.reviewedBy", "reviewedBy").leftJoinAndSelect("disbursement.paidBy", "paidBy").where("disbursement.projectId IN (:...ids)", { ids }).andWhere(publicOnly ? "disbursement.publicVisible = :visible AND disbursement.status = :paidStatus" : "1=1", { visible: true, paidStatus: "paid" }).orderBy("disbursement.createdAt", "DESC").getMany()
    ]);
    return projects.map((project) => ({
      ...(publicOnly ? this.publicProjectView(project) : this.projectView(project)),
      updates: updates.filter((row: any) => row.project?.id === project.id).slice(0, 3).map((row) => this.projectUpdateView(row)),
      disbursements: disbursements.filter((row: any) => row.project?.id === project.id).slice(0, 5).map((row) => publicOnly ? this.publicDisbursementView(row) : this.disbursementView(row))
    }));
  }

  private projectView(project: CharityProject) {
    const target = Number(project.targetAmount || 0);
    const disbursed = Number(project.disbursedAmount || 0);
    return {
      ...project,
      applicant: project.applicant ? { id: project.applicant.id, username: project.applicant.username } : null,
      reviewer: project.reviewer ? { id: project.reviewer.id, username: project.reviewer.username } : null,
      progressPercent: target > 0 ? Math.min(Number(((disbursed / target) * 100).toFixed(2)), 100) : 0
    };
  }

  private publicProjectView(project: CharityProject) {
    const target = Number(project.targetAmount || 0);
    const disbursed = Number(project.disbursedAmount || 0);
    return {
      id: project.id,
      projectNo: project.projectNo,
      tenant: project.tenant ? { id: project.tenant.id, code: project.tenant.code, name: project.tenant.name } : null,
      title: project.title,
      targetAmount: project.targetAmount,
      disbursedAmount: project.disbursedAmount,
      status: project.status,
      coverUrl: project.coverUrl,
      description: project.description,
      executedAt: project.executedAt,
      progressPercent: target > 0 ? Math.min(Number(((disbursed / target) * 100).toFixed(2)), 100) : 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  private projectUpdateView(row: CharityProjectUpdate) {
    return { ...row, project: row.project ? { id: row.project.id, title: row.project.title } : null };
  }

  private projectEventView(row: CharityProjectEvent) {
    return { id: row.id, project: row.project ? { id: row.project.id, projectNo: row.project.projectNo, title: row.project.title } : null, operator: row.operator ? { id: row.operator.id, username: row.operator.username } : null, businessKey: row.businessKey, action: row.action, fromStatus: row.fromStatus, toStatus: row.toStatus, remark: row.remark, snapshot: row.snapshot, createdAt: row.createdAt };
  }

  private disbursementView(row: CharityProjectDisbursement) {
    return { ...row, project: row.project ? { id: row.project.id, title: row.project.title } : null, operator: row.operator ? { id: row.operator.id, username: row.operator.username } : null, requestedBy: row.requestedBy ? { id: row.requestedBy.id, username: row.requestedBy.username } : null, reviewedBy: row.reviewedBy ? { id: row.reviewedBy.id, username: row.reviewedBy.username } : null, paidBy: row.paidBy ? { id: row.paidBy.id, username: row.paidBy.username } : null, cancelledBy: row.cancelledBy ? { id: row.cancelledBy.id, username: row.cancelledBy.username } : null };
  }

  private publicDisbursementView(row: CharityProjectDisbursement) {
    return { id: row.id, stageNo: row.stageNo, status: row.status, amount: row.amount, proofUrl: row.proofUrl, remark: row.remark, paidReference: this.maskReference(row.paidReference), paidAt: row.paidAt, createdAt: row.createdAt };
  }

  private adminTransactionView(tx: CharityFundTransaction) {
    const certificateEligible = isCharityContributionCertificateEligible(tx);
    const certificateNo = certificateEligible ? this.contributionCertificateNo(tx) : null;
    return {
      id: tx.id,
      account: tx.account ? { id: tx.account.id, scopeKey: tx.account.scopeKey } : null,
      tenant: tx.tenant ? { id: tx.tenant.id, code: tx.tenant.code, name: tx.tenant.name } : null,
      user: tx.user ? { id: tx.user.id, nickname: tx.user.nickname, phone: maskPhone(tx.user.phone) } : null,
      order: tx.order ? { id: tx.order.id, orderNo: tx.order.orderNo } : null,
      refund: tx.refund ? { id: tx.refund.id, refundNo: tx.refund.refundNo, status: tx.refund.status } : null,
      project: tx.project ? { id: tx.project.id, projectNo: tx.project.projectNo, title: tx.project.title } : null,
      disbursement: tx.disbursement ? { id: tx.disbursement.id, stageNo: tx.disbursement.stageNo, status: tx.disbursement.status } : null,
      direction: tx.direction,
      type: tx.type,
      sourceType: tx.sourceType,
      sourceTitle: tx.sourceTitle,
      retainedOnRefund: tx.retainedOnRefund,
      certificateEligible,
      certificateNo,
      certificatePreviewUrl: certificateNo ? `/api/admin/charity/transactions/${tx.id}/certificate/image` : null,
      amount: tx.amount,
      amountFen: tx.amountFen,
      balanceBeforeFen: tx.balanceBeforeFen,
      balanceAfterFen: tx.balanceAfterFen,
      ledgerSequence: tx.ledgerSequence,
      previousHash: tx.previousHash,
      entryHash: tx.entryHash,
      ledgerVersion: tx.ledgerVersion,
      businessSnapshot: tx.businessSnapshot,
      basisAmount: tx.basisAmount,
      ratePercent: tx.ratePercent,
      operator: tx.operator,
      remark: tx.remark,
      idempotencyKey: tx.idempotencyKey,
      createdAt: tx.createdAt
    };
  }

  private transactionView(tx: CharityFundTransaction) {
    const order = tx.order;
    const refund = tx.refund;
    const paidAmount = Number(order?.amount || 0);
    const retained = Boolean(tx.retainedOnRefund || tx.type === "charity_retention");
    const amount = tx.type === "charity_retention" ? Number(tx.businessSnapshot?.retainedAmountFen || 0) / 100 : Number(tx.amount || 0);
    const certificateEligible = isCharityContributionCertificateEligible({ ...tx, amountFen: tx.amountFen || Math.round(amount * 100) });
    const certificateNo = certificateEligible ? this.contributionCertificateNo(tx) : null;
    return {
      id: tx.id,
      direction: tx.direction,
      type: tx.type,
      sourceType: tx.sourceType,
      retainedOnRefund: retained,
      amount: amount.toFixed(2),
      sourceTitle: tx.sourceTitle || order?.registration?.activity?.title || order?.orderNo || "公益流水",
      paidAmount: paidAmount.toFixed(2),
      charityAmount: amount.toFixed(2),
      ratePercent: tx.ratePercent,
      remark: tx.remark,
      createdAt: tx.createdAt,
      refundAmount: retained ? Math.max(paidAmount - amount, 0).toFixed(2) : refund ? Number(refund.amount || 0).toFixed(2) : "0.00",
      orderNo: order?.orderNo || null,
      activityTitle: order?.registration?.activity?.title || null,
      refundStatus: refund?.status || (retained ? "retained" : null),
      certificateEligible,
      certificateNo,
      certificatePreviewUrl: certificateNo ? `/api/public/charity-certificates/${encodeURIComponent(certificateNo)}/image` : null
    };
  }

  private async contributionCertificateTransaction(transactionId: number, userId?: number, admin?: AdminContext) {
    const builder = this.transactions.createQueryBuilder("certificateTx")
      .leftJoinAndSelect("certificateTx.user", "certificateUser")
      .leftJoinAndSelect("certificateTx.order", "certificateOrder")
      .leftJoinAndSelect("certificateTx.tenant", "certificateTenant")
      .where("certificateTx.id = :transactionId", { transactionId });
    this.applyScope(builder, "certificateTx", admin);
    const tx = await builder.getOne();
    if (!tx || (userId !== undefined && tx.user?.id !== userId)) throw new NotFoundException("公益贡献凭证不存在");
    if (!isCharityContributionCertificateEligible(tx)) throw new BadRequestException("该公益流水不符合发放凭证条件");
    return tx;
  }

  private async contributionCertificateByNo(certificateNo: string) {
    const normalized = String(certificateNo || "").trim().toUpperCase();
    const match = normalized.match(/^MPCG\d{8}-(\d{6,})-[A-F0-9]{8}$/);
    if (!match) throw new BadRequestException("公益贡献凭证编号格式不正确");
    const tx = await this.contributionCertificateTransaction(Number(match[1]));
    if (this.contributionCertificateNo(tx) !== normalized) throw new NotFoundException("公益贡献凭证不存在");
    return tx;
  }

  private contributionCertificateNo(tx: CharityFundTransaction) {
    return charityContributionCertificateNo(tx);
  }

  private async contributionCertificateView(tx: CharityFundTransaction, masked: boolean, hidden = false) {
    const originalFen = Number(tx.amountFen || yuanToFen(tx.amount));
    let currentFen = originalFen;
    if (tx.order?.id) {
      const total = await this.transactions.createQueryBuilder("related")
        .select("COALESCE(SUM(CASE WHEN related.direction = 'credit' THEN related.amountFen ELSE -related.amountFen END), 0)", "sum")
        .where("related.orderId = :orderId", { orderId: tx.order.id })
        .andWhere("related.type IN (:...types)", { types: ["charity_accrual", "charity_reversal"] })
        .getRawOne<{ sum: string }>();
      currentFen = Math.max(Number(total?.sum || 0), 0);
    }
    const status = charityContributionCertificateStatus(originalFen, currentFen);
    const name = tx.user?.nickname || tx.user?.phone || (tx.user?.id ? `用户${tx.user.id}` : "公益参与者");
    return {
      certificateNo: this.contributionCertificateNo(tx),
      holderName: hidden ? "公益参与者" : masked ? this.maskContributionHolder(name) : name,
      contributionAmount: currentFen / 100,
      sourceTitle: tx.sourceTitle || "公益金计划",
      orderNo: tx.order?.orderNo || null,
      issuedAt: tx.createdAt,
      status
    };
  }

  private maskContributionHolder(value: string) {
    return maskCharityContributionHolder(value);
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

  private maskReference(value?: string | null) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (text.length <= 8) return `${text.slice(0, 2)}***${text.slice(-2)}`;
    return `${text.slice(0, 4)}***${text.slice(-4)}`;
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
