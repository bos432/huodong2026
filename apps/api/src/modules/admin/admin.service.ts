import { BadRequestException, ForbiddenException, Injectable, NotFoundException, NotImplementedException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { mkdirSync } from "fs";
import { DataSource, In, LessThanOrEqual, MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { ActivityCategory } from "../../entities/activity-category.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { ActivityApprovalLog } from "../../entities/activity-approval-log.entity";
import { ActivityField } from "../../entities/activity-field.entity";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Activity } from "../../entities/activity.entity";
import { AdminLoginLog } from "../../entities/admin-login-log.entity";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "../../entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "../../entities/agent-settlement.entity";
import { Agent } from "../../entities/agent.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { Coupon } from "../../entities/coupon.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { Notification } from "../../entities/notification.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "../../entities/payment-statement-record.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Registration } from "../../entities/registration.entity";
import { Refund } from "../../entities/refund.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { UserTag } from "../../entities/user-tag.entity";
import { User } from "../../entities/user.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { Waitlist, WaitlistStatus } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { ActivityStatus, FieldType, OrderStatus, PaymentMethod, RegistrationStatus, checkActivityContentCompliance } from "../../shared/domain";
import { inspectRuntimeConfig } from "../../shared/config-validation";
import { applyTenantScopeToQuery, assertTenantAccessForActor, isTenantScopedActor, tenantRelationForActor } from "../../shared/tenant-scope";
import { AdminRole, normalizeAdminRole } from "./admin-roles";
import { defaultHomepageSections, HOMEPAGE_SECTION_TYPES, isPlainJsonObject, normalizePageKey } from "../homepage-defaults";
import { ActivityApprovalDto, ActivityChannelDto, ActivityDto, ActivityQueryDto, AdminQueryDto, AgentDto, AgentPaymentAccountDto, AgentSettlementGenerateDto, AgentSettlementPayDto, AgentSettlementQueryDto, AgentSettlementSandboxTransferDto, AnalyticsQueryDto, AnnouncementDto, BulkActivityTagDto, CategoryDto, ChangeOwnPasswordDto, CharityDisbursementDto, CharityProjectDto, CharitySettingDto, ConfirmPaymentDto, CouponDto, CreateAdminDto, CreateMemberDto, HomepageReorderItemDto, HomepageSectionDto, LoginDto, MemberLevelDto, OperationSettingDto, OrderQueryDto, OrderRemarkDto, PaymentStatementFetchDto, PaymentStatementImportDto, PaymentStatementImportItemDto, RefundDto, RegistrationQueryDto, ReviewDto, TenantDto, TenantPermissionDto, TenantProfileDto, TicketTypeDto, UpdateAdminDto, UpdateAdminPasswordDto, UpdateAdminStatusDto, UserTagDto, WalletAdjustDto } from "./dto";
import { PaymentProviderService, SupportedPaymentProvider } from "../public/payment-provider.service";
import { assessAgentTransferAccount, createAgentTransferAdapter, providerForPaymentMethod } from "../public/agent-transfer-adapters";
import { RefundCompletionService } from "../refund-completion.service";
import { paymentStatementOrderWhere } from "./payment-statement-import";
import { buildAgentSettlementTransferCapability } from "./agent-transfer-capability";
import { CharityFundService } from "../charity-fund.service";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type TenantPermissionSettings = { activityPublishReviewRequired: boolean; registrationReviewEnabled: boolean; paymentAccountEditable: boolean };
const TENANT_STAFF_ROLES = [AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];

