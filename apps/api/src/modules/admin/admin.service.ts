import { BadRequestException, ForbiddenException, Injectable, NotFoundException, NotImplementedException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { mkdirSync } from "fs";
import { Brackets, DataSource, In, LessThanOrEqual, MoreThan, Repository, SelectQueryBuilder } from "typeorm";
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
import { AmbassadorApplication } from "../../entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "../../entities/ambassador-application-followup.entity";
import { AmbassadorCase } from "../../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../../entities/ambassador-landing-setting.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { Coupon } from "../../entities/coupon.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageDecorationTemplate } from "../../entities/homepage-decoration-template.entity";
import { HomepageDecorationVersion, HomepageDecorationSnapshotRow } from "../../entities/homepage-decoration-version.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MarketingPopup } from "../../entities/marketing-popup.entity";
import { AdAdvertiser } from "../../entities/ad-advertiser.entity";
import { AdCampaign } from "../../entities/ad-campaign.entity";
import { AdContract } from "../../entities/ad-contract.entity";
import { AdDailyStat } from "../../entities/ad-daily-stat.entity";
import { AdOfficialRevenueImport } from "../../entities/ad-official-revenue-import.entity";
import { AdSettlementItem } from "../../entities/ad-settlement-item.entity";
import { AdSettlement } from "../../entities/ad-settlement.entity";
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
import { TenantRegionHitLog } from "../../entities/tenant-region-hit-log.entity";
import { TenantRegion, TenantRegionBoundaryPoint } from "../../entities/tenant-region.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { UserTag } from "../../entities/user-tag.entity";
import { User } from "../../entities/user.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { Waitlist, WaitlistStatus } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { ActivityStatus, FieldType, OrderStatus, PaymentMethod, RegistrationStatus, checkActivityContentCompliance } from "../../shared/domain";
import { inspectRuntimeConfig } from "../../shared/config-validation";
import { configWithLaunchOverrides, normalizeLaunchConfig } from "../../shared/launch-config";
import { applyTenantScopeToQuery, assertTenantAccessForActor, isTenantScopedActor, tenantRelationForActor } from "../../shared/tenant-scope";
import { AdminRole, normalizeAdminRole } from "./admin-roles";
import { defaultPermissionsForRole, effectivePermissionsForAdmin, normalizeAdminPermissions } from "./admin-permissions";
import { defaultHomepageSections, HOMEPAGE_SECTION_TYPES, isPlainJsonObject, normalizePageKey } from "../homepage-defaults";
import { ActivityApprovalDto, ActivityChannelDto, ActivityDto, ActivityQueryDto, AdAdvertiserDto, AdCampaignDto, AdContractDto, AdOfficialRevenueImportDto, AdSettlementGenerateDto, AdSettlementStatusDto, AdminQueryDto, AgentDto, AgentPaymentAccountDto, AgentSettlementGenerateDto, AgentSettlementPayDto, AgentSettlementQueryDto, AgentSettlementSandboxTransferDto, AmbassadorApplicationFollowupDto, AmbassadorApplicationQueryDto, AmbassadorApplicationStatusDto, AmbassadorCaseDto, AmbassadorSettingDto, AnalyticsQueryDto, AnnouncementDto, BulkActivityTagDto, CategoryDto, ChangeOwnPasswordDto, CharityDisbursementDto, CharityProjectDto, CharityProjectUpdateDto, CharitySettingDto, ConfirmPaymentDto, CouponDto, CreateAdminDto, CreateMemberDto, HomepageDecorationTemplateDto, HomepageDecorationVersionDto, HomepageReorderItemDto, HomepageSectionDto, LoginDto, MarketingPopupDto, MemberLevelDto, MemberPointAdjustDto, OperationSettingDto, OrderQueryDto, OrderRemarkDto, PaymentStatementFetchDto, PaymentStatementImportDto, PaymentStatementImportItemDto, RefundDto, RegistrationQueryDto, ResetMemberPasswordDto, ReviewDto, SupportQueryDto, TenantDto, TenantPermissionDto, TenantProfileDto, TenantRegionBulkImportDto, TenantRegionDto, TenantRegionHitLogQueryDto, TicketTypeDto, UpdateAdminDto, UpdateAdminPasswordDto, UpdateAdminStatusDto, UpdateMemberDto, UserTagDto, VolunteerCertificateDto, VolunteerProfileQueryDto, VolunteerProfileStatusDto, VolunteerServiceRecordDto, VolunteerServiceRecordQueryDto, VolunteerTaskApplicationStatusDto, VolunteerTaskDto, VolunteerTaskQueryDto, WalletAdjustDto } from "./dto";
import { financeDailyReport, financeRiskAlerts } from "./finance-operations";
import { tenantOperationHealth } from "./tenant-health";
import { tenantRegionShapesConflict } from "./tenant-region-geometry";
import { normalizeTenantPackageExpiresAt, normalizeTenantPackagePlan, tenantPackagePermissionTemplate, tenantRenewalReminder, tenantSubscriptionStatus, tenantSubscriptionWriteRestriction } from "./tenant-subscription";
import { PaymentProviderService, SupportedPaymentProvider } from "../public/payment-provider.service";
import { assessAgentTransferAccount, createAgentTransferAdapter, providerForPaymentMethod } from "../public/agent-transfer-adapters";
import { RefundCompletionService } from "../refund-completion.service";
import { paymentStatementOrderWhere } from "./payment-statement-import";
import { buildAgentSettlementTransferCapability } from "./agent-transfer-capability";
import { CharityFundService } from "../charity-fund.service";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { Certificate } from "../../entities/certificate.entity";
import { VolunteerProfile } from "../../entities/volunteer-profile.entity";
import { VolunteerServiceRecord } from "../../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../../entities/volunteer-task.entity";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null; permissions?: string[] };
type TenantPermissionSettings = { activityPublishReviewRequired: boolean; registrationReviewEnabled: boolean; paymentAccountEditable: boolean; mallEnabled: boolean; packagePlan: string; packageExpiresAt: string | null };
type MemberListQuery = {
  keyword?: string;
  activityId?: number;
  page?: number;
  pageSize?: number;
  sourceChannel?: string;
  wechatBound?: string | boolean;
  phoneBound?: string | boolean;
  levelId?: string | number;
  activeStart?: string;
  activeEnd?: string;
  sortBy?: string;
  sortOrder?: string;
};
const TENANT_STAFF_ROLES = [AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];

