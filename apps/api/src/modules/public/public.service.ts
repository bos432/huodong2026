import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import { DataSource } from "typeorm";
import { In, MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { ActivityCategory } from "../../entities/activity-category.entity";
import { Activity } from "../../entities/activity.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Announcement } from "../../entities/announcement.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { Coupon } from "../../entities/coupon.entity";
import { ConversionEvent, ConversionEventType } from "../../entities/conversion-event.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Refund } from "../../entities/refund.entity";
import { Registration } from "../../entities/registration.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { User } from "../../entities/user.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { Waitlist, WaitlistStatus } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { ActivityStatus, OrderStatus, PaymentMethod, RegistrationAnswer, RegistrationStatus } from "../../shared/domain";
import { assertTenantOwnedResourceAccess, normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";
import { defaultHomepageSections, normalizePageKey } from "../homepage-defaults";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { RefundCompletionService } from "../refund-completion.service";
import { CharityFundService } from "../charity-fund.service";
import { H5CodeDto, H5LoginDto, H5PasswordLoginDto, MockPayDto, MockPaymentCallbackDto, ProviderPayDto, ProviderPaymentCallbackDto, QuoteDto, RegisterDto, WechatLoginDto } from "./dto";
import { PaymentProviderService, RealPaymentCallbackContext, SupportedPaymentProvider } from "./payment-provider.service";

export type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };
type PublicTrackingContext = { channelCode?: string | null; source?: string | null; inviteCode?: string | null; clientIp?: string | null; userAgent?: string | null };

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AdminUser) private readonly adminUsers: Repository<AdminUser>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(ActivityCategory) private readonly categories: Repository<ActivityCategory>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityViewLog) private readonly activityViewLogs: Repository<ActivityViewLog>,
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(HomepageSection) private readonly homepageSections: Repository<HomepageSection>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(PaymentCallbackLog) private readonly paymentCallbackLogs: Repository<PaymentCallbackLog>,
    @InjectRepository(PaymentTransaction) private readonly paymentTransactions: Repository<PaymentTransaction>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(TicketType) private readonly ticketTypes: Repository<TicketType>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(Waitlist) private readonly waitlists: Repository<Waitlist>,
    @InjectRepository(H5AuthCodeLog) private readonly h5AuthCodeLogs: Repository<H5AuthCodeLog>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    @InjectRepository(ActivityChannel) private readonly activityChannels: Repository<ActivityChannel>,
    @InjectRepository(ConversionEvent) private readonly conversionEvents: Repository<ConversionEvent>,
    private readonly notificationProvider: NotificationProviderService,
    private readonly paymentProvider: PaymentProviderService,
    private readonly refundCompletion: RefundCompletionService,
    private readonly charityFund: CharityFundService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService
  ) {}

  async h5Code(dto: H5CodeDto, clientIp?: string | null) {
    const phone = this.normalizePhone(dto.phone);
    const mode = this.h5AuthMode();
    await this.assertH5CodeRateLimit(phone, clientIp || null, mode);
    const code = mode === "dev" ? this.config.get("H5_DEV_VERIFICATION_CODE", "123456") : this.generateVerificationCode();
    const expireMinutes = Math.max(Number(this.config.get("H5_CODE_EXPIRE_MINUTES", 10)), 1);
    const expiresAt = Date.now() + expireMinutes * 60 * 1000;
    try {
      const delivery = mode === "dev" ? null : await this.sendH5VerificationSms(phone, code, expireMinutes);
      await this.recordH5CodeLog({ phone, clientIp, mode, status: "sent", provider: delivery?.provider, providerMessageId: delivery?.providerMessageId, expiresAt: new Date(expiresAt), message: mode === "dev" ? "dev code issued" : "sms code sent" });
      return {
        phone,
        verificationToken: this.signH5Verification(phone, code, expiresAt),
        expiresAt: new Date(expiresAt).toISOString(),
        provider: delivery?.provider,
        providerMessageId: delivery?.providerMessageId,
        devCode: mode === "dev" ? code : undefined
      };
    } catch (error: any) {
      await this.recordH5CodeLog({ phone, clientIp, mode, status: "failed", message: error.message || "验证码发送失败", expiresAt: null });
      throw error;
    }
  }

  private async resolveTenantContext(context?: PublicTenantContext | null) {
    if (!context?.tenantId && !context?.tenantCode && !context?.host) return null;
    if (context.tenantId) {
      const tenant = await this.tenants.findOne({ where: { id: context.tenantId, enabled: true } });
      if (!tenant) throw new NotFoundException("机构不存在或已停用");
      return tenant;
    }
    const code = normalizeTenantCode(context.tenantCode);
    if (code) {
      const tenant = await this.tenants.findOne({ where: { code, enabled: true } });
      if (!tenant) throw new NotFoundException("机构不存在或已停用");
      return tenant;
    }
    const host = normalizeTenantHost(context.host);
    if (!host) return null;
    const tenant = await this.tenants
      .createQueryBuilder("tenant")
      .where("tenant.enabled = :enabled", { enabled: true })
      .andWhere("JSON_EXTRACT(tenant.settings, '$.domain') = :host OR JSON_EXTRACT(tenant.settings, '$.h5Domain') = :host", { host })
      .getOne();
    return tenant || null;
  }

  private async assertPublicTenantAccess(activity: Activity, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    if (activity.tenant && !activity.tenant.enabled) throw new NotFoundException("Activity not found or not open");
    assertTenantOwnedResourceAccess(activity, tenant, "Activity not found or not open");
    return tenant;
  }

  async h5Login(dto: H5LoginDto) {
    const phone = this.normalizePhone(dto.phone);
    this.verifyH5Token(phone, dto.verificationCode, dto.verificationToken);
    let user = await this.users.findOne({ where: { phone } });
    if (!user) user = this.users.create({ phone, nickname: dto.nickname || `本地用户${phone.slice(-4)}` });
    user.nickname = dto.nickname || user.nickname;
    const saved = await this.users.save(user);
    return this.userLoginResponse(saved);
  }

  async h5PasswordLogin(dto: H5PasswordLoginDto) {
    const phone = this.normalizePhone(dto.phone);
    const password = String(dto.password || "");
    if (password.length < 6 || password.length > 64) throw new BadRequestException("密码长度需为 6-64 位");
    let user = await this.users.findOne({ where: { phone } });
    if (!user) {
      user = this.users.create({
        phone,
        nickname: dto.nickname || `本地用户${phone.slice(-4)}`,
        passwordHash: await bcrypt.hash(password, 10)
      });
      return this.userLoginResponse(await this.users.save(user));
    }
    if (!user.passwordHash) throw new BadRequestException("该手机号尚未设置密码，请联系管理员设置初始密码或使用验证码登录");
    if (!(await bcrypt.compare(password, user.passwordHash))) throw new BadRequestException("手机号或密码错误");
    if (dto.nickname && !user.nickname) {
      user.nickname = dto.nickname;
      user = await this.users.save(user);
    }
    return this.userLoginResponse(user);
  }

  async myAdminAccess(user: User) {
    if (!user.phone) return { canAccess: false };
    const phone = this.normalizePhone(user.phone);
    const admin = await this.adminUsers.findOne({ where: { username: phone, enabled: true } });
    if (!admin) return { canAccess: false };
    return {
      canAccess: true,
      role: admin.role === "admin" ? "super_admin" : admin.role,
      tenantId: admin.tenant?.id ?? null,
      tenantName: admin.tenant?.name || null
    };
  }

  async wechatLogin(dto: WechatLoginDto) {
    const openid = await this.resolveWechatOpenid(dto.code);
    let user = await this.users.findOne({ where: { openid } });
    if (!user) user = this.users.create({ openid });
    user.nickname = dto.nickname || user.nickname;
    user.avatarUrl = dto.avatarUrl || user.avatarUrl;
    const saved = await this.users.save(user);
    return this.userLoginResponse(saved);
  }

  async categoriesList(context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const builder = this.categories
      .createQueryBuilder("category")
      .leftJoin("category.tenant", "tenant")
      .where("category.enabled = :enabled", { enabled: true })
      .andWhere("(category.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.id", "ASC");
    if (tenant) builder.andWhere("category.tenantId = :tenantId", { tenantId: tenant.id });
    return builder.getMany();
  }

  async publicTenants() {
    const tenants = await this.tenants
      .createQueryBuilder("tenant")
      .where("tenant.enabled = :enabled", { enabled: true })
      .andWhere("tenant.code <> :platformCode", { platformCode: "platform" })
      .andWhere("tenant.code NOT LIKE :demoCode", { demoCode: "demo-%" })
      .andWhere("(tenant.region IS NOT NULL OR tenant.contactName IS NOT NULL OR tenant.contactPhone IS NOT NULL)")
      .orderBy("tenant.region", "ASC")
      .addOrderBy("tenant.id", "ASC")
      .getMany();
    return tenants.map((tenant) => this.publicHomepageTenant(tenant));
  }

  async operationSetting(context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    return this.publicOperationSetting(await this.ensureOperationSetting(tenant));
  }

  charitySummary() {
    return this.charityFund.publicSummary();
  }

  charityProjects() {
    return this.charityFund.publicProjects();
  }

  myCharity(user: User) {
    return this.charityFund.userContribution(user);
  }

  async activitiesList(options: { categoryId?: number; status?: string; featured?: boolean; page?: number; pageSize?: number; keyword?: string }, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const usePagination = options.page !== undefined || options.pageSize !== undefined;
    const page = Math.max(Number(options.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(options.pageSize || 10), 1), 50);
    const keyword = options.keyword?.trim();

    const builder = this.activities
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.category", "category")
      .leftJoinAndSelect("activity.fields", "fields")
      .leftJoin("activity.tenant", "tenant")
      .where("activity.status = :status", { status: ActivityStatus.Open })
      .andWhere("(activity.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .orderBy("activity.featured", "DESC")
      .addOrderBy("activity.startTime", "ASC")
      .addOrderBy("activity.id", "DESC");

    if (tenant) builder.andWhere("activity.tenantId = :tenantId", { tenantId: tenant.id });
    if (options.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: options.categoryId });
    if (options.featured !== undefined) builder.andWhere("activity.featured = :featured", { featured: options.featured });
    if (keyword) {
      builder.andWhere("(activity.title LIKE :keyword OR activity.description LIKE :keyword OR activity.location LIKE :keyword OR category.name LIKE :keyword)", { keyword: `%${keyword}%` });
    }

    const list = await builder.getMany();
    const mapped = await Promise.all(list.map((activity) => this.withPublicStats(activity)));
    const filtered = options.status ? mapped.filter((item) => item.displayStatus === options.status) : mapped;
    if (!usePagination) return filtered;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, total, page, pageSize, hasMore: start + items.length < total };
  }

  async homepage(context?: PublicTenantContext, pageKey?: string) {
    const tenant = await this.resolveTenantContext(context);
    const normalizedPageKey = normalizePageKey(pageKey);
    const sectionsBuilder = this.homepageSections
      .createQueryBuilder("section")
      .leftJoin("section.tenant", "tenant")
      .where("section.enabled = :enabled", { enabled: true })
      .andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey })
      .andWhere("(section.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .orderBy("section.sortOrder", "ASC")
      .addOrderBy("section.id", "ASC");
    if (tenant) sectionsBuilder.andWhere("section.tenantId = :tenantId", { tenantId: tenant.id });
    else sectionsBuilder.andWhere("section.tenantId IS NULL");
    const sections = await sectionsBuilder.getMany();
    let source = sections;
    if (!source.length && tenant) {
      source = await this.homepageSections
        .createQueryBuilder("section")
        .where("section.enabled = :enabled", { enabled: true })
        .andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey })
        .andWhere("section.tenantId IS NULL")
        .orderBy("section.sortOrder", "ASC")
        .addOrderBy("section.id", "ASC")
        .getMany();
    }
    if (!source.length) source = defaultHomepageSections(normalizedPageKey).filter((item) => item.enabled).map((item, index) => this.homepageSections.create({ ...item, id: -(index + 1), pageKey: normalizedPageKey }));
    const [announcements, categories, latest, featured] = await Promise.all([
      this.homepageAnnouncements(10, true, tenant),
      this.categoriesList(tenant ? { tenantId: tenant.id } : context),
      this.activitiesList({ pageSize: 20 }, tenant ? { tenantId: tenant.id } : context),
      this.activitiesList({ featured: true, pageSize: 12 }, tenant ? { tenantId: tenant.id } : context)
    ]);
    const latestItems = Array.isArray(latest) ? latest : latest.items;
    const featuredItems = Array.isArray(featured) ? featured : featured.items;
    return {
      sections: source.map((section) => this.homepageSectionView(section, { announcements, categories, latest: latestItems, featured: featuredItems })),
      fallback: !sections.length,
      pageKey: normalizedPageKey,
      tenant: this.publicHomepageTenant(tenant)
    };
  }

  private async homepageAnnouncements(limit: number, pinnedFirst: boolean, tenant?: Tenant | null) {
    const builder = this.announcements
      .createQueryBuilder("announcement")
      .leftJoin("announcement.tenant", "tenant")
      .where("announcement.enabled = :enabled", { enabled: true })
      .andWhere("(announcement.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true });
    if (tenant) builder.andWhere("announcement.tenantId = :tenantId", { tenantId: tenant.id });
    if (pinnedFirst) builder.orderBy("announcement.pinned", "DESC").addOrderBy("announcement.publishAt", "DESC").addOrderBy("announcement.createdAt", "DESC");
    else builder.orderBy("announcement.publishAt", "DESC").addOrderBy("announcement.createdAt", "DESC");
    return builder.take(Math.min(Math.max(limit, 1), 20)).getMany();
  }

  private homepageSectionView(section: HomepageSection, payload: { announcements: unknown[]; categories: unknown[]; latest: any[]; featured: any[] }) {
    const config = section.config || {};
    const data: Record<string, unknown> = {};
    if (section.type === "announcement_bar") {
      data.announcements = payload.announcements.slice(0, this.configLimit(config, 5, 20));
    } else if (section.type === "category_grid" || section.type === "activity_tabs") {
      data.categories = payload.categories.slice(0, this.configLimit(config, 8, 30));
    } else if (section.type === "featured_activities") {
      const source = config.source === "latest" ? payload.latest : payload.featured.length ? payload.featured : payload.latest;
      data.activities = source.slice(0, this.configLimit(config, 6, 20));
    } else if (section.type === "activity_feed") {
      data.activities = payload.latest.slice(0, this.configLimit(config, 10, 30));
    }
    return {
      id: section.id,
      pageKey: section.pageKey || "home",
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      config,
      layout: section.layout || {},
      data
    };
  }

  private publicHomepageTenant(tenant?: Tenant | null) {
    if (!tenant) return null;
    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      region: tenant.region || null,
      contactName: tenant.contactName || null,
      contactPhone: tenant.contactPhone || null
    };
  }

  private configLimit(config: Record<string, unknown>, fallback: number, max: number) {
    const value = Number(config.limit || fallback);
    return Math.min(Math.max(Number.isFinite(value) ? value : fallback, 1), max);
  }

  async activityDetail(id: number, userId?: number, context?: PublicTenantContext, tracking?: PublicTrackingContext) {
    const activity = await this.activities.findOne({ where: { id, status: ActivityStatus.Open }, relations: ["fields"] });
    if (!activity) throw new NotFoundException("活动不存在或未开放");
    await this.assertPublicTenantAccess(activity, context);
    const user = userId ? await this.users.findOneBy({ id: userId }) : null;
    await this.recordActivityView(activity, user || null, tracking);
    activity.fields = activity.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const [ticketTypes, memberAccess] = await Promise.all([
      this.ticketTypes.find({ where: { activity: { id }, enabled: true }, order: { price: "ASC", id: "ASC" } }),
      this.memberAccessSnapshot(activity, userId)
    ]);
    return { ...(await this.withPublicStats(activity)), ticketTypes, memberAccess };
  }

  async quote(activityId: number, dto: QuoteDto, user: User, context?: PublicTenantContext) {
    const activity = await this.activities.findOne({ where: { id: activityId, status: ActivityStatus.Open } });
    if (!activity) throw new NotFoundException("活动不存在或未开放");
    await this.assertPublicTenantAccess(activity, context);
    return this.calculateQuote(activity, { ...dto, userId: user.id });
  }

  async register(activityId: number, dto: RegisterDto, user: User, context?: PublicTenantContext) {
    const activity = await this.activities.findOne({ where: { id: activityId }, relations: ["fields"] });
    if (!activity || activity.status !== ActivityStatus.Open) throw new BadRequestException("活动暂不可报名");
    await this.assertPublicTenantAccess(activity, context);
    await this.assertRegistrationEnabled();
    if (new Date(activity.registrationDeadline).getTime() < Date.now()) throw new BadRequestException("报名已截止");
    await this.ensureActivityMemberAccess(activity, user);

    const activeStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const existing = await this.registrations.findOne({ where: { activity: { id: activityId }, user: { id: user.id }, status: In(activeStatuses) } });
    if (existing) throw new BadRequestException("你已报名该活动");
    const existingWaitlist = await this.waitlists.findOne({ where: { activity: { id: activityId }, user: { id: user.id }, status: WaitlistStatus.Waiting } });
    if (existingWaitlist) throw new BadRequestException("你已在该活动候补名单中");

    this.validateAnswers(activity.fields, dto.answers);
    const stats = await this.withPublicStats(activity);
    if (stats.remainingSeats <= 0) {
      const waitlist = await this.waitlists.save(this.waitlists.create({ activity, user, answers: dto.answers, status: WaitlistStatus.Waiting, remark: "活动满员自动候补" }));
      return { waitlist, registration: null, order: null, waitlisted: true };
    }

    const quote = await this.calculateQuote(activity, { ...dto, userId: user.id });
    const price = Number(quote.payableAmount);
    const paymentMethod = price > 0 ? dto.paymentMethod || PaymentMethod.Wechat : PaymentMethod.Free;
    if (price > 0 && paymentMethod === PaymentMethod.Balance) await this.assertSufficientBalance(user, activity.tenant, price);
    const status = price > 0 ? RegistrationStatus.PendingPayment : activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    const channel = await this.resolveActivityChannel(activity, dto.channelCode, dto.source);
    const registration = await this.registrations.save(this.registrations.create({ activity, tenant: activity.tenant, user, channel, status, answers: dto.answers, checkInCode: uuidv4() }));
    const order = await this.orders.save(this.orders.create({ orderNo: `OD${Date.now()}${registration.id}`, registration, tenant: activity.tenant, agent: activity.agent, amount: quote.payableAmount, originalAmount: quote.originalAmount, discountAmount: quote.discountAmount, memberDiscountAmount: quote.memberDiscountAmount, pointsUsed: quote.pointsUsed, pointsDiscountAmount: quote.pointsDiscountAmount, paymentMethod, status: price > 0 ? OrderStatus.PendingPayment : OrderStatus.Paid, paidAt: price > 0 ? null : new Date(), expiresAt: this.paymentExpiresAt(price), ticketType: quote.ticketType, coupon: quote.coupon, memberLevel: quote.memberLevel }));
    await this.recordConversionEvent("register", { activity, user, registration, order, channel, amount: quote.payableAmount, source: dto.source, idempotencyKey: `register:${registration.id}` });
    if (quote.coupon) await this.coupons.increment({ id: quote.coupon.id }, "usedCount", 1);
    if (quote.pointsUsed > 0) await this.awardPoints(user, -quote.pointsUsed, "points_redeem", order.id, "报名积分抵扣");
    if (price > 0 && paymentMethod === PaymentMethod.Balance) {
      try {
        const balanceResult = await this.payWithBalance(order.id, user, context);
        return { registration: balanceResult.order.registration, order: balanceResult.order, walletTransaction: (balanceResult as any).walletTransaction, waitlisted: false };
      } catch (error) {
        await this.rollbackPendingRegistration(order, quote.coupon, quote.pointsUsed, "余额支付失败，报名已取消");
        throw error;
      }
    }
    return { registration, order, waitlisted: false };
  }

  async mockPay(orderId: number, dto: MockPayDto, user: User, context?: PublicTenantContext) {
    this.paymentProvider.assertSandboxAllowed("mock 支付");
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.assertOrderTenantAccess(order, context);
    this.assertOrderUserAccess(order, user);
    return this.applySuccessfulPayment(order, dto.transactionNo || `MOCK${Date.now()}${order.id}`, "mock", "本地 mock 支付");
  }

  async mockPaymentCallback(dto: MockPaymentCallbackDto) {
    this.paymentProvider.assertSandboxAllowed("mock 支付回调");
    const order = await this.orders.findOne({ where: { orderNo: dto.orderNo } });
    const callbackLog = await this.createPaymentCallbackLog(dto.provider || "mock-callback", dto, order, null);
    if (!order) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", "订单不存在", null);
      throw new NotFoundException("订单不存在");
    }
    if (Math.abs(Number(order.amount) - Number(dto.amount)) > 0.001) {
      await this.recordPaymentDiscrepancy(order, dto.transactionNo, dto.provider || "mock-callback", dto.amount, "amount_mismatch", "回调金额与订单金额不一致");
      await this.finishPaymentCallbackLog(callbackLog, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致，已记录对账差异");
    }
    try {
      const result = await this.applySuccessfulPayment(order, dto.transactionNo, dto.provider || "mock-callback", "mock 支付回调");
      await this.finishPaymentCallbackLog(callbackLog, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "支付回调处理成功", result.order);
      return result;
    } catch (error: any) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", error.message || "支付回调处理失败", order);
      throw error;
    }
  }

  async createProviderPayment(orderId: number, provider: SupportedPaymentProvider, dto: ProviderPayDto, user: User, context?: PublicTenantContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.assertOrderTenantAccess(order, context);
    this.assertOrderUserAccess(order, user);
    if (provider === "alipay") throw new BadRequestException("支付宝本次上线未开放");
    if (order.status !== OrderStatus.PendingPayment && order.status !== OrderStatus.Paid) throw new BadRequestException("当前订单不能发起支付");
    if (order.registration.status === RegistrationStatus.Cancelled) throw new BadRequestException("已取消报名不能支付");
    if (this.isExpiredPendingOrder(order)) {
      await this.closeExpiredOrder(order, "订单超时未付款，系统已关闭");
      throw new BadRequestException("订单已超时关闭，名额已释放，请重新报名");
    }
    const paymentDto = provider === "wechat" && dto.paymentScene === "jsapi" && !dto.openId && user.openid ? { ...dto, openId: user.openid } : dto;
    return this.paymentProvider.createPayment(provider, order, paymentDto);
  }

  async payWithBalance(orderId: number, user: User, context?: PublicTenantContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.assertOrderTenantAccess(order, context);
    this.assertOrderUserAccess(order, user);
    if (order.status === OrderStatus.Paid) {
      const existing = await this.walletTransactions.findOne({ where: { idempotencyKey: `balance_pay:${order.id}` } });
      return { order, walletTransaction: existing, idempotent: true };
    }
    if (order.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能使用余额支付");
    if (this.isExpiredPendingOrder(order)) {
      await this.closeExpiredOrder(order, "订单超时未付款，系统已关闭");
      throw new BadRequestException("订单已超时关闭，名额已释放，请重新报名");
    }

    const amount = Number(order.amount);
    if (amount <= 0) return this.applySuccessfulPayment(order, `FREE${Date.now()}${order.id}`, "balance", "零元订单确认", PaymentMethod.Free);
    const tenant = order.tenant || null;
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(UserWallet);
      const walletTxRepo = manager.getRepository(WalletTransaction);
      const orderRepo = manager.getRepository(Order);
      const registrationRepo = manager.getRepository(Registration);
      const paymentTxRepo = manager.getRepository(PaymentTransaction);
      const lockedOrder = await orderRepo.findOne({ where: { id: order.id }, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder) throw new NotFoundException("订单不存在");
      if (lockedOrder.status === OrderStatus.Paid) {
        return { order: lockedOrder, walletTransaction: await walletTxRepo.findOne({ where: { idempotencyKey: `balance_pay:${lockedOrder.id}` } }), idempotent: true };
      }
      if (lockedOrder.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能使用余额支付");
      let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant, tenantScopeKey }));
      const before = Number(wallet.availableBalance);
      if (before + 0.0001 < amount) throw new BadRequestException("余额不足，请选择微信支付或联系后台充值");
      const after = before - amount;
      wallet.availableBalance = after.toFixed(2);
      wallet.totalSpent = (Number(wallet.totalSpent) + amount).toFixed(2);
      await walletRepo.save(wallet);
      const walletTransaction = await walletTxRepo.save(walletTxRepo.create({
        wallet,
        user,
        tenant,
        order: lockedOrder,
        transactionNo: `BAL${Date.now()}${lockedOrder.id}`,
        direction: "debit",
        type: "balance_pay",
        amount: amount.toFixed(2),
        balanceBefore: before.toFixed(2),
        balanceAfter: after.toFixed(2),
        operator: "user",
        remark: "用户余额支付活动订单",
        idempotencyKey: `balance_pay:${lockedOrder.id}`
      }));
      lockedOrder.status = OrderStatus.Paid;
      lockedOrder.paymentMethod = PaymentMethod.Balance;
      lockedOrder.paidAt = new Date();
      lockedOrder.transactionNo = walletTransaction.transactionNo;
      const savedOrder = await orderRepo.save(lockedOrder);
      await paymentTxRepo.save(paymentTxRepo.create({
        order: savedOrder,
        tenant,
        transactionNo: walletTransaction.transactionNo,
        provider: "balance",
        paymentMethod: PaymentMethod.Balance,
        amount: savedOrder.amount,
        status: "success",
        reconciliationStatus: "matched",
        remark: "余额支付"
      }));
      if (savedOrder.registration.status === RegistrationStatus.PendingPayment) {
        savedOrder.registration.status = savedOrder.registration.activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
        await registrationRepo.save(savedOrder.registration);
      }
      return { order: savedOrder, walletTransaction, idempotent: false };
    });
    if (!result.idempotent && Number(result.order.amount) > 0) await this.awardPoints(user, Math.floor(Number(result.order.amount)), "order_paid", result.order.id, "活动消费积分");
    if (!result.idempotent) await this.charityFund.recordOrderAccrual(result.order, "balance");
    return result;
  }

  async providerPaymentCallback(provider: SupportedPaymentProvider, dto: ProviderPaymentCallbackDto | Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    const realProvider = this.paymentProvider.usesRealProvider(provider);
    const context = { body: dto as Record<string, unknown>, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const extractedOrderNo = realProvider ? this.paymentProvider.extractRealCallbackOrderNo(provider, context) : null;
    const preloadedOrder = extractedOrderNo ? await this.orders.findOne({ where: { orderNo: extractedOrderNo } }) : null;
    if (realProvider && !preloadedOrder) {
      const callbackLog = await this.createPaymentCallbackLog(provider, { ...(dto as Record<string, unknown>), orderNo: extractedOrderNo }, null, null);
      await this.finishPaymentCallbackLog(callbackLog, "failed", "订单不存在", null);
      throw new NotFoundException("订单不存在");
    }
    const callback = realProvider ? await this.paymentProvider.parseRealPaymentCallbackForOrder(provider, preloadedOrder!, context) : this.paymentProvider.parsePaymentCallback(provider, dto as ProviderPaymentCallbackDto);
    if (realProvider && extractedOrderNo && callback.orderNo !== extractedOrderNo) {
      const callbackLog = await this.createPaymentCallbackLog(provider, { ...(dto as Record<string, unknown>), ...(callback.raw || {}), orderNo: callback.orderNo, extractedOrderNo, transactionNo: callback.transactionNo, amount: callback.amount }, preloadedOrder, callback.signatureValid);
      await this.finishPaymentCallbackLog(callbackLog, "failed", "支付回调订单号不一致", preloadedOrder);
      throw new BadRequestException("支付回调订单号不一致");
    }
    const order = await this.orders.findOne({ where: { orderNo: callback.orderNo } });
    const callbackPayload = realProvider ? { ...(dto as Record<string, unknown>), ...(callback.raw || {}), orderNo: callback.orderNo, transactionNo: callback.transactionNo, amount: callback.amount } : dto;
    const callbackLog = await this.createPaymentCallbackLog(provider, callbackPayload, order, callback.signatureValid);
    if (!callback.signatureValid) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", "支付回调签名验证失败", order);
      throw new BadRequestException("支付回调签名验证失败");
    }
    if (!order) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", "订单不存在", null);
      throw new NotFoundException("订单不存在");
    }
    if (Math.abs(Number(order.amount) - Number(callback.amount)) > 0.001) {
      await this.recordPaymentDiscrepancy(order, callback.transactionNo, provider, Number(callback.amount), "amount_mismatch", `${provider} 回调金额与订单金额不一致`);
      await this.finishPaymentCallbackLog(callbackLog, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致，已记录对账差异");
    }
    try {
      const result = await this.applySuccessfulPayment(order, callback.transactionNo, provider, `${provider} 沙箱支付回调`, provider);
      await this.finishPaymentCallbackLog(callbackLog, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "支付回调处理成功", result.order);
      return result;
    } catch (error: any) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", error.message || "支付回调处理失败", order);
      throw error;
    }
  }

  async providerRefundNotification(provider: SupportedPaymentProvider, dto: Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    if (!this.paymentProvider.usesRealProvider(provider)) throw new BadRequestException("真实退款通知需要先启用真实支付渠道");
    const context = { body: dto, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const extractedOrderNo = this.paymentProvider.extractRealRefundNotificationOrderNo(provider, context);
    const order = await this.orders.findOne({ where: { orderNo: extractedOrderNo } });
    if (!order) throw new NotFoundException("订单不存在");
    const notification = await this.paymentProvider.parseRealRefundNotificationForOrder(provider, order, context);
    if (notification.orderNo !== extractedOrderNo) throw new BadRequestException("退款通知订单号不一致");
    const refund = await this.refunds.findOne({ where: { refundNo: notification.refundNo } });
    if (!refund) throw new NotFoundException("退款单不存在");
    if (refund.order.orderNo !== notification.orderNo) throw new BadRequestException("退款通知与退款单订单不一致");
    if (!["processing", "completed", "failed"].includes(refund.status)) throw new BadRequestException("退款单尚未进入服务商处理状态");

    const now = new Date();
    refund.providerRefundNo = notification.providerRefundNo || refund.providerRefundNo;
    refund.providerRefundStatus = notification.status;
    refund.providerRefundSyncedAt = now;
    refund.providerRefundPayload = { ...(refund.providerRefundPayload || {}), lastNotification: notification.raw || notification };
    refund.providerRefundFailureReason = notification.failureReason || null;

    let action = "processing";
    if (notification.status === "success") {
      const completed = await this.refundCompletion.complete({ refund, order, actorName: "provider_callback", remark: "服务商退款通知确认成功", now });
      action = completed.idempotent ? "idempotent" : "completed";
      return { received: true, provider, action, refund: completed.refund };
    } else if (notification.status === "failed") {
      refund.status = refund.status === "completed" ? refund.status : "failed";
      refund.providerRefundNextQueryAt = null;
      action = refund.status === "completed" ? "idempotent" : "failed";
    } else {
      refund.status = refund.status === "completed" ? refund.status : "processing";
      refund.providerRefundNextQueryAt = refund.status === "completed" ? null : new Date(Date.now() + 10 * 60 * 1000);
    }

    const saved = await this.refunds.save(refund);
    return { received: true, provider, action, refund: saved };
  }

  private async assertOrderTenantAccess(order: Order, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    this.assertOrderTenantEnabled(order);
    assertTenantOwnedResourceAccess(order, tenant, "Order not found");
  }

  private assertOrderTenantEnabled(order: Order) {
    if (order.tenant && !order.tenant.enabled) throw new NotFoundException("Order not found");
  }

  private assertOrderUserAccess(order: Order, user: User) {
    if (order.registration?.user?.id !== user.id) throw new NotFoundException("订单不存在");
  }

  async myRegistrations(userId: number, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const builder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .where("user.id = :userId", { userId })
      .andWhere("(registration.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .andWhere("(activity.tenantId IS NULL OR activityTenant.enabled = :activityTenantEnabled)", { activityTenantEnabled: true })
      .orderBy("registration.createdAt", "DESC");
    if (tenant) builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: tenant.id });
    return builder.getMany();
  }

  async myWallet(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveWalletTenantContext(context);
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const wallet = await this.userWallets.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    return wallet || { user, tenant, tenantScopeKey, availableBalance: "0.00", frozenBalance: "0.00", totalRecharge: "0.00", totalSpent: "0.00" };
  }

  async myWalletTransactions(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveWalletTenantContext(context);
    const builder = this.walletTransactions
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.wallet", "wallet")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .where("tx.userId = :userId", { userId: user.id })
      .orderBy("tx.createdAt", "DESC")
      .take(100);
    if (tenant) builder.andWhere("tx.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("tx.tenantId IS NULL");
    return builder.getMany();
  }

  private async resolveWalletTenantContext(context?: PublicTenantContext) {
    const multiTenantEnabled = this.config.get("MULTI_TENANT_ENABLED", "false") === "true";
    if (!multiTenantEnabled || normalizeTenantCode(context?.tenantCode) === "platform") return null;
    return this.resolveTenantContext(context);
  }

  private async assertSufficientBalance(user: User, tenant: Tenant | null, amount: number) {
    const wallet = await this.userWallets.findOne({ where: { user: { id: user.id }, tenantScopeKey: this.walletTenantScopeKey(tenant) } });
    if (Number(wallet?.availableBalance || 0) + 0.0001 < amount) throw new BadRequestException("余额不足，请选择微信支付或联系后台充值");
  }

  private async rollbackPendingRegistration(order: Order, coupon: Coupon | null, pointsUsed: number, reason: string) {
    order.status = OrderStatus.Cancelled;
    order.registration.status = RegistrationStatus.Cancelled;
    order.registration.cancelReason = reason;
    await this.orders.save(order);
    await this.registrations.save(order.registration);
    if (coupon) await this.coupons.decrement({ id: coupon.id }, "usedCount", 1);
    if (pointsUsed > 0) await this.awardPoints(order.registration.user, pointsUsed, "points_return", order.id, reason);
  }

  async registrationDetail(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.registrations.findOne({ where: { id, user: { id: userId } } });
    if (!registration) throw new NotFoundException("报名记录不存在");
    const tenant = await this.assertRegistrationTenantAccess(registration, context);
    const [order, operationSetting] = await Promise.all([this.orders.findOne({ where: { registration: { id } } }), this.ensureOperationSetting(tenant)]);
    const groupVisible = ![RegistrationStatus.Cancelled, RegistrationStatus.Rejected].includes(registration.status);
    const groupQrCodeUrl = groupVisible ? registration.activity.groupQrCodeUrl || operationSetting.defaultGroupQrCodeUrl || null : null;
    return { registration: this.publicRegistration(registration), order: order ? this.publicOrder(order) : null, operationSetting: this.publicOperationSetting(operationSetting), groupQrCodeUrl };
  }

  async cancelRegistration(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.registrations.findOne({ where: { id, user: { id: userId } } });
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    if (!registration.activity.allowCancel) throw new BadRequestException("该活动不允许用户取消报名");
    if ([RegistrationStatus.Cancelled, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("当前状态不能取消");
    registration.status = RegistrationStatus.Cancelled;
    registration.cancelReason = "用户取消";
    const order = await this.orders.findOne({ where: { registration: { id } } });
    if (order && order.status === OrderStatus.PendingPayment) {
      order.status = OrderStatus.Cancelled;
      await this.orders.save(order);
      await this.refundRedeemedPoints(order, "用户取消报名返还积分");
    }
    return this.registrations.save(registration);
  }

  async checkInCode(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.registrations.findOne({ where: { id, user: { id: userId } } });
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    if (![RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("报名成功后才会生成签到码");
    return { code: registration.checkInCode };
  }

  private async assertRegistrationTenantAccess(registration: Registration, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    if (registration.tenant && !registration.tenant.enabled) throw new NotFoundException("Registration not found");
    if (registration.activity?.tenant && !registration.activity.tenant.enabled) throw new NotFoundException("Registration not found");
    if (tenant && registration.tenant?.id !== tenant.id && registration.activity?.tenant?.id !== tenant.id) throw new NotFoundException("Registration not found");
    return tenant || registration.tenant || registration.activity?.tenant || null;
  }

  private validateAnswers(fields: any[], answers: RegistrationAnswer[]) {
    for (const field of fields) {
      const answer = answers.find((item) => item.fieldId === field.id);
      if (field.required && (!answer || answer.value === "" || (Array.isArray(answer.value) && answer.value.length === 0))) throw new BadRequestException(`请填写${field.label}`);
    }
  }

  private normalizePhone(phone: string) {
    const normalized = String(phone || "").trim();
    if (!/^1\d{10}$/.test(normalized)) throw new BadRequestException("请输入正确的手机号");
    return normalized;
  }

  async requireUserFromAuthorization(authorization?: string | string[] | null) {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = this.extractBearerToken(header);
    if (!token) throw new UnauthorizedException("请先登录");
    const payload = this.verifyUserAccessToken(token);
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException("登录已失效，请重新登录");
    return user;
  }

  optionalUserIdFromAuthorization(authorization?: string | string[] | null) {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = this.extractBearerToken(header);
    if (!token) return undefined;
    return this.verifyUserAccessToken(token).sub;
  }

  private userLoginResponse(user: User) {
    return { user, userAccessToken: this.signUserAccessToken(user) };
  }

  private signUserAccessToken(user: User) {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(Number(this.config.get("USER_ACCESS_TOKEN_TTL_SECONDS", 7 * 24 * 60 * 60)), 60);
    const payload = Buffer.from(JSON.stringify({ sub: user.id, scope: "user", iat: now, exp: now + ttl })).toString("base64url");
    const sign = createHmac("sha256", this.userAccessTokenSecret()).update(payload).digest("base64url");
    return `${payload}.${sign}`;
  }

  private verifyUserAccessToken(token: string): { sub: number; exp: number; scope: string } {
    const [payloadText, sign] = token.split(".");
    if (!payloadText || !sign) throw new UnauthorizedException("登录凭证无效");
    const expected = createHmac("sha256", this.userAccessTokenSecret()).update(payloadText).digest("base64url");
    if (sign !== expected) throw new UnauthorizedException("登录凭证无效");
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8"));
    } catch {
      throw new UnauthorizedException("登录凭证无效");
    }
    if (payload?.scope !== "user" || !Number.isInteger(payload.sub)) throw new UnauthorizedException("登录凭证无效");
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new UnauthorizedException("登录已过期，请重新登录");
    return payload;
  }

  private extractBearerToken(authorization?: string | null) {
    const match = String(authorization || "").match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
  }

  private userAccessTokenSecret() {
    return this.config.get<string>("USER_ACCESS_TOKEN_SECRET") || this.config.get<string>("JWT_SECRET") || this.h5AuthSecret();
  }

  private walletTenantScopeKey(tenant?: Tenant | null) {
    return tenant?.id ? String(tenant.id) : "platform";
  }

  private async resolveWechatOpenid(code: string) {
    const realWechatLogin = this.config.get("WECHAT_LOGIN_REAL_ENABLED", this.config.get("NODE_ENV") === "production" ? "true" : "false") === "true";
    if (!realWechatLogin) return `dev_${code}`;
    const appId = this.config.get<string>("WECHAT_APP_ID") || this.config.get<string>("WECHAT_PAY_APP_ID");
    const appSecret = this.config.get<string>("WECHAT_APP_SECRET");
    if (!appId || !appSecret) throw new BadRequestException("微信登录配置未完成");
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const response = await fetch(url);
    const payload = await response.json() as Record<string, unknown>;
    const openid = typeof payload.openid === "string" ? payload.openid.trim() : "";
    if (!response.ok || !openid) throw new BadRequestException(String(payload.errmsg || "微信登录失败"));
    return openid;
  }

  private generateVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private h5AuthMode() {
    const mode = this.config.get<string>("H5_AUTH_MODE", "dev").trim().toLowerCase();
    if (mode === "dev" || mode === "sms") return mode;
    throw new BadRequestException("H5 登录模式配置错误");
  }

  private async assertH5CodeRateLimit(phone: string, clientIp: string | null, mode: string) {
    const now = Date.now();
    const cooldownSeconds = Math.max(Number(this.config.get("H5_CODE_COOLDOWN_SECONDS", 60)), 0);
    const hourlyLimit = Math.max(Number(this.config.get("H5_CODE_PHONE_HOURLY_LIMIT", 6)), 1);
    const dailyLimit = Math.max(Number(this.config.get("H5_CODE_PHONE_DAILY_LIMIT", 20)), 1);
    const ipHourlyLimit = Math.max(Number(this.config.get("H5_CODE_IP_HOURLY_LIMIT", 60)), 1);
    const sentStatuses: Array<"sent"> = ["sent"];

    const latest = await this.h5AuthCodeLogs.findOne({ where: { phone, status: In(sentStatuses) }, order: { createdAt: "DESC" } });
    if (latest && cooldownSeconds > 0 && latest.createdAt.getTime() > now - cooldownSeconds * 1000) {
      const waitSeconds = Math.max(Math.ceil((latest.createdAt.getTime() + cooldownSeconds * 1000 - now) / 1000), 1);
      await this.recordH5CodeLog({ phone, clientIp, mode, status: "rate_limited", message: `cooldown:${waitSeconds}s`, expiresAt: null });
      throw new BadRequestException(`验证码发送过于频繁，请 ${waitSeconds} 秒后再试`);
    }

    const [phoneHourly, phoneDaily, ipHourly] = await Promise.all([
      this.h5AuthCodeLogs.count({ where: { phone, status: In(sentStatuses), createdAt: MoreThan(new Date(now - 60 * 60 * 1000)) } }),
      this.h5AuthCodeLogs.count({ where: { phone, status: In(sentStatuses), createdAt: MoreThan(new Date(now - 24 * 60 * 60 * 1000)) } }),
      clientIp ? this.h5AuthCodeLogs.count({ where: { clientIp, status: In(sentStatuses), createdAt: MoreThan(new Date(now - 60 * 60 * 1000)) } }) : Promise.resolve(0)
    ]);

    const message = phoneHourly >= hourlyLimit ? "手机号验证码请求已达小时上限" : phoneDaily >= dailyLimit ? "手机号验证码请求已达今日上限" : ipHourly >= ipHourlyLimit ? "当前网络验证码请求过多" : "";
    if (message) {
      await this.recordH5CodeLog({ phone, clientIp, mode, status: "rate_limited", message, expiresAt: null });
      throw new BadRequestException(message);
    }
  }

  private recordH5CodeLog(input: { phone: string; clientIp?: string | null; mode: string; status: "sent" | "failed" | "rate_limited"; provider?: string | null; providerMessageId?: string | null; message?: string | null; expiresAt?: Date | null }) {
    return this.h5AuthCodeLogs.save(
      this.h5AuthCodeLogs.create({
        phone: input.phone,
        clientIp: input.clientIp || null,
        mode: input.mode,
        status: input.status,
        provider: input.provider || null,
        providerMessageId: input.providerMessageId || null,
        message: input.message || null,
        expiresAt: input.expiresAt || null
      })
    );
  }

  private async sendH5VerificationSms(phone: string, code: string, expireMinutes: number) {
    const setting = await this.ensureOperationSetting();
    if (!setting.smsProviderEnabled) throw new BadRequestException("短信服务未配置，请在后台系统设置中配置短信服务");
    const result = await this.notificationProvider.deliver({
      channel: "sms",
      title: "H5 登录验证码",
      content: `验证码 ${code}，${expireMinutes} 分钟内有效。请勿转发给他人。`,
      to: { phone }
    });
    if (result.status !== "sent") throw new BadRequestException(result.errorMessage || "H5 验证码发送失败");
    return result;
  }

  private h5AuthSecret() {
    return this.config.get("H5_AUTH_SECRET") || this.config.get("JWT_SECRET", "dev-secret-change-me");
  }

  private signH5Verification(phone: string, code: string, expiresAt: number) {
    const codeHash = createHmac("sha256", this.h5AuthSecret()).update(`${phone}.${code}.${expiresAt}`).digest("hex");
    const payload = `${phone}.${expiresAt}.${codeHash}`;
    const sign = createHmac("sha256", this.h5AuthSecret()).update(payload).digest("hex");
    return Buffer.from(`${payload}.${sign}`).toString("base64url");
  }

  private verifyH5Token(phone: string, code: string, token: string) {
    if (!token) throw new BadRequestException("请先获取验证码");
    if (!/^\d{6}$/.test(String(code || ""))) throw new BadRequestException("请输入 6 位验证码");
    let raw = "";
    try {
      raw = Buffer.from(token, "base64url").toString("utf8");
    } catch {
      throw new BadRequestException("验证码无效");
    }
    const parts = raw.split(".");
    if (parts.length !== 4) throw new BadRequestException("验证码无效");
    const [tokenPhone, expiresAtText, codeHash, sign] = parts;
    const expiresAt = Number(expiresAtText);
    if (tokenPhone !== phone) throw new BadRequestException("验证码手机号不匹配");
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) throw new BadRequestException("验证码已过期");
    const expectedCodeHash = createHmac("sha256", this.h5AuthSecret()).update(`${tokenPhone}.${code}.${expiresAt}`).digest("hex");
    if (codeHash !== expectedCodeHash) throw new BadRequestException("验证码错误");
    const expected = createHmac("sha256", this.h5AuthSecret()).update(`${tokenPhone}.${expiresAt}.${codeHash}`).digest("hex");
    if (sign !== expected) throw new BadRequestException("验证码无效");
  }

  private async calculateQuote(activity: Activity, dto: QuoteDto) {
    const ticketType = dto.ticketTypeId ? await this.ticketTypes.findOne({ where: { id: dto.ticketTypeId } }) : null;
    if (dto.ticketTypeId && (!ticketType || ticketType.activity.id !== activity.id || !ticketType.enabled)) throw new BadRequestException("票种不可用");
    const original = ticketType ? Number(ticketType.price) : Number(activity.price);
    const memberProfile = dto.userId ? await this.memberProfiles.findOne({ where: { user: { id: dto.userId } } }) : null;
    const memberLevel = memberProfile?.level && memberProfile.level.enabled ? memberProfile.level : null;
    const memberDiscount = memberLevel ? Math.max(original - original * Number(memberLevel.discountRate), 0) : 0;
    const afterMember = Math.max(original - memberDiscount, 0);
    const couponCode = dto.couponCode?.trim().toUpperCase();
    const coupon = couponCode
      ? await this.coupons.findOne({ where: activity.tenant?.id ? { code: couponCode, tenant: { id: activity.tenant.id } } : { code: couponCode } })
      : null;
    if (couponCode && !coupon) throw new BadRequestException("优惠码不存在");
    let couponDiscount = 0;
    if (coupon) {
      this.validateCoupon(coupon, activity, afterMember);
      couponDiscount = coupon.discountType === "percent" ? afterMember * (Number(coupon.discountValue) / 100) : Number(coupon.discountValue);
      couponDiscount = Math.min(Math.max(couponDiscount, 0), afterMember);
    }
    const beforePoints = Math.max(original - memberDiscount - couponDiscount, 0);
    const requestedPoints = Math.max(Number(dto.pointsToUse || 0), 0);
    const availablePoints = Math.max(memberProfile?.points || 0, 0);
    const pointsUsed = Math.min(requestedPoints, availablePoints, Math.floor(beforePoints * 100));
    const pointsDiscount = pointsUsed / 100;
    const totalDiscount = memberDiscount + couponDiscount + pointsDiscount;
    const payable = Math.max(original - totalDiscount, 0);
    return {
      originalAmount: original.toFixed(2),
      discountAmount: totalDiscount.toFixed(2),
      memberDiscountAmount: memberDiscount.toFixed(2),
      couponDiscountAmount: couponDiscount.toFixed(2),
      pointsUsed,
      pointsDiscountAmount: pointsDiscount.toFixed(2),
      availablePoints,
      payableAmount: payable.toFixed(2),
      ticketType,
      coupon,
      memberLevel
    };
  }

  private validateCoupon(coupon: Coupon, activity: Activity, amount: number) {
    if (!coupon.enabled) throw new BadRequestException("优惠码已停用");
    if (coupon.tenant?.id && activity.tenant?.id && coupon.tenant.id !== activity.tenant.id) throw new BadRequestException("优惠码不适用于当前商家");
    if (coupon.activity && coupon.activity.id !== activity.id) throw new BadRequestException("优惠码不适用于该活动");
    const now = Date.now();
    if (coupon.startsAt && coupon.startsAt.getTime() > now) throw new BadRequestException("优惠码尚未开始");
    if (coupon.endsAt && coupon.endsAt.getTime() < now) throw new BadRequestException("优惠码已过期");
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException("优惠码已用完");
    if (amount < Number(coupon.minAmount)) throw new BadRequestException("订单金额未达到优惠码使用门槛");
  }

  private async applySuccessfulPayment(order: Order, transactionNo: string, provider: string, remark: string, paymentMethod?: PaymentMethod | string) {
    this.assertOrderTenantEnabled(order);
    const existingTransaction = await this.paymentTransactions.findOne({ where: { transactionNo } });
    if (existingTransaction) return { order: existingTransaction.order, transaction: existingTransaction, idempotent: true };
    const orderTransaction = await this.paymentTransactions.findOne({ where: { order: { id: order.id } } });
    if (order.status === OrderStatus.Paid && orderTransaction) return { order, transaction: orderTransaction, idempotent: true };
    if (order.status !== OrderStatus.PendingPayment && order.status !== OrderStatus.Paid) throw new BadRequestException("当前订单不能支付");
    if (order.registration.status === RegistrationStatus.Cancelled) throw new BadRequestException("已取消报名不能支付");
    if (this.isExpiredPendingOrder(order)) {
      await this.closeExpiredOrder(order, "订单超时未付款，系统已关闭");
      throw new BadRequestException("订单已超时关闭，名额已释放，请重新报名");
    }

    order.status = OrderStatus.Paid;
    order.paidAt = order.paidAt || new Date();
    order.transactionNo = order.transactionNo || transactionNo;
    if (paymentMethod) order.paymentMethod = paymentMethod as PaymentMethod;
    const savedOrder = await this.orders.save(order);
    const transaction = await this.paymentTransactions.save(
      this.paymentTransactions.create({
        order: savedOrder,
        tenant: savedOrder.tenant,
        transactionNo,
        provider,
        paymentMethod: paymentMethod || savedOrder.paymentMethod,
        amount: savedOrder.amount,
        status: "success",
        reconciliationStatus: "matched",
        remark
      })
    );
    if (Number(savedOrder.amount) > 0) await this.awardPoints(savedOrder.registration.user, Math.floor(Number(savedOrder.amount)), "order_paid", savedOrder.id, "活动消费积分");
    if (savedOrder.registration.status === RegistrationStatus.PendingPayment) {
      savedOrder.registration.status = savedOrder.registration.activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
      await this.registrations.save(savedOrder.registration);
    }
    await this.recordConversionEvent("pay", { activity: savedOrder.registration.activity, user: savedOrder.registration.user, registration: savedOrder.registration, order: savedOrder, channel: savedOrder.registration.channel || null, amount: savedOrder.amount, source: provider, idempotencyKey: `pay:${savedOrder.id}` });
    await this.charityFund.recordOrderAccrual(savedOrder, provider);
    return { order: savedOrder, transaction, idempotent: false };
  }

  private async recordActivityView(activity: Activity, user: User | null, tracking?: PublicTrackingContext) {
    const channel = await this.resolveActivityChannel(activity, tracking?.channelCode, tracking?.source);
    const source = this.cleanTrackingText(tracking?.source || channel?.source || tracking?.inviteCode || "direct", 80);
    const visitorKey = user?.id ? `u${user.id}` : this.cleanTrackingText(tracking?.clientIp || "anonymous", 40);
    const day = new Date().toISOString().slice(0, 10);
    const channelKey = channel?.id || "none";
    const idempotencyKey = `view:${activity.id}:${visitorKey}:${day}:${channelKey}`;
    const exists = await this.conversionEvents.findOne({ where: { idempotencyKey } });
    if (exists) return;
    await this.activityViewLogs.save(this.activityViewLogs.create({ activity, user, channel, source }));
    await this.recordConversionEvent("view", {
      activity,
      user,
      channel,
      source,
      idempotencyKey,
      clientIp: tracking?.clientIp,
      userAgent: tracking?.userAgent,
      payload: { inviteCode: tracking?.inviteCode || null }
    });
  }

  private async resolveActivityChannel(activity: Activity, channelCode?: string | null, source?: string | null) {
    const code = this.cleanTrackingText(channelCode, 48);
    if (code) {
      const channel = await this.activityChannels.findOne({ where: { code, activity: { id: activity.id }, enabled: true } });
      if (channel) return channel;
    }
    const sourceText = this.cleanTrackingText(source, 80);
    if (!sourceText) return null;
    return this.activityChannels.findOne({ where: { activity: { id: activity.id }, source: sourceText, enabled: true } });
  }

  private async recordConversionEvent(type: ConversionEventType, input: { activity?: Activity | null; user?: User | null; registration?: Registration | null; order?: Order | null; channel?: ActivityChannel | null; amount?: string | number | null; source?: string | null; idempotencyKey?: string | null; clientIp?: string | null; userAgent?: string | null; payload?: Record<string, unknown> | null }) {
    if (input.idempotencyKey && await this.conversionEvents.findOne({ where: { idempotencyKey: input.idempotencyKey } })) return null;
    return this.conversionEvents.save(this.conversionEvents.create({
      type,
      tenant: input.activity?.tenant || input.order?.tenant || input.registration?.tenant || input.channel?.tenant || null,
      activity: input.activity || input.registration?.activity || input.order?.registration?.activity || null,
      user: input.user || input.registration?.user || input.order?.registration?.user || null,
      registration: input.registration || input.order?.registration || null,
      order: input.order || null,
      channel: input.channel || input.registration?.channel || null,
      amount: Number(input.amount || 0).toFixed(2),
      source: this.cleanTrackingText(input.source, 80) || null,
      idempotencyKey: input.idempotencyKey || null,
      clientIp: this.cleanTrackingText(input.clientIp, 80) || null,
      userAgent: this.cleanTrackingText(input.userAgent, 255) || null,
      payload: input.payload || null
    }));
  }

  private cleanTrackingText(value: unknown, max = 80) {
    return String(value || "").trim().replace(/[^\w\u4e00-\u9fa5:.-]/g, "").slice(0, max);
  }

  private async recordPaymentDiscrepancy(order: Order, transactionNo: string, provider: string, amount: number, discrepancyType: string, remark: string) {
    const existingTransaction = await this.paymentTransactions.findOne({ where: { transactionNo } });
    if (existingTransaction) return existingTransaction;
    return this.paymentTransactions.save(
      this.paymentTransactions.create({
        order,
        tenant: order.tenant,
        transactionNo,
        provider,
        paymentMethod: order.paymentMethod,
        amount: Number(amount).toFixed(2),
        status: "discrepancy",
        reconciliationStatus: "pending",
        discrepancyType,
        remark
      })
    );
  }

  private createPaymentCallbackLog(provider: string, payload: MockPaymentCallbackDto | ProviderPaymentCallbackDto | Record<string, unknown>, order: Order | null, signatureValid: boolean | null) {
    const callbackPayload = payload as Record<string, unknown>;
    const orderNo = this.callbackString(callbackPayload, "orderNo", "out_trade_no", "outTradeNo");
    const transactionNo = this.callbackString(callbackPayload, "transactionNo", "transaction_id", "trade_no", "tradeNo");
    const amount = this.callbackNumber(callbackPayload, "amount", "total_amount", "totalAmount");
    return this.paymentCallbackLogs.save(
      this.paymentCallbackLogs.create({
        order,
        tenant: order?.tenant || null,
        provider,
        orderNo,
        transactionNo,
        amount: amount === null ? null : amount.toFixed(2),
        signatureValid,
        resultStatus: "received",
        resultMessage: null,
        payload: callbackPayload,
        processedAt: null
      })
    );
  }

  private callbackString(payload: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return null;
  }

  private callbackNumber(payload: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    }
    return null;
  }

  private finishPaymentCallbackLog(log: PaymentCallbackLog, resultStatus: string, resultMessage: string, order?: Order | null) {
    log.resultStatus = resultStatus;
    log.resultMessage = resultMessage;
    log.processedAt = new Date();
    if (order) log.order = order;
    return this.paymentCallbackLogs.save(log);
  }

  private paymentExpiresAt(price: number) {
    if (price <= 0) return null;
    const minutes = Math.max(Number(this.config.get("OFFLINE_PAYMENT_EXPIRE_MINUTES", 1440)), 1);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async ensureOperationSetting(tenant?: Tenant | null) {
    const id = tenant?.id || 1;
    let setting = await this.operationSettings.findOneBy({ id });
    if (setting) return setting;
    setting = this.operationSettings.create({
      id,
      tenant: tenant || null,
      registrationEnabled: true,
      registrationDisabledMessage: "报名通道暂时关闭，请稍后再试或联系主办方。",
      offlinePaymentInstructions: "请在付款截止前完成线下转账或现场付款，并在备注中填写报名手机号。主办方确认收款后，报名状态会自动更新。",
      customerServiceName: "活动运营客服",
      customerServicePhone: "13800000000",
      customerServiceWechat: "activity_service",
      defaultGroupQrCodeUrl: null,
      pageTheme: {},
      refundInstructions: "如需取消报名或申请退款，请先联系主办方客服。已签到或活动开始后的退款规则以活动报名须知为准。",
      invoiceInstructions: "如需发票，请在付款后联系客服登记抬头、税号和接收邮箱。",
      smsProviderEnabled: false,
      smsProvider: "tencent-cloud-sms",
      smsAccessKeyId: null,
      smsAccessKeySecret: null,
      smsSignName: null,
      smsTemplateId: null
    });
    return this.operationSettings.save(setting);
  }

  private async assertRegistrationEnabled() {
    const setting = await this.ensureOperationSetting();
    if (setting.registrationEnabled !== false && (setting.registrationEnabled as unknown) !== 0 && (setting.registrationEnabled as unknown) !== "0") return;
    throw new BadRequestException(setting.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。");
  }

  private isExpiredPendingOrder(order: Order) {
    return order.status === OrderStatus.PendingPayment && Boolean(order.expiresAt && order.expiresAt.getTime() <= Date.now());
  }

  private async closeExpiredOrder(order: Order, reason: string) {
    order.status = OrderStatus.Closed;
    order.closedAt = new Date();
    order.closeReason = reason;
    if (order.registration.status === RegistrationStatus.PendingPayment) {
      order.registration.status = RegistrationStatus.Cancelled;
      order.registration.cancelReason = reason;
      await this.registrations.save(order.registration);
    }
    await this.orders.save(order);
    await this.refundRedeemedPoints(order, "订单超时关闭返还积分");
    return order;
  }

  private async awardPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string) {
    const key = String(sourceId);
    const exists = await this.memberPointLogs.findOne({ where: { sourceType, sourceId: key } });
    if (exists) return exists;
    const log = await this.memberPointLogs.save(this.memberPointLogs.create({ user, points, type: points >= 0 ? "earn" : "deduct", sourceType, sourceId: key, remark }));
    await this.refreshMemberProfile(user);
    return log;
  }

  private async refundRedeemedPoints(order: Order, remark: string) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardPoints(order.registration.user, order.pointsUsed, "points_return", order.id, remark);
    order.pointsRefundedAt = new Date();
    await this.orders.save(order);
    return order;
  }

  private async refreshMemberProfile(user: User) {
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = this.memberProfiles.create({ user, level: null });
    const [registrationCount, pointSum, paidAmount] = await Promise.all([
      this.registrations.count({ where: { user: { id: user.id } } }),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).getRawOne<{ sum: string }>(),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>()
    ]);
    profile.points = Number(pointSum?.sum || 0);
    profile.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    profile.registrationCount = registrationCount;
    profile.level = await this.resolveMemberLevel(profile.points);
    profile.lastActiveAt = new Date();
    return this.memberProfiles.save(profile);
  }

  private async resolveMemberLevel(points: number) {
    const levels = await this.memberLevels.find({ where: { enabled: true }, order: { minPoints: "DESC" } });
    return levels.find((level) => points >= level.minPoints) || null;
  }

  private async ensureActivityMemberAccess(activity: Activity, user: User) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    if (!requiredLevel) return;
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = await this.refreshMemberProfile(user);
    if (!profile.level || profile.level.minPoints < requiredLevel.minPoints) {
      const message = this.isPriorityBookingActive(activity)
        ? `优先报名截止前仅限${requiredLevel.name}及以上会员报名`
        : `该活动仅限${requiredLevel.name}及以上会员报名`;
      throw new BadRequestException(message);
    }
  }

  private async memberAccessSnapshot(activity: Activity, userId?: number) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    const priorityActive = this.isPriorityBookingActive(activity);
    if (!requiredLevel) return { requiredLevel: null, currentLevel: null, eligible: true, message: "不限会员等级", priorityActive: false, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    if (!userId) {
      return { requiredLevel, currentLevel: null, eligible: false, message: priorityActive ? `优先报名截止前仅限${requiredLevel.name}及以上会员报名` : `该活动仅限${requiredLevel.name}及以上会员报名`, priorityActive, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    }
    const user = await this.users.findOneBy({ id: userId });
    if (!user) return { requiredLevel, currentLevel: null, eligible: false, message: "用户不存在", priorityActive, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = await this.refreshMemberProfile(user);
    const currentLevel = profile.level || null;
    const eligible = Boolean(currentLevel && currentLevel.minPoints >= requiredLevel.minPoints);
    return {
      requiredLevel,
      currentLevel,
      eligible,
      priorityActive,
      priorityMemberLevel: activity.priorityMemberLevel,
      priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt,
      message: eligible ? (priorityActive ? "已满足优先报名资格" : "已满足会员报名门槛") : priorityActive ? `优先报名截止前仅限${requiredLevel.name}及以上会员报名` : `该活动仅限${requiredLevel.name}及以上会员报名`
    };
  }

  private effectiveRequiredMemberLevel(activity: Activity) {
    const levels = [activity.minMemberLevel];
    if (this.isPriorityBookingActive(activity)) levels.push(activity.priorityMemberLevel);
    return levels.filter(Boolean).sort((a, b) => b!.minPoints - a!.minPoints)[0] || null;
  }

  private isPriorityBookingActive(activity: Activity) {
    return Boolean(activity.priorityMemberLevel && activity.priorityRegistrationEndsAt && activity.priorityRegistrationEndsAt.getTime() > Date.now());
  }

  private async withPublicStats(activity: Activity) {
    const usedStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const [registeredCount, waitingCount] = await Promise.all([
      this.registrations.count({ where: { activity: { id: activity.id }, status: In(usedStatuses) } }),
      this.waitlists.count({ where: { activity: { id: activity.id }, status: WaitlistStatus.Waiting } })
    ]);
    const remainingSeats = Math.max(activity.capacity - registeredCount, 0);
    const now = Date.now();
    const displayStatus = new Date(activity.registrationDeadline).getTime() < now || new Date(activity.endTime).getTime() < now ? "ended" : remainingSeats <= 0 ? "full" : "open";
    return { ...this.publicActivity(activity), registeredCount, waitingCount, remainingSeats, displayStatus };
  }

  private publicRegistration(registration: Registration) {
    return { ...registration, activity: this.publicActivity(registration.activity) };
  }

  private publicOrder(order: Order) {
    return { ...order, registration: this.publicRegistration(order.registration) };
  }

  private publicActivity(activity: Activity) {
    const { groupQrCodeUrl: _groupQrCodeUrl, ...publicActivity } = activity as Activity & { groupQrCodeUrl?: string | null };
    return publicActivity;
  }

  private publicOperationSetting(setting: OperationSetting) {
    const { defaultGroupQrCodeUrl: _defaultGroupQrCodeUrl, smsProviderEnabled: _smsProviderEnabled, smsProvider: _smsProvider, smsAccessKeyId: _smsAccessKeyId, smsAccessKeySecret: _smsAccessKeySecret, smsSignName: _smsSignName, smsTemplateId: _smsTemplateId, ...publicSetting } = setting as OperationSetting & { defaultGroupQrCodeUrl?: string | null };
    return publicSetting;
  }
}