@Injectable()
export class AdminService implements OnModuleInit, OnModuleDestroy {
  private orderCloseTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminLoginLog) private readonly adminLoginLogs: Repository<AdminLoginLog>,
    @InjectRepository(AdminOperationLog) private readonly operationLogs: Repository<AdminOperationLog>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentPaymentAccount) private readonly agentPaymentAccounts: Repository<AgentPaymentAccount>,
    @InjectRepository(AgentSettlement) private readonly agentSettlements: Repository<AgentSettlement>,
    @InjectRepository(AgentSettlementTransfer) private readonly agentSettlementTransfers: Repository<AgentSettlementTransfer>,
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(ActivityCategory) private readonly categories: Repository<ActivityCategory>,
    @InjectRepository(ActivityChannel) private readonly activityChannels: Repository<ActivityChannel>,
    @InjectRepository(ActivityApprovalLog) private readonly activityApprovalLogs: Repository<ActivityApprovalLog>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityField) private readonly fields: Repository<ActivityField>,
    @InjectRepository(ActivityHost) private readonly hosts: Repository<ActivityHost>,
    @InjectRepository(ActivitySection) private readonly sections: Repository<ActivitySection>,
    @InjectRepository(ActivityReview) private readonly activityReviews: Repository<ActivityReview>,
    @InjectRepository(ActivityViewLog) private readonly activityViewLogs: Repository<ActivityViewLog>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(PaymentCallbackLog) private readonly paymentCallbackLogs: Repository<PaymentCallbackLog>,
    @InjectRepository(PaymentStatementRecord) private readonly paymentStatementRecords: Repository<PaymentStatementRecord>,
    @InjectRepository(PaymentTransaction) private readonly paymentTransactions: Repository<PaymentTransaction>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(TicketType) private readonly ticketTypes: Repository<TicketType>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(ConversionEvent) private readonly conversionEvents: Repository<ConversionEvent>,
    @InjectRepository(H5AuthCodeLog) private readonly h5AuthCodeLogs: Repository<H5AuthCodeLog>,
    @InjectRepository(HomepageSection) private readonly homepageSections: Repository<HomepageSection>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    @InjectRepository(Waitlist) private readonly waitlists: Repository<Waitlist>,
    @InjectRepository(UserTag) private readonly userTags: Repository<UserTag>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(ShareVisit) private readonly shareVisits: Repository<ShareVisit>,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly paymentProvider: PaymentProviderService,
    private readonly refundCompletion: RefundCompletionService,
    private readonly charityFund: CharityFundService
  ) {}

  async onModuleInit() {
    mkdirSync(this.uploadRoot(), { recursive: true });
    await this.ensureDefaultAdmin();
    await this.ensureDevSeed();
    this.startOrderCloseWorker();
  }

  onModuleDestroy() {
    if (this.orderCloseTimer) clearInterval(this.orderCloseTimer);
  }

  async login(dto: LoginDto, context?: { clientIp?: string | null; userAgent?: string | null }) {
    const username = String(dto.username || "").trim();
    await this.assertAdminLoginRateLimit(username, context?.clientIp || null, context?.userAgent || null);
    const admin = await this.admins.findOne({ where: { username, enabled: true } });
    if (!admin) {
      await this.recordAdminLogin({ username, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "failed", failureReason: "invalid_username" });
      throw new UnauthorizedException("用户名或密码错误");
    }
    if (!(await bcrypt.compare(dto.password, admin.passwordHash))) {
      await this.recordAdminLogin({ username, adminId: admin.id, tenantId: admin.tenant?.id, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "failed", failureReason: "invalid_password" });
      throw new UnauthorizedException("用户名或密码错误");
    }
    if (admin.tenant && !admin.tenant.enabled) {
      await this.recordAdminLogin({ username, adminId: admin.id, tenantId: admin.tenant.id, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "failed", failureReason: "tenant_disabled" });
      throw new ForbiddenException("当前商家已停用，请联系平台管理员");
    }
    await this.recordAdminLogin({ username, adminId: admin.id, tenantId: admin.tenant?.id, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "success" });
    const role = normalizeAdminRole(admin.role);
    const tenantId = admin.tenant?.id ?? null;
    const token = await this.jwt.signAsync({ sub: admin.id, username: admin.username, role, tenantId });
    return { token, admin: { id: admin.id, username: admin.username, role, tenantId, tenant: admin.tenant ? this.publicTenant(admin.tenant) : null } };
  }

  async listTenants(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const rows = await this.tenants.find({ order: { id: "ASC" } });
    const adminCounts = await Promise.all(
      rows.map(async (tenant) => {
        const paymentAccountBuilder = () =>
          this.agentPaymentAccounts
            .createQueryBuilder("account")
            .leftJoin("account.tenant", "tenant")
            .leftJoin("account.agent", "agent")
            .leftJoin("agent.tenant", "agentTenant")
            .where("(tenant.id = :tenantId OR agentTenant.id = :tenantId)", { tenantId: tenant.id });
        const [adminCount, enabledAdminCount, agentCount, enabledAgentCount, paymentAccountCount, enabledPaymentAccountCount, totalActivityCount, totalRegistrationCount, totalOrderCount, pendingActivityCount, pendingRegistrationCount, pendingRefundCount, callbackRiskCount] = await Promise.all([
          this.admins.count({ where: { tenant: { id: tenant.id } } }),
          this.admins.count({ where: { tenant: { id: tenant.id }, enabled: true } }),
          this.agents.count({ where: { tenant: { id: tenant.id } } }),
          this.agents.count({ where: { tenant: { id: tenant.id }, enabled: true } }),
          paymentAccountBuilder().getCount(),
          paymentAccountBuilder().andWhere("account.enabled = :enabled", { enabled: true }).getCount(),
          this.activities.count({ where: { tenant: { id: tenant.id } } }),
          this.activities.count({ where: { tenant: { id: tenant.id }, status: ActivityStatus.PendingApproval } }),
          this.registrations.count({ where: { tenant: { id: tenant.id } } }),
          this.registrations
            .createQueryBuilder("registration")
            .leftJoin("registration.activity", "activity")
            .where("registration.status = :status", { status: RegistrationStatus.PendingReview })
            .andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: tenant.id })
            .getCount(),
          this.orders.count({ where: { tenant: { id: tenant.id } } }),
          this.refunds.count({ where: { tenant: { id: tenant.id }, status: "pending" } }),
          this.paymentCallbackLogs
            .createQueryBuilder("callback")
            .where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] })
            .andWhere("callback.tenantId = :tenantId", { tenantId: tenant.id })
            .getCount()
        ]);
        return [tenant.id, { adminCount, enabledAdminCount, agentCount, enabledAgentCount, paymentAccountCount, enabledPaymentAccountCount, pendingActivityCount, pendingRegistrationCount, pendingRefundCount, callbackRiskCount }] as const;
      })
    );
    const adminCountMap = new Map(adminCounts);
    return rows.map((tenant) => ({ ...this.publicTenant(tenant), ...(adminCountMap.get(tenant.id) || { adminCount: 0, enabledAdminCount: 0, agentCount: 0, enabledAgentCount: 0, paymentAccountCount: 0, enabledPaymentAccountCount: 0, pendingActivityCount: 0, pendingRegistrationCount: 0, pendingRefundCount: 0, callbackRiskCount: 0 }) }));
  }

  async saveTenant(dto: TenantDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = id ? await this.tenants.findOneBy({ id }) : this.tenants.create();
    if (!tenant) throw new NotFoundException("Tenant not found");
    const code = dto.code.trim();
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(code)) throw new BadRequestException("商家编码必须为 2-64 位字母、数字、下划线或连字符");
    const exists = await this.tenants.findOne({ where: { code } });
    if (exists && exists.id !== tenant.id) throw new BadRequestException("商家编码已存在");
    Object.assign(tenant, {
      code,
      name: dto.name.trim(),
      region: dto.region?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      enabled: dto.enabled ?? true,
      settings: this.mergeTenantSettings(dto.settings, tenant.settings)
    });
    const saved = await this.tenants.save(tenant);
    await this.logOperation(admin, id ? "tenant.update" : "tenant.create", "tenant", saved.id, id ? `更新商家：${saved.name}` : `创建商家：${saved.name}`, { code: saved.code, enabled: saved.enabled });
    return this.publicTenant(saved);
  }

  async updateTenantPermissions(id: number, dto: TenantPermissionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException("商家不存在");
    tenant.settings = this.mergeTenantSettings(dto as Record<string, unknown>, tenant.settings);
    const saved = await this.tenants.save(tenant);
    await this.logOperation(admin, "tenant.permissions.update", "tenant", saved.id, `更新商家权限：${saved.name}`, this.tenantPermissions(saved));
    return this.publicTenant(saved);
  }

  async getTenantProfile(admin?: AdminContext) {
    const tenant = await this.currentTenantForAdmin(admin);
    return this.publicTenant(tenant);
  }

  async updateTenantProfile(dto: TenantProfileDto, admin?: AdminContext) {
    const tenant = await this.currentTenantForAdmin(admin);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("商家名称不能为空");
    Object.assign(tenant, {
      name,
      region: dto.region?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null
    });
    const saved = await this.tenants.save(tenant);
    await this.logOperation(admin, "tenant.profile.update", "tenant", saved.id, `更新商家资料：${saved.name}`, {
      name: saved.name,
      region: saved.region,
      contactName: saved.contactName,
      contactPhone: saved.contactPhone
    });
    return this.publicTenant(saved);
  }

  async listAdmins(query: AdminQueryDto = {}, admin?: AdminContext) {
    const pageSize = Math.min(Math.max(Number(query.pageSize || 0), 0), 100);
    const page = Math.max(Number(query.page || 1), 1);
    const builder = this.admins.createQueryBuilder("admin").leftJoinAndSelect("admin.tenant", "tenant").select(["admin.id", "admin.username", "admin.role", "admin.enabled", "admin.createdAt", "admin.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.region", "tenant.enabled", "tenant.settings"]).orderBy("admin.id", "ASC");
    if (this.isTenantScoped(admin)) builder.andWhere("tenant.id = :tenantId", { tenantId: admin?.tenantId });
    else if (query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });

    if (query.keyword?.trim()) {
      builder.andWhere("(admin.username LIKE :keyword OR admin.role LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.role?.trim()) {
      const role = normalizeAdminRole(query.role);
      if (role === AdminRole.SuperAdmin) builder.andWhere("admin.role IN (:...roles)", { roles: [AdminRole.SuperAdmin, "admin"] });
      else builder.andWhere("admin.role = :role", { role });
    }
    if (query.enabled === "true" || query.enabled === "false") {
      builder.andWhere("admin.enabled = :enabled", { enabled: query.enabled === "true" });
    }
    if (query.includeSmoke !== "true") {
      builder.andWhere("admin.username NOT LIKE :smokePrefix", { smokePrefix: "smoke\\_%" });
    }

    const hasDefaultAdminEnabled = this.isTenantScoped(admin) ? false : await this.admins.count({ where: { username: "admin", enabled: true } }).then((count) => count > 0);

    if (!pageSize) {
      const rows = await builder.getMany();
      return rows.map((admin) => this.publicAdmin(admin));
    }

    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((admin) => this.publicAdmin(admin)), total, page, pageSize, hasDefaultAdminEnabled };
  }

  listOperationLogs(admin?: AdminContext, tenantId?: number) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const builder = this.operationLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(300);
    if (this.isTenantScoped(admin)) builder.andWhere("log.tenantId = :tenantId", { tenantId: admin?.tenantId || 0 });
    else if (tenantId) builder.andWhere("log.tenantId = :tenantId", { tenantId });
    return builder.getMany();
  }

  async listAdminLoginLogs(query: { username?: string; status?: string; tenantId?: number }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.adminLoginLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(300);
    if (query.username?.trim()) builder.andWhere("log.username LIKE :username", { username: `%${query.username.trim()}%` });
    if (query.status?.trim()) builder.andWhere("log.status = :status", { status: query.status.trim() });
    if (query.tenantId) builder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    const [items, total] = await builder.getManyAndCount();
    const summaryBuilder = this.adminLoginLogs.createQueryBuilder("log").select("log.status", "status").addSelect("COUNT(1)", "count").groupBy("log.status");
    if (query.tenantId) summaryBuilder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    const summaryRows = await summaryBuilder.getRawMany<{ status: string; count: string }>();
    const summary = summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
    return { items, total, summary };
  }

  async listH5AuthCodeLogs(query: { phone?: string; status?: string; mode?: string }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.h5AuthCodeLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(300);
    if (query.phone?.trim()) builder.andWhere("log.phone LIKE :phone", { phone: `%${query.phone.trim()}%` });
    if (query.status?.trim()) builder.andWhere("log.status = :status", { status: query.status.trim() });
    if (query.mode?.trim()) builder.andWhere("log.mode = :mode", { mode: query.mode.trim() });
    const [items, total] = await builder.getManyAndCount();
    const summaryRows = await this.h5AuthCodeLogs.createQueryBuilder("log").select("log.status", "status").addSelect("COUNT(1)", "count").groupBy("log.status").getRawMany<{ status: string; count: string }>();
    const summary = summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
    return { items, total, summary };
  }

  async dashboard(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const tenantId = admin?.tenantId || 0;
    const isTenant = this.isTenantScoped(admin);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const activityCountBuilder = this.activities.createQueryBuilder("activity");
    const pendingActivityCountBuilder = this.activities.createQueryBuilder("activity").where("activity.status = :status", { status: ActivityStatus.PendingApproval });
    const registrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity");
    const pendingRegistrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.status = :status", { status: RegistrationStatus.PendingReview });
    const monthRegistrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.createdAt >= :monthStart", { monthStart });
    const orderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const pendingOrderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.status = :status", { status: OrderStatus.PendingPayment });
    const paidOrderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] });
    const checkInCountBuilder = this.checkIns.createQueryBuilder("checkIn").leftJoin("checkIn.registration", "registration").leftJoin("registration.activity", "activity");
    const reviewCountBuilder = this.activityReviews.createQueryBuilder("review").leftJoin("review.activity", "activity");
    const viewCountBuilder = this.activityViewLogs.createQueryBuilder("view").leftJoin("view.activity", "activity");
    const notificationCountBuilder = this.notifications.createQueryBuilder("notification").leftJoin("notification.activity", "activity");
    const paidAmountBuilder = this.paymentTransactions.createQueryBuilder("transaction").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status: "success" });
    const monthPaidAmountBuilder = this.paymentTransactions.createQueryBuilder("transaction").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status: "success" }).andWhere("transaction.createdAt >= :monthStart", { monthStart });
    const refundAmountBuilder = this.refunds.createQueryBuilder("refund").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status: "completed" });
    const monthRefundAmountBuilder = this.refunds.createQueryBuilder("refund").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status: "completed" }).andWhere("refund.createdAt >= :monthStart", { monthStart });
    const refundCountBuilder = this.refunds.createQueryBuilder("refund").where("refund.status = :status", { status: "pending" });
    const callbackRiskCountBuilder = this.paymentCallbackLogs.createQueryBuilder("callback").where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] });

    if (isTenant) {
      activityCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      pendingActivityCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      registrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      pendingRegistrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      monthRegistrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      orderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      pendingOrderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      paidOrderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      checkInCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      reviewCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      viewCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      notificationCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      paidAmountBuilder.andWhere("transaction.tenantId = :tenantId", { tenantId });
      monthPaidAmountBuilder.andWhere("transaction.tenantId = :tenantId", { tenantId });
      refundAmountBuilder.andWhere("refund.tenantId = :tenantId", { tenantId });
      monthRefundAmountBuilder.andWhere("refund.tenantId = :tenantId", { tenantId });
      refundCountBuilder.andWhere("refund.tenantId = :tenantId", { tenantId });
      callbackRiskCountBuilder.andWhere("callback.tenantId = :tenantId", { tenantId });
    }

    const recentActivityBuilder = this.activities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").orderBy("activity.updatedAt", "DESC").take(8);
    if (isTenant) recentActivityBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });

    const [tenantCount, disabledTenantCount, activityCount, pendingActivityCount, registrationCount, pendingRegistrationCount, monthRegistrationCount, orderCount, pendingOrderCount, paidOrderCount, checkInCount, reviewCount, viewCount, notificationCount, paidAmount, monthPaidAmount, refundAmount, monthRefundAmount, pendingRefundCount, callbackRiskCount, recentActivities] = await Promise.all([
      isTenant ? Promise.resolve(1) : this.tenants.count(),
      isTenant ? Promise.resolve(0) : this.tenants.count({ where: { enabled: false } }),
      activityCountBuilder.getCount(),
      pendingActivityCountBuilder.getCount(),
      registrationCountBuilder.getCount(),
      pendingRegistrationCountBuilder.getCount(),
      monthRegistrationCountBuilder.getCount(),
      orderCountBuilder.getCount(),
      pendingOrderCountBuilder.getCount(),
      paidOrderCountBuilder.getCount(),
      checkInCountBuilder.getCount(),
      reviewCountBuilder.getCount(),
      viewCountBuilder.getCount(),
      notificationCountBuilder.getCount(),
      paidAmountBuilder.getRawOne<{ sum: string }>(),
      monthPaidAmountBuilder.getRawOne<{ sum: string }>(),
      refundAmountBuilder.getRawOne<{ sum: string }>(),
      monthRefundAmountBuilder.getRawOne<{ sum: string }>(),
      refundCountBuilder.getCount(),
      callbackRiskCountBuilder.getCount(),
      recentActivityBuilder.getMany()
    ]);
    const paidTotal = Number(paidAmount?.sum || 0);
    const monthPaidTotal = Number(monthPaidAmount?.sum || 0);
    const refundTotal = Number(refundAmount?.sum || 0);
    const monthRefundTotal = Number(monthRefundAmount?.sum || 0);
    const checkInRate = registrationCount > 0 ? Math.round((checkInCount / registrationCount) * 1000) / 10 : 0;
    const registrationConversionRate = viewCount > 0 ? Math.round((registrationCount / viewCount) * 1000) / 10 : 0;
    const avgOrderAmount = paidOrderCount > 0 ? paidTotal / paidOrderCount : 0;

    return {
      scope: isTenant ? "tenant" : "platform",
      totals: {
        tenantCount,
        disabledTenantCount,
        activityCount,
        registrationCount,
        orderCount,
        checkInCount,
        reviewCount,
        viewCount,
        notificationCount,
        paidAmount: paidTotal.toFixed(2)
      },
      operations: {
        paidOrderCount,
        refundAmount: refundTotal.toFixed(2),
        netAmount: (paidTotal - refundTotal).toFixed(2),
        monthRegistrationCount,
        monthPaidAmount: monthPaidTotal.toFixed(2),
        monthRefundAmount: monthRefundTotal.toFixed(2),
        monthNetAmount: (monthPaidTotal - monthRefundTotal).toFixed(2),
        checkInRate,
        registrationConversionRate,
        avgOrderAmount: avgOrderAmount.toFixed(2)
      },
      todos: {
        pendingActivityCount,
        pendingRegistrationCount,
        pendingOrderCount,
        pendingRefundCount,
        callbackRiskCount
      },
      recentActivities: await Promise.all(recentActivities.map((activity: Activity) => this.dashboardActivityRow(activity)))
    };
  }

  async mobileBootstrap(admin?: AdminContext) {
    const normalizedRole = normalizeAdminRole(admin?.role);
    const canWriteActivities = normalizedRole === AdminRole.SuperAdmin || normalizedRole === AdminRole.Operator;
    const canReviewRegistrations = normalizedRole === AdminRole.SuperAdmin || normalizedRole === AdminRole.Operator;
    const canViewRegistrations = canReviewRegistrations || normalizedRole === AdminRole.Finance || normalizedRole === AdminRole.CheckInStaff;
    const canViewOrders = normalizedRole === AdminRole.SuperAdmin || normalizedRole === AdminRole.Finance;
    const canCheckIn = normalizedRole === AdminRole.SuperAdmin || normalizedRole === AdminRole.Operator || normalizedRole === AdminRole.CheckInStaff;
    const currentTenant = admin?.tenantId ? await this.tenants.findOneBy({ id: admin.tenantId }) : null;
    const [tenants, categories, agents, memberLevels, operationSetting] = await Promise.all([
      normalizedRole === AdminRole.SuperAdmin && !admin?.tenantId ? this.listTenants(admin) : Promise.resolve(currentTenant ? [this.publicTenant(currentTenant)] : []),
      this.listCategories(true, admin),
      this.listAgents(true, admin).catch(() => []),
      this.listMemberLevels(true),
      this.getOperationSetting(admin).catch(() => null)
    ]);
    return {
      admin: { id: admin?.id || null, username: admin?.username || "", role: normalizedRole, tenantId: admin?.tenantId || null, tenant: currentTenant ? this.publicTenant(currentTenant) : null },
      permissions: { canWriteActivities, canReviewRegistrations, canViewRegistrations, canViewOrders, canCheckIn, canSelectTenant: normalizedRole === AdminRole.SuperAdmin && !admin?.tenantId },
      tenants,
      categories,
      agents,
      memberLevels,
      operationSetting,
      upload: { imageEndpoint: "/admin/uploads/images", maxImageSizeMb: 5, imageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] }
    };
  }

  charitySummary(admin?: AdminContext) {
    return this.charityFund.adminSummary(admin);
  }

  charityTransactions(admin?: AdminContext) {
    return this.charityFund.adminTransactions(admin);
  }

  charityProjects(admin?: AdminContext) {
    return this.charityFund.adminProjects(admin);
  }

  saveCharityProject(dto: CharityProjectDto, id?: number, admin?: AdminContext) {
    return this.charityFund.saveProject(dto, id, admin);
  }

  addCharityDisbursement(projectId: number, dto: CharityDisbursementDto, admin?: AdminContext) {
    return this.charityFund.addDisbursement(projectId, dto, admin);
  }

  charitySetting(admin?: AdminContext) {
    return this.charityFund.getSetting(admin);
  }

  saveCharitySetting(dto: CharitySettingDto, admin?: AdminContext) {
    return this.charityFund.saveSetting(dto, admin);
  }

  async analyticsOverview(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const builders = this.analyticsBuilders(scope, admin);
    const [eventCounts, paidAmount, refundAmount, walletRechargeAmount, charitySummary, activeUserCount, tenantRanking, risk] = await Promise.all([
      builders.events.select("event.type", "type").addSelect("COUNT(1)", "count").groupBy("event.type").getRawMany<{ type: string; count: string }>(),
      builders.payments.select("COALESCE(SUM(transaction.amount), 0)", "sum").andWhere("transaction.status = :status", { status: "success" }).getRawOne<{ sum: string }>(),
      builders.refunds.select("COALESCE(SUM(refund.amount), 0)", "sum").andWhere("refund.status = :status", { status: "completed" }).getRawOne<{ sum: string }>(),
      builders.walletTx.select("COALESCE(SUM(walletTx.amount), 0)", "sum").andWhere("walletTx.direction = :direction", { direction: "credit" }).andWhere("walletTx.type = :type", { type: "admin_recharge" }).getRawOne<{ sum: string }>(),
      this.charityFund.adminSummary(admin),
      builders.events.select("COUNT(DISTINCT event.userId)", "count").andWhere("event.userId IS NOT NULL").getRawOne<{ count: string }>(),
      this.analyticsTenantRanking(scope, admin),
      this.analyticsRisk(scope, admin)
    ]);
    const counts = Object.fromEntries(eventCounts.map((row) => [row.type, Number(row.count || 0)]));
    return {
      scope: scope.tenantId ? "tenant" : "platform",
      range: { startDate: scope.startDate?.toISOString() || null, endDate: scope.endDate?.toISOString() || null },
      totals: {
        viewCount: counts.view || 0,
        registrationCount: counts.register || 0,
        paidCount: counts.pay || 0,
        checkInCount: counts.check_in || 0,
        reviewCount: counts.review || 0,
        activeUserCount: Number(activeUserCount?.count || 0),
        paidAmount: Number(paidAmount?.sum || 0).toFixed(2),
        refundAmount: Number(refundAmount?.sum || 0).toFixed(2),
        netAmount: (Number(paidAmount?.sum || 0) - Number(refundAmount?.sum || 0)).toFixed(2),
        walletRechargeAmount: Number(walletRechargeAmount?.sum || 0).toFixed(2),
        charityAccruedAmount: charitySummary.totalAccrued,
        charityAvailableAmount: charitySummary.availableAmount,
        charityDisbursedAmount: charitySummary.totalDisbursed,
        charityReversedAmount: charitySummary.totalReversed
      },
      rates: {
        signupRate: this.rate(counts.register || 0, counts.view || 0),
        paymentRate: this.rate(counts.pay || 0, counts.register || 0),
        checkInRate: this.rate(counts.check_in || 0, counts.pay || 0),
        reviewRate: this.rate(counts.review || 0, counts.check_in || 0)
      },
      tenantRanking,
      risk
    };
  }

  async analyticsTrends(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const eventBuilder = this.conversionEvents.createQueryBuilder("event").select("DATE(event.createdAt)", "date").addSelect("event.type", "type").addSelect("COUNT(1)", "count").groupBy("DATE(event.createdAt)").addGroupBy("event.type").orderBy("date", "ASC");
    this.applyAnalyticsScope(eventBuilder, "event", scope, admin);
    const amountBuilder = this.paymentTransactions.createQueryBuilder("transaction").select("DATE(transaction.createdAt)", "date").addSelect("COALESCE(SUM(transaction.amount), 0)", "amount").where("transaction.status = :status", { status: "success" }).groupBy("DATE(transaction.createdAt)").orderBy("date", "ASC");
    this.applyAnalyticsScope(amountBuilder, "transaction", scope, admin);
    const [events, amounts] = await Promise.all([eventBuilder.getRawMany<{ date: string; type: string; count: string }>(), amountBuilder.getRawMany<{ date: string; amount: string }>()]);
    const byDate = new Map<string, Record<string, unknown>>();
    for (const row of events) {
      const item = byDate.get(row.date) || { date: row.date, view: 0, register: 0, pay: 0, check_in: 0, review: 0, paidAmount: "0.00" };
      item[row.type] = Number(row.count || 0);
      byDate.set(row.date, item);
    }
    for (const row of amounts) {
      const item = byDate.get(row.date) || { date: row.date, view: 0, register: 0, pay: 0, check_in: 0, review: 0, paidAmount: "0.00" };
      item.paidAmount = Number(row.amount || 0).toFixed(2);
      byDate.set(row.date, item);
    }
    return Array.from(byDate.values()).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  }

  async analyticsChannels(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const rows = await this.channelReportBuilder(scope, admin).getRawMany<any>();
    return rows.map((row) => this.channelReportRow(row));
  }

  async analyticsUsers(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const [newUsers, activeUsers, repeatUsers, memberLevels, categoryPreference] = await Promise.all([
      this.users.createQueryBuilder("user").where(scope.startDate ? "user.createdAt >= :startDate" : "1 = 1", { startDate: scope.startDate }).andWhere(scope.endDate ? "user.createdAt < :endDate" : "1 = 1", { endDate: scope.endDate }).getCount(),
      this.conversionEvents.createQueryBuilder("event").select("COUNT(DISTINCT event.userId)", "count").where("event.userId IS NOT NULL").andWhere(scope.tenantId ? "event.tenantId = :tenantId" : "1 = 1", { tenantId: scope.tenantId }).getRawOne<{ count: string }>(),
      this.registrations.createQueryBuilder("registration").select("COUNT(DISTINCT registration.userId)", "count").leftJoin("registration.activity", "activity").where("registration.userId IN (SELECT r.userId FROM registrations r GROUP BY r.userId HAVING COUNT(1) > 1)").andWhere(scope.tenantId ? "(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)" : "1 = 1", { tenantId: scope.tenantId }).getRawOne<{ count: string }>(),
      this.memberProfiles.createQueryBuilder("profile").leftJoin("profile.level", "level").select("COALESCE(level.name, '普通用户')", "level").addSelect("COUNT(1)", "count").groupBy("COALESCE(level.name, '普通用户')").getRawMany<{ level: string; count: string }>(),
      this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").leftJoin("activity.category", "category").select("COALESCE(category.name, '未分类')", "category").addSelect("COUNT(1)", "count").where(scope.tenantId ? "(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)" : "1 = 1", { tenantId: scope.tenantId }).groupBy("COALESCE(category.name, '未分类')").orderBy("count", "DESC").limit(8).getRawMany<{ category: string; count: string }>()
    ]);
    return {
      newUserCount: newUsers,
      activeUserCount: Number(activeUsers?.count || 0),
      repeatUserCount: Number(repeatUsers?.count || 0),
      memberLevels: memberLevels.map((row) => ({ level: row.level, count: Number(row.count || 0) })),
      categoryPreference: categoryPreference.map((row) => ({ category: row.category, count: Number(row.count || 0) }))
    };
  }

  async listActivityChannels(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertTenantAccess(activity, admin);
    return this.activityChannels.find({ where: { activity: { id: activityId } }, order: { id: "DESC" } });
  }

  async createActivityChannel(activityId: number, dto: ActivityChannelDto, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertTenantAccess(activity, admin);
    const code = this.normalizeChannelCode(dto.code || `${activity.id}-${Date.now().toString(36)}`);
    if (await this.activityChannels.findOne({ where: { code } })) throw new BadRequestException("渠道码已存在");
    const creator = admin?.id ? await this.admins.findOneBy({ id: admin.id }) : null;
    const saved = await this.activityChannels.save(this.activityChannels.create({
      activity,
      tenant: activity.tenant || null,
      createdBy: creator,
      name: dto.name.trim(),
      code,
      source: dto.source?.trim() || null,
      remark: dto.remark?.trim() || null,
      enabled: dto.enabled ?? true,
      qrCodeUrl: null
    }));
    await this.logOperation(admin, "activity_channel.create", "activity", activity.id, `创建活动渠道：${saved.name}`, { code: saved.code });
    return saved;
  }

  async activityChannelReport(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertTenantAccess(activity, admin);
    const rows = await this.channelReportBuilder({ activityId }, admin).getRawMany<any>();
    return { activity: { id: activity.id, title: activity.title }, channels: rows.map((row) => this.channelReportRow(row)) };
  }

  configCheck(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return {
      ...inspectRuntimeConfig(this.config),
      release: this.releaseInfo()
    };
  }

  uploadedImage(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传图片文");
    const publicBase = this.config.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
    const urlPath = `/uploads/images/${file.filename}`;
    return {
      url: publicBase ? `${publicBase}${urlPath}` : urlPath,
      path: urlPath,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    };
  }

  uploadedSettlementProof(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传打款凭证文");
    const publicBase = this.config.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
    const urlPath = `/uploads/settlement-proofs/${file.filename}`;
    return {
      url: publicBase ? `${publicBase}${urlPath}` : urlPath,
      path: urlPath,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    };
  }

  async createAdmin(dto: CreateAdminDto, admin?: AdminContext) {
    const username = dto.username.trim();
    this.validateAdminPassword(dto.password);
    const exists = await this.admins.findOne({ where: { username } });
    if (exists) throw new BadRequestException("管理员账号已存在");
    const tenant = await this.resolveAdminTenant(dto.tenantId, admin);
    const role = this.resolveNewAdminRole(dto.role, admin);
    const saved = await this.admins.save(this.admins.create({ username, passwordHash: await bcrypt.hash(dto.password, 10), role, tenant }));
    await this.logOperation(admin, "admin.create", "admin", saved.id, `创建管理员：${saved.username}`, { role: saved.role, tenantId: tenant?.id || null });
    return this.publicAdmin(saved);
  }

  async updateAdminPassword(id: number, dto: UpdateAdminPasswordDto, admin?: AdminContext) {
    this.validateAdminPassword(dto.password);
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    row.passwordHash = await bcrypt.hash(dto.password, 10);
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.password.reset", "admin", saved.id, `重置管理员密码：${saved.username}`);
    return this.publicAdmin(saved);
  }

  async updateAdmin(id: number, dto: UpdateAdminDto, admin?: AdminContext) {
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    const nextRole = dto.role ? this.resolveNewAdminRole(dto.role, admin) : normalizeAdminRole(row.role);
    const nextTenant = dto.tenantId !== undefined ? await this.resolveAdminTenant(dto.tenantId, admin) : row.tenant || null;
    if (dto.enabled === false) {
      if (admin?.id === id) throw new BadRequestException("不能禁用当前登录账号");
      const enabledCount = await this.admins.count({ where: { enabled: true } });
      if (row.enabled && enabledCount <= 1) throw new BadRequestException("至少需要保留一个启用的管理员账号");
    }
    row.role = nextRole;
    row.tenant = nextTenant;
    if (dto.enabled !== undefined) row.enabled = dto.enabled;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.update", "admin", saved.id, `编辑管理员：${saved.username}`, { role: saved.role, tenantId: saved.tenant?.id || null, enabled: saved.enabled });
    return this.publicAdmin(saved);
  }

  async changeOwnPassword(dto: ChangeOwnPasswordDto, admin: { id: number; username: string }) {
    this.validateAdminPassword(dto.newPassword);
    if (dto.oldPassword === dto.newPassword) throw new BadRequestException("新密码不能与当前密码相同");
    const row = await this.admins.findOneBy({ id: admin.id });
    if (!row || !row.enabled) throw new NotFoundException("管理员不存在或已禁用");
    if (!(await bcrypt.compare(dto.oldPassword, row.passwordHash))) throw new BadRequestException("当前密码不正确");
    row.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.password.change", "admin", saved.id, `管理员修改自己的密码：${saved.username}`);
    return this.publicAdmin(saved);
  }

  async updateAdminStatus(id: number, dto: UpdateAdminStatusDto, admin?: AdminContext) {
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    if (!dto.enabled) {
      if (admin?.id === id) throw new BadRequestException("不能禁用当前登录账号");
      const enabledCount = await this.admins.count({ where: { enabled: true } });
      if (row.enabled && enabledCount <= 1) throw new BadRequestException("至少需要保留一个启用的管理员账");
    }
    row.enabled = dto.enabled;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, dto.enabled ? "admin.enable" : "admin.disable", "admin", saved.id, `${dto.enabled ? "启用" : "禁用"}管理员：${saved.username}`);
    return this.publicAdmin(saved);
  }

  listCategories(includeDisabled = false, admin?: AdminContext) {
    const builder = this.categories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant").orderBy("category.sortOrder", "ASC").addOrderBy("category.id", "ASC");
    this.applyTenantScope(builder, "category", admin);
    if (!includeDisabled) builder.andWhere("category.enabled = :enabled", { enabled: true });
    return builder.getMany();
  }

  listAnnouncements(admin?: AdminContext, tenantId?: number) {
    const builder = this.announcements.createQueryBuilder("announcement").leftJoinAndSelect("announcement.tenant", "tenant").orderBy("announcement.pinned", "DESC").addOrderBy("announcement.createdAt", "DESC");
    this.applyTenantScope(builder, "announcement", admin);
    if (!this.isTenantScoped(admin) && tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId });
    return builder.getMany();
  }

  async createAnnouncement(dto: AnnouncementDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    const saved = await this.announcements.save(
      this.announcements.create({
        tenant,
        title: dto.title.trim(),
        content: dto.content.trim(),
        type: dto.type?.trim() || "notice",
        enabled: dto.enabled ?? true,
        pinned: dto.pinned ?? false
      })
    );
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "announcement.create", "announcement", saved.id, `创建公告：${saved.title}`, { type: saved.type, enabled: saved.enabled, pinned: saved.pinned, tenantId: saved.tenant?.id || null });
    return saved;
  }

  async updateAnnouncement(id: number, dto: AnnouncementDto, admin?: AdminContext) {
    const row = await this.announcements.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("公告不存在");
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin);
    Object.assign(row, {
      tenant,
      title: dto.title.trim(),
      content: dto.content.trim(),
      type: dto.type?.trim() || row.type,
      enabled: dto.enabled ?? row.enabled,
      pinned: dto.pinned ?? row.pinned
    });
    const saved = await this.announcements.save(row);
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "announcement.update", "announcement", saved.id, `更新公告：${saved.title}`, { type: saved.type, enabled: saved.enabled, pinned: saved.pinned, tenantId: saved.tenant?.id || null });
    return saved;
  }

  async deleteAnnouncement(id: number, admin?: AdminContext) {
    const row = await this.announcements.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("公告不存在");
    await this.announcements.delete(id);
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "announcement.delete", "announcement", id, `删除公告：${row.title}`, { type: row.type, enabled: row.enabled, pinned: row.pinned, tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async listHomepageSections(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageSections.createQueryBuilder("section").leftJoinAndSelect("section.tenant", "tenant").orderBy("section.sortOrder", "ASC").addOrderBy("section.id", "ASC");
    if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("section.tenantId IS NULL");
    builder.andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey });
    return builder.getMany();
  }

  async createHomepageSection(dto: HomepageSectionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(dto.pageKey || pageKey);
    const section = this.homepageSections.create({
      tenant: targetTenant,
      pageKey: normalizedPageKey,
      type: this.normalizeHomepageType(dto.type),
      title: this.nullableText(dto.title),
      subtitle: this.nullableText(dto.subtitle),
      enabled: dto.enabled ?? true,
      sortOrder: dto.sortOrder ?? (await this.nextHomepageSortOrder(admin, targetTenant, normalizedPageKey)),
      config: this.normalizeJsonObject(dto.config, "config"),
      layout: this.normalizeJsonObject(dto.layout, "layout")
    });
    const saved = await this.homepageSections.save(section);
    await this.logOperation(admin, "homepage.section.create", "homepage_section", saved.id, `创建H5装修模块：${saved.type}`, { title: saved.title, pageKey: saved.pageKey });
    return saved;
  }

  async updateHomepageSection(id: number, dto: HomepageSectionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(dto.pageKey || pageKey);
    const section = await this.homepageSections.findOneBy({ id });
    if (!section) throw new NotFoundException("首页模块不存");
    this.assertHomepageSectionScope(section, targetTenant, normalizedPageKey);
    section.pageKey = normalizedPageKey;
    if (dto.type !== undefined) section.type = this.normalizeHomepageType(dto.type);
    if (dto.title !== undefined) section.title = this.nullableText(dto.title);
    if (dto.subtitle !== undefined) section.subtitle = this.nullableText(dto.subtitle);
    if (dto.enabled !== undefined) section.enabled = dto.enabled;
    if (dto.sortOrder !== undefined) section.sortOrder = dto.sortOrder;
    if (dto.config !== undefined) section.config = this.normalizeJsonObject(dto.config, "config");
    if (dto.layout !== undefined) section.layout = this.normalizeJsonObject(dto.layout, "layout");
    const saved = await this.homepageSections.save(section);
    await this.logOperation(admin, "homepage.section.update", "homepage_section", saved.id, `更新H5装修模块：${saved.type}`, { title: saved.title, enabled: saved.enabled, pageKey: saved.pageKey });
    return saved;
  }

  async deleteHomepageSection(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const section = await this.homepageSections.findOneBy({ id });
    if (!section) throw new NotFoundException("首页模块不存");
    this.assertHomepageSectionScope(section, targetTenant, normalizedPageKey);
    await this.homepageSections.delete(id);
    await this.logOperation(admin, "homepage.section.delete", "homepage_section", id, `删除H5装修模块：${section.type}`, { title: section.title, pageKey: section.pageKey });
    return { id, deleted: true };
  }

  async reorderHomepageSections(items: HomepageReorderItemDto[], admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    if (!items.length) return this.listHomepageSections(admin, tenantId, normalizedPageKey);
    const ids = items.map((item) => item.id);
    const builder = this.homepageSections.createQueryBuilder("section").where("section.id IN (:...ids)", { ids });
    if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("section.tenantId IS NULL");
    builder.andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey });
    const sections = await builder.getMany();
    if (sections.length !== ids.length) throw new BadRequestException("排序列表包含不存在的首页模块");
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));
    for (const section of sections) section.sortOrder = orderMap.get(section.id) ?? section.sortOrder;
    await this.homepageSections.save(sections);
    await this.logOperation(admin, "homepage.section.reorder", "homepage_section", null, "调整H5装修模块排序", { items, pageKey: normalizedPageKey });
    return this.listHomepageSections(admin, tenantId, normalizedPageKey);
  }

  async resetHomepageSections(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageSections.createQueryBuilder().delete().where("pageKey = :pageKey", { pageKey: normalizedPageKey });
    if (targetTenant) builder.andWhere("tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("tenantId IS NULL");
    await builder.execute();
    const saved = await this.createDefaultHomepageSections(admin, targetTenant, normalizedPageKey);
    await this.logOperation(admin, "homepage.section.reset_default", "homepage_section", null, "恢复默认H5装修配置", { count: saved.length, pageKey: normalizedPageKey });
    return saved;
  }

  createCategory(dto: CategoryDto, admin?: AdminContext) {
    return this.categories.save(this.categories.create({ ...dto, tenant: this.tenantRelation(admin) }));
  }

  async updateCategory(id: number, dto: CategoryDto, admin?: AdminContext) {
    const category = await this.categories.findOneBy({ id });
    this.assertTenantAccess(category, admin);
    if (!category) throw new NotFoundException("分类不存");
    Object.assign(category, dto);
    category.tenant = this.tenantRelation(admin, category.tenant);
    return this.categories.save(category);
  }

  async removeCategory(id: number, admin?: AdminContext) {
    const category = await this.categories.findOneBy({ id });
    this.assertTenantAccess(category, admin);
    if (!category) throw new NotFoundException("分类不存");
    category.enabled = false;
    return this.categories.save(category);
  }

  listAgents(includeDisabled = false, admin?: AdminContext, tenantId?: number) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const builder = this.agents.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").orderBy("agent.id", "DESC");
    this.applyTenantScope(builder, "agent", admin);
    if (!this.isTenantScoped(admin) && tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId });
    if (!includeDisabled) builder.andWhere("agent.enabled = :enabled", { enabled: true });
    return builder.getMany();
  }

  async saveAgent(dto: AgentDto, id?: number, admin?: AdminContext) {
    await this.assertPaymentAccountEditable(admin);
    const agent = id ? await this.agents.findOne({ where: { id } }) : this.agents.create();
    if (!agent) throw new NotFoundException("代理不存");
    this.assertTenantAccess(agent, admin);
    const tenant = await this.resolveAgentTenant(dto.tenantId, agent.tenant, admin);
    Object.assign(agent, {
      name: dto.name.trim(),
      tenant: this.tenantRelation(admin, tenant || agent.tenant),
      region: dto.region?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      enabled: dto.enabled ?? true,
      settlementConfig: dto.settlementConfig || null
    });
    const saved = await this.agents.save(agent);
    await this.logOperation(admin, id ? "agent.update" : "agent.create", "agent", saved.id, id ? `更新代理：${saved.name}` : `创建代理：${saved.name}`, { region: saved.region, enabled: saved.enabled });
    return saved;
  }

  listAgentPaymentAccounts(agentId?: number, admin?: AdminContext, tenantId?: number) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const builder = this.agentPaymentAccounts
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.agent", "agent")
      .leftJoinAndSelect("account.tenant", "tenant")
      .leftJoinAndSelect("agent.tenant", "agentTenant")
      .orderBy("account.id", "DESC");
    this.applyTenantScope(builder, "account", admin);
    if (!this.isTenantScoped(admin) && tenantId) builder.andWhere("(tenant.id = :tenantId OR agentTenant.id = :tenantId)", { tenantId });
    if (agentId) builder.andWhere("agent.id = :agentId", { agentId });
    return builder.getMany().then((rows) => rows.map((row) => this.publicAgentPaymentAccount(row)));
  }

  async saveAgentPaymentAccount(dto: AgentPaymentAccountDto, id?: number, admin?: AdminContext) {
    await this.assertPaymentAccountEditable(admin);
    const agent = await this.agents.findOneBy({ id: dto.agentId });
    if (!agent) throw new NotFoundException("代理不存");
    this.assertTenantAccess(agent, admin);
    const row = id ? await this.agentPaymentAccounts.findOneBy({ id }) : this.agentPaymentAccounts.create();
    if (!row) throw new NotFoundException("代理支付账户不存");
    this.assertTenantAccess(row, admin);
    Object.assign(row, {
      agent,
      tenant: this.tenantRelation(admin, agent.tenant || row.tenant),
      provider: dto.provider,
      merchantName: dto.merchantName?.trim() || null,
      merchantNo: dto.merchantNo?.trim() || null,
      enabled: dto.enabled ?? true,
      config: dto.config || null
    });
    const saved = await this.agentPaymentAccounts.save(row);
    await this.logOperation(admin, id ? "agent_payment_account.update" : "agent_payment_account.create", "agent_payment_account", saved.id, id ? `更新代理支付账户：${agent.name}` : `创建代理支付账户：${agent.name}`, { agentId: agent.id, provider: saved.provider, merchantNo: saved.merchantNo, enabled: saved.enabled });
    return this.publicAgentPaymentAccount(saved);
  }

  async listActivities(query: ActivityQueryDto = {}, admin?: AdminContext) {
    const pageSize = Math.min(Math.max(Number(query.pageSize || 0), 0), 100);
    const page = Math.max(Number(query.page || 1), 1);
    const builder = this.activities
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.category", "category")
      .leftJoinAndSelect("activity.agent", "agent")
      .leftJoinAndSelect("activity.tenant", "tenant")
      .leftJoinAndSelect("activity.minMemberLevel", "minMemberLevel")
      .leftJoinAndSelect("activity.priorityMemberLevel", "priorityMemberLevel")
      .orderBy("activity.createdAt", "DESC");

    this.applyTenantScope(builder, "activity", admin);
    if (query.keyword?.trim()) {
      builder.andWhere("(activity.title LIKE :keyword OR activity.location LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.status) builder.andWhere("activity.status = :status", { status: query.status });
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });

    if (!pageSize) {
      const list = await builder.getMany();
      return Promise.all(list.map((activity) => this.withActivityStats(activity)));
    }

    const [list, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const items = await Promise.all(list.map((activity) => this.withActivityStats(activity)));
    const countBuilder = this.activities.createQueryBuilder("activity");
    this.applyTenantScope(countBuilder, "activity", admin);
    if (query.keyword?.trim()) {
      countBuilder.andWhere("(activity.title LIKE :keyword OR activity.location LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.categoryId) countBuilder.andWhere("activity.categoryId = :categoryId", { categoryId: query.categoryId });
    if (!this.isTenantScoped(admin) && query.tenantId) countBuilder.andWhere("activity.tenantId = :tenantId", { tenantId: query.tenantId });
    const statusCounts = await countBuilder.select("activity.status", "status").addSelect("COUNT(*)", "cnt").groupBy("activity.status").getRawMany();
    const counts: Record<string, number> = {};
    statusCounts.forEach((row: { status: string; cnt: string | number }) => {
      counts[row.status] = Number(row.cnt || 0);
    });
    return { items, total, page, pageSize, counts };
  }

  async getActivity(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id }, relations: ["fields"] });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    activity.fields = activity.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const [hosts, sections] = await Promise.all([
      this.hosts.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } }),
      this.sections.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } })
    ]);
    return this.withActivityStats({ ...activity, hosts, sections } as any);
  }

  async listActivityApprovalLogs(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    return this.activityApprovalLogs.find({
      where: { activity: { id: activityId } },
      order: { createdAt: "DESC" },
      take: 100
    });
  }

  async saveActivity(dto: ActivityDto, id?: number, admin?: AdminContext) {
    this.validateActivityDto(dto);
    this.assertActivityContentCompliance(dto);
    const category = dto.categoryId ? await this.categories.findOneBy({ id: dto.categoryId }) : null;
    if (dto.categoryId && !category) throw new BadRequestException("分类不存");
    this.assertTenantAccess(category, admin);
    const agent = dto.agentId ? await this.agents.findOneBy({ id: dto.agentId }) : null;
    if (dto.agentId && !agent) throw new BadRequestException("代理不存在");
    this.assertTenantAccess(agent, admin);
    const minMemberLevel = dto.minMemberLevelId ? await this.memberLevels.findOneBy({ id: dto.minMemberLevelId }) : null;
    if (dto.minMemberLevelId && !minMemberLevel) throw new BadRequestException("会员等级不存");
    const priorityMemberLevel = dto.priorityMemberLevelId ? await this.memberLevels.findOneBy({ id: dto.priorityMemberLevelId }) : null;
    if (dto.priorityMemberLevelId && !priorityMemberLevel) throw new BadRequestException("优先报名会员等级不存");
    const activity = id ? await this.activities.findOne({ where: { id }, relations: ["fields"] }) : this.activities.create();
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    const tenant = await this.resolveActivityTenant(admin, activity.tenant, dto.tenantId);
    const permissions = this.tenantPermissions(tenant);
    if (dto.requireReview && this.isTenantScoped(admin) && !permissions.registrationReviewEnabled) throw new BadRequestException("当前商家未开启报名审核权限");
    const fromStatus = id ? activity.status : null;
    const nextStatus = this.resolveActivitySaveStatus(dto.status, activity.status, permissions, admin);

    Object.assign(activity, { title: dto.title.trim(), tenant: tenant || this.tenantRelation(admin, activity.tenant), coverUrl: dto.coverUrl || null, description: dto.description.trim(), notice: dto.notice?.trim() || null, location: dto.location.trim(), locationLatitude: dto.locationLatitude === undefined || dto.locationLatitude === null ? null : Number(dto.locationLatitude).toFixed(6), locationLongitude: dto.locationLongitude === undefined || dto.locationLongitude === null ? null : Number(dto.locationLongitude).toFixed(6), locationMapUrl: dto.locationMapUrl?.trim() || null, groupQrCodeUrl: dto.groupQrCodeUrl?.trim() || null, startTime: this.parseDate(dto.startTime), endTime: this.parseDate(dto.endTime), registrationDeadline: this.parseDate(dto.registrationDeadline), priorityRegistrationEndsAt: dto.priorityRegistrationEndsAt ? this.parseDate(dto.priorityRegistrationEndsAt) : null, capacity: dto.capacity, price: Number(dto.price).toFixed(2), status: nextStatus, featured: dto.featured, requireReview: dto.requireReview, allowCancel: dto.allowCancel, category, agent, minMemberLevel, priorityMemberLevel });
    const saved = await this.activities.save(activity);
    if (id) await Promise.all([this.fields.delete({ activity: { id } }), this.hosts.delete({ activity: { id } }), this.sections.delete({ activity: { id } })]);
    await this.fields.save(dto.fields.map((field) => this.fields.create({ ...field, label: field.label.trim(), options: field.options || null, activity: saved })));
    await this.hosts.save((dto.hosts || []).map((host) => this.hosts.create({ activity: saved, name: host.name.trim(), title: host.title?.trim() || null, avatarUrl: host.avatarUrl?.trim() || null, bio: host.bio?.trim() || null, sortOrder: host.sortOrder })));
    await this.sections.save((dto.sections || []).map((section) => this.sections.create({ activity: saved, type: section.type, title: section.title.trim(), content: section.content.trim(), imageUrl: section.imageUrl?.trim() || null, sortOrder: section.sortOrder })));
    await this.recordActivityApproval(saved, id ? "update" : "create", fromStatus, saved.status, admin, id ? "编辑活动内容" : "创建活动");
    await this.logOperation(admin, id ? "activity.update" : "activity.create", "activity", saved.id, id ? `编辑活动：${saved.title}` : `创建活动：${saved.title}`, { status: saved.status, price: saved.price });
    return this.getActivity(saved.id, admin);
  }

  async submitActivityForApproval(id: number, admin?: AdminContext) {
    const activity = await this.activityWithSections(id);
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    this.assertActivityContentCompliance(activity);
    if (!this.isTenantScoped(admin)) throw new BadRequestException("平台管理员请直接审核活动");
    if (![ActivityStatus.Draft, ActivityStatus.Rejected].includes(activity.status)) throw new BadRequestException("只有草稿或已驳回活动可以提交审核");
    const tenant = await this.resolveActivityTenant(admin, activity.tenant);
    const fromStatus = activity.status;
    if (!this.tenantPermissions(tenant).activityPublishReviewRequired) {
      activity.status = ActivityStatus.Open;
    } else {
      activity.status = ActivityStatus.PendingApproval;
    }
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "submit", fromStatus, saved.status, admin);
    await this.logOperation(admin, "activity.submit_approval", "activity", saved.id, `提交活动审核：${saved.title}`, { status: saved.status });
    return this.getActivity(saved.id, admin);
  }

  async approveActivity(id: number, dto: ActivityApprovalDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const activity = await this.activityWithSections(id);
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityContentCompliance(activity);
    if (activity.status !== ActivityStatus.PendingApproval) throw new BadRequestException("只有待平台审核活动可以通过");
    const fromStatus = activity.status;
    activity.status = ActivityStatus.Open;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "approve", fromStatus, saved.status, admin, dto.remark);
    await this.logOperation(admin, "activity.approve", "activity", saved.id, `审核通过活动：${saved.title}`, { remark: dto.remark || null });
    return this.getActivity(saved.id, admin);
  }

  async rejectActivity(id: number, dto: ActivityApprovalDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存");
    if (activity.status !== ActivityStatus.PendingApproval) throw new BadRequestException("只有待平台审核活动可以驳回");
    const fromStatus = activity.status;
    activity.status = ActivityStatus.Rejected;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "reject", fromStatus, saved.status, admin, dto.remark);
    await this.logOperation(admin, "activity.reject", "activity", saved.id, `驳回活动：${saved.title}`, { remark: dto.remark || null });
    return this.getActivity(saved.id, admin);
  }

  private async recordActivityApproval(
    activity: Activity,
    action: "create" | "update" | "close" | "submit" | "approve" | "reject",
    fromStatus: ActivityStatus | string | null,
    toStatus: ActivityStatus | string | null,
    admin?: AdminContext,
    remark?: string | null
  ) {
    await this.activityApprovalLogs.save(
      this.activityApprovalLogs.create({
        activity,
        tenant: this.tenantRelation(admin, activity.tenant),
        action,
        operator: admin?.username || null,
        fromStatus: fromStatus || null,
        toStatus: toStatus || null,
        remark: remark?.trim() || null,
        snapshot: {
          title: activity.title,
          status: activity.status,
          startTime: activity.startTime,
          endTime: activity.endTime,
          registrationDeadline: activity.registrationDeadline,
          capacity: activity.capacity,
          price: activity.price,
          requireReview: activity.requireReview
        }
      })
    );
  }

  async deleteActivity(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    const fromStatus = activity.status;
    activity.status = ActivityStatus.Closed;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "close", fromStatus, saved.status, admin, "下架活动");
    await this.logOperation(admin, "activity.close", "activity", saved.id, `下架活动：${saved.title}`);
    return saved;
  }

  async listRegistrations(query: RegistrationQueryDto, admin?: AdminContext) {
    const pageSize = Math.min(Math.max(Number(query.pageSize || 0), 0), 100);
    const page = Math.max(Number(query.page || 1), 1);
    const builder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .orderBy("registration.createdAt", "DESC");

    this.applyTenantScope(builder, "registration", admin);
    if (query.activityId) builder.andWhere("activity.id = :activityId", { activityId: query.activityId });
    if (query.status) builder.andWhere("registration.status = :status", { status: query.status });
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: query.tenantId });
    if (query.keyword?.trim()) {
      builder.andWhere("(activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR linkedOrder.orderNo LIKE :keyword OR JSON_EXTRACT(registration.answers, '$') LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }

    if (!pageSize) return builder.getMany();

    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  async approveRegistration(id: number, dto: ReviewDto, admin?: AdminContext) {
    const registration = await this.getRegistration(id, admin);
    if (registration.status !== RegistrationStatus.PendingReview) throw new BadRequestException("只有待审核报名可以审核通过");
    const order = await this.orders.findOne({ where: { registration: { id } } });
    if (order?.status === OrderStatus.PendingPayment) throw new BadRequestException("请先确认收款");
    registration.status = RegistrationStatus.Approved;
    registration.reviewRemark = dto.remark || null;
    const saved = await this.registrations.save(registration);
    await this.logOperation(admin, "registration.approve", "registration", saved.id, `审核通过报名：${saved.activity.title}`, { remark: dto.remark || null });
    return saved;
  }

  async rejectRegistration(id: number, dto: ReviewDto, admin?: AdminContext) {
    const registration = await this.getRegistration(id, admin);
    if (![RegistrationStatus.PendingReview, RegistrationStatus.PendingPayment].includes(registration.status)) throw new BadRequestException("当前状态不能拒");
    registration.status = RegistrationStatus.Rejected;
    registration.reviewRemark = dto.remark || null;
    const order = await this.orders.findOne({ where: { registration: { id } } });
    if (order && order.status === OrderStatus.PendingPayment) {
      order.status = OrderStatus.Cancelled;
      await this.orders.save(order);
      await this.refundRedeemedPoints(order, "报名拒绝返还积分");
    }
    const saved = await this.registrations.save(registration);
    await this.logOperation(admin, "registration.reject", "registration", saved.id, `拒绝报名：${saved.activity.title}`, { remark: dto.remark || null });
    return saved;
  }

  async cancelRegistration(id: number, reason?: string, admin?: AdminContext) {
    const registration = await this.getRegistration(id, admin);
    if ([RegistrationStatus.Cancelled, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("当前状态不能取");
    registration.status = RegistrationStatus.Cancelled;
    registration.cancelReason = reason || "后台取消";
    const order = await this.orders.findOne({ where: { registration: { id } } });
    if (order && order.status === OrderStatus.PendingPayment) {
      order.status = OrderStatus.Cancelled;
      await this.orders.save(order);
      await this.refundRedeemedPoints(order, "后台取消报名返还积分");
    }
    const saved = await this.registrations.save(registration);
    await this.logOperation(admin, "registration.cancel", "registration", saved.id, `取消报名：${saved.activity.title}`, { reason: saved.cancelReason });
    return saved;
  }

  async listOrders(query: OrderQueryDto | OrderStatus = {}, admin?: AdminContext) {
    const normalizedQuery: OrderQueryDto = typeof query === "string" ? { status: query } : query || {};
    const pageSize = Math.min(Math.max(Number(normalizedQuery.pageSize || 0), 0), 100);
    const page = Math.max(Number(normalizedQuery.page || 1), 1);
    const builder = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.agent", "agent")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .leftJoinAndSelect("order.coupon", "coupon")
      .leftJoinAndSelect("order.memberLevel", "memberLevel")
      .orderBy("order.createdAt", "DESC");

    this.applyTenantScope(builder, "order", admin);
    if (normalizedQuery.status) builder.andWhere("order.status = :status", { status: normalizedQuery.status });
    if (normalizedQuery.activityId) builder.andWhere("activity.id = :activityId", { activityId: normalizedQuery.activityId });
    if (normalizedQuery.agentId) builder.andWhere("agent.id = :agentId", { agentId: normalizedQuery.agentId });
    if (!this.isTenantScoped(admin) && normalizedQuery.tenantId) builder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: normalizedQuery.tenantId });
    if (normalizedQuery.keyword?.trim()) {
      builder.andWhere("(order.orderNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${normalizedQuery.keyword.trim()}%` });
    }

    if (!pageSize) return builder.getMany();

    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  async closeExpiredPendingOrders(now = new Date(), admin?: { id?: number; username?: string }) {
    const rows = await this.orders.find({
      where: { status: OrderStatus.PendingPayment, expiresAt: LessThanOrEqual(now) },
      order: { expiresAt: "ASC" },
      take: 200
    });
    const closed: Order[] = [];
    for (const order of rows) {
      closed.push(await this.closeExpiredOrder(order, "订单超时未付款，系统已关"));
    }
    await this.logOperation(admin, "order.close_expired", "order", null, `Closed expired pending orders: ${closed.length}`, { checkedCount: rows.length, closedCount: closed.length, now: now.toISOString() });
    return { checkedCount: rows.length, closedCount: closed.length, closed };
  }

  listTicketTypes(activityId?: number, admin?: AdminContext) {
    const builder = this.ticketTypes.createQueryBuilder("ticketType").leftJoinAndSelect("ticketType.activity", "activity").leftJoinAndSelect("ticketType.tenant", "tenant").orderBy("ticketType.id", "DESC");
    this.applyTenantScope(builder, "ticketType", admin);
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    return builder.getMany();
  }

  async saveTicketType(dto: TicketTypeDto, id?: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: dto.activityId });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    const row = id ? await this.ticketTypes.findOneBy({ id }) : this.ticketTypes.create();
    if (!row) throw new NotFoundException("票种不存");
    this.assertTenantAccess(row, admin);
    Object.assign(row, { activity, tenant: this.tenantRelation(admin, activity.tenant || row.tenant), name: dto.name.trim(), price: Number(dto.price).toFixed(2), capacity: dto.capacity ?? null, enabled: dto.enabled ?? true });
    return this.ticketTypes.save(row);
  }

  listCoupons(admin?: AdminContext) {
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("coupon.tenant", "tenant").orderBy("coupon.createdAt", "DESC");
    this.applyTenantScope(builder, "coupon", admin);
    return builder.getMany();
  }

  async saveCoupon(dto: CouponDto, id?: number, admin?: AdminContext) {
    if (!["fixed", "percent"].includes(dto.discountType)) throw new BadRequestException("优惠类型不正");
    if (dto.discountType === "percent" && dto.discountValue > 100) throw new BadRequestException("折扣比例不能超过 100");
    const activity = dto.activityId ? await this.activities.findOneBy({ id: dto.activityId }) : null;
    if (dto.activityId && !activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    const row = id ? await this.coupons.findOneBy({ id }) : this.coupons.create();
    if (!row) throw new NotFoundException("优惠码不存在");
    this.assertTenantAccess(row, admin);
    Object.assign(row, {
      code: dto.code.trim().toUpperCase(),
      tenant: this.tenantRelation(admin, activity?.tenant || row.tenant),
      name: dto.name.trim(),
      discountType: dto.discountType,
      discountValue: Number(dto.discountValue).toFixed(2),
      minAmount: Number(dto.minAmount || 0).toFixed(2),
      usageLimit: dto.usageLimit ?? null,
      activity,
      enabled: dto.enabled ?? true,
      startsAt: dto.startsAt ? this.parseDate(dto.startsAt) : null,
      endsAt: dto.endsAt ? this.parseDate(dto.endsAt) : null
    });
    if (row.startsAt && row.endsAt && row.endsAt <= row.startsAt) throw new BadRequestException("优惠码结束时间必须晚于开始时");
    return this.coupons.save(row);
  }

  async financeDashboard(query: OrderQueryDto = {}, admin?: AdminContext) {
    const [orderCount, paidOrderCount, pendingOrderCount, refundCount, pendingRefundCount, completedRefundCount, pendingReconciliationCount, pendingStatementCount, failedCallbackCount, transactions, refunds, reconciliationItems, callbackLogs, statementRecords, agentSummary] = await Promise.all([
      this.countOrdersForAgent(query, undefined, admin),
      this.countOrdersForAgent(query, OrderStatus.Paid, admin),
      this.countOrdersForAgent(query, OrderStatus.PendingPayment, admin),
      this.countRefundsForAgent(query, undefined, admin),
      this.countRefundsForAgent(query, "pending", admin),
      this.countRefundsForAgent(query, "completed", admin),
      this.countTransactionsForAgent(query, "pending", admin),
      this.countPaymentStatementsForAgent(query, "pending", admin),
      this.countCallbackLogsForAgent(query, "failed", admin),
      this.listPaymentTransactions(query, 8, admin),
      this.listRefunds(query, 8, admin),
      this.listPaymentReconciliation(query, 8, admin),
      this.listPaymentCallbackLogs(query, 8, admin),
      this.listPaymentStatements(query, 8, admin),
      this.agentFinanceSummary(query, admin)
    ]);
    const paidAmount = await this.transactionSumForAgent(query, "success", admin);
    const refundAmount = await this.refundSumForAgent(query, "completed", admin);
    const income = Number(paidAmount?.sum || 0);
    const refundsTotal = Number(refundAmount?.sum || 0);
    return {
      totals: {
        orderCount,
        paidOrderCount,
        pendingOrderCount,
        refundCount,
        pendingRefundCount,
        completedRefundCount,
        pendingReconciliationCount,
        pendingStatementCount,
        failedCallbackCount,
        paidAmount: income.toFixed(2),
        refundAmount: refundsTotal.toFixed(2),
        netAmount: (income - refundsTotal).toFixed(2)
      },
      recentTransactions: transactions,
      recentRefunds: refunds,
      reconciliationItems,
      callbackLogs,
      statementRecords,
      agentSummary
    };
  }

  listPaymentTransactions(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.paymentTransactionsQuery().orderBy("transaction.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  listPaymentReconciliation(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.paymentTransactionsQuery().where("transaction.reconciliationStatus IN (:...statuses)", { statuses: ["pending", "resolved"] }).orderBy("transaction.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  listPaymentCallbackLogs(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.callbackLogsQuery().orderBy("callback.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "callback", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "callback");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  listPaymentStatements(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.paymentStatementsQuery().orderBy("statement.importedAt", "DESC").take(take);
    this.applyTenantScope(builder, "statement", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "statement");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  async importPaymentStatements(dto: PaymentStatementImportDto, admin: AdminContext & { username: string }) {
    const provider = this.normalizeStatementProvider(dto.provider);
    const batchNo = dto.batchNo?.trim() || `ST${Date.now()}`;
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException("请至少导入一条服务商账单记录");
    let importedCount = 0;
    let updatedCount = 0;
    let matchedCount = 0;
    let pendingCount = 0;
    let skippedCount = 0;
    const details: Array<{ transactionNo: string; orderNo: string | null; status: string; discrepancyType: string | null }> = [];
    for (const item of items.slice(0, 500)) {
      const normalized = this.normalizePaymentStatementItem(provider, item, batchNo);
      if (!normalized) {
        skippedCount += 1;
        continue;
      }
      const orderWhere = normalized.orderNo ? paymentStatementOrderWhere(normalized.orderNo, admin) : null;
      const order = normalized.orderNo ? await this.orders.findOne({ where: orderWhere as any }) : null;
      const { status, discrepancyType, remark } = this.reconcileStatementWithOrder(normalized, order);
      let record = await this.paymentStatementRecords.findOne({ where: { provider, transactionNo: normalized.transactionNo } });
      const isNew = !record;
      record = record || this.paymentStatementRecords.create({ provider, transactionNo: normalized.transactionNo });
      Object.assign(record, {
        order,
        tenant: this.tenantRelation(admin, order?.tenant || record.tenant),
        orderNo: normalized.orderNo,
        amount: normalized.amount,
        tradeType: normalized.tradeType,
        providerStatus: normalized.providerStatus,
        tradedAt: normalized.tradedAt,
        batchNo,
        reconciliationStatus: status,
        discrepancyType,
        remark,
        rawPayload: normalized.raw,
        importedBy: admin.username
      });
      const savedRecord = await this.paymentStatementRecords.save(record);
      if (isNew) importedCount += 1;
      else updatedCount += 1;
      if (status === "matched") matchedCount += 1;
      else pendingCount += 1;
      if (order) await this.upsertStatementPaymentTransaction(provider, normalized, order, status, discrepancyType, remark);
      details.push({ transactionNo: savedRecord.transactionNo, orderNo: savedRecord.orderNo, status: savedRecord.reconciliationStatus, discrepancyType: savedRecord.discrepancyType });
    }
    await this.logOperation(admin, "finance.statement_import", "payment_statement", null, `导入服务商对账单：${batchNo}`, { provider, batchNo, importedCount, updatedCount, matchedCount, pendingCount, skippedCount });
    return { provider, batchNo, importedCount, updatedCount, matchedCount, pendingCount, skippedCount, details };
  }

  async fetchPaymentStatements(dto: PaymentStatementFetchDto, admin: AdminContext & { username: string }) {
    const provider = this.normalizeStatementProvider(dto.provider);
    const statementDate = this.normalizeStatementDate(dto.statementDate);
    try {
      const result = await this.paymentProvider.fetchStatement({ provider, statementDate, agentId: dto.agentId || null, tenantId: admin.tenantId || null });
      const imported = await this.importPaymentStatements(
        {
          provider,
          batchNo: result.batchNo,
          items: result.items.map((item) => ({
            transactionNo: item.transactionNo,
            orderNo: item.orderNo || undefined,
            amount: Number(item.amount),
            tradeType: item.tradeType || undefined,
            providerStatus: item.providerStatus || undefined,
            tradedAt: item.tradedAt || undefined,
            raw: item.raw
          }))
        },
        admin
      );
      await this.logOperation(admin, "finance.statement_fetch", "payment_statement", null, `拉取服务商对账单：${provider} ${statementDate}`, { provider, statementDate, agentId: dto.agentId || null, batchNo: result.batchNo, itemCount: result.items.length });
      return { implemented: true, statementDate, ...imported };
    } catch (error) {
      if (!(error instanceof NotImplementedException)) throw error;
      const message = error.message || "服务商账单自动拉取尚未实";
      await this.logOperation(admin, "finance.statement_fetch_unimplemented", "payment_statement", null, `服务商账单自动拉取未实现：${provider} ${statementDate}`, { provider, statementDate, agentId: dto.agentId || null, message });
      return { implemented: false, provider, statementDate, importedCount: 0, updatedCount: 0, matchedCount: 0, pendingCount: 0, skippedCount: 0, message };
    }
  }

  async scanPaymentReconciliation() {
    const rows = await this.paymentTransactions.find({ order: { createdAt: "DESC" }, take: 500 });
    let pendingCount = 0;
    let matchedCount = 0;
    for (const row of rows) {
      if (row.reconciliationStatus === "resolved") continue;
      const orderAmount = Number(row.order.amount);
      const transactionAmount = Number(row.amount);
      let discrepancyType: string | null = null;
      if (row.status === "discrepancy") discrepancyType = row.discrepancyType || "provider_callback_error";
      else if (Math.abs(orderAmount - transactionAmount) > 0.001) discrepancyType = "amount_mismatch";
      else if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded].includes(row.order.status)) discrepancyType = "order_status_mismatch";

      if (discrepancyType) {
        row.reconciliationStatus = "pending";
        row.discrepancyType = discrepancyType;
        pendingCount += 1;
      } else {
        row.reconciliationStatus = "matched";
        row.discrepancyType = null;
        matchedCount += 1;
      }
      await this.paymentTransactions.save(row);
    }
    return { scannedCount: rows.length, pendingCount, matchedCount };
  }

  async resolvePaymentTransaction(id: number, dto: ReviewDto, admin: AdminContext) {
    const transaction = await this.paymentTransactions.findOne({ where: { id } });
    if (!transaction) throw new NotFoundException("支付流水不存");
    this.assertTenantAccess(transaction, admin);
    if (transaction.reconciliationStatus !== "pending") throw new BadRequestException("只有待处理对账差异可以标记处");
    transaction.reconciliationStatus = "resolved";
    transaction.reconciledBy = this.actorName(admin);
    transaction.reconciliationRemark = dto.remark || null;
    transaction.reconciledAt = new Date();
    return this.paymentTransactions.save(transaction);
  }

  private normalizeStatementProvider(provider: string) {
    const value = String(provider || "").trim().toLowerCase();
    if (value !== "wechat" && value !== "alipay") throw new BadRequestException("暂只支持导入微信或支付宝对账");
    return value;
  }

  private normalizeStatementDate(value: string) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new BadRequestException("Statement date must be YYYY-MM-DD");
    const date = new Date(`${text}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("账单日期无效");
    return text;
  }

  private normalizePaymentStatementItem(provider: string, item: PaymentStatementImportItemDto, batchNo: string) {
    const raw = { ...(item.raw || {}), ...item } as Record<string, unknown>;
    const transactionNo = this.statementString(raw, "transactionNo", "transaction_no", "transaction_id", "trade_no", "providerTransactionNo");
    if (!transactionNo) return null;
    const orderNo = this.statementString(raw, "orderNo", "order_no", "out_trade_no", "outTradeNo", "merchant_order_no") || null;
    const amountValue = this.statementNumber(raw, "amount", "total_amount", "totalFee", "total_fee", "settlement_total_fee", "payer_total");
    if (amountValue === null || amountValue < 0) return null;
    return {
      provider,
      transactionNo,
      orderNo,
      amount: amountValue.toFixed(2),
      tradeType: this.statementString(raw, "tradeType", "trade_type", "trade_scene", "bill_type") || null,
      providerStatus: this.statementString(raw, "providerStatus", "trade_status", "trade_state", "status") || null,
      tradedAt: this.statementDate(raw, "tradedAt", "success_time", "trade_time", "paidAt", "paid_at"),
      batchNo,
      raw
    };
  }

  private reconcileStatementWithOrder(statement: { amount: string; orderNo: string | null; transactionNo: string }, order: Order | null) {
    if (!order) return { status: "pending", discrepancyType: "unknown_order", remark: statement.orderNo ? "服务商账单订单号未匹配到本地订单" : "服务商账单缺少订单号" };
    if (Math.abs(Number(statement.amount) - Number(order.amount)) > 0.001) return { status: "pending", discrepancyType: "amount_mismatch", remark: "服务商账单金额与本地订单金额不一" };
    if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded].includes(order.status)) return { status: "pending", discrepancyType: "order_status_mismatch", remark: "Provider statement is paid but local order status is not paid" };
    return { status: "matched", discrepancyType: null, remark: "服务商账单与本地订单匹配" };
  }

  private async upsertStatementPaymentTransaction(provider: string, statement: { transactionNo: string; amount: string }, order: Order, reconciliationStatus: string, discrepancyType: string | null, remark: string) {
    let transaction = await this.paymentTransactions.findOne({ where: { transactionNo: statement.transactionNo } });
    transaction = transaction || this.paymentTransactions.create({ transactionNo: statement.transactionNo });
    Object.assign(transaction, {
      order,
      tenant: order.tenant || transaction.tenant || null,
      provider,
      paymentMethod: order.paymentMethod,
      amount: statement.amount,
      status: reconciliationStatus === "matched" ? "success" : "discrepancy",
      reconciliationStatus,
      discrepancyType,
      remark
    });
    await this.paymentTransactions.save(transaction);
  }

  private statementString(raw: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  }

  private statementNumber(raw: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim()) {
        const normalized = Number(value.replace(/[,\s￥¥元]/g, ""));
        if (Number.isFinite(normalized)) return normalized;
      }
    }
    return null;
  }

  private statementDate(raw: Record<string, unknown>, ...keys: string[]) {
    const value = this.statementString(raw, ...keys);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  listRefunds(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.refundsQuery().orderBy("refund.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  async exportFinance(query: OrderQueryDto = {}, admin?: AdminContext) {
    const [transactions, refunds, callbackLogs, statementRecords] = await Promise.all([this.listPaymentTransactions(query, 200, admin), this.listRefunds(query, 200, admin), this.listPaymentCallbackLogs(query, 200, admin), this.listPaymentStatements(query, 200, admin)]);
    const workbook = new ExcelJS.Workbook();
    const transactionSheet = workbook.addWorksheet("支付流水");
    transactionSheet.columns = [
      { header: "流水", key: "transactionNo", width: 28 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "渠道", key: "provider", width: 16 },
      { header: "支付方式", key: "paymentMethod", width: 16 },
      { header: "金额", key: "amount", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Reconciliation status", key: "reconciliationStatus", width: 18 },
      { header: "Discrepancy type", key: "discrepancyType", width: 18 },
      { header: "Reconciled by", key: "reconciledBy", width: 14 },
      { header: "处理备注", key: "reconciliationRemark", width: 28 },
      { header: "备注", key: "remark", width: 28 },
      { header: "处理时间", key: "reconciledAt", width: 24 },
      { header: "时间", key: "createdAt", width: 24 }
    ];
    transactions.forEach((item) => transactionSheet.addRow({ transactionNo: item.transactionNo, orderNo: item.order.orderNo, activity: item.order.registration.activity.title, agent: item.order.agent?.name || "平台自营", provider: item.provider, paymentMethod: item.paymentMethod, amount: item.amount, status: item.status, reconciliationStatus: item.reconciliationStatus, discrepancyType: item.discrepancyType, reconciledBy: item.reconciledBy, reconciliationRemark: item.reconciliationRemark, remark: item.remark, reconciledAt: item.reconciledAt, createdAt: item.createdAt }));

    const refundSheet = workbook.addWorksheet("退款记");
    refundSheet.columns = [
      { header: "退款号", key: "refundNo", width: 28 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "金额", key: "amount", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "操作", key: "operator", width: 16 },
      { header: "原因", key: "reason", width: 28 },
      { header: "审核", key: "reviewedBy", width: 16 },
      { header: "审核备注", key: "reviewRemark", width: 28 },
      { header: "服务商退款号", key: "providerRefundNo", width: 28 },
      { header: "服务商退款状", key: "providerRefundStatus", width: 18 },
      { header: "服务商失败原", key: "providerRefundFailureReason", width: 32 },
      { header: "服务商同步时", key: "providerRefundSyncedAt", width: 24 },
      { header: "下次查询时间", key: "providerRefundNextQueryAt", width: 24 },
      { header: "申请时间", key: "createdAt", width: 24 },
      { header: "审核时间", key: "reviewedAt", width: 24 },
      { header: "完成时间", key: "completedAt", width: 24 }
    ];
    refunds.forEach((item) => refundSheet.addRow({ refundNo: item.refundNo, orderNo: item.order.orderNo, activity: item.order.registration.activity.title, agent: item.order.agent?.name || "平台自营", amount: item.amount, status: item.status, operator: item.operator, reason: item.reason, reviewedBy: item.reviewedBy, reviewRemark: item.reviewRemark, providerRefundNo: item.providerRefundNo, providerRefundStatus: item.providerRefundStatus, providerRefundFailureReason: item.providerRefundFailureReason, providerRefundSyncedAt: item.providerRefundSyncedAt, providerRefundNextQueryAt: item.providerRefundNextQueryAt, createdAt: item.createdAt, reviewedAt: item.reviewedAt, completedAt: item.completedAt }));

    const callbackSheet = workbook.addWorksheet("支付回调日志");
    callbackSheet.columns = [
      { header: "服务", key: "provider", width: 16 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "交易", key: "transactionNo", width: 28 },
      { header: "金额", key: "amount", width: 12 },
      { header: "验签", key: "signatureValid", width: 12 },
      { header: "处理结果", key: "resultStatus", width: 14 },
      { header: "结果说明", key: "resultMessage", width: 32 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "收到时间", key: "createdAt", width: 24 },
      { header: "处理时间", key: "processedAt", width: 24 }
    ];
    callbackLogs.forEach((item) => callbackSheet.addRow({ provider: item.provider, orderNo: item.orderNo, transactionNo: item.transactionNo, amount: item.amount, signatureValid: item.signatureValid === null ? "未验" : item.signatureValid ? "通过" : "失败", resultStatus: item.resultStatus, resultMessage: item.resultMessage, activity: item.order?.registration?.activity?.title || "-", agent: item.order?.agent?.name || "平台自营", createdAt: item.createdAt, processedAt: item.processedAt }));

    const statementSheet = workbook.addWorksheet("服务商账");
    statementSheet.columns = [
      { header: "服务", key: "provider", width: 16 },
      { header: "交易", key: "transactionNo", width: 28 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "金额", key: "amount", width: 12 },
      { header: "交易类型", key: "tradeType", width: 16 },
      { header: "服务商状", key: "providerStatus", width: 16 },
      { header: "Reconciliation status", key: "reconciliationStatus", width: 18 },
      { header: "Discrepancy type", key: "discrepancyType", width: 18 },
      { header: "Remark", key: "remark", width: 28 },
      { header: "批次", key: "batchNo", width: 20 },
      { header: "导入", key: "importedBy", width: 16 },
      { header: "交易时间", key: "tradedAt", width: 24 },
      { header: "导入时间", key: "importedAt", width: 24 }
    ];
    statementRecords.forEach((item) => statementSheet.addRow({ provider: item.provider, transactionNo: item.transactionNo, orderNo: item.orderNo, activity: item.order?.registration?.activity?.title || "-", agent: item.order?.agent?.name || "平台自营", amount: item.amount, tradeType: item.tradeType, providerStatus: item.providerStatus, reconciliationStatus: item.reconciliationStatus, discrepancyType: item.discrepancyType, remark: item.remark, batchNo: item.batchNo, importedBy: item.importedBy, tradedAt: item.tradedAt, importedAt: item.importedAt }));

    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }
    return workbook.xlsx.writeBuffer();
  }

  listAgentSettlements(query: AgentSettlementQueryDto = {}, admin?: AdminContext) {
    const builder = this.agentSettlements.createQueryBuilder("settlement").leftJoinAndSelect("settlement.agent", "agent").orderBy("settlement.createdAt", "DESC");
    this.applyTenantScope(builder, "settlement", admin);
    if (query.agentId) builder.andWhere("agent.id = :agentId", { agentId: query.agentId });
    if (query.status?.trim()) builder.andWhere("settlement.status = :status", { status: query.status.trim() });
    return builder.take(300).getMany();
  }

  async agentSettlementTransferCapability(admin?: AdminContext) {
    const agentBuilder = this.agents.createQueryBuilder("agent").orderBy("agent.id", "ASC");
    this.applyTenantScope(agentBuilder, "agent", admin);
    const accountBuilder = this.agentPaymentAccounts.createQueryBuilder("account").leftJoinAndSelect("account.agent", "agent").orderBy("account.id", "DESC");
    this.applyTenantScope(accountBuilder, "account", admin);
    const [agents, accounts] = await Promise.all([
      agentBuilder.getMany(),
      accountBuilder.getMany()
    ]);
    return buildAgentSettlementTransferCapability(this.config, agents, accounts);
  }

  async generateAgentSettlement(dto: AgentSettlementGenerateDto, admin: AdminContext) {
    const agent = await this.agents.findOneBy({ id: dto.agentId });
    if (!agent) throw new NotFoundException("代理不存");
    this.assertTenantAccess(agent, admin);
    const periodStart = this.parseDate(dto.periodStart);
    const periodEnd = this.parseDate(dto.periodEnd);
    if (periodEnd <= periodStart) throw new BadRequestException("结算结束时间必须晚于开始时");
    await this.assertNoActiveAgentSettlement(agent.id, periodStart, periodEnd);

    const [transactionRows, refundRows] = await Promise.all([this.agentSettlementTransactions(agent.id, periodStart, periodEnd), this.agentSettlementRefunds(agent.id, periodStart, periodEnd)]);
    const grossAmount = transactionRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const refundAmount = refundRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const netAmount = Math.max(grossAmount - refundAmount, 0);
    const commissionRate = this.resolveAgentCommissionRate(agent, dto.commissionRate);
    const commissionAmount = netAmount * (commissionRate / 100);
    const payableAmount = Math.max(netAmount - commissionAmount, 0);
    const settlement = await this.agentSettlements.save(
      this.agentSettlements.create({
        settlementNo: `AS${Date.now()}${agent.id}`,
        agent,
        tenant: this.tenantRelation(admin, agent.tenant),
        periodStart,
        periodEnd,
        transactionCount: transactionRows.length,
        refundCount: refundRows.length,
        grossAmount: grossAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        commissionRate: commissionRate.toFixed(4),
        commissionAmount: commissionAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        status: "draft",
        generatedBy: this.actorName(admin),
        payload: {
          remark: dto.remark || null,
          transactionIds: transactionRows.map((item) => item.id),
          refundIds: refundRows.map((item) => item.id),
          transactionNos: transactionRows.map((item) => item.transactionNo),
          refundNos: refundRows.map((item) => item.refundNo)
        }
      })
    );
    await this.logOperation(admin, "agent_settlement.generate", "agent_settlement", settlement.id, `生成代理结算单：${settlement.settlementNo}`, { agentId: agent.id, periodStart, periodEnd, payableAmount: settlement.payableAmount });
    return settlement;
  }

  async agentSettlementDetails(id: number, admin?: AdminContext) {
    const settlement = await this.getAgentSettlement(id, admin);
    const recalculated = await this.calculateAgentSettlementSnapshot(settlement.agent, settlement.periodStart, settlement.periodEnd, Number(settlement.commissionRate || 0));
    const payload = this.agentSettlementPayload(settlement);
    const snapshot = {
      transactionIds: payload.transactionIds,
      refundIds: payload.refundIds,
      transactionCount: settlement.transactionCount,
      refundCount: settlement.refundCount,
      grossAmount: settlement.grossAmount,
      refundAmount: settlement.refundAmount,
      netAmount: settlement.netAmount,
      commissionRate: settlement.commissionRate,
      commissionAmount: settlement.commissionAmount,
      payableAmount: settlement.payableAmount
    };
    const differences = this.agentSettlementDifferences(settlement, recalculated);
    const risks = await this.agentSettlementRisks(settlement, recalculated, differences);
    const auditLogBuilder = this.operationLogs
      .createQueryBuilder("log")
      .where("log.targetType = :targetType", { targetType: "agent_settlement" })
      .andWhere("log.targetId = :targetId", { targetId: String(settlement.id) })
      .orderBy("log.createdAt", "DESC")
      .take(50);
    this.applyTenantScope(auditLogBuilder, "log", admin);
    const auditLogs = await auditLogBuilder.getMany();
    const transfers = await this.agentSettlementTransfers.find({ where: { settlement: { id: settlement.id }, ...(this.isTenantScoped(admin) ? { tenant: { id: admin?.tenantId || 0 } } : {}) }, order: { createdAt: "DESC" }, take: 50 });
    return {
      settlement,
      snapshot,
      current: {
        transactionIds: recalculated.transactionRows.map((item) => item.id),
        refundIds: recalculated.refundRows.map((item) => item.id),
        transactionCount: recalculated.transactionRows.length,
        refundCount: recalculated.refundRows.length,
        grossAmount: recalculated.grossAmount,
        refundAmount: recalculated.refundAmount,
        netAmount: recalculated.netAmount,
        commissionRate: recalculated.commissionRate,
        commissionAmount: recalculated.commissionAmount,
        payableAmount: recalculated.payableAmount
      },
      differences,
      risks,
      transactions: recalculated.transactionRows,
      refunds: recalculated.refundRows,
      transfers,
      auditLogs,
      snapshotTransactionIds: payload.transactionIds,
      snapshotRefundIds: payload.refundIds,
      canMarkPaid: settlement.status === "approved" && !risks.some((item) => item.blocking)
    };
  }

  async submitAgentSettlement(id: number, admin: AdminContext) {
    const settlement = await this.getAgentSettlement(id, admin);
    if (settlement.status !== "draft") throw new BadRequestException("只有草稿结算单可以提交审");
    settlement.status = "pending_review";
    settlement.submittedAt = new Date();
    const saved = await this.agentSettlements.save(settlement);
    await this.logOperation(admin, "agent_settlement.submit", "agent_settlement", saved.id, `提交代理结算审核：${saved.settlementNo}`);
    return saved;
  }

  async approveAgentSettlement(id: number, dto: ReviewDto, admin: AdminContext) {
    const settlement = await this.getAgentSettlement(id, admin);
    if (settlement.status !== "pending_review") throw new BadRequestException("只有待审核结算单可以通过");
    settlement.status = "approved";
    settlement.reviewedBy = this.actorName(admin);
    settlement.reviewRemark = dto.remark || null;
    settlement.reviewedAt = new Date();
    const saved = await this.agentSettlements.save(settlement);
    await this.logOperation(admin, "agent_settlement.approve", "agent_settlement", saved.id, `通过代理结算审核：${saved.settlementNo}`, { remark: dto.remark || null });
    return saved;
  }

  async rejectAgentSettlement(id: number, dto: ReviewDto, admin: AdminContext) {
    const settlement = await this.getAgentSettlement(id, admin);
    if (settlement.status !== "pending_review") throw new BadRequestException("只有待审核结算单可以拒绝");
    settlement.status = "rejected";
    settlement.reviewedBy = this.actorName(admin);
    settlement.reviewRemark = dto.remark || null;
    settlement.reviewedAt = new Date();
    const saved = await this.agentSettlements.save(settlement);
    await this.logOperation(admin, "agent_settlement.reject", "agent_settlement", saved.id, `拒绝代理结算审核：${saved.settlementNo}`, { remark: dto.remark || null });
    return saved;
  }

  async markAgentSettlementPaid(id: number, dto: AgentSettlementPayDto, admin: AdminContext) {
    const settlement = await this.getAgentSettlement(id, admin);
    if (settlement.status !== "approved") throw new BadRequestException("只有已审核结算单可以标记打款");
    const details = await this.agentSettlementDetails(id, admin);
    const blockingRisks = details.risks.filter((item) => item.blocking);
    if (blockingRisks.length) throw new BadRequestException(`结算单存在未处理风险：${blockingRisks.map((item) => item.message).join("")}`);
    settlement.status = "paid";
    settlement.paidBy = this.actorName(admin);
    settlement.paidReference = dto.paidReference?.trim() || null;
    settlement.paidProofUrl = dto.paidProofUrl?.trim() || null;
    settlement.paidRemark = dto.remark || null;
    settlement.paidAt = new Date();
    const saved = await this.agentSettlements.save(settlement);
    await this.logOperation(admin, "agent_settlement.mark_paid", "agent_settlement", saved.id, `标记代理结算已打款：${saved.settlementNo}`, { paidReference: saved.paidReference, paidProofUrl: saved.paidProofUrl, remark: dto.remark || null });
    return saved;
  }

  async sandboxTransferAgentSettlement(id: number, dto: AgentSettlementSandboxTransferDto, admin: AdminContext) {
    return this.requestAgentSettlementTransfer(id, dto, admin, "sandbox");
  }

  async realTransferAgentSettlement(id: number, dto: AgentSettlementSandboxTransferDto, admin: AdminContext) {
    return this.requestAgentSettlementTransfer(id, dto, admin, "real");
  }

  private async requestAgentSettlementTransfer(id: number, dto: AgentSettlementSandboxTransferDto, admin: AdminContext, mode: "sandbox" | "real") {
    const settlement = await this.getAgentSettlement(id, admin);
    if (settlement.status !== "approved") throw new BadRequestException(mode === "sandbox" ? "只有已审核结算单可以发起沙箱打款" : "只有已审核结算单可以发起真实打款");
    const details = await this.agentSettlementDetails(id, admin);
    const blockingRisks = details.risks.filter((item) => item.blocking);
    if (blockingRisks.length) throw new BadRequestException(`结算单存在未处理风险：${blockingRisks.map((item) => item.message).join("")}`);
    if (Number(settlement.payableAmount || 0) <= 0) throw new BadRequestException("Payable amount must be greater than 0 before automatic transfer");

    const account = await this.selectAgentTransferAccount(settlement.agent.id, dto.provider);
    const provider = providerForPaymentMethod(account.provider);
    if (!provider) throw new BadRequestException("该代理支付账户不支持自动打款沙箱验证");
    const assessment = assessAgentTransferAccount(this.config, account);
    if (!assessment) throw new BadRequestException("无法评估该代理支付账户的转账能力");
    if (assessment.status !== "sandbox_ready" && assessment.status !== "real_ready") {
      throw new BadRequestException(`该代理${assessment.providerLabel}未达到沙箱验证条件：${assessment.nextAction}`);
    }
    if (mode === "real" && assessment.status !== "real_ready") {
      throw new BadRequestException("真实自动打款 SDK 未接入，当前只能进行沙箱回执演练");
    }

    const adapter = createAgentTransferAdapter(provider, this.config, account);
    const transferNo = this.agentSettlementTransferNo(settlement, mode);
    const existing = await this.agentSettlementTransfers.findOne({ where: { transferNo } });
    if (existing?.status === "success") throw new BadRequestException(`该结算单已存在成功转账记录：${existing.transferNo}`);
    const transfer = existing || this.agentSettlementTransfers.create({ settlement, tenant: settlement.tenant, agent: settlement.agent, account, provider, mode, transferNo, amount: settlement.payableAmount, status: "pending", retryCount: 0 });
    Object.assign(transfer, {
      account,
      provider,
      mode,
      amount: settlement.payableAmount,
      status: "processing",
      requestedBy: this.actorName(admin),
      requestedAt: new Date(),
      remark: dto.remark || null,
      payload: { requested: { simulateStatus: dto.simulateStatus || "success", failureReason: dto.failureReason || null } }
    });
    const processingTransfer = await this.agentSettlementTransfers.save(transfer);
    let result: any;
    try {
      result = mode === "sandbox" ? adapter.requestSandboxTransfer(settlement, { status: dto.simulateStatus === "failed" ? "failed" : "success", failureReason: dto.failureReason, operator: this.actorName(admin), transferNo: processingTransfer.transferNo }) : adapter.requestRealTransfer(settlement, { operator: this.actorName(admin), transferNo: processingTransfer.transferNo });
    } catch (error) {
      if (!(error instanceof NotImplementedException)) throw error;
      result = { ...adapter.createTransferDraft(settlement), mode, status: "failed", transferNo: processingTransfer.transferNo, providerTransferNo: null, failureReason: error.message, raw: { provider, mode, error: error.message, generatedAt: new Date().toISOString() } };
    }
    processingTransfer.status = result.status === "accepted" ? "processing" : result.status;
    processingTransfer.providerTransferNo = result.providerTransferNo;
    processingTransfer.failureReason = result.failureReason;
    processingTransfer.syncedAt = new Date();
    processingTransfer.completedAt = result.status === "success" ? new Date() : null;
    processingTransfer.retryCount = Number(processingTransfer.retryCount || 0) + 1;
    processingTransfer.nextQueryAt = processingTransfer.status === "processing" || processingTransfer.status === "failed" ? new Date(Date.now() + 10 * 60 * 1000) : null;
    processingTransfer.payload = { ...(processingTransfer.payload || {}), result };
    const savedTransfer = await this.agentSettlementTransfers.save(processingTransfer);
    if (savedTransfer.status !== "success") {
      await this.logOperation(admin, `agent_settlement.${mode}_transfer_${savedTransfer.status}`, "agent_settlement", settlement.id, `代理结算${mode === "sandbox" ? "沙箱" : "真实"}打款${savedTransfer.status === "failed" ? "失败" : "处理"}：${settlement.settlementNo}`, { provider, transferId: savedTransfer.id, transferNo: savedTransfer.transferNo, failureReason: result.failureReason, remark: dto.remark || null, raw: result.raw });
      return { settlement, transfer: savedTransfer, result, markedPaid: false };
    }

    settlement.status = "paid";
    settlement.paidBy = this.actorName(admin);
    settlement.paidReference = savedTransfer.providerTransferNo || savedTransfer.transferNo;
    settlement.paidProofUrl = null;
    settlement.paidRemark = dto.remark || `${mode === "sandbox" ? "沙箱" : "真实"}自动打款成功：${assessment.providerLabel}`;
    settlement.paidAt = new Date();
    const saved = await this.agentSettlements.save(settlement);
    await this.logOperation(admin, `agent_settlement.${mode}_transfer_success`, "agent_settlement", saved.id, `代理结算${mode === "sandbox" ? "沙箱" : "真实"}打款成功：${saved.settlementNo}`, { provider, transferId: savedTransfer.id, transferNo: savedTransfer.transferNo, providerTransferNo: savedTransfer.providerTransferNo, amount: savedTransfer.amount, remark: dto.remark || null, raw: result.raw });
    return { settlement: saved, transfer: savedTransfer, result, markedPaid: true };
  }

  async scanAgentSettlementTransfers(admin: AdminContext) {
    const builder = this.agentSettlementTransfers
      .createQueryBuilder("transfer")
      .leftJoinAndSelect("transfer.settlement", "settlement")
      .leftJoinAndSelect("transfer.agent", "agent")
      .leftJoinAndSelect("transfer.account", "account")
      .where("transfer.status IN (:...statuses)", { statuses: ["pending", "processing", "failed"] })
      .andWhere("(transfer.nextQueryAt IS NULL OR transfer.nextQueryAt <= :now)", { now: new Date() })
      .orderBy("transfer.createdAt", "ASC")
      .take(50);
    this.applyTenantScope(builder, "transfer", admin);
    const transfers = await builder.getMany();
    const checked: Array<{ id: number; transferNo: string; status: string; action: string }> = [];
    for (const transfer of transfers) {
      transfer.retryCount = Number(transfer.retryCount || 0) + 1;
      transfer.syncedAt = new Date();
      if (transfer.mode === "real") {
        const provider = providerForPaymentMethod(transfer.account?.provider as any);
        if (!provider) {
          transfer.status = "failed";
          transfer.failureReason = transfer.failureReason || "转账记录缺少可查询的支付账户";
          transfer.nextQueryAt = null;
          await this.agentSettlementTransfers.save(transfer);
          checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "missing_account_failed" });
          continue;
        }
        try {
          const result = await createAgentTransferAdapter(provider, this.config, transfer.account || undefined).queryTransfer(transfer.transferNo);
          transfer.status = result.status;
          transfer.providerTransferNo = result.providerTransferNo || transfer.providerTransferNo;
          transfer.failureReason = result.failureReason;
          transfer.completedAt = result.status === "success" ? new Date() : null;
          transfer.nextQueryAt = result.status === "processing" ? new Date(Date.now() + 10 * 60 * 1000) : null;
          transfer.payload = { ...(transfer.payload || {}), lastQuery: result };
          await this.agentSettlementTransfers.save(transfer);
          checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "real_query" });
        } catch (error) {
          transfer.failureReason = error instanceof Error ? error.message : "真实转账查询失败";
          transfer.nextQueryAt = new Date(Date.now() + Math.min(60, 10 * transfer.retryCount) * 60 * 1000);
          transfer.payload = { ...(transfer.payload || {}), lastQueryError: { message: transfer.failureReason, checkedAt: new Date().toISOString() } };
          await this.agentSettlementTransfers.save(transfer);
          checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "real_query_pending" });
        }
        continue;
      }
      if (transfer.mode === "sandbox" && transfer.status === "failed") {
        transfer.nextQueryAt = new Date(Date.now() + Math.min(60, 10 * transfer.retryCount) * 60 * 1000);
        transfer.payload = { ...(transfer.payload || {}), lastCompensation: { status: "failed", checkedAt: new Date().toISOString(), message: "沙箱失败回执保持失败状态，等待人工重试或重新发起沙箱打" } };
        await this.agentSettlementTransfers.save(transfer);
        checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "kept_failed" });
        continue;
      }
      if (transfer.mode === "sandbox" && transfer.status === "processing") {
        transfer.status = "failed";
        transfer.failureReason = transfer.failureReason || "沙箱回执超时，补偿扫描标记失";
        transfer.nextQueryAt = new Date(Date.now() + 10 * 60 * 1000);
        transfer.payload = { ...(transfer.payload || {}), lastCompensation: { status: "failed", checkedAt: new Date().toISOString(), message: transfer.failureReason } };
        await this.agentSettlementTransfers.save(transfer);
        checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "timeout_failed" });
      }
    }
    await this.logOperation(admin, "agent_settlement.transfer_scan", "agent_settlement_transfer", null, `扫描代理结算打款回执：${checked.length} 条`, { checked });
    return { checkedCount: checked.length, checked };
  }


  async exportTenants(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const raw = await this.listTenants(admin);
    const rows = raw as any[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商家列表");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "商家编码", key: "code", width: 16 },
      { header: "商家名称", key: "name", width: 24 },
      { header: "地区", key: "region", width: 14 },
      { header: "联系人", key: "contactName", width: 14 },
      { header: "联系电话", key: "contactPhone", width: 18 },
      { header: "状态", key: "status", width: 10 },
      { header: "管理员数", key: "adminCount", width: 10 },
      { header: "活动数", key: "activityCount", width: 10 },
      { header: "报名数", key: "registrationCount", width: 10 },
      { header: "订单数", key: "orderCount", width: 10 },
      { header: "待审活动", key: "pendingActivity", width: 12 },
      { header: "待审退款", key: "pendingRefund", width: 10 },
      { header: "内部备注", key: "remark", width: 28 },
      { header: "创建时间", key: "createdAt", width: 18 }
    ];
    rows.forEach(function(r: any) {
      sheet.addRow({
        id: r.id,
        code: r.code,
        name: r.name,
        region: r.region || "",
        contactName: r.contactName || "",
        contactPhone: r.contactPhone || "",
        status: r.enabled ? "启用" : "停用",
        adminCount: Number(r.adminCount || 0),
        activityCount: Number(r.totalActivityCount || 0),
        registrationCount: Number(r.totalRegistrationCount || 0),
        orderCount: Number(r.totalOrderCount || 0),
        pendingActivity: Number(r.pendingActivityCount || 0),
        pendingRefund: Number(r.pendingRefundCount || 0),
        remark: r.remark || "",
        createdAt: r.createdAt || ""
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async exportAgentSettlements(query: AgentSettlementQueryDto = {}, admin?: AdminContext) {
    const rows = await this.listAgentSettlements(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("代理结算");
    sheet.columns = [
      { header: "结算单号", key: "settlementNo", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "地区", key: "region", width: 16 },
      { header: "周期开", key: "periodStart", width: 22 },
      { header: "周期结束", key: "periodEnd", width: 22 },
      { header: "流水笔数", key: "transactionCount", width: 12 },
      { header: "退款笔", key: "refundCount", width: 12 },
      { header: "实收", key: "grossAmount", width: 12 },
      { header: "退", key: "refundAmount", width: 12 },
      { header: "净收入", key: "netAmount", width: 12 },
      { header: "Commission (%)", key: "commissionRate", width: 12 },
      { header: "佣金", key: "commissionAmount", width: 12 },
      { header: "应打", key: "payableAmount", width: 12 },
      { header: "Status", key: "status", width: 14 },
      { header: "生成", key: "generatedBy", width: 14 },
      { header: "审核", key: "reviewedBy", width: 14 },
      { header: "审核备注", key: "reviewRemark", width: 28 },
      { header: "打款", key: "paidBy", width: 14 },
      { header: "打款凭证", key: "paidReference", width: 20 },
      { header: "凭证附件", key: "paidProofUrl", width: 38 },
      { header: "打款备注", key: "paidRemark", width: 28 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        settlementNo: row.settlementNo,
        agent: row.agent?.name || "-",
        region: row.agent?.region || "-",
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        transactionCount: row.transactionCount,
        refundCount: row.refundCount,
        grossAmount: row.grossAmount,
        refundAmount: row.refundAmount,
        netAmount: row.netAmount,
        commissionRate: row.commissionRate,
        commissionAmount: row.commissionAmount,
        payableAmount: row.payableAmount,
        status: row.status,
        generatedBy: row.generatedBy,
        reviewedBy: row.reviewedBy,
        reviewRemark: row.reviewRemark,
        paidBy: row.paidBy,
        paidReference: row.paidReference,
        paidProofUrl: row.paidProofUrl,
        paidRemark: row.paidRemark,
        createdAt: row.createdAt
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async confirmOfflinePayment(orderId: number, dto: ConfirmPaymentDto, admin: AdminContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存");
    this.assertTenantAccess(order, admin);
    if (order.status === OrderStatus.Paid) return order;
    if (order.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能确认收款");
    if (order.paymentMethod !== PaymentMethod.Offline) throw new BadRequestException("只有线下收款订单可以后台确认收款");
    if (order.registration.status === RegistrationStatus.Cancelled) throw new BadRequestException("已取消报名不能确认收");
    if (this.isExpiredPendingOrder(order)) {
      await this.closeExpiredOrder(order, "订单超时未付款，系统已关");
      throw new BadRequestException("订单已超时关闭，不能确认收款");
    }
    order.status = OrderStatus.Paid;
    order.paidAt = new Date();
    order.paidByAdmin = this.actorName(admin);
    order.paidRemark = dto.remark || null;
    const savedOrder = await this.orders.save(order);
    await this.ensurePaymentTransaction(savedOrder, "offline", dto.remark || "后台确认线下收款");
    if (Number(savedOrder.amount) > 0) await this.awardPoints(savedOrder.registration.user, Math.floor(Number(savedOrder.amount)), "order_paid", savedOrder.id, "活动消费积分");
    await this.charityFund.recordOrderAccrual(savedOrder, this.actorName(admin));
    const registration = await this.getRegistration(order.registration.id, admin);
    registration.status = registration.activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    await this.registrations.save(registration);
    await this.logOperation(admin, "order.confirm_offline_payment", "order", savedOrder.id, `确认线下收款：${savedOrder.orderNo}`, { amount: savedOrder.amount, remark: dto.remark || null });
    return order;
  }

  async updateOrderRemark(orderId: number, dto: OrderRemarkDto, admin: AdminContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存");
    this.assertTenantAccess(order, admin);
    order.remark = dto.remark?.trim() || null;
    const saved = await this.orders.save(order);
    await this.logOperation({ ...admin, tenantId: order.tenant?.id ?? admin?.tenantId ?? null }, "order.update_remark", "order", saved.id, `更新订单备注：${saved.orderNo}`, { remark: saved.remark || null });
    return saved;
  }

  async getOperationSetting(admin?: AdminContext) {
    return this.ensureOperationSetting(admin);
  }

  async saveOperationSetting(dto: OperationSettingDto, admin?: AdminContext) {
    const setting = await this.ensureOperationSetting(admin);
    Object.assign(setting, {
      registrationEnabled: dto.registrationEnabled ?? true,
      registrationDisabledMessage: dto.registrationDisabledMessage?.trim() || null,
      offlinePaymentInstructions: dto.offlinePaymentInstructions.trim(),
      paymentMethods: this.normalizePaymentMethods(dto.paymentMethods),
      customerServiceName: dto.customerServiceName?.trim() || null,
      customerServicePhone: dto.customerServicePhone?.trim() || null,
      customerServiceWechat: dto.customerServiceWechat?.trim() || null,
      defaultGroupQrCodeUrl: dto.defaultGroupQrCodeUrl?.trim() || null,
      pageTheme: this.isPlainObject(dto.pageTheme) ? dto.pageTheme : {},
      refundInstructions: dto.refundInstructions.trim(),
      invoiceInstructions: dto.invoiceInstructions?.trim() || null,
      smsProviderEnabled: dto.smsProviderEnabled ?? false,
      smsProvider: dto.smsProvider?.trim() || null,
      smsAccessKeyId: dto.smsAccessKeyId?.trim() || null,
      smsAccessKeySecret: dto.smsAccessKeySecret?.trim() || null,
      smsSignName: dto.smsSignName?.trim() || null,
      smsTemplateId: dto.smsTemplateId?.trim() || null
    });
    const saved = await this.operationSettings.save(setting);
    await this.logOperation(admin, "settings.operation.update", "operation_setting", saved.id, "更新运营设置", { registrationEnabled: saved.registrationEnabled, customerServicePhone: saved.customerServicePhone, customerServiceWechat: saved.customerServiceWechat, smsProviderEnabled: saved.smsProviderEnabled });
    return saved;
  }

  async refundOrder(orderId: number, dto: RefundDto, admin: AdminContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存");
    this.assertTenantAccess(order, admin);
    if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) throw new BadRequestException("当前订单不能退");
    const refundNo = dto.refundNo?.trim() || `RF${Date.now()}${order.id}`;
    const existing = await this.refunds.findOne({ where: { refundNo } });
    if (existing) return { refund: existing, order, idempotent: true };
    const existingRefunds = await this.refunds.find({ where: { order: { id: order.id }, status: In(["pending", "processing", "completed"]) } });
    const reserved = existingRefunds.reduce((sum, item) => sum + Number(item.amount), 0);
    const amount = Number(dto.amount);
    if (amount <= 0) throw new BadRequestException("Refund amount must be greater than 0");
    if (reserved + amount - Number(order.amount) > 0.001) throw new BadRequestException("退款金额不能超过订单可退金额");
    const refund = await this.refunds.save(this.refunds.create({ order, tenant: this.tenantRelation(admin, order.tenant), refundNo, amount: amount.toFixed(2), status: "pending", operator: this.actorName(admin), reason: dto.reason || null }));
    await this.logOperation(admin, "refund.request", "refund", refund.id, `Request refund: ${refund.refundNo}`, { orderNo: order.orderNo, amount: refund.amount, reason: refund.reason });
    return { refund, order, idempotent: false, pending: true };
  }

  async approveRefund(refundId: number, dto: ReviewDto, admin: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id: refundId } });
    if (!refund) throw new NotFoundException("退款申请不存在");
    this.assertTenantAccess(refund, admin);
    if (refund.status !== "pending") throw new BadRequestException("只有待审核退款可以通过");
    const order = refund.order;
    if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) throw new BadRequestException("当前订单不能退");
    const reservedRefunds = await this.refunds.find({ where: { order: { id: order.id }, status: In(["processing", "completed"]) } });
    const refunded = reservedRefunds.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0);
    const reserved = reservedRefunds.filter((item) => item.id !== refund.id).reduce((sum, item) => sum + Number(item.amount), 0);
    const amount = Number(refund.amount);
    if (reserved + amount - Number(order.amount) > 0.001) throw new BadRequestException("退款金额不能超过订单实付金");
    const providerRefund = await this.requestProviderRefundIfNeeded(order, refund, this.actorName(admin));
    const now = new Date();
    if (providerRefund) {
      refund.providerRefundNo = providerRefund.providerRefundNo;
      refund.providerRefundStatus = providerRefund.status;
      refund.providerRefundSyncedAt = now;
      refund.providerRefundPayload = providerRefund.raw || null;
      refund.providerRefundFailureReason = null;
      refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + 1;
      refund.providerRefundNextQueryAt = providerRefund.status === "accepted" || providerRefund.status === "processing" ? new Date(Date.now() + 10 * 60 * 1000) : null;
      if (providerRefund.status === "failed") {
        refund.status = "failed";
        refund.reviewedBy = this.actorName(admin);
        refund.reviewRemark = dto.remark || null;
        refund.reviewedAt = now;
        refund.providerRefundFailureReason = "服务商退款失败";
        const savedRefund = await this.refunds.save(refund);
        await this.logOperation(admin, "refund.provider_failed", "refund", savedRefund.id, `服务商退款失败：${savedRefund.refundNo}`, { orderNo: order.orderNo, amount: savedRefund.amount, providerRefundNo: savedRefund.providerRefundNo });
        return { refund: savedRefund, order, providerPending: false };
      }
      if (providerRefund.status === "accepted" || providerRefund.status === "processing") {
        refund.status = "processing";
        refund.reviewedBy = this.actorName(admin);
        refund.reviewRemark = dto.remark || null;
        refund.reviewedAt = now;
        const savedRefund = await this.refunds.save(refund);
        await this.logOperation(admin, "refund.provider_processing", "refund", savedRefund.id, `服务商退款处理中：${savedRefund.refundNo}`, { orderNo: order.orderNo, amount: savedRefund.amount, providerRefundNo: savedRefund.providerRefundNo, providerRefundStatus: savedRefund.providerRefundStatus });
        return { refund: savedRefund, order, providerPending: true };
      }
    }
    const completed = await this.refundCompletion.complete({ refund, order, actorName: this.actorName(admin), remark: dto.remark || null, now });
    await this.logOperation(admin, "refund.approve", "refund", completed.refund.id, `通过退款审核：${completed.refund.refundNo}`, { orderNo: completed.order.orderNo, amount: completed.refund.amount, remark: dto.remark || null });
    return { refund: completed.refund, order: completed.order };
  }

  async rejectRefund(refundId: number, dto: ReviewDto, admin: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id: refundId } });
    if (!refund) throw new NotFoundException("退款申请不存在");
    this.assertTenantAccess(refund, admin);
    if (refund.status !== "pending") throw new BadRequestException("只有待审核退款可以拒绝");
    refund.status = "rejected";
    refund.reviewedBy = this.actorName(admin);
    refund.reviewRemark = dto.remark || null;
    refund.reviewedAt = new Date();
    const saved = await this.refunds.save(refund);
    await this.logOperation(admin, "refund.reject", "refund", saved.id, `拒绝退款申请：${saved.refundNo}`, { remark: dto.remark || null });
    return saved;
  }

  async scanProviderRefunds(admin: AdminContext) {
    const builder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .where("refund.status IN (:...statuses)", { statuses: ["processing"] })
      .andWhere("refund.providerRefundStatus IS NOT NULL")
      .andWhere("(refund.providerRefundNextQueryAt IS NULL OR refund.providerRefundNextQueryAt <= :now)", { now: new Date() })
      .orderBy("refund.createdAt", "ASC")
      .take(50);
    this.applyTenantScope(builder, "refund", admin);
    const rows = await builder.getMany();
    const checked: Array<{ id: number; refundNo: string; status: string; action: string }> = [];
    for (const refund of rows) {
      const provider = this.refundProviderForOrder(refund.order);
      if (!provider) continue;
      refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + 1;
      try {
        const result = await this.paymentProvider.queryRefund({ provider, order: refund.order, refundNo: refund.refundNo, providerRefundNo: refund.providerRefundNo });
        refund.providerRefundNo = result.providerRefundNo || refund.providerRefundNo;
        refund.providerRefundStatus = result.status;
        refund.providerRefundSyncedAt = new Date();
        refund.providerRefundPayload = { ...(refund.providerRefundPayload || {}), lastQuery: result.raw || result };
        refund.providerRefundFailureReason = result.failureReason || null;
        if (result.status === "success") {
          await this.refundCompletion.complete({ refund, order: refund.order, actorName: this.actorName(admin), remark: refund.reviewRemark || "服务商退款查询确认成" });
          checked.push({ id: refund.id, refundNo: refund.refundNo, status: "completed", action: "completed" });
        } else if (result.status === "failed") {
          refund.status = "failed";
          refund.providerRefundNextQueryAt = null;
          await this.refunds.save(refund);
          checked.push({ id: refund.id, refundNo: refund.refundNo, status: refund.status, action: "failed" });
        } else {
          refund.status = "processing";
          refund.providerRefundNextQueryAt = new Date(Date.now() + Math.min(60, 10 * refund.providerRefundRetryCount) * 60 * 1000);
          await this.refunds.save(refund);
          checked.push({ id: refund.id, refundNo: refund.refundNo, status: refund.status, action: "processing" });
        }
      } catch (error) {
        refund.providerRefundSyncedAt = new Date();
        refund.providerRefundFailureReason = error instanceof Error ? error.message : "服务商退款查询失";
        refund.providerRefundNextQueryAt = new Date(Date.now() + Math.min(60, 10 * refund.providerRefundRetryCount) * 60 * 1000);
        refund.providerRefundPayload = { ...(refund.providerRefundPayload || {}), lastQueryError: { message: refund.providerRefundFailureReason, checkedAt: new Date().toISOString() } };
        await this.refunds.save(refund);
        checked.push({ id: refund.id, refundNo: refund.refundNo, status: refund.status, action: "query_error" });
      }
    }
    await this.logOperation(admin, "refund.provider_scan", "refund", null, `Scan provider refunds: ${checked.length}`, { checked });
    return { checkedCount: checked.length, checked };
  }

  async checkIn(code: string, adminId: number, remark?: string, currentAdmin?: AdminContext) {
    const registration = await this.registrations.findOne({ where: { checkInCode: code } });
    if (!registration) throw new NotFoundException("签到码不存在");
    if (this.isTenantScoped(currentAdmin) && registration.tenant?.id !== currentAdmin?.tenantId && registration.activity.tenant?.id !== currentAdmin?.tenantId) throw new NotFoundException("Resource not found or not in current tenant");
    if (registration.status === RegistrationStatus.CheckedIn) throw new BadRequestException("该报名已签到，请勿重复核销");
    if (registration.status !== RegistrationStatus.Approved) throw new BadRequestException("只有报名成功可以签到");
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new UnauthorizedException("管理员不存在");
    registration.status = RegistrationStatus.CheckedIn;
    await this.registrations.save(registration);
    const checkIn = await this.checkIns.save(this.checkIns.create({ registration, operator: admin, remark: remark || null }));
    await this.recordAdminConversionEvent("check_in", { activity: registration.activity, user: registration.user, registration, channel: registration.channel || null, idempotencyKey: `check_in:${checkIn.id}` });
    await this.awardPoints(registration.user, 20, "check_in", checkIn.id, "活动签到奖励");
    await this.logOperation(currentAdmin || admin, "check_in.verify", "registration", registration.id, `签到核销：${registration.activity.title}`, { code, remark: remark || null });
    return checkIn;
  }

  async listWaitlists(activityId?: number, status?: WaitlistStatus, admin?: AdminContext) {
    const builder = this.waitlists
      .createQueryBuilder("waitlist")
      .leftJoinAndSelect("waitlist.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "tenant")
      .leftJoinAndSelect("activity.agent", "agent")
      .leftJoinAndSelect("waitlist.user", "user")
      .leftJoinAndSelect("waitlist.promotedRegistration", "promotedRegistration")
      .orderBy("waitlist.createdAt", "ASC");
    this.applyTenantScope(builder, "activity", admin);
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    if (status) builder.andWhere("waitlist.status = :status", { status });
    return builder.getMany();
  }

  async promoteWaitlist(id: number, admin?: AdminContext) {
    const waitlist = await this.waitlists.findOne({ where: { id } });
    if (!waitlist) throw new NotFoundException("候补记录不存");
    this.assertTenantAccess(waitlist.activity, admin);
    if (waitlist.status !== WaitlistStatus.Waiting) throw new BadRequestException("只有等待中的候补可以补位");
    await this.ensureActivityMemberAccess(waitlist.activity, waitlist.user);
    const stats = await this.withActivityStats(waitlist.activity);
    if (stats.remainingSeats <= 0) throw new BadRequestException("当前活动仍无可用名额");
    const price = Number(waitlist.activity.price);
    const status = price > 0 ? RegistrationStatus.PendingPayment : waitlist.activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    const tenant = this.tenantRelation(admin, waitlist.activity.tenant);
    const registration = await this.registrations.save(this.registrations.create({ activity: waitlist.activity, tenant, user: waitlist.user, status, answers: waitlist.answers, checkInCode: uuidv4() }));
    await this.orders.save(this.orders.create({ orderNo: `OD${Date.now()}${registration.id}`, registration, tenant, agent: waitlist.activity.agent, amount: price.toFixed(2), paymentMethod: price > 0 ? PaymentMethod.Offline : PaymentMethod.Free, status: price > 0 ? OrderStatus.PendingPayment : OrderStatus.Paid, paidAt: price > 0 ? null : new Date(), expiresAt: this.paymentExpiresAt(price) }));
    waitlist.status = WaitlistStatus.Promoted;
    waitlist.promotedRegistration = registration;
    const saved = await this.waitlists.save(waitlist);
    await this.logOperation(admin, "waitlist.promote", "waitlist", saved.id, `候补补位：${waitlist.activity.title}`, { registrationId: registration.id });
    return saved;
  }

  async cancelWaitlist(id: number, remark?: string, admin?: AdminContext) {
    const waitlist = await this.waitlists.findOne({ where: { id } });
    if (!waitlist) throw new NotFoundException("候补记录不存");
    this.assertTenantAccess(waitlist.activity, admin);
    if (waitlist.status !== WaitlistStatus.Waiting) throw new BadRequestException("只有等待中的候补可以取消");
    waitlist.status = WaitlistStatus.Cancelled;
    waitlist.remark = remark || "后台取消候补";
    const saved = await this.waitlists.save(waitlist);
    await this.logOperation(admin, "waitlist.cancel", "waitlist", saved.id, `取消候补：${waitlist.activity.title}`, { remark: saved.remark });
    return saved;
  }

  async listUserTags(query: { userId?: number; activityId?: number } = {}, admin?: AdminContext) {
    const { userId, activityId } = query;
    if (userId) await this.assertUserTenantAccess(userId, admin);
    let activity: Activity | null = null;
    let activityUserIds: number[] = [];
    if (activityId) {
      activity = await this.activities.findOneBy({ id: activityId });
      if (!activity) throw new NotFoundException("活动不存");
      this.assertTenantAccess(activity, admin);
      activityUserIds = await this.userIdsForActivity(activityId, admin);
      if (!activityUserIds.length) return { activity, users: [], tags: [] };
    }
    const builder = this.userTags
      .createQueryBuilder("tag")
      .leftJoinAndSelect("tag.user", "user")
      .leftJoinAndSelect("tag.tenant", "tenant")
      .orderBy("tag.createdAt", "DESC");
    this.applyTenantScope(builder, "tag", admin);
    if (userId) builder.andWhere("user.id = :userId", { userId });
    if (activityId) builder.andWhere("user.id IN (:...activityUserIds)", { activityUserIds });
    if (activityId && !this.isTenantScoped(admin)) this.applyExplicitTenantFilter(builder, "tag", activity?.tenant || null);
    const tags = await builder.getMany();
    if (!activityId) return tags;
    const users = await this.users.find({ where: { id: In(activityUserIds) } });
    return { activity, users, tags };
  }

  async createUserTag(input: UserTagDto, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: input.userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(user.id, admin);
    if (!input.name?.trim()) throw new BadRequestException("标签名称不能为空");
    const existsBuilder = this.userTags
      .createQueryBuilder("tag")
      .leftJoinAndSelect("tag.user", "user")
      .leftJoinAndSelect("tag.tenant", "tenant")
      .where("user.id = :userId", { userId: user.id })
      .andWhere("tag.name = :name", { name: input.name.trim() });
    this.applyTenantScope(existsBuilder, "tag", admin);
    const exists = await existsBuilder.getOne();
    if (exists) return exists;
    return this.userTags.save(this.userTags.create({ user, tenant: this.tenantRelation(admin), name: input.name.trim(), color: input.color || "default", remark: input.remark || null }));
  }

  async createActivityUserTags(input: BulkActivityTagDto, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: input.activityId });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertTenantAccess(activity, admin);
    if (!input.name?.trim()) throw new BadRequestException("标签名称不能为空");
    const userIds = await this.userIdsForActivity(activity.id, admin);
    let createdCount = 0;
    let skippedCount = 0;
    for (const userId of userIds) {
      const existing = await this.userTags
        .createQueryBuilder("tag")
        .leftJoin("tag.user", "user")
        .where("user.id = :userId", { userId })
        .andWhere("tag.name = :name", { name: input.name.trim() });
      this.applyTenantScope(existing, "tag", admin);
      if (!this.isTenantScoped(admin)) this.applyExplicitTenantFilter(existing, "tag", activity.tenant);
      if (await existing.getOne()) {
        skippedCount += 1;
        continue;
      }
      const user = await this.users.findOneBy({ id: userId });
      if (!user) continue;
      await this.userTags.save(this.userTags.create({ user, tenant: this.tenantRelation(admin, activity.tenant), name: input.name.trim(), color: input.color || "default", remark: input.remark || `来自活动：${activity.title}` }));
      createdCount += 1;
    }
    await this.logOperation(admin, "user_tag.bulk_activity", "activity", activity.id, `批量标记活动用户：${activity.title}`, { tag: input.name.trim(), createdCount, skippedCount });
    return { activityId: activity.id, activityTitle: activity.title, matchedCount: userIds.length, createdCount, skippedCount };
  }

  async deleteUserTag(id: number, admin?: AdminContext) {
    const tag = await this.userTags.findOneBy({ id });
    if (!tag) throw new NotFoundException("标签不存");
    this.assertTenantAccess(tag, admin);
    await this.userTags.delete({ id });
    return tag;
  }

  listMemberLevels(includeDisabled = true) {
    return this.memberLevels.find({ where: includeDisabled ? {} : { enabled: true }, order: { sortOrder: "ASC", minPoints: "ASC", id: "ASC" } });
  }

  async saveMemberLevel(dto: MemberLevelDto, id?: number) {
    const row = id ? await this.memberLevels.findOneBy({ id }) : this.memberLevels.create();
    if (!row) throw new NotFoundException("会员等级不存");
    if (!dto.name?.trim()) throw new BadRequestException("请填写等级名");
    if (dto.discountRate < 0 || dto.discountRate > 1) throw new BadRequestException("Member discount must be between 0 and 1");
    Object.assign(row, {
      name: dto.name.trim(),
      minPoints: dto.minPoints,
      discountRate: Number(dto.discountRate).toFixed(2),
      priorityBooking: dto.priorityBooking ?? false,
      enabled: dto.enabled ?? true,
      sortOrder: dto.sortOrder ?? 0
    });
    return this.memberLevels.save(row);
  }

  async listMembers(query: string | { keyword?: string; activityId?: number } = {}, admin?: AdminContext) {
    const keyword = typeof query === "string" ? query : query.keyword;
    const activityId = typeof query === "string" ? undefined : query.activityId;
    if (activityId) {
      const activity = await this.activities.findOneBy({ id: activityId });
      if (!activity) throw new NotFoundException("活动不存");
      this.assertTenantAccess(activity, admin);
      const userIds = await this.userIdsForActivity(activity.id, admin);
      const users = userIds.length ? await this.users.find({ where: { id: In(userIds) } }) : [];
      for (const user of users) await this.ensureMemberProfile(user);
      if (!users.length) return [];
      const builder = this.memberProfiles
        .createQueryBuilder("profile")
        .leftJoinAndSelect("profile.user", "user")
        .leftJoinAndSelect("profile.level", "level")
        .where("user.id IN (:...userIds)", { userIds });
      if (keyword?.trim()) builder.andWhere("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword.trim()}%` });
      const profiles = await builder.orderBy("profile.points", "DESC").addOrderBy("profile.updatedAt", "DESC").getMany();
      return profiles.map((profile) => ({ ...profile, activity: { id: activity.id, title: activity.title } }));
    }
    if (this.isTenantScoped(admin)) {
      const users = await this.usersForTenant(admin, keyword, 300);
      for (const user of users) await this.ensureMemberProfile(user);
      if (!users.length) return [];
      return this.memberProfiles.find({ where: { user: { id: In(users.map((user) => user.id)) } }, order: { points: "DESC", updatedAt: "DESC" }, take: 300 });
    }
    await this.ensureProfilesForExistingUsers();
    const profiles = await this.memberProfiles.find({ order: { points: "DESC", updatedAt: "DESC" }, take: 300 });
    const filtered = keyword?.trim()
      ? profiles.filter((item) => `${item.user.nickname || ""}${item.user.phone || ""}`.includes(keyword.trim()))
      : profiles;
    return filtered;
  }

  async createMember(dto: CreateMemberDto, admin?: AdminContext) {
    const phone = String(dto.phone || "").trim();
    const password = String(dto.password || "");
    const nickname = String(dto.nickname || "").trim();
    if (!phone && !nickname) throw new BadRequestException("请至少填写手机号或昵称");
    if (phone && !/^1\d{10}$/.test(phone)) throw new BadRequestException("请填写正确的手机号");
    if (password && (password.length < 6 || password.length > 64)) throw new BadRequestException("初始密码长度需为 6-64 位");
    let user = phone ? await this.users.findOne({ where: { phone } }) : null;
    if (!user) {
      user = this.users.create({
        phone: phone || null,
        nickname: nickname || (phone ? `本地用户${phone.slice(-4)}` : `测试会员${Date.now().toString().slice(-4)}`)
      });
    } else if (nickname && user.nickname !== nickname) {
      user.nickname = nickname;
    }
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    const saved = await this.users.save(user);
    const profile = await this.ensureMemberProfile(saved);
    await this.logOperation(admin, "member.create", "user", saved.id, `新增会员：${saved.nickname || saved.phone || saved.id}`, { phone: saved.phone, nickname: saved.nickname, passwordSet: Boolean(password), remark: dto.remark });
    return profile;
  }

  async memberDetail(userId: number, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const profile = await this.ensureMemberProfile(user);
    if (this.isTenantScoped(admin)) {
      const [registrations, orders, checkIns, reviews] = await Promise.all([
        this.visibleRegistrationsForUser(userId, admin),
        this.visibleOrdersForUser(userId, admin),
        this.visibleCheckInsForUser(userId, admin),
        this.visibleReviewsForUser(userId, admin)
      ]);
      const points = await this.visiblePointLogsForUser(userId, registrations, orders, checkIns, reviews);
      return { profile, registrations, orders, checkIns, reviews, points };
    }
    const [registrations, orders, checkIns, reviews, points] = await Promise.all([
      this.registrations.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 50 }),
      this.orders.find({ where: { registration: { user: { id: userId } } }, order: { createdAt: "DESC" }, take: 50 }),
      this.checkIns.find({ where: { registration: { user: { id: userId } } }, order: { createdAt: "DESC" }, take: 50 }),
      this.activityReviews.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 50 }),
      this.memberPointLogs.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 100 })
    ]);
    return { profile, registrations, orders, checkIns, reviews, points };
  }

  async listWallets(keyword?: string, admin?: AdminContext) {
    const tenant = await this.walletTenantForAdmin(admin);
    const builder = this.userWallets
      .createQueryBuilder("wallet")
      .leftJoinAndSelect("wallet.user", "user")
      .leftJoinAndSelect("wallet.tenant", "tenant")
      .orderBy("wallet.updatedAt", "DESC")
      .take(300);
    if (tenant) builder.where("wallet.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.where("wallet.tenantId IS NULL");
    if (keyword?.trim()) builder.andWhere("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword.trim()}%` });
    return builder.getMany();
  }

  async getUserWallet(userId: number, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const tenant = await this.walletTenantForAdmin(admin);
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const wallet = await this.userWallets.findOne({ where: { user: { id: userId }, tenantScopeKey } });
    return wallet || { user, tenant, tenantScopeKey, availableBalance: "0.00", frozenBalance: "0.00", totalRecharge: "0.00", totalSpent: "0.00" };
  }

  async listWalletTransactions(userId: number | undefined, admin?: AdminContext) {
    const tenant = await this.walletTenantForAdmin(admin);
    const builder = this.walletTransactions
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.user", "user")
      .leftJoinAndSelect("tx.wallet", "wallet")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .orderBy("tx.createdAt", "DESC")
      .take(300);
    if (tenant) builder.where("tx.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.where("tx.tenantId IS NULL");
    if (userId) {
      await this.assertUserTenantAccess(userId, admin);
      builder.andWhere("tx.userId = :userId", { userId });
    }
    return builder.getMany();
  }

  async adjustUserWallet(userId: number, dto: WalletAdjustDto, admin: AdminContext) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount === 0) throw new BadRequestException("调整金额不能为 0");
    if (dto.type !== "adjust" && amount <= 0) throw new BadRequestException("充值或扣减金额必须大于 0");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const tenant = await this.walletTenantForAdmin(admin);
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const direction = dto.type === "deduct" || (dto.type === "adjust" && amount < 0) ? "debit" : "credit";
    const absoluteAmount = Math.abs(amount);
    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(UserWallet);
      const txRepo = manager.getRepository(WalletTransaction);
      let wallet = await walletRepo.findOne({ where: { user: { id: userId }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant, tenantScopeKey }));
      const before = Number(wallet.availableBalance);
      const after = direction === "credit" ? before + absoluteAmount : before - absoluteAmount;
      if (after < -0.0001) throw new BadRequestException("余额不足，不能扣减");
      wallet.availableBalance = after.toFixed(2);
      if (dto.type === "recharge") wallet.totalRecharge = (Number(wallet.totalRecharge) + absoluteAmount).toFixed(2);
      await walletRepo.save(wallet);
      const walletTransaction = await txRepo.save(txRepo.create({
        wallet,
        user,
        tenant,
        order: null,
        transactionNo: `WAL${Date.now()}${userId}`,
        direction,
        type: dto.type === "recharge" ? "admin_recharge" : dto.type === "deduct" ? "admin_deduct" : "admin_adjust",
        amount: absoluteAmount.toFixed(2),
        balanceBefore: before.toFixed(2),
        balanceAfter: after.toFixed(2),
        operator: this.actorName(admin),
        remark: dto.remark || null,
        idempotencyKey: null
      }));
      return { wallet, walletTransaction };
    });
    await this.logOperation(admin, `wallet.${dto.type}`, "user", userId, `用户余额${dto.type}：${absoluteAmount.toFixed(2)}`, { direction, remark: dto.remark || null });
    return result;
  }

  async exportRegistrations(query: RegistrationQueryDto, admin?: AdminContext) {
    const rows = (await this.listRegistrations({ ...query, page: undefined, pageSize: undefined }, admin)) as Registration[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("报名记录");
    const customLabels = Array.from(new Set(rows.flatMap((row) => row.answers.map((answer) => answer.label))));
    sheet.columns = [
      { header: "报名ID", key: "id", width: 10 },
      { header: "活动", key: "activity", width: 24 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "Status", key: "status", width: 16 },
      { header: "报名时间", key: "createdAt", width: 22 },
      ...customLabels.map((label) => ({ header: label, key: label, width: 20 }))
    ];
    rows.forEach((row) => {
      const values: Record<string, unknown> = { id: row.id, activity: row.activity.title, phone: row.user.phone, status: row.status, createdAt: row.createdAt };
      row.answers.forEach((answer) => { values[answer.label] = Array.isArray(answer.value) ? answer.value.join(",") : answer.value; });
      sheet.addRow(values);
    });
    return workbook.xlsx.writeBuffer();
  }

  async exportOrders(query: OrderQueryDto | OrderStatus = {}, admin?: AdminContext) {
    const normalizedQuery: OrderQueryDto = typeof query === "string" ? { status: query } : { ...(query || {}), page: undefined, pageSize: undefined };
    const rows = (await this.listOrders(normalizedQuery, admin)) as Order[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("订单记录");
    sheet.columns = [
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "票种", key: "ticketType", width: 16 },
      { header: "优惠", key: "coupon", width: 16 },
      { header: "会员等级", key: "memberLevel", width: 16 },
      { header: "原价", key: "originalAmount", width: 12 },
      { header: "会员优惠", key: "memberDiscountAmount", width: 12 },
      { header: "积分抵扣", key: "pointsDiscountAmount", width: 12 },
      { header: "使用积分", key: "pointsUsed", width: 12 },
      { header: "总优", key: "discountAmount", width: 12 },
      { header: "金额", key: "amount", width: 12 },
      { header: "支付方式", key: "paymentMethod", width: 14 },
      { header: "Status", key: "status", width: 14 },
      { header: "交易", key: "transactionNo", width: 24 },
      { header: "确认", key: "paidByAdmin", width: 14 },
      { header: "收款备注", key: "paidRemark", width: 28 },
      { header: "付款截止", key: "expiresAt", width: 22 },
      { header: "关闭时间", key: "closedAt", width: 22 },
      { header: "关闭原因", key: "closeReason", width: 28 },
      { header: "支付时间", key: "paidAt", width: 22 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => sheet.addRow({ orderNo: row.orderNo, activity: row.registration.activity.title, agent: row.agent?.name || "平台自营", phone: row.registration.user.phone, ticketType: row.ticketType?.name || "标准报名", coupon: row.coupon?.code || "-", memberLevel: row.memberLevel?.name || "-", originalAmount: row.originalAmount || row.amount, memberDiscountAmount: row.memberDiscountAmount || "0.00", pointsDiscountAmount: row.pointsDiscountAmount || "0.00", pointsUsed: row.pointsUsed || 0, discountAmount: row.discountAmount || "0.00", amount: row.amount, paymentMethod: row.paymentMethod, status: row.status, transactionNo: row.transactionNo, paidByAdmin: row.paidByAdmin, paidRemark: row.paidRemark, expiresAt: row.expiresAt, closedAt: row.closedAt, closeReason: row.closeReason, paidAt: row.paidAt, createdAt: row.createdAt }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  private async ensureDefaultAdmin() {
    if ((await this.admins.count()) === 0) {
      await this.admins.save(this.admins.create({ username: "admin", passwordHash: await bcrypt.hash("Admin123456", 10), role: AdminRole.SuperAdmin, tenant: null }));
      return;
    }
    const defaultAdmin = await this.admins.findOne({ where: { username: "admin" } });
    if (defaultAdmin && defaultAdmin.tenant) {
      defaultAdmin.tenant = null;
      await this.admins.save(defaultAdmin);
    }
  }

  private uploadRoot() {
    return `${this.config.get<string>("UPLOAD_DIR", "uploads").replace(/\/$/, "")}/images`;
  }

  private releaseInfo() {
    return {
      version: this.config.get<string>("APP_VERSION", "0.1.0"),
      commit: this.config.get<string>("BUILD_COMMIT", "local"),
      buildTime: this.config.get<string>("BUILD_TIME", "unknown")
    };
  }

  private validateAdminPassword(password: string) {
    if (!password || password.length < 8) throw new BadRequestException("管理员密码至少需要 8 位");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) throw new BadRequestException("管理员密码需要包含大小写字母和数字");
  }

  private publicAdmin(admin: AdminUser) {
    return { id: admin.id, username: admin.username, role: normalizeAdminRole(admin.role), tenantId: admin.tenant?.id ?? null, tenant: admin.tenant ? this.publicTenant(admin.tenant) : null, enabled: admin.enabled, createdAt: admin.createdAt, updatedAt: admin.updatedAt };
  }

  private async assertAdminLoginRateLimit(username: string, clientIp: string | null, userAgent: string | null) {
    const windowMinutes = Math.max(Number(this.config.get("ADMIN_LOGIN_WINDOW_MINUTES", 10)), 1);
    const maxFailures = Math.max(Number(this.config.get("ADMIN_LOGIN_MAX_FAILURES", 5)), 1);
    const lockedMinutes = Math.max(Number(this.config.get("ADMIN_LOGIN_LOCK_MINUTES", 10)), 1);
    const now = Date.now();
    const lockedSince = new Date(now - lockedMinutes * 60 * 1000);
    const limitedBuilder = this.adminLoginLogs.createQueryBuilder("log").where("log.username = :username", { username }).andWhere("log.status = :status", { status: "rate_limited" }).andWhere("log.createdAt > :lockedSince", { lockedSince }).orderBy("log.createdAt", "DESC");
    if (clientIp) limitedBuilder.andWhere("log.clientIp = :clientIp", { clientIp });
    else limitedBuilder.andWhere("log.clientIp IS NULL");
    const recentLimit = await limitedBuilder.getOne();
    if (recentLimit) throw new UnauthorizedException("登录失败次数过多，请稍后再试");

    const failedBuilder = this.adminLoginLogs.createQueryBuilder("log").where("log.username = :username", { username }).andWhere("log.status = :status", { status: "failed" }).andWhere("log.createdAt > :windowStart", { windowStart: new Date(now - windowMinutes * 60 * 1000) });
    if (clientIp) failedBuilder.andWhere("log.clientIp = :clientIp", { clientIp });
    else failedBuilder.andWhere("log.clientIp IS NULL");
    const failedCount = await failedBuilder.getCount();
    if (failedCount >= maxFailures) {
      await this.recordAdminLogin({ username, clientIp, userAgent, status: "rate_limited", failureReason: "too_many_failures" });
      throw new UnauthorizedException("登录失败次数过多，请稍后再试");
    }
  }

  private recordAdminLogin(input: { username: string; adminId?: number | null; tenantId?: number | null; clientIp?: string | null; userAgent?: string | null; status: "success" | "failed" | "rate_limited"; failureReason?: string | null }) {
    return this.adminLoginLogs.save(
      this.adminLoginLogs.create({
        username: input.username || "-",
        adminId: input.adminId || null,
        tenantId: input.tenantId || null,
        clientIp: input.clientIp || null,
        status: input.status,
        failureReason: input.failureReason || null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null
      })
    );
  }

  private logOperation(admin: AdminContext | undefined, action: string, targetType: string, targetId: string | number | null, summary: string, detail?: Record<string, unknown>) {
    return this.operationLogs.save(
      this.operationLogs.create({
        adminId: admin?.id || null,
        adminUsername: admin?.username || null,
        tenantId: admin?.tenantId || null,
        action,
        targetType,
        targetId: targetId === null || targetId === undefined ? null : String(targetId),
        summary,
        detail: detail || null
      })
    );
  }

  private actorName(admin?: AdminContext) {
    return admin?.username || "system";
  }

  private async dashboardActivityRow(activity: Activity) {
    const [registeredCount, checkInCount, reviewCount, viewCount, shareVisitCount, paidOrderCount, paidAmount, refundAmount] = await Promise.all([
      this.registrations.count({ where: { activity: { id: activity.id } } }),
      this.checkIns.createQueryBuilder("checkIn").leftJoin("checkIn.registration", "registration").where("registration.activityId = :activityId", { activityId: activity.id }).getCount(),
      this.activityReviews.count({ where: { activity: { id: activity.id } } }),
      this.activityViewLogs.createQueryBuilder("view").where("view.activityId = :activityId", { activityId: activity.id }).getCount(),
      this.shareVisits.createQueryBuilder("share").where("share.activityId = :activityId", { activityId: activity.id }).getCount(),
      this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("order.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getCount(),
      this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.registration", "registration").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("transaction.status = :status", { status: "success" }).getRawOne<{ sum: string }>(),
      this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.registration", "registration").select("COALESCE(SUM(refund.amount), 0)", "sum").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("refund.status = :status", { status: "completed" }).getRawOne<{ sum: string }>()
    ]);
    const paidTotal = Number(paidAmount?.sum || 0);
    const refundTotal = Number(refundAmount?.sum || 0);
    const checkInRate = registeredCount > 0 ? Math.round((checkInCount / registeredCount) * 1000) / 10 : 0;
    const registrationConversionRate = viewCount > 0 ? Math.round((registeredCount / viewCount) * 1000) / 10 : 0;
    const netAmount = paidTotal - refundTotal;
    const operationAdvice = this.dashboardActivityAdvice({ registeredCount, netAmount, checkInRate, registrationConversionRate });
    return {
      id: activity.id,
      title: activity.title,
      status: activity.status,
      tenant: activity.tenant ? this.publicTenant(activity.tenant) : null,
      registeredCount,
      checkInCount,
      reviewCount,
      viewCount,
      shareVisitCount,
      paidOrderCount,
      paidAmount: paidTotal.toFixed(2),
      refundAmount: refundTotal.toFixed(2),
      netAmount: netAmount.toFixed(2),
      avgOrderAmount: (paidOrderCount > 0 ? paidTotal / paidOrderCount : 0).toFixed(2),
      checkInRate,
      registrationConversionRate,
      operationAdvice,
      remainingSeats: Math.max(Number(activity.capacity || 0) - registeredCount, 0)
    };
  }

  private async analyticsScope(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId || undefined : query.tenantId;
    if (tenantId && !this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: tenantId });
      if (!tenant) throw new NotFoundException("商家不存在");
    }
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    if (startDate && Number.isNaN(startDate.getTime())) throw new BadRequestException("开始日期格式错误");
    if (endDate && Number.isNaN(endDate.getTime())) throw new BadRequestException("结束日期格式错误");
    return { tenantId, activityId: query.activityId, startDate, endDate };
  }

  private analyticsBuilders(scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    const events = this.conversionEvents.createQueryBuilder("event");
    const payments = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const refunds = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const walletTx = this.walletTransactions.createQueryBuilder("walletTx");
    this.applyAnalyticsScope(events, "event", scope, admin);
    this.applyAnalyticsScope(payments, "transaction", scope, admin);
    this.applyAnalyticsScope(refunds, "refund", scope, admin);
    if (scope.tenantId) walletTx.andWhere("walletTx.tenantId = :walletTenantId", { walletTenantId: scope.tenantId });
    if (scope.startDate) walletTx.andWhere("walletTx.createdAt >= :walletStartDate", { walletStartDate: scope.startDate });
    if (scope.endDate) walletTx.andWhere("walletTx.createdAt < :walletEndDate", { walletEndDate: scope.endDate });
    return { events, payments, refunds, walletTx };
  }

  private applyAnalyticsScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId : scope.tenantId;
    if (tenantId) builder.andWhere(`${alias}.tenantId = :analyticsTenantId`, { analyticsTenantId: tenantId });
    if (scope.activityId) {
      if (alias === "transaction" || alias === "refund") builder.andWhere("activity.id = :analyticsActivityId", { analyticsActivityId: scope.activityId });
      else builder.andWhere(`${alias}.activityId = :analyticsActivityId`, { analyticsActivityId: scope.activityId });
    }
    if (scope.startDate) builder.andWhere(`${alias}.createdAt >= :analyticsStartDate`, { analyticsStartDate: scope.startDate });
    if (scope.endDate) builder.andWhere(`${alias}.createdAt < :analyticsEndDate`, { analyticsEndDate: scope.endDate });
  }

  private channelReportBuilder(scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    const builder = this.activityChannels
      .createQueryBuilder("channel")
      .leftJoin("channel.activity", "activity")
      .leftJoin("channel.tenant", "tenant")
      .leftJoin("conversion_events", "event", "event.channelId = channel.id")
      .select("channel.id", "id")
      .addSelect("channel.name", "name")
      .addSelect("channel.code", "code")
      .addSelect("channel.source", "source")
      .addSelect("channel.enabled", "enabled")
      .addSelect("activity.id", "activityId")
      .addSelect("activity.title", "activityTitle")
      .addSelect("tenant.name", "tenantName")
      .addSelect("SUM(CASE WHEN event.type = 'view' THEN 1 ELSE 0 END)", "viewCount")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN 1 ELSE 0 END)", "paidCount")
      .addSelect("SUM(CASE WHEN event.type = 'check_in' THEN 1 ELSE 0 END)", "checkInCount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END), 0)", "paidAmount")
      .groupBy("channel.id")
      .addGroupBy("activity.id")
      .addGroupBy("tenant.name")
      .orderBy("paidAmount", "DESC");
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId : scope.tenantId;
    if (tenantId) builder.andWhere("channel.tenantId = :channelTenantId", { channelTenantId: tenantId });
    if (scope.activityId) builder.andWhere("activity.id = :channelActivityId", { channelActivityId: scope.activityId });
    if (scope.startDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt >= :channelStartDate)", { channelStartDate: scope.startDate });
    if (scope.endDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt < :channelEndDate)", { channelEndDate: scope.endDate });
    return builder;
  }

  private channelReportRow(row: any) {
    const viewCount = Number(row.viewCount || 0);
    const registrationCount = Number(row.registrationCount || 0);
    const paidCount = Number(row.paidCount || 0);
    return {
      id: Number(row.id),
      name: row.name,
      code: row.code,
      source: row.source,
      enabled: Boolean(row.enabled),
      activityId: Number(row.activityId),
      activityTitle: row.activityTitle,
      tenantName: row.tenantName,
      viewCount,
      registrationCount,
      paidCount,
      checkInCount: Number(row.checkInCount || 0),
      paidAmount: Number(row.paidAmount || 0).toFixed(2),
      signupRate: this.rate(registrationCount, viewCount),
      paymentRate: this.rate(paidCount, registrationCount)
    };
  }

  private async recordAdminConversionEvent(type: string, input: { activity?: Activity | null; user?: User | null; registration?: Registration | null; order?: Order | null; channel?: ActivityChannel | null; amount?: string | number | null; source?: string | null; idempotencyKey?: string | null }) {
    if (input.idempotencyKey && await this.conversionEvents.findOne({ where: { idempotencyKey: input.idempotencyKey } })) return null;
    return this.conversionEvents.save(this.conversionEvents.create({
      type: type as any,
      tenant: input.activity?.tenant || input.order?.tenant || input.registration?.tenant || input.channel?.tenant || null,
      activity: input.activity || input.registration?.activity || input.order?.registration?.activity || null,
      user: input.user || input.registration?.user || input.order?.registration?.user || null,
      registration: input.registration || input.order?.registration || null,
      order: input.order || null,
      channel: input.channel || input.registration?.channel || null,
      amount: Number(input.amount || 0).toFixed(2),
      source: input.source || "admin",
      idempotencyKey: input.idempotencyKey || null,
      clientIp: null,
      userAgent: null,
      payload: null
    }));
  }

  private async analyticsTenantRanking(scope: { tenantId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    if (this.isTenantScoped(admin) || scope.tenantId) return [];
    const builder = this.tenants
      .createQueryBuilder("tenant")
      .leftJoin("activities", "activity", "activity.tenantId = tenant.id")
      .leftJoin("conversion_events", "event", "event.tenantId = tenant.id")
      .select("tenant.id", "tenantId")
      .addSelect("tenant.name", "tenantName")
      .addSelect("COUNT(DISTINCT activity.id)", "activityCount")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END)", "paidAmount")
      .groupBy("tenant.id")
      .orderBy("paidAmount", "DESC")
      .limit(10);
    if (scope.startDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt >= :rankStartDate)", { rankStartDate: scope.startDate });
    if (scope.endDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt < :rankEndDate)", { rankEndDate: scope.endDate });
    const rows = await builder.getRawMany<any>();
    return rows.map((row) => ({ tenantId: Number(row.tenantId), tenantName: row.tenantName, activityCount: Number(row.activityCount || 0), registrationCount: Number(row.registrationCount || 0), paidAmount: Number(row.paidAmount || 0).toFixed(2) }));
  }

  private async analyticsRisk(scope: { tenantId?: number }, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId : scope.tenantId;
    const pendingRefundBuilder = this.refunds.createQueryBuilder("refund").where("refund.status = :status", { status: "pending" });
    const callbackRiskBuilder = this.paymentCallbackLogs.createQueryBuilder("callback").where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] });
    const reconciliationBuilder = this.paymentTransactions.createQueryBuilder("transaction").where("transaction.reconciliationStatus = :status", { status: "pending" });
    if (tenantId) {
      pendingRefundBuilder.andWhere("refund.tenantId = :riskTenantId", { riskTenantId: tenantId });
      callbackRiskBuilder.andWhere("callback.tenantId = :riskTenantId", { riskTenantId: tenantId });
      reconciliationBuilder.andWhere("transaction.tenantId = :riskTenantId", { riskTenantId: tenantId });
    }
    const [pendingRefundCount, callbackRiskCount, pendingReconciliationCount] = await Promise.all([pendingRefundBuilder.getCount(), callbackRiskBuilder.getCount(), reconciliationBuilder.getCount()]);
    return { pendingRefundCount, callbackRiskCount, pendingReconciliationCount };
  }

  private rate(numerator: number, denominator: number) {
    return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
  }

  private normalizeChannelCode(value: string) {
    const code = String(value || "").trim().replace(/[^\w-]/g, "").slice(0, 48);
    if (code.length < 2) throw new BadRequestException("渠道码至少需要 2 位字母、数字、下划线或连字符");
    return code;
  }

  private dashboardActivityAdvice(input: { registeredCount: number; netAmount: number; checkInRate: number; registrationConversionRate: number }) {
    if (input.registeredCount <= 0) return { level: "muted", label: "观察中", message: "先积累报名和浏览数据，再判断是否复制。" };
    if (input.netAmount > 0 && input.registeredCount >= 10 && input.checkInRate >= 70) return { level: "success", label: "可复制", message: "报名、收入和交付表现较好，适合复盘后复制。" };
    if (input.registrationConversionRate > 0 && input.registrationConversionRate < 5) return { level: "warning", label: "转化待优化", message: "浏览到报名偏低，建议优化标题、封面、价格或报名说明。" };
    if (input.checkInRate > 0 && input.checkInRate < 60) return { level: "danger", label: "交付风险", message: "签到率偏低，建议加强开课提醒、客服跟进和现场流程。" };
    if (input.netAmount <= 0 && input.registeredCount > 0) return { level: "warning", label: "收益待提升", message: "已有报名但净收入偏低，建议检查定价、优惠和退款原因。" };
    return { level: "muted", label: "持续观察", message: "数据已有起步，继续观察报名、收入和签到变化。" };
  }

  private publicTenant(tenant: Tenant) {
    return { id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, contactName: tenant.contactName, contactPhone: tenant.contactPhone, remark: tenant.remark, enabled: tenant.enabled, settings: this.tenantPermissions(tenant), createdAt: tenant.createdAt, updatedAt: tenant.updatedAt };
  }

  private isTenantScoped(admin?: AdminContext) {
    return isTenantScopedActor(admin);
  }

  private isPlatformAdmin(admin?: AdminContext) {
    return normalizeAdminRole(admin?.role) === AdminRole.SuperAdmin && !admin?.tenantId;
  }

  private assertPlatformAdmin(admin?: AdminContext) {
    if (!this.isPlatformAdmin(admin)) throw new ForbiddenException("Only platform super admin can operate");
  }

  private async currentTenantForAdmin(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) throw new ForbiddenException("只有商家后台账号可以维护商家资料");
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    return tenant;
  }

  private defaultTenantPermissions(): TenantPermissionSettings {
    return { activityPublishReviewRequired: true, registrationReviewEnabled: false, paymentAccountEditable: true };
  }

  private tenantPermissions(tenant?: Tenant | null): TenantPermissionSettings {
    const settings = this.isPlainObject(tenant?.settings) ? tenant?.settings || {} : {};
    const defaults = this.defaultTenantPermissions();
    return {
      activityPublishReviewRequired: settings.activityPublishReviewRequired === undefined ? defaults.activityPublishReviewRequired : Boolean(settings.activityPublishReviewRequired),
      registrationReviewEnabled: settings.registrationReviewEnabled === undefined ? defaults.registrationReviewEnabled : Boolean(settings.registrationReviewEnabled),
      paymentAccountEditable: settings.paymentAccountEditable === undefined ? defaults.paymentAccountEditable : Boolean(settings.paymentAccountEditable)
    };
  }

  private mergeTenantSettings(input?: Record<string, unknown> | null, current?: Record<string, unknown> | null) {
    const base = this.isPlainObject(current) ? current : {};
    const next = this.isPlainObject(input) ? input : {};
    const merged: Record<string, unknown> = { ...base };
    for (const key of ["activityPublishReviewRequired", "registrationReviewEnabled", "paymentAccountEditable"]) {
      if (next[key] !== undefined) merged[key] = Boolean(next[key]);
    }
    return { ...this.defaultTenantPermissions(), ...merged };
  }

  private async resolveAdminTenant(tenantId?: number | null, admin?: AdminContext) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant) throw new NotFoundException("当前商家不存在或已停用");
      return tenant;
    }
    this.assertPlatformAdmin(admin);
    if (!tenantId) return null;
    const tenant = await this.tenants.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException("商家不存在");
    return tenant;
  }

  private async resolveHomepageTenant(admin?: AdminContext, tenantId?: number | null) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant || !tenant.enabled) throw new NotFoundException("Current tenant not found or disabled");
      return tenant;
    }
    this.assertPlatformAdmin(admin);
    if (!tenantId) return null;
    const tenant = await this.tenants.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException("商家不存在");
    return tenant;
  }

  private assertHomepageSectionScope(section: HomepageSection, targetTenant: Tenant | null, pageKey = "home") {
    if ((section.pageKey || "home") !== normalizePageKey(pageKey)) throw new NotFoundException("Homepage section not found in selected page");
    if (targetTenant) {
      if (section.tenant?.id !== targetTenant.id) throw new NotFoundException("Homepage section not found in selected tenant");
      return;
    }
    if (section.tenant?.id) throw new NotFoundException("Homepage section not found in global scope");
  }

  private async resolveAgentTenant(tenantId?: number | null, fallback?: Tenant | null, admin?: AdminContext) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant) throw new NotFoundException("Current tenant not found or disabled");
      return tenant;
    }
    this.assertPlatformAdmin(admin);
    if (!tenantId) {
      if (fallback?.id) return fallback;
      throw new BadRequestException("Platform admin must select a tenant before creating merchant payment agents");
    }
    const tenant = await this.tenants.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return tenant;
  }

  private resolveNewAdminRole(role: string | undefined, admin?: AdminContext) {
    const normalized = normalizeAdminRole(role || AdminRole.SuperAdmin) as AdminRole;
    if (this.isTenantScoped(admin)) {
      if (!TENANT_STAFF_ROLES.includes(normalized)) throw new ForbiddenException("商家管理员只能创建运营、财务或签到员工账号");
      return normalized;
    }
    this.assertPlatformAdmin(admin);
    return normalized;
  }

  private assertAdminAccountAccess(row: AdminUser, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) {
      this.assertPlatformAdmin(admin);
      return;
    }
    if (row.tenant?.id !== admin?.tenantId) throw new NotFoundException("管理员不存在或不属于当前商家");
  }

  private async resolveActivityTenant(admin?: AdminContext, fallback?: Tenant | null, tenantId?: number | null) {
    if (admin?.tenantId) {
      const tenant = await this.tenants.findOneBy({ id: admin.tenantId });
      if (!tenant || !tenant.enabled) throw new NotFoundException("Current tenant not found or disabled");
      return tenant;
    }
    if (tenantId) {
      this.assertPlatformAdmin(admin);
      const tenant = await this.tenants.findOneBy({ id: tenantId });
      if (!tenant || !tenant.enabled) throw new NotFoundException("商家不存在或已停用");
      return tenant;
    }
    return fallback || null;
  }

  private resolveActivitySaveStatus(requested: ActivityStatus, current: ActivityStatus | undefined, permissions: TenantPermissionSettings, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return requested;
    if (!permissions.activityPublishReviewRequired) return requested;
    if (current === ActivityStatus.Open && requested === ActivityStatus.Open) return ActivityStatus.Open;
    if (requested === ActivityStatus.Open) throw new BadRequestException("当前商家活动发布需要平台审核，请先提交审核");
    if (requested === ActivityStatus.PendingApproval) return ActivityStatus.PendingApproval;
    return requested;
  }

  private async assertPaymentAccountEditable(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    if (!this.tenantPermissions(tenant).paymentAccountEditable) throw new ForbiddenException("Payment account configuration is not enabled for current tenant");
  }

  private async resolveAnnouncementTenant(tenantId: number | null | undefined, fallback: Tenant | null | undefined, admin?: AdminContext) {
    if (this.isTenantScoped(admin)) return this.tenantRelation(admin, fallback);
    if (tenantId === null) return null;
    const id = Number(tenantId || fallback?.id || 0);
    if (!id) return null;
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant || !tenant.enabled) throw new NotFoundException("公告所属商家不存在或已停用");
    return tenant;
  }

  private operationActorForTenant(admin?: AdminContext, tenant?: Tenant | null) {
    if (admin?.tenantId || !tenant?.id) return admin;
    return { ...admin, tenantId: tenant.id };
  }

  private tenantRelation(admin?: AdminContext, fallback?: Tenant | null) {
    return tenantRelationForActor<Tenant>(admin, fallback);
  }

  private async walletTenantForAdmin(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return null;
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    return tenant;
  }

  private walletTenantScopeKey(tenant?: Tenant | null) {
    return tenant?.id ? String(tenant.id) : "platform";
  }

  private applyTenantScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, admin?: AdminContext) {
    applyTenantScopeToQuery(builder, alias, admin);
  }

  private applyExplicitTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, tenant?: Tenant | null) {
    if (tenant?.id) builder.andWhere(`${alias}.tenantId = :explicitTenantId`, { explicitTenantId: tenant.id });
    else builder.andWhere(`${alias}.tenantId IS NULL`);
  }

  private assertTenantAccess(row: { tenant?: Tenant | null } | null | undefined, admin?: AdminContext) {
    assertTenantAccessForActor(row, admin, "Resource not found or not in current tenant");
  }

  private async assertUserTenantAccess(userId: number, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    const count = await this.registrations
      .createQueryBuilder("registration")
      .leftJoin("registration.activity", "activity")
      .where("registration.userId = :userId", { userId })
      .andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId })
      .getCount();
    if (!count) throw new NotFoundException("User not found or not in current tenant");
  }

  private async userIdsForActivity(activityId: number, admin?: AdminContext) {
    const builder = this.registrations
      .createQueryBuilder("registration")
      .innerJoin("registration.user", "user")
      .leftJoin("registration.activity", "activity")
      .select("user.id", "id")
      .where("activity.id = :activityId", { activityId })
      .groupBy("user.id")
      .orderBy("MAX(registration.createdAt)", "DESC");
    this.applyTenantScope(builder, "registration", admin);
    const rows = await builder.getRawMany<{ id: number }>();
    return rows.map((row) => Number(row.id)).filter(Boolean);
  }

  private async usersForTenant(admin?: AdminContext, keyword?: string, take = 300) {
    if (!this.isTenantScoped(admin)) return this.users.find({ take });
    const builder = this.registrations
      .createQueryBuilder("registration")
      .innerJoin("registration.user", "user")
      .leftJoin("registration.activity", "activity")
      .select("user.id", "id")
      .where("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId })
      .groupBy("user.id")
      .orderBy("MAX(registration.createdAt)", "DESC")
      .limit(take);
    if (keyword?.trim()) builder.andWhere("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword.trim()}%` });
    const rows = await builder.getRawMany<{ id: number }>();
    const ids = rows.map((row) => Number(row.id)).filter(Boolean);
    return ids.length ? this.users.find({ where: { id: In(ids) } }) : [];
  }

  private visibleRegistrationsForUser(userId: number, admin?: AdminContext) {
    const builder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("registration.user", "user")
      .where("user.id = :userId", { userId })
      .orderBy("registration.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleOrdersForUser(userId: number, admin?: AdminContext) {
    const builder = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.agent", "agent")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .leftJoinAndSelect("order.coupon", "coupon")
      .leftJoinAndSelect("order.memberLevel", "memberLevel")
      .where("user.id = :userId", { userId })
      .orderBy("order.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleCheckInsForUser(userId: number, admin?: AdminContext) {
    const builder = this.checkIns
      .createQueryBuilder("checkIn")
      .leftJoinAndSelect("checkIn.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("checkIn.operator", "operator")
      .where("user.id = :userId", { userId })
      .orderBy("checkIn.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleReviewsForUser(userId: number, admin?: AdminContext) {
    const builder = this.activityReviews
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.user", "user")
      .leftJoinAndSelect("review.activity", "activity")
      .leftJoinAndSelect("review.registration", "registration")
      .where("user.id = :userId", { userId })
      .orderBy("review.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(activity.tenantId = :tenantId OR registration.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private async visiblePointLogsForUser(userId: number, registrations: Registration[], orders: Order[], checkIns: CheckIn[], reviews: ActivityReview[]) {
    const sourcePairs = [
      ...orders.map((order) => ({ sourceType: "order_paid", sourceId: String(order.id) })),
      ...orders.map((order) => ({ sourceType: "points_redeem", sourceId: String(order.id) })),
      ...orders.map((order) => ({ sourceType: "points_return", sourceId: String(order.id) })),
      ...registrations.map((registration) => ({ sourceType: "registration", sourceId: String(registration.id) })),
      ...checkIns.map((checkIn) => ({ sourceType: "check_in", sourceId: String(checkIn.id) })),
      ...reviews.map((review) => ({ sourceType: "activity_review", sourceId: String(review.id) }))
    ];
    if (!sourcePairs.length) return [];
    const allowed = new Set(sourcePairs.map((pair) => `${pair.sourceType}:${pair.sourceId}`));
    const logs = await this.memberPointLogs.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 300 });
    return logs.filter((log) => allowed.has(`${log.sourceType}:${log.sourceId}`)).slice(0, 100);
  }

  private async ensureOperationSetting(admin?: AdminContext) {
    const id = this.isTenantScoped(admin) ? admin?.tenantId || 1 : 1;
    let setting = await this.operationSettings.findOne({ where: { id } });
    if (setting) return setting;
    setting = this.operationSettings.create({
      id,
      tenant: this.tenantRelation(admin),
      registrationEnabled: true,
      registrationDisabledMessage: "报名通道暂时关闭，请稍后再试或联系主办方",
      offlinePaymentInstructions: "请在付款截止前完成线下转账或现场付款，并在备注中填写报名手机号。主办方确认收款后，报名状态会自动更新",
      paymentMethods: this.defaultPaymentMethods(),
      customerServiceName: "活动运营客服",
      customerServicePhone: "13800000000",
      customerServiceWechat: "activity_service",
      defaultGroupQrCodeUrl: null,
      pageTheme: {},
      refundInstructions: "如需取消报名或申请退款，请先联系主办方客服。已签到或活动开始后的退款规则以活动报名须知为准",
      invoiceInstructions: "如需发票，请在付款后联系客服登记抬头、税号和接收邮箱",
      smsProviderEnabled: false,
      smsProvider: "tencent-cloud-sms",
      smsAccessKeyId: null,
      smsAccessKeySecret: null,
      smsSignName: null,
      smsTemplateId: null
    });
    return this.operationSettings.save(setting);
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  private defaultPaymentMethods() {
    return { free: true, wechat: true, alipay: false, balance: true, offline: true };
  }

  private normalizePaymentMethods(value: unknown) {
    const input = this.isPlainObject(value) ? value : {};
    const defaults = this.defaultPaymentMethods();
    return {
      free: input.free === undefined ? defaults.free : Boolean(input.free),
      wechat: input.wechat === undefined ? defaults.wechat : Boolean(input.wechat),
      alipay: input.alipay === undefined ? defaults.alipay : Boolean(input.alipay),
      balance: input.balance === undefined ? defaults.balance : Boolean(input.balance),
      offline: input.offline === undefined ? defaults.offline : Boolean(input.offline)
    };
  }

  private async ensureDevSeed() {
    await this.ensureMemberLevelSeeds();
    await this.ensureHomepageSeeds();
    const names = ["沙龙", "读书", "培训"];
    const categoryMap = new Map<string, ActivityCategory>();
    for (const [index, name] of names.entries()) {
      let category = await this.categories.findOne({ where: { name } });
      if (!category) category = await this.categories.save(this.categories.create({ name, sortOrder: index + 1, enabled: true }));
      categoryMap.set(name, category);
    }
    if (await this.activities.findOne({ where: { title: "Weekend Reading: Courage" } })) return;
    const now = Date.now();
    await this.createSeedActivity({ title: "Weekend Reading: Courage", category: categoryMap.values().next().value!, price: 0, featured: true, requireReview: true, startTime: new Date(now + 7 * 86400000), endTime: new Date(now + 7 * 86400000 + 2 * 3600000), deadline: new Date(now + 6 * 86400000), location: "City Bookroom 2F", description: "A focused weekend reading session about courage and relationships.", notice: "Please read the first two chapters before joining." });
    await this.createSeedActivity({ title: "Offline Creator Salon", category: categoryMap.values().next().value!, price: 99, featured: true, requireReview: false, startTime: new Date(now + 10 * 86400000), endTime: new Date(now + 10 * 86400000 + 3 * 3600000), deadline: new Date(now + 9 * 86400000), location: "Co-creation Space A", description: "A practical salon for activity planning and operation.", notice: "Complete offline payment after registration; admin confirmation will approve the registration." });
  }

  private async createSeedActivity(input: { title: string; category: ActivityCategory; price: number; featured: boolean; requireReview: boolean; startTime: Date; endTime: Date; deadline: Date; location: string; description: string; notice: string }) {
    const activity = await this.activities.save(this.activities.create({ title: input.title, category: input.category, coverUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", description: input.description, notice: input.notice, location: input.location, startTime: input.startTime, endTime: input.endTime, registrationDeadline: input.deadline, capacity: 30, price: input.price.toFixed(2), status: ActivityStatus.Open, featured: input.featured, requireReview: input.requireReview, allowCancel: true }));
    await this.fields.save([
      this.fields.create({ activity, label: "姓名", type: FieldType.Text, required: true, sortOrder: 1 }),
      this.fields.create({ activity, label: "手机", type: FieldType.Phone, required: true, sortOrder: 2 }),
      this.fields.create({ activity, label: "职业/行业", type: FieldType.Text, required: false, sortOrder: 3 }),
      this.fields.create({ activity, label: "备注", type: FieldType.Remark, required: false, sortOrder: 4 })
    ]);
  }

  private async ensureMemberLevelSeeds() {
    if ((await this.memberLevels.count()) > 0) return;
    await this.memberLevels.save([
      this.memberLevels.create({ name: "普通会", minPoints: 0, discountRate: "1.00", priorityBooking: false, enabled: true, sortOrder: 1 }),
      this.memberLevels.create({ name: "VIP 会员", minPoints: 300, discountRate: "0.95", priorityBooking: true, enabled: true, sortOrder: 2 }),
      this.memberLevels.create({ name: "年卡会员", minPoints: 1000, discountRate: "0.90", priorityBooking: true, enabled: true, sortOrder: 3 })
    ]);
  }

  private async ensureHomepageSeeds() {
    if ((await this.homepageSections.count()) > 0) return;
    await this.createDefaultHomepageSections();
  }

  private createDefaultHomepageSections(admin?: AdminContext, targetTenant?: Tenant | null, pageKey = "home") {
    const normalizedPageKey = normalizePageKey(pageKey);
    return this.homepageSections.save(defaultHomepageSections(normalizedPageKey).map((item) => this.homepageSections.create({ ...item, pageKey: normalizedPageKey, tenant: targetTenant === undefined ? this.tenantRelation(admin) : targetTenant })));
  }

  private async nextHomepageSortOrder(admin?: AdminContext, targetTenant?: Tenant | null, pageKey = "home") {
    const builder = this.homepageSections.createQueryBuilder("section").select("COALESCE(MAX(section.sortOrder), 0)", "max");
    if (targetTenant !== undefined) {
      if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
      else builder.andWhere("section.tenantId IS NULL");
    } else {
      this.applyTenantScope(builder, "section", admin);
    }
    builder.andWhere("section.pageKey = :pageKey", { pageKey: normalizePageKey(pageKey) });
    const row = await builder.getRawOne<{ max: string }>();
    return Number(row?.max || 0) + 10;
  }

  private normalizeHomepageType(type?: string) {
    const value = String(type || "").trim();
    if (!value) throw new BadRequestException("首页模块类型不能为空");
    if (!HOMEPAGE_SECTION_TYPES.includes(value as any)) throw new BadRequestException("不支持的首页模块类型");
    return value;
  }

  private normalizeJsonObject(value: unknown, label: string) {
    if (value === undefined || value === null) return {};
    if (!isPlainJsonObject(value)) throw new BadRequestException(`${label} must be a JSON object`);
    return value;
  }

  private nullableText(value?: string | null) {
    const text = String(value ?? "").trim();
    return text || null;
  }

  private async ensureProfilesForExistingUsers() {
    const users = await this.users.find({ take: 500 });
    for (const user of users) await this.ensureMemberProfile(user);
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

  private async ensureActivityMemberAccess(activity: Activity, user: User) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    if (!requiredLevel) return;
    const profile = await this.ensureMemberProfile(user);
    const current = profile.level;
    if (!current || current.minPoints < requiredLevel.minPoints) {
      const message = this.isPriorityBookingActive(activity)
        ? `优先报名截止前仅 ${requiredLevel.name} 及以上会员报名`
        : `该活动仅 ${requiredLevel.name} 及以上会员报名`;
      throw new BadRequestException(message);
    }
  }

  private effectiveRequiredMemberLevel(activity: Activity) {
    const levels = [activity.minMemberLevel];
    if (this.isPriorityBookingActive(activity)) levels.push(activity.priorityMemberLevel);
    return levels.filter(Boolean).sort((a, b) => b!.minPoints - a!.minPoints)[0] || null;
  }

  private isPriorityBookingActive(activity: Activity) {
    return Boolean(activity.priorityMemberLevel && activity.priorityRegistrationEndsAt && activity.priorityRegistrationEndsAt.getTime() > Date.now());
  }

  private validateActivityDto(dto: ActivityDto) {
    if (!dto.title?.trim()) throw new BadRequestException("请填写活动标");
    if (!dto.location?.trim()) throw new BadRequestException("请填写活动地");
    if (!dto.description?.trim()) throw new BadRequestException("请填写活动介");
    const hasLat = dto.locationLatitude !== undefined && dto.locationLatitude !== null;
    const hasLng = dto.locationLongitude !== undefined && dto.locationLongitude !== null;
    if (hasLat !== hasLng) throw new BadRequestException("请同时填写地图纬度和经度");
    if (hasLat && (Number(dto.locationLatitude) < -90 || Number(dto.locationLatitude) > 90)) throw new BadRequestException("Map latitude must be between -90 and 90");
    if (hasLng && (Number(dto.locationLongitude) < -180 || Number(dto.locationLongitude) > 180)) throw new BadRequestException("Map longitude must be between -180 and 180");
    const start = this.parseDate(dto.startTime);
    const end = this.parseDate(dto.endTime);
    const deadline = this.parseDate(dto.registrationDeadline);
    if (end <= start) throw new BadRequestException("结束时间必须晚于开始时");
    if (deadline >= start) throw new BadRequestException("报名截止时间必须早于活动开始时");
    if (dto.priorityMemberLevelId && !dto.priorityRegistrationEndsAt) throw new BadRequestException("请设置优先报名截止时");
    if (!dto.priorityMemberLevelId && dto.priorityRegistrationEndsAt) throw new BadRequestException("请先选择优先报名会员等级");
    if (dto.priorityRegistrationEndsAt) {
      const priorityEndsAt = this.parseDate(dto.priorityRegistrationEndsAt);
      if (priorityEndsAt >= deadline) throw new BadRequestException("优先报名截止时间必须早于报名截止时间");
    }
    if (!dto.fields.length) throw new BadRequestException("至少需要配置一个报名字");
    for (const field of dto.fields) if (!field.label?.trim()) throw new BadRequestException("报名字段名称不能为空");
  }

  private assertActivityContentCompliance(input: { title?: string | null; description?: string | null; notice?: string | null; sections?: Array<{ title?: string | null; content?: string | null }> }) {
    const result = checkActivityContentCompliance(input);
    if (result.passed) return;
    throw new BadRequestException({
      message: "活动内容存在合规风险，请修改后再保存或提交审核",
      issues: result.blockingIssues,
      suggestions: ["请使用东方哲学与传统文化、民俗文化、节气文化、国学经典解读、书法美育等学习型表述。", "避免算命、改运、破灾、保证结果、预测财富/婚姻/疾病等宣传。"]
    });
  }

  private async activityWithSections(id: number) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) return null;
    const sections = await this.sections.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } });
    return { ...activity, sections } as Activity & { sections: ActivitySection[] };
  }

  private parseDate(value: string) {
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) throw new BadRequestException("时间格式不正");
    return date;
  }

  private async getRegistration(id: number, admin?: AdminContext) {
    const registration = await this.registrations.findOne({ where: { id } });
    if (!registration) throw new NotFoundException("报名记录不存");
    if (this.isTenantScoped(admin) && registration.tenant?.id !== admin?.tenantId && registration.activity.tenant?.id !== admin?.tenantId) throw new NotFoundException("Resource not found or not in current tenant");
    return registration;
  }

  private async getAgentSettlement(id: number, admin?: AdminContext) {
    const settlement = await this.agentSettlements.findOne({ where: { id } });
    if (!settlement) throw new NotFoundException("代理结算单不存在");
    this.assertTenantAccess(settlement, admin);
    return settlement;
  }

  private async selectAgentTransferAccount(agentId: number, provider?: "wechat" | "alipay") {
    const accounts = await this.agentPaymentAccounts.find({ where: { agent: { id: agentId }, enabled: true }, order: { id: "DESC" } });
    const supported = accounts.filter((account) => {
      const accountProvider = providerForPaymentMethod(account.provider);
      return accountProvider && (!provider || accountProvider === provider);
    });
    if (!supported.length) throw new BadRequestException(provider ? `该代理未配置启用的 ${provider} 支付账户` : "该代理未配置启用的微信或支付宝支付账户");
    const ready = supported.find((account) => {
      const assessment = assessAgentTransferAccount(this.config, account);
      return assessment?.status === "sandbox_ready" || assessment?.status === "real_ready";
    });
    return ready || supported[0];
  }

  private agentSettlementTransferNo(settlement: AgentSettlement, mode: "sandbox" | "real" = "sandbox") {
    return `${mode === "real" ? "ART" : "AST"}${settlement.id}${settlement.settlementNo.replace(/[^A-Za-z0-9]/g, "").slice(-24)}`;
  }

  private async assertNoActiveAgentSettlement(agentId: number, periodStart: Date, periodEnd: Date) {
    const exists = await this.agentSettlements
      .createQueryBuilder("settlement")
      .leftJoin("settlement.agent", "agent")
      .where("agent.id = :agentId", { agentId })
      .andWhere("settlement.status NOT IN (:...inactiveStatuses)", { inactiveStatuses: ["rejected", "cancelled"] })
      .andWhere("settlement.periodStart < :periodEnd", { periodEnd })
      .andWhere("settlement.periodEnd > :periodStart", { periodStart })
      .getOne();
    if (exists) throw new BadRequestException(`该代理在所选周期已有结算单：${exists.settlementNo}`);
  }

  private async calculateAgentSettlementSnapshot(agent: Agent, periodStart: Date, periodEnd: Date, commissionRate: number) {
    const [transactionRows, refundRows] = await Promise.all([this.agentSettlementTransactions(agent.id, periodStart, periodEnd), this.agentSettlementRefunds(agent.id, periodStart, periodEnd)]);
    const gross = transactionRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const refund = refundRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const net = Math.max(gross - refund, 0);
    const commission = net * (commissionRate / 100);
    return {
      transactionRows,
      refundRows,
      grossAmount: gross.toFixed(2),
      refundAmount: refund.toFixed(2),
      netAmount: net.toFixed(2),
      commissionRate: commissionRate.toFixed(4),
      commissionAmount: commission.toFixed(2),
      payableAmount: Math.max(net - commission, 0).toFixed(2)
    };
  }

  private agentSettlementPayload(settlement: AgentSettlement) {
    const payload = settlement.payload || {};
    const toIds = (value: unknown) => (Array.isArray(value) ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item)) : []);
    return {
      transactionIds: toIds(payload.transactionIds),
      refundIds: toIds(payload.refundIds)
    };
  }

  private agentSettlementDifferences(settlement: AgentSettlement, recalculated: Awaited<ReturnType<AdminService["calculateAgentSettlementSnapshot"]>>) {
    const payload = this.agentSettlementPayload(settlement);
    const currentTransactionIds = recalculated.transactionRows.map((item) => item.id);
    const currentRefundIds = recalculated.refundRows.map((item) => item.id);
    const differences: Array<{ field: string; label: string; snapshot: unknown; current: unknown; blocking: boolean }> = [];
    const addAmountDiff = (field: keyof AgentSettlement, label: string, current: string) => {
      if (Math.abs(Number(settlement[field] || 0) - Number(current || 0)) > 0.001) differences.push({ field, label, snapshot: settlement[field], current, blocking: true });
    };
    if (settlement.transactionCount !== recalculated.transactionRows.length) differences.push({ field: "transactionCount", label: "支付流水笔数", snapshot: settlement.transactionCount, current: recalculated.transactionRows.length, blocking: true });
    if (settlement.refundCount !== recalculated.refundRows.length) differences.push({ field: "refundCount", label: "退款笔", snapshot: settlement.refundCount, current: recalculated.refundRows.length, blocking: true });
    addAmountDiff("grossAmount", "实收金额", recalculated.grossAmount);
    addAmountDiff("refundAmount", "退款金", recalculated.refundAmount);
    addAmountDiff("netAmount", "净收入", recalculated.netAmount);
    addAmountDiff("commissionAmount", "佣金", recalculated.commissionAmount);
    addAmountDiff("payableAmount", "应打", recalculated.payableAmount);
    const missingTransactions = payload.transactionIds.filter((id) => !currentTransactionIds.includes(id));
    const newTransactions = currentTransactionIds.filter((id) => !payload.transactionIds.includes(id));
    const missingRefunds = payload.refundIds.filter((id) => !currentRefundIds.includes(id));
    const newRefunds = currentRefundIds.filter((id) => !payload.refundIds.includes(id));
    if (missingTransactions.length || newTransactions.length) differences.push({ field: "transactionIds", label: "支付流水明细", snapshot: payload.transactionIds, current: currentTransactionIds, blocking: true });
    if (missingRefunds.length || newRefunds.length) differences.push({ field: "refundIds", label: "退款明", snapshot: payload.refundIds, current: currentRefundIds, blocking: true });
    return differences;
  }

  private async agentSettlementRisks(settlement: AgentSettlement, recalculated: Awaited<ReturnType<AdminService["calculateAgentSettlementSnapshot"]>>, differences: Array<{ blocking: boolean }>) {
    const pendingReconciliationCount = recalculated.transactionRows.filter((item) => item.reconciliationStatus === "pending").length;
    const risks: Array<{ type: string; level: "info" | "warning" | "danger"; message: string; blocking: boolean }> = [];
    if (differences.some((item) => item.blocking)) risks.push({ type: "snapshot_changed", level: "danger", message: "结算单生成后流水或金额发生变化，需要重新生成或人工复核", blocking: true });
    if (pendingReconciliationCount) risks.push({ type: "pending_reconciliation", level: "danger", message: `周期内仍"${pendingReconciliationCount} 笔待处理对账差异`, blocking: true });
    if (Number(recalculated.payableAmount) <= 0) risks.push({ type: "zero_payable", level: "warning", message: "应打款金额为 0 或负数，打款前需确认无需转账", blocking: false });
    if (!settlement.paidReference && settlement.status === "paid") risks.push({ type: "missing_paid_reference", level: "warning", message: "已打款但未记录打款凭", blocking: false });
    return risks;
  }

  private agentSettlementTransactions(agentId: number, periodStart: Date, periodEnd: Date) {
    return this.paymentTransactions
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.order", "order")
      .leftJoinAndSelect("order.agent", "agent")
      .where("agent.id = :agentId", { agentId })
      .andWhere("transaction.status = :status", { status: "success" })
      .andWhere("transaction.createdAt >= :periodStart", { periodStart })
      .andWhere("transaction.createdAt < :periodEnd", { periodEnd })
      .orderBy("transaction.createdAt", "ASC")
      .getMany();
  }

  private agentSettlementRefunds(agentId: number, periodStart: Date, periodEnd: Date) {
    return this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.agent", "agent")
      .where("agent.id = :agentId", { agentId })
      .andWhere("refund.status = :status", { status: "completed" })
      .andWhere("COALESCE(refund.completedAt, refund.createdAt) >= :periodStart", { periodStart })
      .andWhere("COALESCE(refund.completedAt, refund.createdAt) < :periodEnd", { periodEnd })
      .orderBy("COALESCE(refund.completedAt, refund.createdAt)", "ASC")
      .getMany();
  }

  private resolveAgentCommissionRate(agent: Agent, inputRate?: number) {
    const raw = inputRate ?? (agent.settlementConfig?.commissionRate as number | string | undefined) ?? 0;
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new BadRequestException("Agent commission rate must be between 0 and 100");
    return rate;
  }

  private paymentTransactionsQuery() {
    return this.paymentTransactions
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity");
  }

  private paymentStatementsQuery() {
    return this.paymentStatementRecords
      .createQueryBuilder("statement")
      .leftJoinAndSelect("statement.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity");
  }

  private refundsQuery() {
    return this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity");
  }

  private callbackLogsQuery() {
    return this.paymentCallbackLogs
      .createQueryBuilder("callback")
      .leftJoinAndSelect("callback.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity");
  }

  private applyAgentFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, query: Pick<OrderQueryDto, "agentId">, alias = "agent") {
    if (query.agentId) builder.andWhere(`${alias}.id = :agentId`, { agentId: query.agentId });
  }

  private applyFinanceTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, query: Pick<OrderQueryDto, "tenantId">, admin?: AdminContext, recordAlias = "order") {
    if (this.isTenantScoped(admin) || !query.tenantId) return;
    builder.andWhere(`(${recordAlias}.tenantId = :financeTenantId OR order.tenantId = :financeTenantId OR registration.tenantId = :financeTenantId OR activity.tenantId = :financeTenantId)`, { financeTenantId: query.tenantId });
  }

  private countOrdersForAgent(query: OrderQueryDto, status?: OrderStatus, admin?: AdminContext) {
    const builder = this.orders.createQueryBuilder("order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("order.status = :status", { status });
    this.applyTenantScope(builder, "order", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "order");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countTransactionsForAgent(query: OrderQueryDto, reconciliationStatus?: string, admin?: AdminContext) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (reconciliationStatus) builder.where("transaction.reconciliationStatus = :reconciliationStatus", { reconciliationStatus });
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countPaymentStatementsForAgent(query: OrderQueryDto, reconciliationStatus?: string, admin?: AdminContext) {
    const builder = this.paymentStatementRecords.createQueryBuilder("statement").leftJoin("statement.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (reconciliationStatus) builder.where("statement.reconciliationStatus = :reconciliationStatus", { reconciliationStatus });
    this.applyTenantScope(builder, "statement", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "statement");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countRefundsForAgent(query: OrderQueryDto, status?: string, admin?: AdminContext) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("refund.status = :status", { status });
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countCallbackLogsForAgent(query: OrderQueryDto, resultStatus?: string, admin?: AdminContext) {
    const builder = this.paymentCallbackLogs.createQueryBuilder("callback").leftJoin("callback.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (resultStatus) builder.where("callback.resultStatus = :resultStatus", { resultStatus });
    this.applyTenantScope(builder, "callback", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "callback");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private transactionSumForAgent(query: OrderQueryDto, status: string, admin?: AdminContext) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status });
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query);
    return builder.getRawOne<{ sum: string }>();
  }

  private refundSumForAgent(query: OrderQueryDto, status: string, admin?: AdminContext) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status });
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query);
    return builder.getRawOne<{ sum: string }>();
  }

  private async agentFinanceSummary(query: OrderQueryDto, admin?: AdminContext) {
    const paidBuilder = this.paymentTransactions
      .createQueryBuilder("transaction")
      .leftJoin("transaction.order", "order")
      .leftJoin("order.agent", "agent")
      .leftJoin("order.registration", "registration")
      .leftJoin("registration.activity", "activity")
      .select("COALESCE(agent.id, 0)", "agentId")
      .addSelect("COALESCE(agent.name, '平台自营')", "agentName")
      .addSelect("COUNT(transaction.id)", "transactionCount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.status = 'success' THEN transaction.amount ELSE 0 END), 0)", "paidAmount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.reconciliationStatus = 'pending' THEN 1 ELSE 0 END), 0)", "pendingReconciliationCount")
      .where(query.agentId ? "agent.id = :agentId" : "1 = 1", { agentId: query.agentId })
      .groupBy("COALESCE(agent.id, 0)")
      .addGroupBy("COALESCE(agent.name, '平台自营')");
    this.applyTenantScope(paidBuilder, "transaction", admin);
    this.applyFinanceTenantFilter(paidBuilder, query, admin, "transaction");
    const paidRows = await paidBuilder.getRawMany<{ agentId: string; agentName: string; transactionCount: string; paidAmount: string; pendingReconciliationCount: string }>();
    const refundBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoin("refund.order", "order")
      .leftJoin("order.agent", "agent")
      .leftJoin("order.registration", "registration")
      .leftJoin("registration.activity", "activity")
      .select("COALESCE(agent.id, 0)", "agentId")
      .addSelect("COALESCE(SUM(CASE WHEN refund.status = 'completed' THEN refund.amount ELSE 0 END), 0)", "refundAmount")
      .where(query.agentId ? "agent.id = :agentId" : "1 = 1", { agentId: query.agentId })
      .groupBy("COALESCE(agent.id, 0)");
    this.applyTenantScope(refundBuilder, "refund", admin);
    this.applyFinanceTenantFilter(refundBuilder, query, admin, "refund");
    const refundRows = await refundBuilder.getRawMany<{ agentId: string; refundAmount: string }>();
    const refundMap = new Map(refundRows.map((row) => [Number(row.agentId), Number(row.refundAmount || 0)]));
    return paidRows.map((row) => {
      const paidAmount = Number(row.paidAmount || 0);
      const refundAmount = refundMap.get(Number(row.agentId)) || 0;
      return {
        agentId: Number(row.agentId) || null,
        agentName: row.agentName,
        transactionCount: Number(row.transactionCount || 0),
        paidAmount: paidAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        netAmount: (paidAmount - refundAmount).toFixed(2),
        pendingReconciliationCount: Number(row.pendingReconciliationCount || 0)
      };
    });
  }

  private publicAgentPaymentAccount(row: AgentPaymentAccount) {
    return { ...row, config: this.maskPaymentConfig(row.config) };
  }

  private maskPaymentConfig(config: Record<string, unknown> | null) {
    if (!config) return null;
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      masked[key] = /secret|key|cert|token|password/i.test(key) && value ? "***" : value;
    }
    return masked;
  }

  private async ensurePaymentTransaction(order: Order, provider: string, remark?: string) {
    const exists = await this.paymentTransactions.findOne({ where: { order: { id: order.id } } });
    if (exists) return exists;
    return this.paymentTransactions.save(
      this.paymentTransactions.create({
        order,
        tenant: order.tenant,
        transactionNo: order.transactionNo || `TX${Date.now()}${order.id}`,
        provider,
        paymentMethod: order.paymentMethod,
        amount: order.amount,
        status: "success",
        reconciliationStatus: "matched",
        remark: remark || null
      })
    );
  }

  private async requestProviderRefundIfNeeded(order: Order, refund: Refund, operator: string) {
    const provider = this.refundProviderForOrder(order);
    if (!provider) return null;
    if (this.config.get("REAL_PAYMENT_ENABLED", "false") !== "true") return null;
    if (this.config.get(provider === "wechat" ? "WECHAT_PAY_ENABLED" : "ALIPAY_ENABLED", "false") !== "true") return null;
    return this.paymentProvider.requestRefund({
      provider,
      order,
      refundNo: refund.refundNo,
      amount: refund.amount,
      reason: refund.reason,
      operator
    });
  }

  private refundProviderForOrder(order: Order): SupportedPaymentProvider | null {
    if (order.paymentMethod === PaymentMethod.Wechat) return "wechat";
    if (order.paymentMethod === PaymentMethod.Alipay) return "alipay";
    return null;
  }

  private paymentExpiresAt(price: number) {
    if (price <= 0) return null;
    const minutes = Math.max(Number(this.config.get("OFFLINE_PAYMENT_EXPIRE_MINUTES", 1440)), 1);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private isExpiredPendingOrder(order: Order) {
    return order.status === OrderStatus.PendingPayment && Boolean(order.expiresAt && order.expiresAt.getTime() <= Date.now());
  }

  private async closeExpiredOrder(order: Order, reason: string) {
    if (order.status !== OrderStatus.PendingPayment) return order;
    order.status = OrderStatus.Closed;
    order.closedAt = order.closedAt || new Date();
    order.closeReason = order.closeReason || reason;
    if (order.registration.status === RegistrationStatus.PendingPayment) {
      order.registration.status = RegistrationStatus.Cancelled;
      order.registration.cancelReason = reason;
      await this.registrations.save(order.registration);
    }
    const saved = await this.orders.save(order);
    await this.refundRedeemedPoints(saved, "订单超时关闭返还积分");
    return saved;
  }

  private startOrderCloseWorker() {
    if (this.config.get("ORDER_CLOSE_WORKER_ENABLED", "false") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("ORDER_CLOSE_WORKER_INTERVAL_SECONDS", 300)), 30);
    this.orderCloseTimer = setInterval(() => {
      this.closeExpiredPendingOrders().catch((error) => {
        console.error("Order close worker failed", error);
      });
    }, intervalSeconds * 1000);
  }

  private async withActivityStats(activity: Activity) {
    const usedStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const registeredCount = await this.registrations.count({ where: { activity: { id: activity.id }, status: In(usedStatuses) } });
    return { ...activity, registeredCount, remainingSeats: Math.max(activity.capacity - registeredCount, 0) };
  }
}