@Injectable()
export class AdminService implements OnModuleInit, OnModuleDestroy {
  private orderCloseTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantRegion) private readonly tenantRegions: Repository<TenantRegion>,
    @InjectRepository(TenantRegionHitLog) private readonly tenantRegionHitLogs: Repository<TenantRegionHitLog>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminLoginLog) private readonly adminLoginLogs: Repository<AdminLoginLog>,
    @InjectRepository(AdminOperationLog) private readonly operationLogs: Repository<AdminOperationLog>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentPaymentAccount) private readonly agentPaymentAccounts: Repository<AgentPaymentAccount>,
    @InjectRepository(AgentSettlement) private readonly agentSettlements: Repository<AgentSettlement>,
    @InjectRepository(AgentSettlementTransfer) private readonly agentSettlementTransfers: Repository<AgentSettlementTransfer>,
    @InjectRepository(AmbassadorLandingSetting) private readonly ambassadorSettings: Repository<AmbassadorLandingSetting>,
    @InjectRepository(AmbassadorCase) private readonly ambassadorCases: Repository<AmbassadorCase>,
    @InjectRepository(AmbassadorApplication) private readonly ambassadorApplications: Repository<AmbassadorApplication>,
    @InjectRepository(AmbassadorApplicationFollowup) private readonly ambassadorFollowups: Repository<AmbassadorApplicationFollowup>,
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
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(H5AuthCodeLog) private readonly h5AuthCodeLogs: Repository<H5AuthCodeLog>,
    @InjectRepository(HomepageSection) private readonly homepageSections: Repository<HomepageSection>,
    @InjectRepository(HomepageDecorationVersion) private readonly homepageDecorationVersions: Repository<HomepageDecorationVersion>,
    @InjectRepository(HomepageDecorationTemplate) private readonly homepageDecorationTemplates: Repository<HomepageDecorationTemplate>,
    @InjectRepository(MarketingPopup) private readonly marketingPopups: Repository<MarketingPopup>,
    @InjectRepository(AdAdvertiser) private readonly adAdvertisers: Repository<AdAdvertiser>,
    @InjectRepository(AdContract) private readonly adContracts: Repository<AdContract>,
    @InjectRepository(AdCampaign) private readonly adCampaigns: Repository<AdCampaign>,
    @InjectRepository(AdDailyStat) private readonly adDailyStats: Repository<AdDailyStat>,
    @InjectRepository(AdSettlement) private readonly adSettlements: Repository<AdSettlement>,
    @InjectRepository(AdSettlementItem) private readonly adSettlementItems: Repository<AdSettlementItem>,
    @InjectRepository(AdOfficialRevenueImport) private readonly adOfficialRevenueImports: Repository<AdOfficialRevenueImport>,
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
    @InjectRepository(CharityFundTransaction) private readonly charityTransactionsRepo: Repository<CharityFundTransaction>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(VolunteerProfile) private readonly volunteerProfiles: Repository<VolunteerProfile>,
    @InjectRepository(VolunteerTask) private readonly volunteerTasksRepo: Repository<VolunteerTask>,
    @InjectRepository(VolunteerTaskApplication) private readonly volunteerTaskApplicationsRepo: Repository<VolunteerTaskApplication>,
    @InjectRepository(VolunteerServiceRecord) private readonly volunteerServiceRecords: Repository<VolunteerServiceRecord>,
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
    const permissions = this.effectiveAdminPermissions(admin, role, tenantId);
    const token = await this.jwt.signAsync({ sub: admin.id, username: admin.username, role, tenantId });
    return { token, admin: { id: admin.id, username: admin.username, role, tenantId, permissions, tenant: admin.tenant ? this.publicTenant(admin.tenant) : null } };
  }

  async currentAdmin(admin?: AdminContext) {
    if (!admin?.id) throw new UnauthorizedException("当前账号不存在或已停用");
    const row = await this.admins.findOne({ where: { id: admin.id } });
    if (!row || !row.enabled) throw new UnauthorizedException("当前账号不存在或已停用");
    if (row.tenant && !row.tenant.enabled) throw new UnauthorizedException("当前商家已停用，请联系平台管理员");
    return this.publicAdmin(row);
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
        const [adminCount, enabledAdminCount, agentCount, enabledAgentCount, paymentAccountCount, enabledPaymentAccountCount, totalActivityCount, pendingActivityCount, totalRegistrationCount, pendingRegistrationCount, totalOrderCount, totalCourseCount, publishedCourseCount, pendingRefundCount, callbackRiskCount, pendingReconciliationCount, homepageSectionCount, operationSetting] = await Promise.all([
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
          this.courses.count({ where: { tenant: { id: tenant.id } } }),
          this.courses.count({ where: { tenant: { id: tenant.id }, status: "published" } }),
          this.refunds.count({ where: { tenant: { id: tenant.id }, status: "pending" } }),
          this.paymentCallbackLogs
            .createQueryBuilder("callback")
            .where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] })
            .andWhere("callback.tenantId = :tenantId", { tenantId: tenant.id })
            .getCount(),
          this.paymentTransactions.count({ where: { tenant: { id: tenant.id }, reconciliationStatus: "pending" } }),
          this.homepageSections.count({ where: { tenant: { id: tenant.id }, enabled: true } }),
          this.operationSettings
            .createQueryBuilder("setting")
            .leftJoinAndSelect("setting.tenant", "settingTenant")
            .where("(setting.id = :tenantId OR settingTenant.id = :tenantId)", { tenantId: tenant.id })
            .getOne()
        ]);
        const counts = { adminCount, enabledAdminCount, agentCount, enabledAgentCount, paymentAccountCount, enabledPaymentAccountCount, totalActivityCount, totalRegistrationCount, totalOrderCount, totalCourseCount, publishedCourseCount, pendingActivityCount, pendingRegistrationCount, pendingRefundCount, callbackRiskCount, pendingReconciliationCount, homepageSectionCount };
        const subscriptionStatus = tenantSubscriptionStatus(this.tenantPermissions(tenant));
        return [tenant.id, { ...counts, launchReadiness: this.tenantLaunchReadiness(tenant, counts, operationSetting), operationHealth: tenantOperationHealth({ enabled: tenant.enabled, subscriptionStatus, ...counts }) }] as const;
      })
    );
    const adminCountMap = new Map(adminCounts);
    return rows.map((tenant) => {
      const emptyCounts = { adminCount: 0, enabledAdminCount: 0, agentCount: 0, enabledAgentCount: 0, paymentAccountCount: 0, enabledPaymentAccountCount: 0, totalActivityCount: 0, totalRegistrationCount: 0, totalOrderCount: 0, totalCourseCount: 0, publishedCourseCount: 0, pendingActivityCount: 0, pendingRegistrationCount: 0, pendingRefundCount: 0, callbackRiskCount: 0, pendingReconciliationCount: 0, homepageSectionCount: 0 };
      const subscriptionStatus = tenantSubscriptionStatus(this.tenantPermissions(tenant));
      const counts = adminCountMap.get(tenant.id) || { ...emptyCounts, launchReadiness: this.tenantLaunchReadiness(tenant, emptyCounts, null), operationHealth: tenantOperationHealth({ enabled: tenant.enabled, subscriptionStatus, ...emptyCounts }) };
      return { ...this.publicTenant(tenant), ...counts };
    });
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

  async listTenantRegions(admin?: AdminContext, tenantId?: number) {
    this.assertPlatformAdmin(admin);
    const builder = this.tenantRegions.createQueryBuilder("region").leftJoinAndSelect("region.tenant", "tenant").orderBy("region.priority", "DESC").addOrderBy("region.id", "ASC");
    if (tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId });
    const rows = await builder.getMany();
    return rows.map((row) => this.publicTenantRegion(row));
  }

  async listTenantRegionHitLogs(query: TenantRegionHitLogQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.tenantRegionHitLogQuery(query, true)
      .orderBy("log.createdAt", "DESC")
      .addOrderBy("log.id", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await builder.getManyAndCount();
    return {
      items: rows.map((row) => this.publicTenantRegionHitLog(row)),
      total,
      page,
      pageSize
    };
  }

  async tenantRegionHitLogSummary(query: TenantRegionHitLogQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const overview = await this.tenantRegionHitLogQuery(query)
      .select("COUNT(log.id)", "total")
      .addSelect("SUM(CASE WHEN log.matched = true THEN 1 ELSE 0 END)", "matched")
      .getRawOne<{ total: string; matched: string }>();
    const total = Number(overview?.total || 0);
    const matched = Number(overview?.matched || 0);
    const unmatched = Math.max(total - matched, 0);
    const [sources, tenants, regions] = await Promise.all([
      this.tenantRegionHitLogQuery(query)
        .select("COALESCE(log.source, 'public_tenant_resolve')", "source")
        .addSelect("COUNT(log.id)", "count")
        .addSelect("SUM(CASE WHEN log.matched = true THEN 1 ELSE 0 END)", "matchedCount")
        .groupBy("COALESCE(log.source, 'public_tenant_resolve')")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ source: string; count: string; matchedCount: string }>(),
      this.tenantRegionHitLogQuery(query)
        .andWhere("log.matched = :tenantStatsMatched", { tenantStatsMatched: true })
        .andWhere("(tenant.id IS NOT NULL OR regionTenant.id IS NOT NULL)")
        .select("COALESCE(tenant.id, regionTenant.id)", "tenantId")
        .addSelect("COALESCE(tenant.name, regionTenant.name)", "tenantName")
        .addSelect("COALESCE(tenant.code, regionTenant.code)", "tenantCode")
        .addSelect("COALESCE(tenant.region, regionTenant.region)", "tenantRegion")
        .addSelect("COUNT(log.id)", "count")
        .groupBy("COALESCE(tenant.id, regionTenant.id)")
        .addGroupBy("COALESCE(tenant.name, regionTenant.name)")
        .addGroupBy("COALESCE(tenant.code, regionTenant.code)")
        .addGroupBy("COALESCE(tenant.region, regionTenant.region)")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ tenantId: string; tenantName: string; tenantCode: string; tenantRegion: string; count: string }>(),
      this.tenantRegionHitLogQuery(query)
        .andWhere("log.matched = :regionStatsMatched", { regionStatsMatched: true })
        .andWhere("region.id IS NOT NULL")
        .select("region.id", "regionId")
        .addSelect("region.name", "regionName")
        .addSelect("region.province", "province")
        .addSelect("region.city", "city")
        .addSelect("region.district", "district")
        .addSelect("COALESCE(tenant.name, regionTenant.name)", "tenantName")
        .addSelect("COALESCE(tenant.code, regionTenant.code)", "tenantCode")
        .addSelect("COUNT(log.id)", "count")
        .groupBy("region.id")
        .addGroupBy("region.name")
        .addGroupBy("region.province")
        .addGroupBy("region.city")
        .addGroupBy("region.district")
        .addGroupBy("COALESCE(tenant.name, regionTenant.name)")
        .addGroupBy("COALESCE(tenant.code, regionTenant.code)")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ regionId: string; regionName: string; province: string; city: string; district: string; tenantName: string; tenantCode: string; count: string }>()
    ]);
    return {
      total,
      matched,
      unmatched,
      matchRate: this.ratio(matched, total),
      sources: sources.map((row) => {
        const count = Number(row.count || 0);
        const matchedCount = Number(row.matchedCount || 0);
        return { source: row.source || "public_tenant_resolve", count, matchedCount, matchRate: this.ratio(matchedCount, count) };
      }),
      tenants: tenants.map((row) => ({
        tenant: { id: Number(row.tenantId), name: row.tenantName, code: row.tenantCode, region: row.tenantRegion },
        count: Number(row.count || 0),
        share: this.ratio(Number(row.count || 0), matched)
      })),
      regions: regions.map((row) => ({
        region: { id: Number(row.regionId), name: row.regionName, province: row.province, city: row.city, district: row.district },
        tenant: { name: row.tenantName, code: row.tenantCode },
        count: Number(row.count || 0),
        share: this.ratio(Number(row.count || 0), matched)
      }))
    };
  }

  async saveTenantRegion(dto: TenantRegionDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = await this.tenants.findOne({ where: { id: Number(dto.tenantId), enabled: true } });
    if (!tenant) throw new NotFoundException("商家不存在或已停用");
    const region = id ? await this.tenantRegions.findOne({ where: { id } }) : this.tenantRegions.create();
    if (!region) throw new NotFoundException("区域不存在");
    const normalized = this.normalizeTenantRegionDto(dto);
    await this.assertTenantRegionNoConflict({
      ...normalized,
      boundaryPoints: normalized.boundaryPoints === undefined ? region.boundaryPoints : normalized.boundaryPoints,
      tenantId: tenant.id,
      id: region.id || null
    });
    Object.assign(region, {
      tenant,
      province: normalized.province,
      city: normalized.city,
      district: normalized.district,
      name: normalized.name,
      latitude: normalized.latitude.toFixed(6),
      longitude: normalized.longitude.toFixed(6),
      radiusMeters: normalized.radiusMeters,
      ...(!id || normalized.boundaryPoints !== undefined ? { boundaryPoints: normalized.boundaryPoints ?? null } : {}),
      exclusive: normalized.exclusive,
      priority: normalized.priority,
      enabled: normalized.enabled,
      remark: normalized.remark
    });
    const saved = await this.tenantRegions.save(region);
    await this.logOperation(admin, id ? "tenant_region.update" : "tenant_region.create", "tenant_region", saved.id, id ? `更新区域保护：${saved.name}` : `创建区域保护：${saved.name}`, {
      tenantId: tenant.id,
      tenantName: tenant.name,
      latitude: saved.latitude,
      longitude: saved.longitude,
      radiusMeters: saved.radiusMeters,
      boundaryPoints: saved.boundaryPoints,
      exclusive: saved.exclusive,
      enabled: saved.enabled
    });
    return this.publicTenantRegion(saved);
  }

  async bulkImportTenantRegions(dto: TenantRegionBulkImportDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException("请提供要导入的区域保护数据");
    if (items.length > 200) throw new BadRequestException("单次最多导入 200 条区域保护数据");
    const results = [];
    for (let index = 0; index < items.length; index += 1) {
      try {
        const region = await this.saveTenantRegion(items[index], undefined, admin);
        results.push({ index, success: true, region });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ index, success: false, message });
      }
    }
    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;
    await this.logOperation(admin, "tenant_region.bulk_import", "tenant_region", null, `批量导入区域保护：成功 ${succeeded} 条，失败 ${failed} 条`, { total: results.length, succeeded, failed });
    return { total: results.length, succeeded, failed, items: results };
  }

  async deleteTenantRegion(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.tenantRegions.findOne({ where: { id } });
    if (!row) throw new NotFoundException("区域不存在");
    await this.tenantRegions.delete(id);
    await this.logOperation(admin, "tenant_region.delete", "tenant_region", id, `删除区域保护：${row.name}`, { tenantId: row.tenant.id, tenantName: row.tenant.name });
    return { success: true };
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
    const builder = this.admins.createQueryBuilder("admin").leftJoinAndSelect("admin.tenant", "tenant").select(["admin.id", "admin.username", "admin.role", "admin.permissions", "admin.enabled", "admin.createdAt", "admin.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.region", "tenant.enabled", "tenant.settings"]).orderBy("admin.id", "ASC");
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
    const assignedPermissions = admin?.permissions || defaultPermissionsForRole(normalizedRole, Boolean(admin?.tenantId));
    const hasPermission = (key: string) => assignedPermissions.includes(key);
    const canWriteActivities = hasPermission("activity.manage");
    const canReviewRegistrations = hasPermission("registration.manage");
    const canViewRegistrations = hasPermission("registration.view");
    const canViewOrders = hasPermission("order.view");
    const canCheckIn = hasPermission("checkin.manage");
    const currentTenant = admin?.tenantId ? await this.tenants.findOneBy({ id: admin.tenantId }) : null;
    const [tenants, categories, agents, memberLevels, operationSetting] = await Promise.all([
      normalizedRole === AdminRole.SuperAdmin && !admin?.tenantId ? this.listTenants(admin) : Promise.resolve(currentTenant ? [this.publicTenant(currentTenant)] : []),
      this.listCategories(true, admin),
      this.listAgents(true, admin).catch(() => []),
      this.listMemberLevels(true),
      this.getOperationSetting(admin).catch(() => null)
    ]);
    return {
      admin: { id: admin?.id || null, username: admin?.username || "", role: normalizedRole, tenantId: admin?.tenantId || null, permissions: assignedPermissions, tenant: currentTenant ? this.publicTenant(currentTenant) : null },
      permissions: { canWriteActivities, canReviewRegistrations, canViewRegistrations, canViewOrders, canCheckIn, canSelectTenant: hasPermission("tenant.manage") && !admin?.tenantId },
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

  charityProjectUpdates(projectId: number, admin?: AdminContext) {
    return this.charityFund.adminProjectUpdates(projectId, admin);
  }

  saveCharityProjectUpdate(projectId: number, dto: CharityProjectUpdateDto, id?: number, admin?: AdminContext) {
    return this.charityFund.saveProjectUpdate(projectId, dto, id, admin);
  }

  charitySetting(admin?: AdminContext) {
    return this.charityFund.getSetting(admin);
  }

  saveCharitySetting(dto: CharitySettingDto, admin?: AdminContext) {
    return this.charityFund.saveSetting(dto, admin);
  }

  async ambassadorSetting(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return this.publicAmbassadorSetting(await this.ensureAmbassadorSetting());
  }

  async saveAmbassadorSetting(dto: AmbassadorSettingDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const setting = await this.ensureAmbassadorSetting();
    setting.enabled = dto.enabled === undefined ? setting.enabled : Boolean(dto.enabled);
    setting.config = this.mergeAmbassadorConfig(dto.config, setting.config);
    const saved = await this.ambassadorSettings.save(setting);
    await this.logOperation(admin, "ambassador.settings.update", "ambassador", saved.id, "更新文化大使落地页配置", { enabled: saved.enabled });
    return this.publicAmbassadorSetting(saved);
  }

  async ambassadorCasesList(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return this.ambassadorCases.find({ order: { sortOrder: "ASC", id: "ASC" } });
  }

  async saveAmbassadorCase(dto: AmbassadorCaseDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = id ? await this.ambassadorCases.findOneBy({ id }) : this.ambassadorCases.create();
    if (!row) throw new NotFoundException("案例不存在");
    row.name = dto.name.trim();
    if (!row.name) throw new BadRequestException("案例姓名不能为空");
    row.field = this.nullableText(dto.field);
    row.avatarUrl = this.nullableText(dto.avatarUrl);
    row.metrics = this.nullableText(dto.metrics);
    row.quote = this.nullableText(dto.quote);
    row.sortOrder = Number(dto.sortOrder ?? row.sortOrder ?? 0);
    row.enabled = dto.enabled === undefined ? row.enabled !== false : Boolean(dto.enabled);
    const saved = await this.ambassadorCases.save(row);
    await this.logOperation(admin, id ? "ambassador.case.update" : "ambassador.case.create", "ambassador_case", saved.id, `${id ? "更新" : "新增"}文化大使案例：${saved.name}`, { enabled: saved.enabled });
    return saved;
  }

  async ambassadorApplicationsList(query: AmbassadorApplicationQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.ambassadorApplications.createQueryBuilder("application").orderBy("application.id", "DESC");
    const status = String(query.status || "").trim();
    if (status) builder.andWhere("application.status = :status", { status });
    const priority = String(query.priority || "").trim();
    if (priority) builder.andWhere("application.priority = :priority", { priority });
    const source = String(query.source || "").trim();
    if (source) builder.andWhere("application.source = :source", { source });
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      builder.andWhere("(application.name LIKE :keyword OR application.phone LIKE :keyword OR application.city LIKE :keyword OR application.expertise LIKE :keyword OR application.wechat LIKE :keyword OR application.assignee LIKE :keyword)", { keyword: `%${keyword}%` });
    }
    return builder.take(500).getMany();
  }

  async exportAmbassadorApplications(query: AmbassadorApplicationQueryDto = {}, admin?: AdminContext) {
    const rows = await this.ambassadorApplicationsList(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("ambassador-applications");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "姓名", key: "name", width: 14 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "城市", key: "city", width: 16 },
      { header: "方向/需求", key: "expertise", width: 24 },
      { header: "微信号", key: "wechat", width: 20 },
      { header: "申请类型", key: "source", width: 16 },
      { header: "渠道码", key: "channelCode", width: 18 },
      { header: "状态", key: "status", width: 14 },
      { header: "线索等级", key: "priority", width: 12 },
      { header: "跟进人", key: "assignee", width: 14 },
      { header: "下次跟进", key: "nextFollowAt", width: 22 },
      { header: "备注", key: "remark", width: 36 },
      { header: "提交时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        id: row.id,
        name: row.name,
        phone: row.phone,
        city: row.city,
        expertise: row.expertise,
        wechat: row.wechat,
        source: this.ambassadorApplicationSourceText(row.source),
        channelCode: row.channelCode || "",
        status: row.status,
        priority: row.priority || "normal",
        assignee: row.assignee || "",
        nextFollowAt: row.nextFollowAt ? row.nextFollowAt.toISOString().slice(0, 19).replace("T", " ") : "",
        remark: row.remark || "",
        createdAt: row.createdAt ? row.createdAt.toISOString().slice(0, 19).replace("T", " ") : ""
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  private ambassadorApplicationSourceText(source?: string | null) {
    const map: Record<string, string> = {
      dean_recruit: "院长招募",
      ambassador_apply: "大使申请",
      aid_personal: "个人帮扶",
      aid_project: "项目帮扶",
      volunteer_apply: "志愿者",
      brand_story_contact: "品牌咨询"
    };
    return map[String(source || "")] || source || "文化大使旧入口";
  }

  async updateAmbassadorApplication(id: number, dto: AmbassadorApplicationStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.ambassadorApplications.findOneBy({ id });
    if (!row) throw new NotFoundException("申请记录不存在");
    row.status = dto.status;
    row.remark = this.nullableText(dto.remark);
    if (dto.assignee !== undefined) row.assignee = this.nullableText(dto.assignee);
    if (dto.priority !== undefined) row.priority = dto.priority;
    if (dto.nextFollowAt !== undefined) row.nextFollowAt = dto.nextFollowAt ? this.parseDate(dto.nextFollowAt) : null;
    for (const key of ["cityResourceScore", "communityScore", "contentScore", "charityScore", "deliveryScore"] as const) {
      if (dto[key] !== undefined) row[key] = Math.min(Math.max(Number(dto[key] || 0), 0), 5);
    }
    row.reviewedBy = admin?.id || null;
    row.reviewedAt = new Date();
    const saved = await this.ambassadorApplications.save(row);
    if (["approved", "activated"].includes(saved.status) || saved.source === "volunteer_apply") await this.ensureVolunteerProfileFromApplication(saved);
    await this.logOperation(admin, "ambassador.application.update", "ambassador_application", saved.id, `跟进文化大使申请：${saved.name}`, { status: saved.status });
    return saved;
  }

  async ambassadorApplicationFollowups(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const application = await this.ambassadorApplications.findOneBy({ id });
    if (!application) throw new NotFoundException("申请记录不存在");
    return this.ambassadorFollowups.find({ where: { application: { id } }, order: { createdAt: "DESC" } });
  }

  async createAmbassadorApplicationFollowup(id: number, dto: AmbassadorApplicationFollowupDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const application = await this.ambassadorApplications.findOneBy({ id });
    if (!application) throw new NotFoundException("申请记录不存在");
    const content = String(dto.content || "").trim();
    if (!content) throw new BadRequestException("请填写跟进内容");
    const operator = admin?.id ? await this.admins.findOne({ where: { id: admin.id } }) : null;
    const followup = await this.ambassadorFollowups.save(this.ambassadorFollowups.create({
      application,
      operator,
      method: this.cleanText(dto.method, 40) || "wechat",
      result: this.cleanText(dto.result, 40) || "contacted",
      content,
      nextFollowAt: dto.nextFollowAt ? this.parseDate(dto.nextFollowAt) : null
    }));
    application.remark = content;
    application.status = dto.result === "approved" ? "approved" : dto.result === "activated" ? "activated" : application.status === "pending" ? "contacted" : application.status;
    application.nextFollowAt = followup.nextFollowAt;
    application.reviewedBy = admin?.id || null;
    application.reviewedAt = new Date();
    await this.ambassadorApplications.save(application);
    await this.logOperation(admin, "ambassador.application.followup", "ambassador_application", application.id, `新增线索跟进：${application.name}`, { result: followup.result });
    return followup;
  }

  async volunteerTasks(query: VolunteerTaskQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerTasksRepo.createQueryBuilder("task").orderBy("task.startAt", "ASC").addOrderBy("task.id", "DESC");
    if (query.status) builder.andWhere("task.status = :status", { status: query.status });
    if (query.city) builder.andWhere("task.city LIKE :city", { city: `%${query.city.trim()}%` });
    return builder.take(500).getMany();
  }

  async volunteerProfilesList(query: VolunteerProfileQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerProfiles
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("profile.application", "application")
      .orderBy("profile.updatedAt", "DESC")
      .addOrderBy("profile.id", "DESC");
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      builder.andWhere("(profile.name LIKE :keyword OR profile.phone LIKE :keyword OR profile.city LIKE :keyword OR profile.expertise LIKE :keyword OR profile.serviceIntent LIKE :keyword)", { keyword: `%${keyword}%` });
    }
    const status = String(query.status || "").trim();
    if (status) builder.andWhere("profile.status = :status", { status });
    const level = String(query.level || "").trim();
    if (level) builder.andWhere("profile.level = :level", { level });
    const city = String(query.city || "").trim();
    if (city) builder.andWhere("profile.city LIKE :city", { city: `%${city}%` });
    const rows = await builder.take(500).getMany();
    const userIds = rows.map((row) => row.user?.id).filter((id): id is number => Boolean(id));
    if (!userIds.length) return rows.map((row) => ({ ...row, certificateCount: 0, latestCertificate: null }));
    const certificates = await this.certificates.find({ where: { userId: In(userIds) }, order: { issuedAt: "DESC" } });
    return rows.map((row) => {
      const owned = certificates.filter((item) => item.userId === row.user?.id);
      return { ...row, certificateCount: owned.length, latestCertificate: owned[0] || null };
    });
  }

  async updateVolunteerProfile(id: number, dto: VolunteerProfileStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    profile.status = dto.status;
    if (dto.level) profile.level = dto.level;
    profile.remark = this.nullableText(dto.remark);
    const saved = await this.volunteerProfiles.save(profile);
    await this.logOperation(admin, "volunteer.profile.update", "volunteer_profile", saved.id, `更新志愿者档案：${saved.name}`, { status: saved.status, level: saved.level });
    return saved;
  }

  async volunteerProfileCertificates(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    if (!profile.user) return [];
    return this.certificates.find({ where: { userId: profile.user.id }, order: { issuedAt: "DESC" } });
  }

  async issueVolunteerCertificate(id: number, dto: VolunteerCertificateDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    if (!profile.user) throw new BadRequestException("志愿者档案尚未绑定用户账号，需用户登录后申请或报名志愿任务后再发放证书");
    const certificate = await this.ensureVolunteerCertificate(profile, admin, dto.name);
    if (!certificate) throw new BadRequestException("志愿者档案尚未绑定用户账号，无法发放证书");
    return certificate;
  }

  async exportVolunteerProfiles(query: VolunteerProfileQueryDto = {}, admin?: AdminContext) {
    const rows = await this.volunteerProfilesList(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("volunteer-profiles");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "姓名", key: "name", width: 14 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "城市", key: "city", width: 16 },
      { header: "擅长领域", key: "expertise", width: 24 },
      { header: "可服务时间", key: "availableTime", width: 22 },
      { header: "服务意向", key: "serviceIntent", width: 24 },
      { header: "审核状态", key: "status", width: 14 },
      { header: "成长等级", key: "level", width: 14 },
      { header: "累计时长", key: "serviceHours", width: 12 },
      { header: "来源线索", key: "applicationId", width: 12 },
      { header: "备注", key: "remark", width: 36 },
      { header: "创建时间", key: "createdAt", width: 22 },
      { header: "更新时间", key: "updatedAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        id: row.id,
        name: row.name,
        phone: row.phone,
        city: row.city,
        expertise: row.expertise || "",
        availableTime: row.availableTime || "",
        serviceIntent: row.serviceIntent || "",
        status: this.volunteerProfileStatusText(row.status),
        level: this.volunteerLevelText(row.level),
        serviceHours: Number(row.serviceHours || 0),
        applicationId: row.application?.id || "",
        remark: row.remark || "",
        createdAt: this.excelDateTime(row.createdAt),
        updatedAt: this.excelDateTime(row.updatedAt)
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async saveVolunteerTask(dto: VolunteerTaskDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const task = id ? await this.volunteerTasksRepo.findOneBy({ id }) : this.volunteerTasksRepo.create();
    if (!task) throw new NotFoundException("志愿任务不存在");
    task.title = this.cleanText(dto.title, 120);
    task.type = this.cleanText(dto.type, 40);
    task.city = this.cleanText(dto.city, 80);
    if (!task.title || !task.type || !task.city) throw new BadRequestException("请填写任务标题、类型和城市");
    task.address = this.cleanText(dto.address, 160) || null;
    task.startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    task.endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    task.quota = Math.max(Number(dto.quota || task.quota || 1), 1);
    task.status = dto.status || task.status || "open";
    task.requirement = this.nullableText(dto.requirement);
    task.description = this.nullableText(dto.description);
    const saved = await this.volunteerTasksRepo.save(task);
    await this.logOperation(admin, id ? "volunteer.task.update" : "volunteer.task.create", "volunteer_task", saved.id, `${id ? "更新" : "新增"}志愿任务：${saved.title}`, { status: saved.status });
    return saved;
  }

  async volunteerTaskApplications(status?: string, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerTaskApplicationsRepo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").leftJoinAndSelect("application.profile", "profile").leftJoinAndSelect("application.user", "user").orderBy("application.id", "DESC");
    if (status) builder.andWhere("application.status = :status", { status });
    return builder.take(500).getMany();
  }

  async updateVolunteerTaskApplication(id: number, dto: VolunteerTaskApplicationStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.volunteerTaskApplicationsRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException("志愿任务报名不存在");
    row.status = dto.status;
    row.remark = this.nullableText(dto.remark);
    const saved = await this.volunteerTaskApplicationsRepo.save(row);
    await this.logOperation(admin, "volunteer.application.update", "volunteer_task_application", saved.id, `更新志愿任务报名：${saved.name}`, { status: saved.status });
    return saved;
  }

  async createVolunteerServiceRecord(dto: VolunteerServiceRecordDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const application = await this.volunteerTaskApplicationsRepo.findOne({ where: { id: Number(dto.applicationId) } });
    if (!application) throw new NotFoundException("志愿任务报名不存在");
    const profile = application.profile || await this.ensureVolunteerProfileFromTaskApplication(application);
    const hours = Math.max(Number(dto.hours || 0), 0);
    const record = await this.volunteerServiceRecords.save(this.volunteerServiceRecords.create({
      profile,
      task: application.task || null,
      application,
      hours: hours.toFixed(2),
      title: this.cleanText(dto.title, 160) || application.task?.title || "志愿服务",
      proofUrl: this.cleanText(dto.proofUrl, 500) || null,
      feedback: this.nullableText(dto.feedback)
    }));
    application.status = "completed";
    await this.volunteerTaskApplicationsRepo.save(application);
    profile.serviceHours = (Number(profile.serviceHours || 0) + hours).toFixed(2);
    profile.level = this.volunteerLevel(Number(profile.serviceHours || 0));
    profile.status = "approved";
    await this.volunteerProfiles.save(profile);
    await this.ensureVolunteerCertificate(profile, admin);
    await this.logOperation(admin, "volunteer.service.create", "volunteer_service_record", record.id, `登记志愿服务：${profile.name}`, { hours: record.hours });
    return record;
  }

  async volunteerServiceRecordsList(query: VolunteerServiceRecordQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerServiceRecords
      .createQueryBuilder("record")
      .leftJoinAndSelect("record.profile", "profile")
      .leftJoinAndSelect("record.task", "task")
      .leftJoinAndSelect("record.application", "application")
      .orderBy("record.id", "DESC");
    if (query.profileId) builder.andWhere("profile.id = :profileId", { profileId: query.profileId });
    const keyword = String(query.keyword || "").trim();
    if (keyword) builder.andWhere("(record.title LIKE :keyword OR profile.name LIKE :keyword OR profile.phone LIKE :keyword OR task.title LIKE :keyword OR record.feedback LIKE :keyword)", { keyword: `%${keyword}%` });
    const city = String(query.city || "").trim();
    if (city) builder.andWhere("profile.city LIKE :city", { city: `%${city}%` });
    if (query.startDate) builder.andWhere("record.createdAt >= :startDate", { startDate: this.parseDate(query.startDate) });
    if (query.endDate) builder.andWhere("record.createdAt <= :endDate", { endDate: this.parseDate(query.endDate) });
    return builder.take(500).getMany();
  }

  async exportVolunteerServiceRecords(query: VolunteerServiceRecordQueryDto = {}, admin?: AdminContext) {
    const rows = await this.volunteerServiceRecordsList(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("volunteer-service-records");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "志愿者", key: "name", width: 14 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "城市", key: "city", width: 16 },
      { header: "服务标题", key: "title", width: 24 },
      { header: "关联任务", key: "task", width: 24 },
      { header: "服务时长", key: "hours", width: 12 },
      { header: "证明材料", key: "proofUrl", width: 36 },
      { header: "服务评价/说明", key: "feedback", width: 36 },
      { header: "登记时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        id: row.id,
        name: row.profile?.name || "",
        phone: row.profile?.phone || "",
        city: row.profile?.city || "",
        title: row.title,
        task: row.task?.title || "",
        hours: Number(row.hours || 0),
        proofUrl: row.proofUrl || "",
        feedback: row.feedback || "",
        createdAt: this.excelDateTime(row.createdAt)
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  private async ensureVolunteerProfileFromApplication(application: AmbassadorApplication) {
    const existing = await this.volunteerProfiles.findOne({ where: [{ application: { id: application.id } }, { phone: application.phone }] });
    if (existing) return existing;
    return this.volunteerProfiles.save(this.volunteerProfiles.create({
      user: null,
      application,
      name: application.name,
      phone: application.phone,
      city: application.city,
      expertise: application.expertise,
      availableTime: null,
      serviceIntent: application.source === "volunteer_apply" ? application.expertise : application.source || "公益招募",
      status: ["approved", "activated"].includes(application.status) ? "approved" : "pending",
      level: "participant",
      serviceHours: "0.00",
      remark: application.remark || application.experience || null
    }));
  }

  private async ensureVolunteerProfileFromTaskApplication(application: VolunteerTaskApplication) {
    if (application.profile) return application.profile;
    let profile = await this.volunteerProfiles.findOne({ where: { phone: application.phone } });
    if (!profile) {
      profile = await this.volunteerProfiles.save(this.volunteerProfiles.create({
        user: application.user || null,
        application: null,
        name: application.name,
        phone: application.phone,
        city: application.city,
        expertise: application.task?.type || null,
        availableTime: null,
        serviceIntent: application.task?.title || "志愿任务",
        status: "approved",
        level: "participant",
        serviceHours: "0.00",
        remark: application.message || null
      }));
    }
    application.profile = profile;
    await this.volunteerTaskApplicationsRepo.save(application);
    return profile;
  }

  private volunteerLevel(hours: number) {
    if (hours >= 80) return "city_builder";
    if (hours >= 30) return "ambassador";
    if (hours >= 8) return "volunteer";
    return "participant";
  }

  private async ensureVolunteerCertificate(profile: VolunteerProfile, admin?: AdminContext, customName?: string) {
    if (!profile.user) return null;
    const name = this.cleanText(customName, 120) || this.volunteerCertificateName(profile);
    const existing = await this.certificates.findOne({ where: { userId: profile.user.id, name } });
    if (existing) return existing;
    const certificate = await this.certificates.save(this.certificates.create({
      userId: profile.user.id,
      name,
      imageUrl: null,
      threshold: Math.floor(Number(profile.serviceHours || 0))
    }));
    await this.logOperation(admin, "volunteer.certificate.issue", "certificate", certificate.id, `发放志愿证书：${profile.name}`, { userId: profile.user.id, profileId: profile.id, name });
    return certificate;
  }

  private volunteerCertificateName(profile: VolunteerProfile) {
    const level = this.volunteerLevelText(profile.level || "participant");
    const hours = Number(profile.serviceHours || 0).toFixed(1);
    return `慢π·${level}志愿服务证书（${hours}小时）`;
  }

  private volunteerProfileStatusText(status?: string | null) {
    const map: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", inactive: "已停用" };
    return map[String(status || "")] || status || "";
  }

  private volunteerLevelText(level?: string | null) {
    const map: Record<string, string> = { participant: "公益参与者", volunteer: "公益志愿者", ambassador: "公益大使", city_builder: "城市共建者" };
    return map[String(level || "")] || level || "";
  }

  private excelDateTime(value?: Date | string | null) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 19).replace("T", " ");
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
    const totals = {
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
    };
    const rates = {
      signupRate: this.rate(counts.register || 0, counts.view || 0),
      paymentRate: this.rate(counts.pay || 0, counts.register || 0),
      checkInRate: this.rate(counts.check_in || 0, counts.pay || 0),
      reviewRate: this.rate(counts.review || 0, counts.check_in || 0)
    };
    return {
      scope: scope.tenantId ? "tenant" : "platform",
      range: { startDate: scope.startDate?.toISOString() || null, endDate: scope.endDate?.toISOString() || null },
      totals,
      rates,
      tenantRanking,
      risk,
      operationAdvice: this.analyticsOperationAdvice(totals, rates, risk)
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

  async supportSearch(query: SupportQueryDto, admin?: AdminContext) {
    const keyword = String(query.keyword || "").trim();
    if (keyword.length < 2) throw new BadRequestException("请输入至少 2 个字符的手机号、订单号、报名人或活动关键词");
    const like = `%${keyword}%`;
    const tenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(query.tenantId || 0);
    const tenantFilter = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : 0;
    if (!this.isTenantScoped(admin) && tenantFilter) {
      const tenant = await this.tenants.findOneBy({ id: tenantFilter });
      if (!tenant) throw new NotFoundException("筛选商家不存在");
    }

    const userBuilder = this.users
      .createQueryBuilder("user")
      .where("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: like })
      .orderBy("user.updatedAt", "DESC")
      .take(10);
    if (tenantFilter) {
      userBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM registrations scopedRegistration
          LEFT JOIN activities scopedActivity ON scopedActivity.id = scopedRegistration.activityId
          WHERE scopedRegistration.userId = user.id
          AND (scopedRegistration.tenantId = :tenantId OR scopedActivity.tenantId = :tenantId)
        )`,
        { tenantId: tenantFilter }
      );
    }

    const registrationBuilder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .where("(activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR registration.checkInCode LIKE :keyword OR linkedOrder.orderNo LIKE :keyword OR JSON_EXTRACT(registration.answers, '$') LIKE :keyword)", { keyword: like })
      .orderBy("registration.createdAt", "DESC")
      .take(20);
    this.applyTenantScope(registrationBuilder, "registration", admin);
    if (tenantFilter && !this.isTenantScoped(admin)) registrationBuilder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: tenantFilter });

    const orderBuilder = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.agent", "agent")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .where("(order.orderNo LIKE :keyword OR order.transactionNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: like })
      .orderBy("order.createdAt", "DESC")
      .take(20);
    this.applyTenantScope(orderBuilder, "order", admin);
    if (tenantFilter && !this.isTenantScoped(admin)) orderBuilder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: tenantFilter });

    const refundBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("refund.tenant", "tenant")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .where("(refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: like })
      .orderBy("refund.createdAt", "DESC")
      .take(20);
    this.applyTenantScope(refundBuilder, "refund", admin);
    if (tenantFilter && !this.isTenantScoped(admin)) refundBuilder.andWhere("(tenant.id = :tenantId OR order.tenantId = :tenantId OR activityTenant.id = :tenantId)", { tenantId: tenantFilter });

    const [users, registrations, orders, refunds] = await Promise.all([userBuilder.getMany(), registrationBuilder.getMany(), orderBuilder.getMany(), refundBuilder.getMany()]);
    const userIds = Array.from(
      new Set([
        ...users.map((user) => user.id),
        ...registrations.map((registration) => registration.user?.id).filter(Boolean),
        ...orders.map((order) => order.registration?.user?.id).filter(Boolean),
        ...refunds.map((refund) => refund.order?.registration?.user?.id).filter(Boolean)
      ].map(Number))
    );
    const phones = Array.from(new Set(users.map((user) => user.phone).filter(Boolean) as string[]));

    const notificationBuilder = this.notifications
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.user", "user")
      .leftJoinAndSelect("notification.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .where(
        new Brackets((qb) => {
          qb.where("(notification.title LIKE :keyword OR notification.content LIKE :keyword OR activity.title LIKE :keyword)", { keyword: like });
          if (userIds.length) qb.orWhere("user.id IN (:...userIds)", { userIds });
        })
      )
      .orderBy("notification.createdAt", "DESC")
      .take(20);
    if (tenantFilter) {
      notificationBuilder.andWhere(userIds.length ? "(activityTenant.id = :tenantId OR user.id IN (:...userIds))" : "activityTenant.id = :tenantId", { tenantId: tenantFilter, userIds });
    }

    const authCodeBuilder = this.h5AuthCodeLogs.createQueryBuilder("log").where("log.phone LIKE :keyword", { keyword: like }).orderBy("log.createdAt", "DESC").take(20);
    if (tenantFilter) {
      if (!phones.length) {
        authCodeBuilder.andWhere("1 = 0");
      } else {
        authCodeBuilder.andWhere("log.phone IN (:...phones)", { phones });
      }
    }

    const [notifications, h5AuthCodeLogs] = await Promise.all([notificationBuilder.getMany(), authCodeBuilder.getMany()]);
    const pendingPayments = orders.filter((order) => order.status === OrderStatus.PendingPayment).length;
    const pendingRefunds = refunds.filter((refund) => ["pending", "processing", "failed"].includes(refund.status)).length;
    const rejectedRegistrations = registrations.filter((registration) => [RegistrationStatus.Rejected, RegistrationStatus.Cancelled].includes(registration.status)).length;

    return {
      keyword,
      scope: tenantFilter ? { type: "tenant", tenantId: tenantFilter } : { type: "platform", tenantId: null },
      summary: {
        userCount: users.length,
        registrationCount: registrations.length,
        orderCount: orders.length,
        refundCount: refunds.length,
        pendingPayments,
        pendingRefunds
      },
      users: users.map((user) => ({ id: user.id, phone: user.phone, nickname: user.nickname, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt })),
      registrations: registrations.map((registration: Registration & { order?: Order }) => ({
        id: registration.id,
        status: registration.status,
        checkInCode: registration.checkInCode,
        reviewRemark: registration.reviewRemark,
        cancelReason: registration.cancelReason,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        tenant: registration.tenant || registration.activity?.tenant ? { id: (registration.tenant || registration.activity.tenant)?.id, name: (registration.tenant || registration.activity.tenant)?.name } : null,
        activity: registration.activity ? { id: registration.activity.id, title: registration.activity.title, startTime: registration.activity.startTime } : null,
        user: registration.user ? { id: registration.user.id, phone: registration.user.phone, nickname: registration.user.nickname } : null,
        order: registration.order ? { id: registration.order.id, orderNo: registration.order.orderNo, status: registration.order.status, amount: registration.order.amount, paymentMethod: registration.order.paymentMethod } : null
      })),
      orders: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        transactionNo: order.transactionNo,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        tenant: order.tenant || order.registration?.activity?.tenant ? { id: (order.tenant || order.registration.activity.tenant)?.id, name: (order.tenant || order.registration.activity.tenant)?.name } : null,
        agent: order.agent ? { id: order.agent.id, name: order.agent.name } : null,
        activity: order.registration?.activity ? { id: order.registration.activity.id, title: order.registration.activity.title } : null,
        user: order.registration?.user ? { id: order.registration.user.id, phone: order.registration.user.phone, nickname: order.registration.user.nickname } : null,
        ticketType: order.ticketType ? { id: order.ticketType.id, name: order.ticketType.name } : null
      })),
      refunds: refunds.map((refund) => ({
        id: refund.id,
        refundNo: refund.refundNo,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason,
        reviewRemark: refund.reviewRemark,
        providerRefundStatus: refund.providerRefundStatus,
        providerRefundFailureReason: refund.providerRefundFailureReason,
        createdAt: refund.createdAt,
        completedAt: refund.completedAt,
        order: refund.order ? { id: refund.order.id, orderNo: refund.order.orderNo, status: refund.order.status, amount: refund.order.amount } : null,
        user: refund.order?.registration?.user ? { id: refund.order.registration.user.id, phone: refund.order.registration.user.phone, nickname: refund.order.registration.user.nickname } : null,
        activity: refund.order?.registration?.activity ? { id: refund.order.registration.activity.id, title: refund.order.registration.activity.title } : null
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        channel: notification.channel,
        title: notification.title,
        status: notification.status,
        provider: notification.provider,
        providerMessageId: notification.providerMessageId,
        errorMessage: notification.errorMessage,
        retryCount: notification.retryCount,
        sentAt: notification.sentAt,
        failedAt: notification.failedAt,
        createdAt: notification.createdAt,
        user: notification.user ? { id: notification.user.id, phone: notification.user.phone, nickname: notification.user.nickname } : null,
        activity: notification.activity ? { id: notification.activity.id, title: notification.activity.title } : null
      })),
      h5AuthCodeLogs: h5AuthCodeLogs.map((log) => ({
        id: log.id,
        phone: log.phone,
        mode: log.mode,
        status: log.status,
        provider: log.provider,
        providerMessageId: log.providerMessageId,
        message: log.message,
        createdAt: log.createdAt
      })),
      advice: [
        pendingPayments ? `有 ${pendingPayments} 笔待付款订单，优先确认用户是否已支付或是否需要重新引导付款。` : "",
        pendingRefunds ? `有 ${pendingRefunds} 笔待处理/异常退款，建议财务先核对退款状态。` : "",
        rejectedRegistrations ? `有 ${rejectedRegistrations} 条被拒绝或取消的报名，客服解释时需查看审核备注或取消原因。` : ""
      ].filter(Boolean)
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

  async configCheck(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const platformSetting = await this.operationSettings.findOne({ where: { id: 1 } });
    return {
      ...inspectRuntimeConfig(configWithLaunchOverrides(this.config, platformSetting?.launchConfig)),
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
    this.validateAdminUsername(username);
    this.validateAdminPassword(dto.password);
    const exists = await this.admins.findOne({ where: { username } });
    if (exists) throw new BadRequestException("管理员账号已存在");
    const tenant = await this.resolveAdminTenant(dto.tenantId, admin);
    const role = this.resolveNewAdminRole(dto.role, admin);
    const permissions = this.resolveAssignedAdminPermissions(dto.permissions, role, tenant?.id ?? null);
    const saved = await this.admins.save(this.admins.create({ username, passwordHash: await bcrypt.hash(dto.password, 10), role, tenant, permissions }));
    await this.logOperation(admin, "admin.create", "admin", saved.id, `创建管理员：${saved.username}`, { role: saved.role, tenantId: tenant?.id || null, permissions: this.effectiveAdminPermissions(saved) });
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
    if (dto.permissions !== undefined) row.permissions = this.resolveAssignedAdminPermissions(dto.permissions, nextRole, nextTenant?.id ?? null);
    if (dto.enabled !== undefined) row.enabled = dto.enabled;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.update", "admin", saved.id, `编辑管理员：${saved.username}`, { role: saved.role, tenantId: saved.tenant?.id || null, enabled: saved.enabled, permissions: this.effectiveAdminPermissions(saved) });
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
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    this.assertTenantSubscriptionWritable(row.tenant, admin);
    await this.announcements.delete(id);
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "announcement.delete", "announcement", id, `删除公告：${row.title}`, { type: row.type, enabled: row.enabled, pinned: row.pinned, tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async listMarketingPopups(admin?: AdminContext, query: { tenantId?: number; keyword?: string; enabled?: string; platform?: string; placement?: string } = {}) {
    const builder = this.marketingPopups.createQueryBuilder("popup").leftJoinAndSelect("popup.tenant", "tenant").orderBy("popup.priority", "DESC").addOrderBy("popup.updatedAt", "DESC").addOrderBy("popup.id", "DESC").take(300);
    this.applyTenantScope(builder, "popup", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.enabled === "true" || query.enabled === "false") builder.andWhere("popup.enabled = :enabled", { enabled: query.enabled === "true" });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(popup.title LIKE :keyword OR popup.subtitle LIKE :keyword OR popup.content LIKE :keyword OR popup.emphasis LIKE :keyword)", { keyword });
    }
    const rows = await builder.getMany();
    return rows.filter((row) => this.marketingPopupArrayMatches(row.platforms, query.platform) && this.marketingPopupArrayMatches(row.placements, query.placement));
  }

  async createMarketingPopup(dto: MarketingPopupDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const saved = await this.marketingPopups.save(this.marketingPopups.create({ tenant, ...this.marketingPopupPayload(dto) }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "marketing_popup.create", "marketing_popup", saved.id, `创建营销弹窗：${saved.title}`, { tenantId: saved.tenant?.id || null, type: saved.type, enabled: saved.enabled });
    return saved;
  }

  async updateMarketingPopup(id: number, dto: MarketingPopupDto, admin?: AdminContext) {
    const row = await this.marketingPopups.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("营销弹窗不存在");
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    Object.assign(row, { tenant, ...this.marketingPopupPayload(dto) });
    const saved = await this.marketingPopups.save(row);
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "marketing_popup.update", "marketing_popup", saved.id, `更新营销弹窗：${saved.title}`, { tenantId: saved.tenant?.id || null, type: saved.type, enabled: saved.enabled });
    return saved;
  }

  async deleteMarketingPopup(id: number, admin?: AdminContext) {
    const row = await this.marketingPopups.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("营销弹窗不存在");
    this.assertTenantSubscriptionWritable(row.tenant, admin);
    await this.marketingPopups.delete(id);
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "marketing_popup.delete", "marketing_popup", id, `删除营销弹窗：${row.title}`, { tenantId: row.tenant?.id || null, type: row.type });
    return { id, deleted: true };
  }

  async listAdAdvertisers(admin?: AdminContext, query: { tenantId?: number; keyword?: string; status?: string } = {}) {
    const builder = this.adAdvertisers.createQueryBuilder("advertiser").leftJoinAndSelect("advertiser.tenant", "tenant").orderBy("advertiser.updatedAt", "DESC").addOrderBy("advertiser.id", "DESC").take(500);
    this.applyTenantScope(builder, "advertiser", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.status) builder.andWhere("advertiser.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(advertiser.companyName LIKE :keyword OR advertiser.contactName LIKE :keyword OR advertiser.contactPhone LIKE :keyword OR advertiser.wechat LIKE :keyword)", { keyword });
    }
    return builder.getMany();
  }

  async createAdAdvertiser(dto: AdAdvertiserDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const saved = await this.adAdvertisers.save(this.adAdvertisers.create({ tenant, ...this.adAdvertiserPayload(dto) }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.advertiser.create", "ad_advertiser", saved.id, `创建广告主：${saved.companyName}`, { tenantId: saved.tenant?.id || null, status: saved.status });
    return saved;
  }

  async updateAdAdvertiser(id: number, dto: AdAdvertiserDto, admin?: AdminContext) {
    const row = await this.adAdvertisers.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告主不存在");
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    Object.assign(row, { tenant, ...this.adAdvertiserPayload(dto) });
    const saved = await this.adAdvertisers.save(row);
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.advertiser.update", "ad_advertiser", saved.id, `更新广告主：${saved.companyName}`, { tenantId: saved.tenant?.id || null, status: saved.status });
    return saved;
  }

  async deleteAdAdvertiser(id: number, admin?: AdminContext) {
    const row = await this.adAdvertisers.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告主不存在");
    this.assertTenantSubscriptionWritable(row.tenant, admin);
    await this.adAdvertisers.delete(id);
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "ad.advertiser.delete", "ad_advertiser", id, `删除广告主：${row.companyName}`, { tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async listAdContracts(admin?: AdminContext, query: { tenantId?: number; advertiserId?: number; keyword?: string; status?: string } = {}) {
    const builder = this.adContracts.createQueryBuilder("contract").leftJoinAndSelect("contract.tenant", "tenant").leftJoinAndSelect("contract.advertiser", "advertiser").orderBy("contract.updatedAt", "DESC").addOrderBy("contract.id", "DESC").take(500);
    this.applyTenantScope(builder, "contract", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.advertiserId) builder.andWhere("advertiser.id = :advertiserId", { advertiserId: query.advertiserId });
    if (query.status) builder.andWhere("contract.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(contract.contractNo LIKE :keyword OR contract.title LIKE :keyword OR advertiser.companyName LIKE :keyword)", { keyword });
    }
    return builder.getMany();
  }

  async createAdContract(dto: AdContractDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin);
    const saved = await this.adContracts.save(this.adContracts.create({ tenant, advertiser, ...this.adContractPayload(dto) }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.contract.create", "ad_contract", saved.id, `创建广告合同：${saved.contractNo}`, { tenantId: saved.tenant?.id || null, billingModel: saved.billingModel, amount: saved.amount });
    return saved;
  }

  async updateAdContract(id: number, dto: AdContractDto, admin?: AdminContext) {
    const row = await this.adContracts.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告合同不存在");
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin);
    Object.assign(row, { tenant, advertiser, ...this.adContractPayload(dto) });
    const saved = await this.adContracts.save(row);
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.contract.update", "ad_contract", saved.id, `更新广告合同：${saved.contractNo}`, { tenantId: saved.tenant?.id || null, billingModel: saved.billingModel, amount: saved.amount });
    return saved;
  }

  async deleteAdContract(id: number, admin?: AdminContext) {
    const row = await this.adContracts.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告合同不存在");
    this.assertTenantSubscriptionWritable(row.tenant, admin);
    await this.adContracts.delete(id);
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "ad.contract.delete", "ad_contract", id, `删除广告合同：${row.contractNo}`, { tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async listAdCampaigns(admin?: AdminContext, query: { tenantId?: number; advertiserId?: number; contractId?: number; keyword?: string; enabled?: string; source?: string; slotKey?: string } = {}) {
    const builder = this.adCampaigns.createQueryBuilder("campaign").leftJoinAndSelect("campaign.tenant", "tenant").leftJoinAndSelect("campaign.advertiser", "advertiser").leftJoinAndSelect("campaign.contract", "contract").orderBy("campaign.priority", "DESC").addOrderBy("campaign.updatedAt", "DESC").addOrderBy("campaign.id", "DESC").take(500);
    this.applyTenantScope(builder, "campaign", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.advertiserId) builder.andWhere("advertiser.id = :advertiserId", { advertiserId: query.advertiserId });
    if (query.contractId) builder.andWhere("contract.id = :contractId", { contractId: query.contractId });
    if (query.enabled === "true" || query.enabled === "false") builder.andWhere("campaign.enabled = :enabled", { enabled: query.enabled === "true" });
    if (query.source) builder.andWhere("campaign.source = :source", { source: query.source });
    if (query.slotKey) builder.andWhere("campaign.slotKey = :slotKey", { slotKey: query.slotKey });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(campaign.name LIKE :keyword OR campaign.title LIKE :keyword OR campaign.subtitle LIKE :keyword OR advertiser.companyName LIKE :keyword OR contract.contractNo LIKE :keyword)", { keyword });
    }
    return builder.getMany();
  }

  async createAdCampaign(dto: AdCampaignDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin);
    const contract = await this.resolveAdContract(dto.contractId, tenant, admin);
    const saved = await this.adCampaigns.save(this.adCampaigns.create({ tenant, advertiser, contract, ...this.adCampaignPayload(dto) }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.campaign.create", "ad_campaign", saved.id, `创建广告计划：${saved.name}`, { tenantId: saved.tenant?.id || null, source: saved.source, format: saved.format, slotKey: saved.slotKey });
    return saved;
  }

  async updateAdCampaign(id: number, dto: AdCampaignDto, admin?: AdminContext) {
    const row = await this.adCampaigns.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告计划不存在");
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin);
    const contract = await this.resolveAdContract(dto.contractId, tenant, admin);
    Object.assign(row, { tenant, advertiser, contract, ...this.adCampaignPayload(dto) });
    const saved = await this.adCampaigns.save(row);
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.campaign.update", "ad_campaign", saved.id, `更新广告计划：${saved.name}`, { tenantId: saved.tenant?.id || null, source: saved.source, format: saved.format, slotKey: saved.slotKey, enabled: saved.enabled });
    return saved;
  }

  async deleteAdCampaign(id: number, admin?: AdminContext) {
    const row = await this.adCampaigns.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告计划不存在");
    this.assertTenantSubscriptionWritable(row.tenant, admin);
    await this.adCampaigns.delete(id);
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "ad.campaign.delete", "ad_campaign", id, `删除广告计划：${row.name}`, { tenantId: row.tenant?.id || null, source: row.source, slotKey: row.slotKey });
    return { id, deleted: true };
  }

  async adCampaignSummary(admin?: AdminContext, query: { tenantId?: number; startDate?: string; endDate?: string } = {}) {
    const statsBuilder = this.adDailyStats.createQueryBuilder("stat").leftJoinAndSelect("stat.tenant", "tenant").leftJoinAndSelect("stat.advertiser", "advertiser").leftJoinAndSelect("stat.campaign", "campaign");
    this.applyTenantScope(statsBuilder, "stat", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) statsBuilder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.startDate) statsBuilder.andWhere("stat.statDate >= :startDate", { startDate: query.startDate });
    if (query.endDate) statsBuilder.andWhere("stat.statDate <= :endDate", { endDate: query.endDate });
    const stats = await statsBuilder.getMany();
    const officialBuilder = this.adOfficialRevenueImports.createQueryBuilder("revenue").leftJoinAndSelect("revenue.tenant", "tenant");
    this.applyTenantScope(officialBuilder, "revenue", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) officialBuilder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.startDate) officialBuilder.andWhere("revenue.importDate >= :startDate", { startDate: query.startDate });
    if (query.endDate) officialBuilder.andWhere("revenue.importDate <= :endDate", { endDate: query.endDate });
    const officialRows = await officialBuilder.getMany();
    const totals = this.adStatsTotals(stats);
    const officialRevenue = officialRows.reduce((sum, row) => sum + this.money(row.revenueAmount), 0);
    const byAdvertiser = new Map<string, { advertiserName: string; impressions: number; clicks: number; amount: number }>();
    for (const row of stats) {
      const key = row.advertiser?.id ? String(row.advertiser.id) : "none";
      const current = byAdvertiser.get(key) || { advertiserName: row.advertiser?.companyName || "未绑定广告主", impressions: 0, clicks: 0, amount: 0 };
      current.impressions += row.impressionCount || 0;
      current.clicks += row.clickCount || 0;
      current.amount += this.money(row.spentAmount);
      byAdvertiser.set(key, current);
    }
    return {
      totals: {
        ...totals,
        officialRevenue: this.roundMoney(officialRevenue),
        totalRevenue: this.roundMoney(totals.amount + officialRevenue),
        ctr: totals.impressions ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0
      },
      byAdvertiser: Array.from(byAdvertiser.values()).sort((a, b) => b.amount - a.amount),
      officialRevenueImports: officialRows.slice(0, 30)
    };
  }

  async listAdSettlements(admin?: AdminContext, query: { tenantId?: number; contractId?: number; advertiserId?: number; status?: string } = {}) {
    const builder = this.adSettlements.createQueryBuilder("settlement").leftJoinAndSelect("settlement.tenant", "tenant").leftJoinAndSelect("settlement.advertiser", "advertiser").leftJoinAndSelect("settlement.contract", "contract").orderBy("settlement.createdAt", "DESC").addOrderBy("settlement.id", "DESC").take(300);
    this.applyTenantScope(builder, "settlement", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.contractId) builder.andWhere("contract.id = :contractId", { contractId: query.contractId });
    if (query.advertiserId) builder.andWhere("advertiser.id = :advertiserId", { advertiserId: query.advertiserId });
    if (query.status) builder.andWhere("settlement.status = :status", { status: query.status });
    const rows = await builder.getMany();
    const ids = rows.map((row) => row.id);
    const items = ids.length ? await this.adSettlementItems.find({ where: { settlement: { id: In(ids) } }, order: { id: "ASC" } }) : [];
    const grouped = new Map<number, AdSettlementItem[]>();
    for (const item of items) {
      const key = item.settlement.id;
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }
    return rows.map((row) => ({ ...row, items: grouped.get(row.id) || [] }));
  }

  async generateAdSettlement(dto: AdSettlementGenerateDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const contract = await this.resolveAdContract(dto.contractId, tenant, admin);
    if (!contract) throw new BadRequestException("请选择要结算的广告合同");
    const periodStart = this.normalizeDateText(dto.periodStart, "结算开始日期");
    const periodEnd = this.normalizeDateText(dto.periodEnd, "结算结束日期");
    if (periodStart > periodEnd) throw new BadRequestException("结算结束日期不能早于开始日期");
    const campaigns = await this.adCampaigns.find({ where: { contract: { id: contract.id } }, order: { id: "ASC" } });
    const stats = await this.adDailyStats
      .createQueryBuilder("stat")
      .leftJoinAndSelect("stat.campaign", "campaign")
      .where("stat.contractId = :contractId", { contractId: contract.id })
      .andWhere("stat.statDate >= :periodStart AND stat.statDate <= :periodEnd", { periodStart, periodEnd })
      .getMany();
    const items = this.buildAdSettlementItems(contract, campaigns, stats);
    const amount = this.roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
    const settlement = await this.adSettlements.save(this.adSettlements.create({
      tenant,
      advertiser: contract.advertiser,
      contract,
      settlementNo: `AD${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${String(contract.id).padStart(4, "0")}`,
      periodStart,
      periodEnd,
      billingModel: contract.billingModel,
      amount: amount.toFixed(2),
      status: "pending",
      remark: this.nullableText(dto.remark)
    }));
    const savedItems = await this.adSettlementItems.save(items.map((item) => this.adSettlementItems.create({
      settlement,
      campaign: item.campaign,
      description: item.description,
      billingModel: item.billingModel,
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(4),
      amount: item.amount.toFixed(2)
    })));
    await this.logOperation(this.operationActorForTenant(admin, settlement.tenant), "ad.settlement.generate", "ad_settlement", settlement.id, `生成广告结算单：${settlement.settlementNo}`, { tenantId: settlement.tenant?.id || null, contractId: contract.id, amount: settlement.amount });
    return { ...settlement, items: savedItems };
  }

  async updateAdSettlementStatus(id: number, dto: AdSettlementStatusDto, admin?: AdminContext) {
    const row = await this.adSettlements.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告结算单不存在");
    const allowed = ["pending", "confirmed", "invoiced", "paid", "voided"];
    row.status = this.normalizeChoice(dto.status, allowed, row.status);
    const saved = await this.adSettlements.save(row);
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.settlement.status", "ad_settlement", saved.id, `更新广告结算单状态：${saved.settlementNo}`, { tenantId: saved.tenant?.id || null, status: saved.status });
    return saved;
  }

  async importAdOfficialRevenue(dto: AdOfficialRevenueImportDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const saved = await this.adOfficialRevenueImports.save(this.adOfficialRevenueImports.create({
      tenant,
      importDate: this.normalizeDateText(dto.importDate, "导入日期"),
      revenueAmount: this.roundMoney(dto.revenueAmount || 0).toFixed(2),
      impressionCount: Math.max(0, Number(dto.impressionCount || 0)),
      clickCount: Math.max(0, Number(dto.clickCount || 0)),
      ecpm: this.roundMoney(dto.ecpm || 0).toFixed(4),
      fileUrl: this.nullableText(dto.fileUrl),
      remark: this.nullableText(dto.remark)
    }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.official_revenue.import", "ad_official_revenue_import", saved.id, `导入官方流量主收益：${saved.importDate}`, { tenantId: saved.tenant?.id || null, revenueAmount: saved.revenueAmount });
    return saved;
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
    this.assertTenantSubscriptionWritable(targetTenant, admin);
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
    this.assertTenantSubscriptionWritable(targetTenant, admin);
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
    this.assertTenantSubscriptionWritable(targetTenant, admin);
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
    this.assertTenantSubscriptionWritable(targetTenant, admin);
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
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageSections.createQueryBuilder().delete().where("pageKey = :pageKey", { pageKey: normalizedPageKey });
    if (targetTenant) builder.andWhere("tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("tenantId IS NULL");
    await builder.execute();
    const saved = await this.createDefaultHomepageSections(admin, targetTenant, normalizedPageKey);
    await this.logOperation(admin, "homepage.section.reset_default", "homepage_section", null, "恢复默认H5装修配置", { count: saved.length, pageKey: normalizedPageKey });
    return saved;
  }

  async listHomepageDecorationVersions(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageDecorationVersions.createQueryBuilder("version").leftJoinAndSelect("version.tenant", "tenant").where("version.pageKey = :pageKey", { pageKey: normalizedPageKey }).orderBy("version.createdAt", "DESC").addOrderBy("version.id", "DESC").take(30);
    if (targetTenant) builder.andWhere("version.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("version.tenantId IS NULL");
    return builder.getMany();
  }

  async createHomepageDecorationVersion(dto: HomepageDecorationVersionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const sections = await this.snapshotHomepageSections(targetTenant, normalizedPageKey);
    const saved = await this.homepageDecorationVersions.save(this.homepageDecorationVersions.create({
      tenant: targetTenant,
      pageKey: normalizedPageKey,
      name: this.nullableText(dto.name),
      note: this.nullableText(dto.note),
      sections,
      sectionCount: sections.length,
      createdById: admin?.id || null,
      createdByName: this.actorName(admin)
    }));
    await this.logOperation(admin, "homepage.version.create", "homepage_decoration_version", saved.id, "保存前台装修版本", { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null, sectionCount: saved.sectionCount, note: saved.note });
    return saved;
  }

  async restoreHomepageDecorationVersion(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const version = await this.homepageDecorationVersions.findOne({ where: { id } });
    if (!version) throw new NotFoundException("装修版本不存在");
    this.assertHomepageDecorationScope(version, targetTenant, normalizedPageKey, "装修版本");
    const saved = await this.replaceHomepageSectionsFromSnapshot(admin, targetTenant, normalizedPageKey, version.sections || [], "homepage.version.restore", "恢复前台装修版本", "homepage_decoration_version", version.id);
    return saved;
  }

  async deleteHomepageDecorationVersion(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const version = await this.homepageDecorationVersions.findOne({ where: { id } });
    if (!version) throw new NotFoundException("装修版本不存在");
    this.assertHomepageDecorationScope(version, targetTenant, normalizedPageKey, "装修版本");
    await this.homepageDecorationVersions.delete(id);
    await this.logOperation(admin, "homepage.version.delete", "homepage_decoration_version", id, "删除前台装修版本", { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null });
    return { id, deleted: true };
  }

  async listHomepageDecorationTemplates(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageDecorationTemplates.createQueryBuilder("template").leftJoinAndSelect("template.tenant", "tenant").where("template.pageKey = :pageKey", { pageKey: normalizedPageKey }).orderBy("template.updatedAt", "DESC").addOrderBy("template.id", "DESC").take(80);
    if (targetTenant) builder.andWhere("(template.tenantId IS NULL OR template.tenantId = :tenantId)", { tenantId: targetTenant.id });
    else builder.andWhere("template.tenantId IS NULL");
    return builder.getMany();
  }

  async createHomepageDecorationTemplate(dto: HomepageDecorationTemplateDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const sections = await this.snapshotHomepageSections(targetTenant, normalizedPageKey);
    if (!sections.length) throw new BadRequestException("当前页面没有可保存为模板的模块");
    const saved = await this.homepageDecorationTemplates.save(this.homepageDecorationTemplates.create({
      tenant: targetTenant,
      pageKey: normalizedPageKey,
      name: dto.name.trim(),
      category: this.nullableText(dto.category),
      description: this.nullableText(dto.description),
      sections,
      sectionCount: sections.length,
      createdById: admin?.id || null,
      createdByName: this.actorName(admin)
    }));
    await this.logOperation(admin, "homepage.template.create", "homepage_decoration_template", saved.id, `保存前台装修模板：${saved.name}`, { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null, sectionCount: saved.sectionCount });
    return saved;
  }

  async applyHomepageDecorationTemplate(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const template = await this.homepageDecorationTemplates.findOne({ where: { id } });
    if (!template) throw new NotFoundException("装修模板不存在");
    this.assertHomepageTemplateReadable(template, targetTenant, normalizedPageKey);
    const saved = await this.replaceHomepageSectionsFromSnapshot(admin, targetTenant, normalizedPageKey, template.sections || [], "homepage.template.apply", `应用前台装修模板：${template.name}`, "homepage_decoration_template", template.id);
    return saved;
  }

  async deleteHomepageDecorationTemplate(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const template = await this.homepageDecorationTemplates.findOne({ where: { id } });
    if (!template) throw new NotFoundException("装修模板不存在");
    if ((template.pageKey || "home") !== normalizedPageKey) throw new NotFoundException("装修模板不属于当前页面");
    if (template.tenant?.id) {
      if (this.isTenantScoped(admin) && template.tenant.id !== targetTenant?.id) throw new NotFoundException("装修模板不属于当前商家");
    } else if (!this.isPlatformAdmin(admin)) {
      throw new ForbiddenException("平台模板只能由平台超管删除");
    }
    await this.homepageDecorationTemplates.delete(id);
    await this.logOperation(admin, "homepage.template.delete", "homepage_decoration_template", id, `删除前台装修模板：${template.name}`, { pageKey: normalizedPageKey, tenantId: template.tenant?.id || null });
    return { id, deleted: true };
  }

  async createCategory(dto: CategoryDto, admin?: AdminContext) {
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null;
    this.assertTenantSubscriptionWritable(tenant, admin);
    return this.categories.save(this.categories.create({ ...this.normalizeCategoryDto(dto), tenant: this.tenantRelation(admin) }));
  }

  async updateCategory(id: number, dto: CategoryDto, admin?: AdminContext) {
    const category = await this.categories.findOne({ where: { id }, relations: ["tenant"] });
    this.assertTenantAccess(category, admin);
    if (!category) throw new NotFoundException("分类不存");
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : category.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
    Object.assign(category, this.normalizeCategoryDto(dto));
    category.tenant = this.tenantRelation(admin, category.tenant);
    return this.categories.save(category);
  }

  async orderTimeline(orderId: number, admin?: AdminContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    this.assertTenantAccess(order, admin);
    const [transactions, refunds, charityTransactions, logs] = await Promise.all([
      this.paymentTransactions.find({ where: { order: { id: order.id } }, order: { createdAt: "ASC" } }),
      this.refunds.find({ where: { order: { id: order.id } }, order: { createdAt: "ASC" } }),
      this.charityTransactionsRepo.find({ where: { order: { id: order.id } }, order: { createdAt: "ASC" } }),
      this.operationLogs.find({ where: { targetType: "order", targetId: String(order.id) }, order: { createdAt: "ASC" }, take: 100 })
    ]);
    const events: Array<{ type: string; title: string; time: Date | null; level: "primary" | "success" | "warning" | "danger" | "info"; detail?: string | null; payload?: Record<string, unknown> }> = [];
    const add = (event: (typeof events)[number]) => events.push(event);
    add({ type: "order_created", title: "创建订单", time: order.createdAt, level: "primary", detail: `${order.orderNo} / ${this.paymentMethodLabel(order.paymentMethod)}`, payload: { amount: order.amount, status: order.status } });
    add({ type: "registration_submitted", title: "提交报名", time: order.registration?.createdAt || order.createdAt, level: "info", detail: order.registration?.activity?.title || null, payload: { registrationStatus: order.registration?.status } });
    if (order.expiresAt) add({ type: "payment_deadline", title: "付款截止", time: order.expiresAt, level: order.status === OrderStatus.PendingPayment ? "warning" : "info", detail: "线下/线上待付款订单到期时间" });
    for (const transaction of transactions) {
      add({ type: "payment_transaction", title: transaction.status === "success" ? "支付成功" : "支付流水", time: transaction.createdAt, level: transaction.status === "success" ? "success" : "warning", detail: `${transaction.provider} / ${transaction.amount} 元`, payload: { transactionNo: transaction.transactionNo, reconciliationStatus: transaction.reconciliationStatus } });
    }
    if (order.paidAt) add({ type: "order_paid", title: order.paidByAdmin ? "后台确认收款" : "订单已支付", time: order.paidAt, level: "success", detail: order.paidByAdmin ? `${order.paidByAdmin}${order.paidRemark ? `：${order.paidRemark}` : ""}` : null });
    if (order.closedAt) add({ type: "order_closed", title: "订单关闭", time: order.closedAt, level: "danger", detail: order.closeReason });
    for (const refund of refunds) {
      add({ type: "refund", title: `退款${refund.status}`, time: refund.completedAt || refund.reviewedAt || refund.createdAt, level: refund.status === "completed" ? "success" : refund.status === "rejected" ? "danger" : "warning", detail: `${refund.amount} 元${refund.reason ? ` / ${refund.reason}` : ""}`, payload: { refundNo: refund.refundNo, reviewedBy: refund.reviewedBy } });
    }
    for (const tx of charityTransactions) {
      add({ type: "charity", title: tx.type === "charity_reversal" ? "公益金冲回" : tx.type === "project_disbursement" ? "公益拨付" : "公益金计提", time: tx.createdAt, level: tx.direction === "credit" ? "success" : "warning", detail: `${tx.amount} 元${tx.remark ? ` / ${tx.remark}` : ""}`, payload: { retainedOnRefund: tx.retainedOnRefund, ratePercent: tx.ratePercent } });
    }
    for (const log of logs) {
      add({ type: "operation_log", title: log.action, time: log.createdAt, level: "info", detail: log.summary || null, payload: log.detail || undefined });
    }
    return events
      .filter((event) => event.time)
      .sort((a, b) => new Date(a.time as Date).getTime() - new Date(b.time as Date).getTime())
      .map((event) => ({ ...event, time: event.time?.toISOString() || null }));
  }

  async removeCategory(id: number, admin?: AdminContext) {
    const category = await this.categories.findOne({ where: { id }, relations: ["tenant"] });
    this.assertTenantAccess(category, admin);
    if (!category) throw new NotFoundException("分类不存");
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : category.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : activity.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : activity?.tenant || null;
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    const today = this.businessDayRange();
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
    const [paidAmount, refundAmount, todayPaidOrderCount, todayPendingOrderCount, todayRefundCount, todayPendingRefundCount, todayPaidAmount, todayRefundAmount] = await Promise.all([
      this.transactionSumForAgent(query, "success", admin),
      this.refundSumForAgent(query, "completed", admin),
      this.countTransactionsForAgentInRange(query, "success", admin, today.start, today.end),
      this.countOrdersForAgentInRange(query, OrderStatus.PendingPayment, admin, today.start, today.end),
      this.countRefundsForAgentInRange(query, undefined, admin, today.start, today.end),
      this.countRefundsForAgentInRange(query, "pending", admin, today.start, today.end),
      this.transactionSumForAgentInRange(query, "success", admin, today.start, today.end),
      this.refundSumForAgentInRange(query, "completed", admin, today.start, today.end)
    ]);
    const income = Number(paidAmount?.sum || 0);
    const refundsTotal = Number(refundAmount?.sum || 0);
    const dailyMetrics = {
      paidOrderCount: todayPaidOrderCount,
      pendingOrderCount: todayPendingOrderCount,
      refundCount: todayRefundCount,
      pendingRefundCount: todayPendingRefundCount,
      paidAmount: Number(todayPaidAmount?.sum || 0),
      refundAmount: Number(todayRefundAmount?.sum || 0)
    };
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
      dailyReport: {
        rangeStart: today.start.toISOString(),
        rangeEnd: today.end.toISOString(),
        ...financeDailyReport(dailyMetrics)
      },
      riskAlerts: financeRiskAlerts({
        ...dailyMetrics,
        pendingReconciliationCount,
        pendingStatementCount,
        failedCallbackCount
      }),
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
      { header: "套餐", key: "packagePlan", width: 14 },
      { header: "套餐到期", key: "packageExpiresAt", width: 14 },
      { header: "套餐状态", key: "packageStatus", width: 14 },
      { header: "续费提醒", key: "renewalReminder", width: 18 },
      { header: "续费动作", key: "renewalAction", width: 34 },
      { header: "经营健康", key: "operationHealthStatus", width: 14 },
      { header: "健康评分", key: "operationHealthScore", width: 10 },
      { header: "健康风险", key: "operationHealthRisks", width: 34 },
      { header: "健康提醒", key: "operationHealthWarnings", width: 34 },
      { header: "健康建议", key: "operationHealthActions", width: 40 },
      { header: "上线结论", key: "launchStatus", width: 14 },
      { header: "上线评分", key: "launchScore", width: 10 },
      { header: "上线阻塞项", key: "launchBlockers", width: 34 },
      { header: "上线提醒项", key: "launchWarnings", width: 34 },
      { header: "下一步动作", key: "launchActions", width: 40 },
      { header: "管理员数", key: "adminCount", width: 10 },
      { header: "活动数", key: "activityCount", width: 10 },
      { header: "课程数", key: "courseCount", width: 10 },
      { header: "已发布课程", key: "publishedCourseCount", width: 12 },
      { header: "报名数", key: "registrationCount", width: 10 },
      { header: "订单数", key: "orderCount", width: 10 },
      { header: "待审活动", key: "pendingActivity", width: 12 },
      { header: "待审退款", key: "pendingRefund", width: 10 },
      { header: "对账差异", key: "pendingReconciliation", width: 10 },
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
        packagePlan: r.subscriptionStatus?.planLabel || "",
        packageExpiresAt: r.subscriptionStatus?.expiresAt || "长期有效",
        packageStatus: r.subscriptionStatus?.label || "",
        renewalReminder: r.renewalReminder?.label || "",
        renewalAction: r.renewalReminder?.message || "",
        operationHealthStatus: r.operationHealth?.label || "",
        operationHealthScore: Number(r.operationHealth?.score || 0),
        operationHealthRisks: (r.operationHealth?.risks || []).join("；"),
        operationHealthWarnings: (r.operationHealth?.warnings || []).join("；"),
        operationHealthActions: (r.operationHealth?.actions || []).join("；"),
        launchStatus: r.launchReadiness?.label || "",
        launchScore: Number(r.launchReadiness?.score || 0),
        launchBlockers: (r.launchReadiness?.blockers || []).join("；"),
        launchWarnings: (r.launchReadiness?.warnings || []).join("；"),
        launchActions: (r.launchReadiness?.actions || []).join("；"),
        adminCount: Number(r.adminCount || 0),
        activityCount: Number(r.totalActivityCount || 0),
        courseCount: Number(r.totalCourseCount || 0),
        publishedCourseCount: Number(r.publishedCourseCount || 0),
        registrationCount: Number(r.totalRegistrationCount || 0),
        orderCount: Number(r.totalOrderCount || 0),
        pendingActivity: Number(r.pendingActivityCount || 0),
        pendingRefund: Number(r.pendingRefundCount || 0),
        pendingReconciliation: Number(r.pendingReconciliationCount || 0),
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
    if (this.isTenantScoped(admin)) this.assertTenantSubscriptionWritable(setting.tenant || (await this.currentTenantForAdmin(admin)), admin);
    const paymentSettingsEditable = await this.canEditTenantPaymentSettings(admin);
    Object.assign(setting, {
      registrationEnabled: dto.registrationEnabled ?? true,
      registrationDisabledMessage: dto.registrationDisabledMessage?.trim() || null,
      customerServiceName: dto.customerServiceName?.trim() || null,
      customerServicePhone: dto.customerServicePhone?.trim() || null,
      customerServiceWechat: dto.customerServiceWechat?.trim() || null,
      defaultGroupQrCodeUrl: dto.defaultGroupQrCodeUrl?.trim() || null,
      pageTheme: this.isPlainObject(dto.pageTheme) ? dto.pageTheme : {},
      smsProviderEnabled: dto.smsProviderEnabled ?? false,
      smsProvider: dto.smsProvider?.trim() || null,
      smsAccessKeyId: dto.smsAccessKeyId?.trim() || null,
      smsAccessKeySecret: dto.smsAccessKeySecret?.trim() || null,
      smsSignName: dto.smsSignName?.trim() || null,
      smsTemplateId: dto.smsTemplateId?.trim() || null
    });
    if (paymentSettingsEditable) {
      this.assertOperationPaymentSettingPayload(dto);
      Object.assign(setting, {
        offlinePaymentInstructions: dto.offlinePaymentInstructions.trim(),
        paymentMethods: this.normalizePaymentMethods(dto.paymentMethods),
        refundInstructions: dto.refundInstructions.trim(),
        invoiceInstructions: dto.invoiceInstructions?.trim() || null
      });
    } else {
      setting.paymentMethods = this.normalizePaymentMethods(setting.paymentMethods);
    }
    if (!this.isTenantScoped(admin) && dto.launchConfig !== undefined) {
      setting.launchConfig = normalizeLaunchConfig(dto.launchConfig);
    }
    const saved = await this.operationSettings.save(setting);
    await this.logOperation(admin, "settings.operation.update", "operation_setting", saved.id, "更新运营设置", { registrationEnabled: saved.registrationEnabled, customerServicePhone: saved.customerServicePhone, customerServiceWechat: saved.customerServiceWechat, smsProviderEnabled: saved.smsProviderEnabled, launchConfigSaved: !this.isTenantScoped(admin) && dto.launchConfig !== undefined });
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
    const registration = await this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.channel", "channel")
      .where("registration.checkInCode = :code", { code })
      .getOne();
    if (!registration) throw new NotFoundException("签到码不存在");
    if (this.isTenantScoped(currentAdmin) && registration.tenant?.id !== currentAdmin?.tenantId && registration.activity.tenant?.id !== currentAdmin?.tenantId) throw new NotFoundException("Resource not found or not in current tenant");
    if (registration.status === RegistrationStatus.CheckedIn) throw new BadRequestException("该报名已签到，请勿重复核销");
    if (registration.status !== RegistrationStatus.Approved) throw new BadRequestException("只有报名成功可以签到");
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new UnauthorizedException("管理员不存在");
    registration.status = RegistrationStatus.CheckedIn;
    await this.registrations.update(registration.id, { status: RegistrationStatus.CheckedIn });
    const checkInResult = await this.checkIns
      .createQueryBuilder()
      .insert()
      .values({ registration: { id: registration.id }, operator: { id: admin.id }, remark: remark || null } as any)
      .execute();
    const checkInId = Number(checkInResult.identifiers[0]?.id || checkInResult.raw?.insertId || 0);
    await this.recordAdminConversionEvent("check_in", { activity: registration.activity, user: registration.user, registration, channel: registration.channel || null, idempotencyKey: `check_in:${checkInId}` });
    await this.awardPoints(registration.user, 20, "check_in", checkInId, "活动签到奖励");
    await this.logOperation(currentAdmin || { id: admin.id, username: admin.username, role: admin.role, tenantId: admin.tenant?.id ?? null }, "check_in.verify", "registration", registration.id, `签到核销：${registration.activity.title}`, { code, remark: remark || null });
    return { id: checkInId, status: registration.status, registration: { id: registration.id, status: registration.status }, remark: remark || null, activity: { id: registration.activity.id, title: registration.activity.title } };
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
    if (this.isTenantScoped(admin)) this.assertTenantSubscriptionWritable(await this.currentTenantForAdmin(admin), admin);
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
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : activity.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
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
    const tag = await this.userTags.findOne({ where: { id }, relations: ["tenant"] });
    if (!tag) throw new NotFoundException("标签不存");
    this.assertTenantAccess(tag, admin);
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : tag.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
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

  async listMembers(query: string | MemberListQuery = {}, admin?: AdminContext) {
    const normalized: MemberListQuery = typeof query === "string" ? { keyword: query } : query;
    const keyword = normalized.keyword;
    const activityId = normalized.activityId;
    const paged = Boolean(normalized.page || normalized.pageSize);
    const page = Math.max(Math.trunc(Number(normalized.page || 1)), 1);
    const pageSize = Math.min(Math.max(Math.trunc(Number(normalized.pageSize || 20)), 1), 100);
    let activity: Activity | null = null;
    let scopedUserIds: number[] | undefined;
    if (activityId) {
      activity = await this.activities.findOneBy({ id: activityId });
      if (!activity) throw new NotFoundException("活动不存");
      this.assertTenantAccess(activity, admin);
      scopedUserIds = await this.userIdsForActivity(activity.id, admin);
    } else if (this.isTenantScoped(admin)) {
      const users = await this.usersForTenant(admin, undefined, 10000);
      scopedUserIds = users.map((user) => user.id);
    } else {
      await this.ensureProfilesForExistingUsers();
    }
    if (scopedUserIds !== undefined) {
      const users = scopedUserIds.length ? await this.users.find({ where: { id: In(scopedUserIds) } }) : [];
      for (const user of users) await this.ensureMemberProfile(user);
      if (!users.length) {
        return paged ? { items: [], total: 0, page, pageSize, summary: { totalMembers: 0, phoneBound: 0, wechatBound: 0, miniProgramSource: 0, active7Days: 0 } } : [];
      }
    }
    const builder = this.memberProfiles
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("profile.level", "level");
    if (scopedUserIds !== undefined) builder.where("user.id IN (:...scopedUserIds)", { scopedUserIds });
    else builder.where("1=1");
    this.applyMemberFilters(builder, normalized);
    this.applyMemberSort(builder, normalized);
    if (!paged) {
      const profiles = await builder.take(300).getMany();
      return activity ? profiles.map((profile) => ({ ...profile, activity: { id: activity!.id, title: activity!.title } })) : profiles;
    }
    const total = await builder.clone().getCount();
    const [phoneBound, wechatBound, miniProgramSource, active7Days] = await Promise.all([
      builder.clone().andWhere("user.phone IS NOT NULL AND user.phone <> ''").getCount(),
      builder.clone().andWhere("user.openid IS NOT NULL AND user.openid <> ''").getCount(),
      builder.clone().andWhere("user.sourceChannel = :summarySource", { summarySource: "mp_weixin" }).getCount(),
      builder.clone().andWhere("profile.lastActiveAt >= :active7Days", { active7Days: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }).getCount()
    ]);
    const items = await builder.skip((page - 1) * pageSize).take(pageSize).getMany();
    return {
      items: activity ? items.map((profile) => ({ ...profile, activity: { id: activity!.id, title: activity!.title } })) : items,
      total,
      page,
      pageSize,
      summary: { totalMembers: total, phoneBound, wechatBound, miniProgramSource, active7Days }
    };
  }

  private applyMemberFilters(builder: SelectQueryBuilder<MemberProfile>, query: MemberListQuery) {
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      const keywordLike = `%${keyword}%`;
      const keywordId = Number(keyword);
      builder.andWhere(new Brackets((qb) => {
        qb.where("user.phone LIKE :keyword", { keyword: keywordLike })
          .orWhere("user.nickname LIKE :keyword", { keyword: keywordLike });
        if (Number.isInteger(keywordId) && keywordId > 0) qb.orWhere("user.id = :keywordId", { keywordId });
      }));
    }
    const sourceChannel = String(query.sourceChannel || "").trim();
    if (["h5", "mp_weixin", "admin"].includes(sourceChannel)) builder.andWhere("user.sourceChannel = :sourceChannel", { sourceChannel });
    const wechatBound = this.memberBooleanFilter(query.wechatBound);
    if (wechatBound === true) builder.andWhere("user.openid IS NOT NULL AND user.openid <> ''");
    if (wechatBound === false) builder.andWhere("(user.openid IS NULL OR user.openid = '')");
    const phoneBound = this.memberBooleanFilter(query.phoneBound);
    if (phoneBound === true) builder.andWhere("user.phone IS NOT NULL AND user.phone <> ''");
    if (phoneBound === false) builder.andWhere("(user.phone IS NULL OR user.phone = '')");
    const levelIdText = String(query.levelId || "").trim();
    if (levelIdText === "none") builder.andWhere("level.id IS NULL");
    else if (Number.isFinite(Number(levelIdText)) && Number(levelIdText) > 0) builder.andWhere("level.id = :levelId", { levelId: Number(levelIdText) });
    const activeStart = this.memberDateFilter(query.activeStart);
    const activeEnd = this.memberDateFilter(query.activeEnd, true);
    if (activeStart) builder.andWhere("profile.lastActiveAt >= :activeStart", { activeStart });
    if (activeEnd) builder.andWhere("profile.lastActiveAt <= :activeEnd", { activeEnd });
  }

  private memberBooleanFilter(value: unknown) {
    if (value === true || value === "true" || value === "1" || value === "yes") return true;
    if (value === false || value === "false" || value === "0" || value === "no") return false;
    return undefined;
  }

  private memberDateFilter(value: unknown, endOfDay = false) {
    const text = String(value || "").trim();
    if (!text) return null;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(text)) date.setHours(23, 59, 59, 999);
    return date;
  }

  private applyMemberSort(builder: SelectQueryBuilder<MemberProfile>, query: MemberListQuery) {
    const sortMap: Record<string, string> = {
      lastActiveAt: "profile.lastActiveAt",
      lastActive: "profile.lastActiveAt",
      lastLoginAt: "user.lastLoginAt",
      lastLogin: "user.lastLoginAt",
      points: "profile.points",
      totalSpent: "profile.totalSpent",
      registrationCount: "profile.registrationCount",
      createdAt: "user.createdAt"
    };
    const sortBy = sortMap[String(query.sortBy || "lastActiveAt")] || sortMap.lastActiveAt;
    const sortOrder = String(query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    builder.orderBy(sortBy, sortOrder).addOrderBy("profile.updatedAt", "DESC").addOrderBy("user.id", "DESC");
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
        nickname: nickname || (phone ? `本地用户${phone.slice(-4)}` : `测试会员${Date.now().toString().slice(-4)}`),
        sourceChannel: "admin"
      });
    } else if (nickname && user.nickname !== nickname) {
      user.nickname = nickname;
    }
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    const saved = await this.users.save(user);
    const profile = await this.ensureMemberProfile(saved);
    await this.logOperation(admin, "member.create", "user", saved.id, `新增会员：${saved.nickname || saved.phone || saved.id}`, { phone: saved.phone, nickname: saved.nickname, sourceChannel: saved.sourceChannel, passwordSet: Boolean(password), remark: dto.remark });
    return profile;
  }

  async updateMember(userId: number, dto: UpdateMemberDto, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const phone = dto.phone === undefined ? user.phone : String(dto.phone || "").trim();
    const nickname = dto.nickname === undefined ? user.nickname : String(dto.nickname || "").trim();
    const avatarUrl = dto.avatarUrl === undefined ? user.avatarUrl : String(dto.avatarUrl || "").trim();
    if (phone && !/^1\d{10}$/.test(phone)) throw new BadRequestException("请填写正确的手机号");
    if (phone && phone !== user.phone) {
      const exists = await this.users.findOne({ where: { phone } });
      if (exists && exists.id !== user.id) throw new BadRequestException("手机号已被其他会员使用");
    }
    user.phone = phone || null;
    user.nickname = nickname || null;
    user.avatarUrl = avatarUrl || null;
    const saved = await this.users.save(user);
    const profile = await this.ensureMemberProfile(saved);
    await this.logOperation(admin, "member.update", "user", saved.id, `编辑会员：${saved.nickname || saved.phone || saved.id}`, { phone: saved.phone, nickname: saved.nickname });
    return profile;
  }

  async resetMemberPassword(userId: number, dto: ResetMemberPasswordDto, admin?: AdminContext) {
    const password = String(dto.password || "");
    if (password.length < 6 || password.length > 64) throw new BadRequestException("会员密码长度需为 6-64 位");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    user.passwordHash = await bcrypt.hash(password, 10);
    const saved = await this.users.save(user);
    await this.logOperation(admin, "member.password.reset", "user", saved.id, `重置会员密码：${saved.nickname || saved.phone || saved.id}`);
    return { id: saved.id, passwordSet: true };
  }

  async adjustMemberPoints(userId: number, dto: MemberPointAdjustDto, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const points = Math.trunc(Number(dto.points || 0));
    if (!points) throw new BadRequestException("调整积分不能为 0");
    const sourceId = `${userId}:${Date.now()}:${admin?.id || "system"}`;
    const log = await this.awardPoints(user, points, "admin_point_adjust", sourceId, dto.remark || "后台调整会员积分");
    await this.logOperation(admin, "member.points.adjust", "user", userId, `调整会员积分：${points}`, { remark: dto.remark || null });
    return { log, profile: await this.memberProfiles.findOne({ where: { user: { id: userId } } }) };
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
    this.assertPlatformAdmin(admin);
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount === 0) throw new BadRequestException("调整金额不能为 0");
    if (dto.type !== "adjust" && amount <= 0) throw new BadRequestException("充值或扣减金额必须大于 0");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const tenant = dto.tenantId ? await this.resolveWalletTenantForPlatform(dto.tenantId) : await this.walletTenantForAdmin(admin);
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
    let defaultAdmin = await this.admins.findOne({ where: { username: "admin" } });
    if (!defaultAdmin) {
      await this.admins.save(this.admins.create({ username: "admin", passwordHash: await bcrypt.hash("Admin123456", 10), role: AdminRole.SuperAdmin, tenant: null }));
      return;
    }
    if (defaultAdmin.tenant) {
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
    if (!password || password.length < 10) throw new BadRequestException("管理员密码至少需要 10 位");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) throw new BadRequestException("管理员密码需要包含大小写字母和数字");
  }

  private validateAdminUsername(username: string) {
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) throw new BadRequestException("管理员账号需为 3-32 位字母、数字、点、下划线或横线");
  }

  private publicAdmin(admin: AdminUser) {
    const role = normalizeAdminRole(admin.role);
    const tenantId = admin.tenant?.id ?? null;
    return { id: admin.id, username: admin.username, role, tenantId, permissions: this.effectiveAdminPermissions(admin, role, tenantId), assignedPermissions: admin.permissions, tenant: admin.tenant ? this.publicTenant(admin.tenant) : null, enabled: admin.enabled, createdAt: admin.createdAt, updatedAt: admin.updatedAt };
  }

  private effectiveAdminPermissions(admin: AdminUser, role = normalizeAdminRole(admin.role), tenantId = admin.tenant?.id ?? null) {
    return effectivePermissionsForAdmin({ role, tenantId, permissions: admin.permissions });
  }

  private resolveAssignedAdminPermissions(value: unknown, role: string, tenantId: number | null) {
    const normalized = normalizeAdminPermissions(value);
    if (normalized === null) return null;
    const platformOnly = new Set(defaultPermissionsForRole(AdminRole.SuperAdmin, false).filter((key) => !defaultPermissionsForRole(AdminRole.SuperAdmin, true).includes(key)));
    const scoped = tenantId ? normalized.filter((key) => !platformOnly.has(key)) : normalized;
    return scoped;
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
    if (input.idempotencyKey) {
      const exists = await this.conversionEvents
        .createQueryBuilder("event")
        .where("event.idempotencyKey = :idempotencyKey", { idempotencyKey: input.idempotencyKey })
        .getExists();
      if (exists) return null;
    }
    const result = await this.conversionEvents
      .createQueryBuilder()
      .insert()
      .values({
      type: type as any,
      tenant: this.relationId(input.activity?.tenant || input.order?.tenant || input.registration?.tenant || input.channel?.tenant || null),
      activity: this.relationId(input.activity || input.registration?.activity || input.order?.registration?.activity || null),
      user: this.relationId(input.user || input.registration?.user || input.order?.registration?.user || null),
      registration: this.relationId(input.registration || input.order?.registration || null),
      order: this.relationId(input.order || null),
      channel: this.relationId(input.channel || input.registration?.channel || null),
      amount: Number(input.amount || 0).toFixed(2),
      source: input.source || "admin",
      idempotencyKey: input.idempotencyKey || null,
      clientIp: null,
      userAgent: null,
      payload: null
    } as any)
      .execute();
    return { id: Number(result.identifiers[0]?.id || result.raw?.insertId || 0) };
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

  private normalizeCategoryDto(dto: CategoryDto) {
    return {
      name: dto.name.trim(),
      iconUrl: this.truncateNullableText(dto.iconUrl, 500),
      coverUrl: this.truncateNullableText(dto.coverUrl, 500),
      publicVisible: dto.publicVisible ?? true,
      scene: this.normalizeScene(dto.scene),
      sortOrder: Number(dto.sortOrder ?? 0),
      enabled: dto.enabled ?? true
    };
  }

  private normalizeScene(value?: string) {
    const scene = String(value || "activity").trim().replace(/[^\w-]/g, "").slice(0, 40);
    return scene || "activity";
  }

  private truncateNullableText(value?: string | null, max = 255) {
    const text = String(value ?? "").trim();
    return text ? text.slice(0, max) : null;
  }

  private paymentMethodLabel(method: PaymentMethod | string) {
    const map: Record<string, string> = {
      [PaymentMethod.Free]: "免费报名",
      [PaymentMethod.Wechat]: "微信支付",
      [PaymentMethod.Alipay]: "支付宝",
      [PaymentMethod.Balance]: "余额支付",
      [PaymentMethod.Offline]: "线下收款"
    };
    return map[String(method)] || String(method || "未知支付");
  }

  private analyticsOperationAdvice(totals: Record<string, any>, rates: Record<string, any>, risk: Record<string, any>) {
    const advice: Array<{ level: "success" | "warning" | "danger" | "info"; title: string; message: string }> = [];
    if (Number(totals.viewCount || 0) > 50 && Number(rates.signupRate || 0) < 8) advice.push({ level: "warning", title: "浏览高报名低", message: "建议优化活动标题、封面、价格和报名说明，降低用户决策成本。" });
    if (Number(totals.registrationCount || 0) > 10 && Number(rates.paymentRate || 0) < 60) advice.push({ level: "warning", title: "报名高支付低", message: "建议检查支付方式、线下收款说明和付款截止提醒。" });
    if (Number(totals.paidCount || 0) > 10 && Number(rates.checkInRate || 0) < 70) advice.push({ level: "danger", title: "支付高签到低", message: "建议加强活动前提醒、客服触达和现场签到引导。" });
    if (Number(totals.refundAmount || 0) > Number(totals.paidAmount || 0) * 0.2 && Number(totals.refundAmount || 0) > 0) advice.push({ level: "danger", title: "退款偏高", message: "建议复盘活动交付、退款规则和用户预期管理。" });
    if (Number(risk?.pendingReconciliationCount || 0) > 0) advice.push({ level: "warning", title: "对账待处理", message: "存在支付对账异常，建议财务优先核对流水。" });
    if (!advice.length) advice.push({ level: "success", title: "经营数据平稳", message: "当前核心漏斗暂无明显异常，可继续观察渠道和复购变化。" });
    return advice;
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

  private tenantLaunchReadiness(
    tenant: Tenant,
    counts: {
      enabledAdminCount: number;
      enabledPaymentAccountCount: number;
      totalActivityCount: number;
      pendingActivityCount: number;
      pendingRegistrationCount: number;
      pendingRefundCount: number;
      callbackRiskCount: number;
      homepageSectionCount: number;
    },
    setting?: OperationSetting | null
  ) {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const actions: string[] = [];
    const settings = this.tenantPermissions(tenant);
    const subscription = tenantSubscriptionStatus(settings);

    if (!tenant.enabled) blockers.push("商家已停用");
    if (subscription.status === "expired") blockers.push("商家套餐已到期");
    if (Number(counts.enabledAdminCount || 0) <= 0) blockers.push("缺少可登录商家管理员");
    if (Number(counts.enabledPaymentAccountCount || 0) <= 0) blockers.push(settings.paymentAccountEditable ? "缺少启用的收款账户" : "收款配置权限关闭且未配置启用账户");
    if (Number(counts.totalActivityCount || 0) <= 0) blockers.push("尚未创建活动");
    if (Number(counts.callbackRiskCount || 0) > 0) blockers.push("存在异常支付回调");

    if (!setting) warnings.push("运营设置未初始化");
    else {
      if (!setting.registrationEnabled) warnings.push("全站报名开关已暂停");
      if (!setting.customerServicePhone && !setting.customerServiceWechat) warnings.push("缺少客服手机号或客服微信");
      if (!setting.offlinePaymentInstructions?.trim()) warnings.push("缺少线下付款说明");
      if (!setting.refundInstructions?.trim()) warnings.push("缺少退款说明");
    }
    if (Number(counts.homepageSectionCount || 0) <= 0) warnings.push("首页装修未启用模块");
    if (subscription.status === "expiring_soon") warnings.push(`商家套餐 ${subscription.daysRemaining} 天后到期`);
    if (Number(counts.pendingActivityCount || 0) > 0) warnings.push(`有 ${counts.pendingActivityCount} 个待审核活动`);
    if (Number(counts.pendingRegistrationCount || 0) > 0) warnings.push(`有 ${counts.pendingRegistrationCount} 个待审核报名`);
    if (Number(counts.pendingRefundCount || 0) > 0) warnings.push(`有 ${counts.pendingRefundCount} 个待处理退款`);

    actions.push(...blockers, ...warnings);
    const score = Math.max(0, Math.min(100, 100 - blockers.length * 22 - warnings.length * 7));
    const status = blockers.length ? "no_go" : warnings.length ? "warn" : "go";
    const label = status === "go" ? "可上线" : status === "warn" ? "可灰度" : "暂不可上线";
    return { score, status, label, blockers, warnings, actions: actions.slice(0, 6) };
  }

  private publicTenant(tenant: Tenant) {
    const settings = this.tenantPermissions(tenant);
    return { id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, contactName: tenant.contactName, contactPhone: tenant.contactPhone, remark: tenant.remark, enabled: tenant.enabled, settings, subscriptionStatus: tenantSubscriptionStatus(settings), renewalReminder: tenantRenewalReminder(settings), packageTemplate: tenantPackagePermissionTemplate(settings.packagePlan), createdAt: tenant.createdAt, updatedAt: tenant.updatedAt };
  }

  private publicTenantRegion(region: TenantRegion) {
    return {
      id: region.id,
      tenant: this.publicTenant(region.tenant),
      province: region.province,
      city: region.city,
      district: region.district,
      name: region.name,
      latitude: Number(region.latitude),
      longitude: Number(region.longitude),
      radiusMeters: region.radiusMeters,
      boundaryPoints: region.boundaryPoints || null,
      exclusive: region.exclusive,
      priority: region.priority,
      enabled: region.enabled,
      remark: region.remark,
      createdAt: region.createdAt,
      updatedAt: region.updatedAt
    };
  }

  private tenantRegionHitLogQuery(query: TenantRegionHitLogQueryDto = {}, withRelations = false) {
    const builder = this.tenantRegionHitLogs.createQueryBuilder("log");
    if (withRelations) {
      builder.leftJoinAndSelect("log.tenant", "tenant").leftJoinAndSelect("log.region", "region").leftJoinAndSelect("region.tenant", "regionTenant");
    } else {
      builder.leftJoin("log.tenant", "tenant").leftJoin("log.region", "region").leftJoin("region.tenant", "regionTenant");
    }
    this.applyTenantRegionHitLogFilters(builder, query);
    return builder;
  }

  private applyTenantRegionHitLogFilters(builder: SelectQueryBuilder<TenantRegionHitLog>, query: TenantRegionHitLogQueryDto = {}) {
    if (query.tenantId) builder.andWhere("(tenant.id = :tenantId OR regionTenant.id = :tenantId)", { tenantId: query.tenantId });
    if (query.matched === "true") builder.andWhere("log.matched = :matched", { matched: true });
    if (query.matched === "false") builder.andWhere("log.matched = :matched", { matched: false });
    if (query.source?.trim()) builder.andWhere("log.source = :source", { source: query.source.trim() });
    const startDate = this.tenantRegionHitLogDate(query.startDate, "开始日期");
    const endDate = this.tenantRegionHitLogDate(query.endDate, "结束日期", true);
    if (startDate && endDate && startDate.getTime() >= endDate.getTime()) throw new BadRequestException("开始日期必须早于结束日期");
    if (startDate) builder.andWhere("log.createdAt >= :startDate", { startDate });
    if (endDate) builder.andWhere("log.createdAt < :endDate", { endDate });
  }

  private tenantRegionHitLogDate(value?: string, label = "日期", endExclusive = false) {
    const text = String(value || "").trim();
    if (!text) return null;
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      date = new Date(`${text}T00:00:00`);
      if (endExclusive) date.setDate(date.getDate() + 1);
    } else {
      date = new Date(text);
    }
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label}格式无效`);
    return date;
  }

  private ratio(part: number, total: number) {
    if (!total) return 0;
    return Number((part / total).toFixed(4));
  }

  private publicTenantRegionHitLog(log: TenantRegionHitLog) {
    const tenant = log.tenant || log.region?.tenant || null;
    return {
      id: log.id,
      matched: log.matched,
      tenant: tenant ? this.publicTenant(tenant) : null,
      region: log.region ? { id: log.region.id, name: log.region.name, province: log.region.province, city: log.region.city, district: log.region.district } : null,
      latitude: Number(log.latitude),
      longitude: Number(log.longitude),
      distanceMeters: log.distanceMeters,
      source: log.source,
      clientIp: log.clientIp,
      userAgent: log.userAgent,
      createdAt: log.createdAt
    };
  }

  private normalizeTenantRegionDto(dto: TenantRegionDto) {
    const latitude = Number(dto.latitude);
    const longitude = Number(dto.longitude);
    const radiusMeters = Math.round(Number(dto.radiusMeters || 0));
    const boundaryPoints = this.normalizeTenantRegionBoundaryPoints(dto.boundaryPoints);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new BadRequestException("纬度范围应为 -90 到 90");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new BadRequestException("经度范围应为 -180 到 180");
    if (!Number.isFinite(radiusMeters) || radiusMeters < 100 || radiusMeters > 200000) throw new BadRequestException("保护半径应为 100 米到 200 公里");
    return {
      province: this.truncateNullableText(dto.province, 80),
      city: this.truncateNullableText(dto.city, 80),
      district: this.truncateNullableText(dto.district, 80),
      name: String(dto.name || "").trim().slice(0, 120),
      latitude,
      longitude,
      radiusMeters,
      boundaryPoints,
      exclusive: dto.exclusive !== false,
      priority: Number.isFinite(Number(dto.priority)) ? Number(dto.priority) : 0,
      enabled: dto.enabled !== false,
      remark: this.truncateNullableText(dto.remark, 1000)
    };
  }

  private normalizeTenantRegionBoundaryPoints(value: unknown): TenantRegionBoundaryPoint[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (!Array.isArray(value)) throw new BadRequestException("多边形边界点格式无效");
    if (!value.length) return null;
    if (value.length < 3) throw new BadRequestException("多边形边界至少需要 3 个点");
    if (value.length > 200) throw new BadRequestException("多边形边界最多支持 200 个点");
    return value.map((item) => {
      if (!item || typeof item !== "object") throw new BadRequestException("多边形边界点格式无效");
      const point = item as Record<string, unknown>;
      const lat = Number(point.lat ?? point.latitude);
      const lng = Number(point.lng ?? point.longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new BadRequestException("多边形边界纬度范围应为 -90 到 90");
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new BadRequestException("多边形边界经度范围应为 -180 到 180");
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    });
  }

  private async assertTenantRegionNoConflict(input: { id?: number | null; tenantId: number; latitude: number; longitude: number; radiusMeters: number; boundaryPoints?: TenantRegionBoundaryPoint[] | null; exclusive: boolean; enabled: boolean }) {
    if (!input.exclusive || !input.enabled) return;
    const candidates = await this.tenantRegions
      .createQueryBuilder("region")
      .leftJoinAndSelect("region.tenant", "tenant")
      .where("region.enabled = :enabled", { enabled: true })
      .andWhere("region.exclusive = :exclusive", { exclusive: true })
      .andWhere("tenant.id <> :tenantId", { tenantId: input.tenantId });
    if (input.id) candidates.andWhere("region.id <> :id", { id: input.id });
    const regions = await candidates.getMany();
    const conflict = regions.find((region) => {
      return tenantRegionShapesConflict(
        { latitude: input.latitude, longitude: input.longitude, radiusMeters: input.radiusMeters, boundaryPoints: input.boundaryPoints || null },
        { latitude: Number(region.latitude), longitude: Number(region.longitude), radiusMeters: Number(region.radiusMeters || 0), boundaryPoints: region.boundaryPoints || null }
      );
    });
    if (conflict) throw new BadRequestException(`区域与「${conflict.tenant.name} / ${conflict.name}」排他范围重叠，请调整半径、位置或关闭排他`);
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
    return { ...tenantPackagePermissionTemplate("standard").permissions, packagePlan: "standard", packageExpiresAt: null };
  }

  private tenantPermissions(tenant?: Tenant | null): TenantPermissionSettings {
    const settings = this.isPlainObject(tenant?.settings) ? tenant?.settings || {} : {};
    const defaults = this.defaultTenantPermissions();
    return {
      activityPublishReviewRequired: settings.activityPublishReviewRequired === undefined ? defaults.activityPublishReviewRequired : Boolean(settings.activityPublishReviewRequired),
      registrationReviewEnabled: settings.registrationReviewEnabled === undefined ? defaults.registrationReviewEnabled : Boolean(settings.registrationReviewEnabled),
      paymentAccountEditable: settings.paymentAccountEditable === undefined ? defaults.paymentAccountEditable : Boolean(settings.paymentAccountEditable),
      mallEnabled: settings.mallEnabled === undefined ? defaults.mallEnabled : Boolean(settings.mallEnabled),
      packagePlan: normalizeTenantPackagePlan(settings.packagePlan),
      packageExpiresAt: normalizeTenantPackageExpiresAt(settings.packageExpiresAt)
    };
  }

  private mergeTenantSettings(input?: Record<string, unknown> | null, current?: Record<string, unknown> | null) {
    const base = this.isPlainObject(current) ? current : {};
    const next = this.isPlainObject(input) ? input : {};
    const merged: Record<string, unknown> = { ...base };
    const permissionKeys = ["activityPublishReviewRequired", "registrationReviewEnabled", "paymentAccountEditable", "mallEnabled"];
    const hasExplicitPermission = permissionKeys.some((key) => next[key] !== undefined);
    if (next.packagePlan !== undefined) {
      const template = tenantPackagePermissionTemplate(next.packagePlan);
      merged.packagePlan = template.plan;
      if (!hasExplicitPermission) Object.assign(merged, template.permissions);
    }
    for (const key of permissionKeys) {
      if (next[key] !== undefined) merged[key] = Boolean(next[key]);
    }
    if (next.packageExpiresAt !== undefined) merged.packageExpiresAt = normalizeTenantPackageExpiresAt(next.packageExpiresAt);
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

  private async snapshotHomepageSections(targetTenant: Tenant | null, pageKey: string): Promise<HomepageDecorationSnapshotRow[]> {
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageSections.createQueryBuilder("section").where("section.pageKey = :pageKey", { pageKey: normalizedPageKey }).orderBy("section.sortOrder", "ASC").addOrderBy("section.id", "ASC");
    if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("section.tenantId IS NULL");
    const sections = await builder.getMany();
    return this.normalizeHomepageSnapshotRows(sections.map((section) => ({
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      config: section.config,
      layout: section.layout
    })));
  }

  private normalizeHomepageSnapshotRows(rows: any[]): HomepageDecorationSnapshotRow[] {
    if (!Array.isArray(rows)) throw new BadRequestException("装修快照格式不正确");
    return rows.map((row, index) => ({
      type: this.normalizeHomepageType(row.type),
      title: this.nullableText(row.title),
      subtitle: this.nullableText(row.subtitle),
      enabled: row.enabled !== false,
      sortOrder: (index + 1) * 10,
      config: this.normalizeJsonObject(row.config || {}, "config"),
      layout: this.normalizeJsonObject(row.layout || {}, "layout")
    }));
  }

  private assertHomepageDecorationScope(row: { tenant?: Tenant | null; pageKey?: string | null }, targetTenant: Tenant | null, pageKey: string, label: string) {
    if ((row.pageKey || "home") !== normalizePageKey(pageKey)) throw new NotFoundException(`${label}不属于当前页面`);
    if (targetTenant) {
      if (row.tenant?.id !== targetTenant.id) throw new NotFoundException(`${label}不属于当前商家`);
      return;
    }
    if (row.tenant?.id) throw new NotFoundException(`${label}不属于平台默认装修`);
  }

  private assertHomepageTemplateReadable(template: HomepageDecorationTemplate, targetTenant: Tenant | null, pageKey: string) {
    if ((template.pageKey || "home") !== normalizePageKey(pageKey)) throw new NotFoundException("装修模板不属于当前页面");
    if (!template.tenant?.id) return;
    if (targetTenant?.id === template.tenant.id) return;
    throw new NotFoundException("装修模板不属于当前商家");
  }

  private async replaceHomepageSectionsFromSnapshot(admin: AdminContext | undefined, targetTenant: Tenant | null, pageKey: string, rows: any[], action: string, summary: string, targetType: string, targetId: string | number | null) {
    const normalizedPageKey = normalizePageKey(pageKey);
    const snapshot = this.normalizeHomepageSnapshotRows(rows);
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(HomepageSection);
      const deleteBuilder = repo.createQueryBuilder().delete().where("pageKey = :pageKey", { pageKey: normalizedPageKey });
      if (targetTenant) deleteBuilder.andWhere("tenantId = :tenantId", { tenantId: targetTenant.id });
      else deleteBuilder.andWhere("tenantId IS NULL");
      await deleteBuilder.execute();
      if (!snapshot.length) return [];
      return repo.save(snapshot.map((row) => repo.create({ ...row, pageKey: normalizedPageKey, tenant: targetTenant })));
    });
    await this.logOperation(admin, action, targetType, targetId, summary, { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null, sectionCount: saved.length });
    return saved;
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
    this.assertTenantSubscriptionWritable(tenant, admin);
    if (!this.tenantPermissions(tenant).paymentAccountEditable) throw new ForbiddenException("平台超级管理员已关闭本商家的收款配置权限");
  }

  private async canEditTenantPaymentSettings(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return true;
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    this.assertTenantSubscriptionWritable(tenant, admin);
    return this.tenantPermissions(tenant).paymentAccountEditable;
  }

  private assertTenantSubscriptionWritable(tenant?: Tenant | null, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    const restriction = tenantSubscriptionWriteRestriction(this.tenantPermissions(tenant));
    if (restriction) throw new ForbiddenException(restriction.message);
  }

  private async resolveAnnouncementTenant(tenantId: number | null | undefined, fallback: Tenant | null | undefined, admin?: AdminContext) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
      return tenant;
    }
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

  private async resolveWalletTenantForPlatform(tenantId?: number | null) {
    const id = Number(tenantId || 0);
    if (!id) return null;
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant || !tenant.enabled) throw new NotFoundException("钱包所属商家不存在或已停用");
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
    const allowed = new Set(sourcePairs.map((pair) => `${pair.sourceType}:${pair.sourceId}`));
    const logs = await this.memberPointLogs.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 300 });
    return logs.filter((log) => allowed.has(`${log.sourceType}:${log.sourceId}`) || log.sourceType.startsWith("mall_")).slice(0, 100);
  }

  private assertOperationPaymentSettingPayload(dto: OperationSettingDto): asserts dto is OperationSettingDto & { offlinePaymentInstructions: string; refundInstructions: string } {
    if (!dto.offlinePaymentInstructions?.trim()) throw new BadRequestException("请填写线下付款说明");
    if (!dto.refundInstructions?.trim()) throw new BadRequestException("请填写退款说明");
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
      launchConfig: {},
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
    return { free: true, wechat: false, alipay: false, balance: true, offline: true };
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

  private async ensureAmbassadorSetting() {
    let setting = await this.ambassadorSettings.findOne({ where: {}, order: { id: "ASC" } });
    if (!setting) setting = await this.ambassadorSettings.save(this.ambassadorSettings.create({ enabled: true, config: this.defaultAmbassadorConfig() }));
    if (!this.isPlainObject(setting.config)) {
      setting.config = this.defaultAmbassadorConfig();
      setting = await this.ambassadorSettings.save(setting);
    }
    return setting;
  }

  private publicAmbassadorSetting(setting: AmbassadorLandingSetting) {
    return { ...setting, config: this.mergeAmbassadorConfig(setting.config, null) };
  }

  private mergeAmbassadorConfig(input?: Record<string, unknown> | null, current?: Record<string, unknown> | null) {
    const defaults = this.defaultAmbassadorConfig();
    const base = this.isPlainObject(current) ? current || {} : {};
    const next = this.isPlainObject(input) ? input || {} : {};
    const merged: Record<string, unknown> = { ...defaults, ...base, ...next };
    for (const key of ["painPoints", "solutionItems", "benefits", "requirements"]) merged[key] = this.normalizeStringArray(merged[key], defaults[key] as string[]);
    merged.faqs = this.normalizeFaqs(merged.faqs, defaults.faqs as Array<{ question: string; answer: string }>);
    merged.entryPages = this.normalizeEntryPages(merged.entryPages, defaults.entryPages as Record<string, Record<string, unknown>>);
    return merged;
  }

  private defaultAmbassadorConfig(): Record<string, unknown> {
    return {
      heroTitle: "寻找100位“慢π大使”",
      heroSubtitle: "一起用7把钥匙，打开中国人的精神家园",
      heroCopy: "不用辞职、不用囤货，只需把你的热爱变成课程，平台帮你搞定技术、流量和变现。",
      ctaText: "立即申请，锁定早鸟名额",
      originalPrice: "2999",
      earlyBirdPrice: "999",
      quotaText: "首期限额100人，审核制入驻",
      refundText: "入驻30天内，觉得不合适，可申请全额退款。",
      customerWechat: "",
      customerPhone: "",
      backgroundImageUrl: "",
      painPoints: ["在传统文化、书法、教育、健康、创业或技能领域钻研多年，却缺少被更多人看见的舞台。", "试过内容平台和社群运营，但流量不稳定、转化不系统。", "想把知识做成课程，却被技术、运营、交付和客服卡住。", "不想只做卖课的人，更想进入一个能共创、能成长、能长期沉淀品牌的圈子。"],
      solutionItems: ["独立小程序店铺 + 专属H5主页，一键开课，收益路径清晰。", "平台全域流量扶持，结合城市线下活动导流。", "每月闭门共创会，讲书/授课技能训练，关键阶段策略陪跑。", "链接传统文化、书法、教育、健康、创业、技能等领域的共创者。"],
      benefits: ["官方认证身份：颁发“慢π·特聘文化大使”证书，并获得平台个人品牌展示机会。", "课程收益支持：首批入驻享平台扶持政策，具体规则以审核沟通为准。", "高端私密社群：进入慢π共创圈，资源互换、经验复盘。", "全年赋能陪跑：闭门策略会、线下大课、课程打磨与运营指导。"],
      requirements: ["有真才实学：在传统文化、东方哲学、民俗文化、书法、教育、健康、创业、技能任一领域有扎实积累。", "有利他之心：愿意分享，愿意帮助他人成长。", "有长期主义：不是来赚快钱，而是想打造个人品牌、沉淀长期资产。"],
      faqs: [
        { question: "我没有录制课程经验，怎么办？", answer: "平台会协助你梳理课程大纲、设计表达结构，并陪跑第一门课程上线。" },
        { question: "入驻后多久能看到收益？", answer: "收益取决于课程质量、运营投入和受众匹配度，平台会提供流量、工具和运营建议。" },
        { question: "早鸟费用是一次性还是每年？", answer: "默认展示为首年早鸟价，具体续费和权益可在后台文案中调整。" }
      ],
      entryPages: {
        brandStory: {
          eyebrow: "慢π · 品牌故事",
          title: "把传统文化，做成可学习、可体验、可持续运营的现代学习空间。",
          copy: "慢π连接课程、活动、共修、公益与本地服务，让每一座城市都能拥有自己的学习空间。",
          primaryActionText: "申请成为院长",
          secondaryActionText: "了解帮扶计划",
          sectionTitle: "我们相信",
          items: ["文化要落到日常：不是只停留在口号里，而是变成一次晨读、一节课、一次共修和一段长期陪伴。", "空间要能运营：活动获客、课程交付、报名收款、退款审核、学员服务都应该有清晰后台承接。", "善意要可追踪：公益帮扶、学员成长和本地资源连接，都需要被记录、被服务、被持续改进。"],
          flowTitle: "一套完整的慢π闭环",
          flowItems: ["品牌认知", "活动体验", "课程学习", "共修打卡", "公益帮扶", "本地慢π"],
          joinTitle: "你可以如何参与"
        },
        deanRecruit: {
          eyebrow: "院长招募",
          title: "招募一批真正愿意把慢π服务落在本地的人。",
          copy: "院长不是普通代理，而是本地学习空间的负责人：组织活动、服务学员、链接老师和公益资源。",
          sectionTitle: "适合谁",
          items: ["有本地文化空间或稳定社群", "愿意长期做课程与活动交付", "能服务学员并维护当地口碑", "认同慢π品牌与公益理念"],
          formTitle: "提交院长申请",
          submitText: "提交院长申请",
          successMessage: "院长招募申请已进入后台，我们会尽快联系你。"
        },
        ambassadorApply: {
          eyebrow: "大使申请",
          title: "把你的热爱，变成能被更多人看见的文化服务。",
          copy: "适合讲师、主理人、内容创作者、社群组织者申请成为慢π大使。",
          sectionTitle: "你将参与",
          items: ["课程共创", "活动共办", "品牌露出", "学员服务", "公益参与", "长期成长"],
          formTitle: "提交大使申请",
          submitText: "提交大使申请",
          successMessage: "大使申请已进入后台，我们会尽快联系你。"
        },
        aidApply: {
          eyebrow: "帮扶申请",
          title: "让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。",
          copy: "个人可申请学习帮扶/公益名额，项目方可提交公益项目合作需求。",
          sectionTitle: "申请类型",
          items: ["个人学习帮扶", "公益项目合作", "课程/活动名额支持", "本地资源连接"],
          formTitle: "提交帮扶申请",
          submitText: "提交帮扶申请",
          successMessage: "帮扶申请已进入后台，我们会尽快联系你核实信息。"
        }
      }
    };
  }

  private normalizeStringArray(value: unknown, fallback: string[]) {
    if (!Array.isArray(value)) return fallback;
    const list = value.map((item) => String(item || "").trim()).filter(Boolean);
    return list.length ? list.slice(0, 20) : fallback;
  }

  private normalizeFaqs(value: unknown, fallback: Array<{ question: string; answer: string }>) {
    if (!Array.isArray(value)) return fallback;
    const list = value
      .map((item) => {
        const row = this.isPlainObject(item) ? (item as Record<string, unknown>) : {};
        return { question: String(row.question || "").trim(), answer: String(row.answer || "").trim() };
      })
      .filter((item) => item.question && item.answer);
    return list.length ? list.slice(0, 20) : fallback;
  }

  private normalizeEntryPages(value: unknown, fallback: Record<string, Record<string, unknown>>) {
    const source = this.isPlainObject(value) ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(fallback).map(([key, defaults]) => [key, this.normalizeEntryPage(source[key], defaults)]));
  }

  private normalizeEntryPage(value: unknown, fallback: Record<string, unknown>) {
    const source = this.isPlainObject(value) ? (value as Record<string, unknown>) : {};
    const merged: Record<string, unknown> = { ...fallback, ...source };
    if ("items" in fallback) merged.items = this.normalizeStringArray(merged.items, fallback.items as string[]);
    if ("flowItems" in fallback) merged.flowItems = this.normalizeStringArray(merged.flowItems, fallback.flowItems as string[]);
    return merged;
  }

  private normalizeJsonObject(value: unknown, label: string) {
    if (value === undefined || value === null) return {};
    if (!isPlainJsonObject(value)) throw new BadRequestException(`${label} must be a JSON object`);
    return value;
  }

  private adAdvertiserPayload(dto: AdAdvertiserDto) {
    const companyName = String(dto.companyName || "").trim();
    if (!companyName) throw new BadRequestException("请填写广告主公司名称");
    return {
      companyName,
      contactName: this.nullableText(dto.contactName),
      contactPhone: this.nullableText(dto.contactPhone),
      wechat: this.nullableText(dto.wechat),
      licenseUrl: this.nullableText(dto.licenseUrl),
      remark: this.nullableText(dto.remark),
      status: this.normalizeChoice(dto.status, ["active", "paused", "archived"], "active")
    };
  }

  private adContractPayload(dto: AdContractDto) {
    const contractNo = String(dto.contractNo || "").trim();
    const title = String(dto.title || "").trim();
    if (!contractNo) throw new BadRequestException("请填写广告合同编号");
    if (!title) throw new BadRequestException("请填写广告合同标题");
    const startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (startAt && endAt && startAt.getTime() > endAt.getTime()) throw new BadRequestException("合同结束时间不能早于开始时间");
    const billingModel = this.normalizeChoice(dto.billingModel, ["fixed", "cpm", "cpc", "mixed"], "fixed");
    const fixedFee = this.roundMoney(dto.fixedFee ?? (billingModel === "fixed" ? dto.amount || 0 : 0));
    return {
      contractNo,
      title,
      billingModel,
      amount: this.roundMoney(dto.amount || fixedFee).toFixed(2),
      fixedFee: fixedFee.toFixed(2),
      cpmPrice: this.roundMoney(dto.cpmPrice || 0, 4).toFixed(4),
      cpcPrice: this.roundMoney(dto.cpcPrice || 0, 4).toFixed(4),
      startAt,
      endAt,
      paymentStatus: this.normalizeChoice(dto.paymentStatus, ["unpaid", "partial", "paid", "refunded"], "unpaid"),
      attachmentUrl: this.nullableText(dto.attachmentUrl),
      remark: this.nullableText(dto.remark),
      status: this.normalizeChoice(dto.status, ["active", "paused", "archived"], "active")
    };
  }

  private adCampaignPayload(dto: AdCampaignDto) {
    const name = String(dto.name || "").trim();
    const title = String(dto.title || "").trim();
    if (!name) throw new BadRequestException("请填写广告计划名称");
    if (!title) throw new BadRequestException("请填写前台广告标题");
    const startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (startAt && endAt && startAt.getTime() > endAt.getTime()) throw new BadRequestException("广告结束时间不能早于开始时间");
    const source = this.normalizeChoice(dto.source, ["custom", "wechat_official"], "custom");
    const format = this.normalizeChoice(dto.format, ["splash", "inline_card", "banner", "official_banner", "official_video", "official_grid", "official_interstitial", "official_rewarded_video"], source === "wechat_official" ? "official_banner" : "banner");
    return {
      name,
      title,
      subtitle: this.nullableText(dto.subtitle),
      imageUrl: this.nullableText(dto.imageUrl),
      source,
      format,
      slotKey: this.normalizeChoice(dto.slotKey, ["app_splash", "home_top_banner", "home_feed_inline", "activity_detail_middle", "course_detail_middle", "mall_product_detail_middle", "community_feed_inline", "user_my_banner"], "home_top_banner"),
      pageKey: this.normalizeChoice(dto.pageKey, ["all", "home", "mall_home", "mall_product_detail", "activity_list", "activity_detail", "course_home", "course_detail", "community_home", "community_detail", "user_my"], "home"),
      platforms: this.normalizeMarketingPopupArray(dto.platforms, ["all", "h5", "mp-weixin"], source === "wechat_official" ? ["mp-weixin"] : ["all"]),
      link: this.nullableText(dto.link),
      billingModel: this.normalizeChoice(dto.billingModel, ["fixed", "cpm", "cpc", "mixed"], "fixed"),
      fixedFee: this.roundMoney(dto.fixedFee || 0).toFixed(2),
      cpmPrice: this.roundMoney(dto.cpmPrice || 0, 4).toFixed(4),
      cpcPrice: this.roundMoney(dto.cpcPrice || 0, 4).toFixed(4),
      totalBudget: this.roundMoney(dto.totalBudget || 0).toFixed(2),
      dailyBudget: this.roundMoney(dto.dailyBudget || 0).toFixed(2),
      impressionLimit: Math.max(0, Number(dto.impressionLimit || 0)),
      clickLimit: Math.max(0, Number(dto.clickLimit || 0)),
      officialAdUnitId: this.nullableText(dto.officialAdUnitId),
      officialAdType: this.nullableText(dto.officialAdType),
      frequency: this.normalizeChoice(dto.frequency, ["every_visit", "once_per_day", "once_per_campaign"], "once_per_day"),
      priority: Math.max(Math.min(Number(dto.priority ?? 0), 9999), -9999),
      enabled: dto.enabled ?? true,
      startAt,
      endAt
    };
  }

  private async resolveAdAdvertiser(id: number | null | undefined, tenant: Tenant | null, admin?: AdminContext) {
    if (!id) return null;
    const row = await this.adAdvertisers.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告主不存在");
    this.assertAdTenantMatches(row.tenant, tenant, "广告主不属于当前投放商家");
    return row;
  }

  private async resolveAdContract(id: number | null | undefined, tenant: Tenant | null, admin?: AdminContext) {
    if (!id) return null;
    const row = await this.adContracts.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告合同不存在");
    this.assertAdTenantMatches(row.tenant, tenant, "广告合同不属于当前投放商家");
    return row;
  }

  private assertAdTenantMatches(rowTenant: Tenant | null | undefined, targetTenant: Tenant | null | undefined, message: string) {
    const rowTenantId = rowTenant?.id || null;
    const targetTenantId = targetTenant?.id || null;
    if (rowTenantId !== targetTenantId) throw new BadRequestException(message);
  }

  private adStatsTotals(stats: AdDailyStat[]) {
    return stats.reduce(
      (sum, row) => ({
        impressions: sum.impressions + Number(row.impressionCount || 0),
        clicks: sum.clicks + Number(row.clickCount || 0),
        skips: sum.skips + Number(row.skipCount || 0),
        closes: sum.closes + Number(row.closeCount || 0),
        loads: sum.loads + Number(row.loadCount || 0),
        errors: sum.errors + Number(row.errorCount || 0),
        rewards: sum.rewards + Number(row.rewardCount || 0),
        amount: this.roundMoney(sum.amount + this.money(row.spentAmount))
      }),
      { impressions: 0, clicks: 0, skips: 0, closes: 0, loads: 0, errors: 0, rewards: 0, amount: 0 }
    );
  }

  private buildAdSettlementItems(contract: AdContract, campaigns: AdCampaign[], stats: AdDailyStat[]) {
    const items: Array<{ campaign: AdCampaign | null; description: string; billingModel: string; quantity: number; unitPrice: number; amount: number }> = [];
    const billingModel = contract.billingModel || "fixed";
    const fixedFee = this.money(contract.fixedFee) || this.money(contract.amount);
    if ((billingModel === "fixed" || billingModel === "mixed") && fixedFee > 0) {
      items.push({ campaign: null, description: `${contract.title} 固定费用`, billingModel: "fixed", quantity: 1, unitPrice: fixedFee, amount: fixedFee });
    }
    const statsByCampaign = new Map<number, AdDailyStat[]>();
    for (const row of stats) {
      const id = row.campaign?.id || 0;
      if (!id) continue;
      statsByCampaign.set(id, [...(statsByCampaign.get(id) || []), row]);
    }
    for (const campaign of campaigns) {
      const totals = this.adStatsTotals(statsByCampaign.get(campaign.id) || []);
      const cpmPrice = this.money(campaign.cpmPrice) || this.money(contract.cpmPrice);
      const cpcPrice = this.money(campaign.cpcPrice) || this.money(contract.cpcPrice);
      if ((billingModel === "cpm" || billingModel === "mixed") && cpmPrice > 0 && totals.impressions > 0) {
        const quantity = totals.impressions / 1000;
        items.push({ campaign, description: `${campaign.name} CPM 曝光计费`, billingModel: "cpm", quantity, unitPrice: cpmPrice, amount: this.roundMoney(quantity * cpmPrice) });
      }
      if ((billingModel === "cpc" || billingModel === "mixed") && cpcPrice > 0 && totals.clicks > 0) {
        items.push({ campaign, description: `${campaign.name} CPC 点击计费`, billingModel: "cpc", quantity: totals.clicks, unitPrice: cpcPrice, amount: this.roundMoney(totals.clicks * cpcPrice) });
      }
    }
    return items.length ? items : [{ campaign: null, description: `${contract.title} 暂无可结算消耗`, billingModel, quantity: 0, unitPrice: 0, amount: 0 }];
  }

  private normalizeDateText(value: string, label: string) {
    const text = String(value || "").trim();
    const date = new Date(text);
    if (!text || Number.isNaN(date.getTime())) throw new BadRequestException(`${label}格式不正确`);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private normalizeChoice(value: unknown, allowed: string[], fallback: string) {
    const text = String(value || "").trim();
    return allowed.includes(text) ? text : fallback;
  }

  private money(value: unknown) {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
  }

  private roundMoney(value: unknown, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(this.money(value) * factor) / factor;
  }

  private marketingPopupPayload(dto: MarketingPopupDto) {
    const title = String(dto.title || "").trim();
    if (!title) throw new BadRequestException("请填写弹窗标题");
    const startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (startAt && endAt && startAt.getTime() >= endAt.getTime()) throw new BadRequestException("弹窗开始时间必须早于结束时间");
    return {
      title,
      subtitle: this.nullableText(dto.subtitle),
      content: this.nullableText(dto.content),
      emphasis: this.nullableText(dto.emphasis),
      imageUrl: this.nullableText(dto.imageUrl),
      type: this.normalizeMarketingPopupChoice(dto.type, ["notice", "ad", "payment", "wuxing_gold"], "notice"),
      platforms: this.normalizeMarketingPopupArray(dto.platforms, ["all", "h5", "mp-weixin"], ["all"]),
      placements: this.normalizeMarketingPopupArray(dto.placements, ["all", "home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "community_home", "user_my"], ["home"]),
      buttons: this.normalizeMarketingPopupButtons(dto.buttons),
      frequency: this.normalizeMarketingPopupChoice(dto.frequency, ["every_visit", "once_per_day", "once_per_campaign"], "once_per_day"),
      priority: Math.max(Math.min(Number(dto.priority ?? 0), 9999), -9999),
      enabled: dto.enabled ?? true,
      dismissible: dto.dismissible ?? true,
      startAt,
      endAt
    };
  }

  private normalizeMarketingPopupArray(value: unknown, allowed: string[], fallback: string[]) {
    const source = Array.isArray(value) ? value : fallback;
    const list = source.map((item) => String(item || "").trim()).filter((item) => allowed.includes(item));
    return Array.from(new Set(list.length ? list : fallback));
  }

  private normalizeMarketingPopupChoice(value: unknown, allowed: string[], fallback: string) {
    const text = String(value || "").trim();
    return allowed.includes(text) ? text : fallback;
  }

  private normalizeMarketingPopupButtons(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        const row = this.isPlainObject(item) ? item as Record<string, unknown> : {};
        const text = String(row.text || "").trim();
        if (!text) return null;
        const style = String(row.style || "") === "secondary" ? "secondary" : "primary";
        return { text: text.slice(0, 24), link: this.nullableText(String(row.link || "")) || "", style };
      })
      .filter(Boolean)
      .slice(0, 2) as Array<{ text: string; link: string; style: "primary" | "secondary" }>;
  }

  private marketingPopupArrayMatches(value: unknown, target?: string) {
    if (!target?.trim()) return true;
    const list = Array.isArray(value) ? value.map((item) => String(item)) : [];
    return list.includes("all") || list.includes(target.trim());
  }

  private nullableText(value?: string | null) {
    const text = String(value ?? "").trim();
    return text || null;
  }

  private relationId<T extends { id?: number }>(value?: T | null) {
    return value?.id ? { id: value.id } : null;
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
      this.registrations
        .createQueryBuilder("registration")
        .select("registration.createdAt", "createdAt")
        .where("registration.userId = :userId", { userId: user.id })
        .orderBy("registration.createdAt", "DESC")
        .getRawOne<{ createdAt: Date }>()
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
    if (!dto.title?.trim()) throw new BadRequestException("请填写活动标题");
    if (!dto.location?.trim()) throw new BadRequestException("请填写活动地点");
    if (!dto.description?.trim()) throw new BadRequestException("请填写活动介绍");
    const hasLat = dto.locationLatitude !== undefined && dto.locationLatitude !== null;
    const hasLng = dto.locationLongitude !== undefined && dto.locationLongitude !== null;
    if (hasLat !== hasLng) throw new BadRequestException("请同时填写地图纬度和经度");
    if (hasLat && (Number(dto.locationLatitude) < -90 || Number(dto.locationLatitude) > 90)) throw new BadRequestException("Map latitude must be between -90 and 90");
    if (hasLng && (Number(dto.locationLongitude) < -180 || Number(dto.locationLongitude) > 180)) throw new BadRequestException("Map longitude must be between -180 and 180");
    const start = this.parseDate(dto.startTime);
    const end = this.parseDate(dto.endTime);
    const deadline = this.parseDate(dto.registrationDeadline);
    if (end <= start) throw new BadRequestException("结束时间必须晚于开始时间");
    if (deadline >= start) throw new BadRequestException("报名截止时间必须早于活动开始时间");
    if (dto.priorityMemberLevelId && !dto.priorityRegistrationEndsAt) throw new BadRequestException("请设置优先报名截止时间");
    if (!dto.priorityMemberLevelId && dto.priorityRegistrationEndsAt) throw new BadRequestException("请先选择优先报名会员等级");
    if (dto.priorityRegistrationEndsAt) {
      const priorityEndsAt = this.parseDate(dto.priorityRegistrationEndsAt);
      if (priorityEndsAt >= deadline) throw new BadRequestException("优先报名截止时间必须早于报名截止时间");
    }
    if (!dto.fields.length) throw new BadRequestException("至少需要配置一个报名字段");
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

  private cleanText(value: unknown, maxLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    return text.slice(0, maxLength);
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

  private applyCreatedAtRange(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, start: Date, end: Date) {
    builder.andWhere(`${alias}.createdAt >= :${alias}RangeStart`, { [`${alias}RangeStart`]: start });
    builder.andWhere(`${alias}.createdAt < :${alias}RangeEnd`, { [`${alias}RangeEnd`]: end });
  }

  private applyFinanceTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, query: Pick<OrderQueryDto, "tenantId">, admin?: AdminContext, recordAlias = "order") {
    if (this.isTenantScoped(admin) || !query.tenantId) return;
    builder.andWhere(`(${recordAlias}.tenantId = :financeTenantId OR order.tenantId = :financeTenantId OR registration.tenantId = :financeTenantId OR activity.tenantId = :financeTenantId)`, { financeTenantId: query.tenantId });
  }

  private businessDayRange(now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  private countOrdersForAgent(query: OrderQueryDto, status?: OrderStatus, admin?: AdminContext) {
    const builder = this.orders.createQueryBuilder("order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("order.status = :status", { status });
    this.applyTenantScope(builder, "order", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "order");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countOrdersForAgentInRange(query: OrderQueryDto, status: OrderStatus | undefined, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.orders.createQueryBuilder("order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("order.status = :status", { status });
    this.applyCreatedAtRange(builder, "order", start, end);
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

  private countTransactionsForAgentInRange(query: OrderQueryDto, status: string, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("transaction.status = :status", { status });
    this.applyCreatedAtRange(builder, "transaction", start, end);
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

  private countRefundsForAgentInRange(query: OrderQueryDto, status: string | undefined, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("refund.status = :status", { status });
    this.applyCreatedAtRange(builder, "refund", start, end);
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

  private transactionSumForAgentInRange(query: OrderQueryDto, status: string, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status });
    this.applyCreatedAtRange(builder, "transaction", start, end);
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

  private refundSumForAgentInRange(query: OrderQueryDto, status: string, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status });
    this.applyCreatedAtRange(builder, "refund", start, end);
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
