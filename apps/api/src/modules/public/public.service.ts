import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import { DataSource, EntityManager } from "typeorm";
import { In, IsNull, MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { ActivityCategory } from "../../entities/activity-category.entity";
import { Activity } from "../../entities/activity.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { AmbassadorApplication } from "../../entities/ambassador-application.entity";
import { AmbassadorCase } from "../../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../../entities/ambassador-landing-setting.entity";
import { Announcement } from "../../entities/announcement.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { Coupon } from "../../entities/coupon.entity";
import { CouponClaim } from "../../entities/coupon-claim.entity";
import { CouponUsage } from "../../entities/coupon-usage.entity";
import { ConversionEvent, ConversionEventType } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { CourseRefund } from "../../entities/course-refund.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { InviteCode } from "../../entities/invite-code.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { HomepagePublication } from "../../entities/homepage-publication.entity";
import { homepagePublicationScopeKey, homepageSectionIsPublicCandidate } from "../../shared/homepage-publication";
import { contentAudienceMatches } from "../../shared/content-audience";
import { marketingPopupEventCounter } from "../../shared/marketing-popup-event";
import { ecosystemBusinessKey } from "../../shared/ecosystem-crm-policy";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { MallCoupon } from "../../entities/mall-coupon.entity";
import { MallCouponClaim } from "../../entities/mall-coupon-claim.entity";
import { MarketingPopup } from "../../entities/marketing-popup.entity";
import { AdCampaign } from "../../entities/ad-campaign.entity";
import { AdDailyStat } from "../../entities/ad-daily-stat.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Refund } from "../../entities/refund.entity";
import { RedemptionCode } from "../../entities/redemption-code.entity";
import { RedemptionCodeUsage } from "../../entities/redemption-code-usage.entity";
import { Registration } from "../../entities/registration.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TenantRegionHitLog } from "../../entities/tenant-region-hit-log.entity";
import { TenantRegion, TenantRegionBoundaryPoint } from "../../entities/tenant-region.entity";
import { decryptStoredSecret, encryptStoredSecret } from "../../shared/secret-storage";
import { maskPhone } from "../../shared/data-masking";
import { TicketType } from "../../entities/ticket-type.entity";
import { User } from "../../entities/user.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { UserFavorite } from "../../entities/user-favorite.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { VolunteerProfile } from "../../entities/volunteer-profile.entity";
import { VolunteerAttendanceRecord } from "../../entities/volunteer-attendance-record.entity";
import { VolunteerBadgeAward } from "../../entities/volunteer-badge-award.entity";
import { VolunteerHourAdjustment } from "../../entities/volunteer-hour-adjustment.entity";
import { VolunteerServiceRecord } from "../../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../../entities/volunteer-task.entity";
import { VolunteerTrainingRecord } from "../../entities/volunteer-training-record.entity";
import { VolunteerServiceProof } from "../../entities/volunteer-service-proof.entity";
import { certificateVerificationView } from "../../shared/certificate-verification";
import { renderCertificateSvg } from "../../shared/certificate-svg";
import { canTransitionVolunteerApplication, nextVolunteerNo, verifyVolunteerAttendanceToken, volunteerBusinessKey, volunteerHoursFromAttendance, volunteerPhoneHash, volunteerQualificationEffective } from "../../shared/volunteer-governance";
import { Waitlist, WaitlistStatus } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { ActivityStatus, FieldType, OrderStatus, PaymentMethod, RegistrationAnswer, RegistrationStatus } from "../../shared/domain";
import { fenToYuan, sameMoneyAmount, yuanToFen } from "../../shared/money";
import { defaultFeatureGates, type FeatureGateKey, normalizeFeatureGates, normalizeLaunchConfig } from "../../shared/launch-config";
import { assertTenantOwnedResourceAccess, normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";
import { validatedUploadFile } from "../../shared/upload-security";
import { claimPrivateDocument, privateDocumentExists, readPrivateDocument, storePrivateDocument } from "../../shared/private-document";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "../../shared/private-asset-token";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";
import { defaultHomepageSections, normalizePageKey } from "../homepage-defaults";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { RefundCompletionService } from "../refund-completion.service";
import { MemberPointsService } from "../member-points/member-points.service";
import { CharityFundService } from "../charity-fund.service";
import { CredentialTemplateService } from "../credential-templates/credential-template.service";
import { AmbassadorApplicationDto, CreateCourseOrderDto, H5CodeDto, H5LoginDto, H5PasswordLoginDto, MockPayDto, MockPaymentCallbackDto, PhoneChangeCodeDto, ProviderPayDto, ProviderPaymentCallbackDto, QuoteDto, RegisterDto, UpdatePasswordDto, UpdatePhoneDto, UpdateProfileDto, VolunteerApplyDto, VolunteerAttendanceSubmitDto, VolunteerServiceConfirmDto, VolunteerTaskApplyDto, VolunteerTaskCancelDto, WechatLoginDto, WechatPhoneDto } from "./dto";

const PUBLIC_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PUBLIC_ATTACHMENT_MIMES = new Set([...PUBLIC_IMAGE_MIMES, "application/pdf"]);
import { PaymentProviderService, RealPaymentCallbackContext, SupportedPaymentProvider } from "./payment-provider.service";
import { tenantEntitlementFeatureForGate, tenantFeatureAccess } from "../admin/tenant-subscription";
import { ObjectStorageService } from "../../shared/object-storage.service";
import { resolveTicketPrice } from "./ticket-pricing";
import { couponLimitError, redemptionLimitError } from "../../shared/promotion-limits";
import { mallCouponClaimError } from "../../shared/mall-review-marketing-governance";
import { memberCanAccessCourse } from "../../shared/course-access-mode";
import { validateRegistrationEligibility } from "./registration-eligibility";
import { growthFromPointLog, levelExpiry, manualLevelOverrideActive, memberLevelScopeKey, memberLevelSnapshot, resolveGrowthLevel } from "../../shared/member-level-engine";
import { checkInNonce, createCheckInTicket } from "../../shared/check-in-ticket";
import { analyticsDateText } from "../../shared/analytics-metrics";
import { buildMemberOrderOverview } from "./member-order-overview";

export type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null; userId?: number | null };
type PublicTrackingContext = { channelCode?: string | null; source?: string | null; inviteCode?: string | null; clientIp?: string | null; userAgent?: string | null };
type TenantLocationTrackingContext = { source?: string | null; clientIp?: string | null; userAgent?: string | null };
type PublicTicketAvailability = {
  soldCount: number;
  remainingSeats: number | null;
  saleStatus: "available" | "sold_out" | "not_started" | "ended";
};

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AdminUser) private readonly adminUsers: Repository<AdminUser>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantRegion) private readonly tenantRegions: Repository<TenantRegion>,
    @InjectRepository(TenantRegionHitLog) private readonly tenantRegionHitLogs: Repository<TenantRegionHitLog>,
    @InjectRepository(ActivityCategory) private readonly categories: Repository<ActivityCategory>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityViewLog) private readonly activityViewLogs: Repository<ActivityViewLog>,
    @InjectRepository(AmbassadorLandingSetting) private readonly ambassadorSettings: Repository<AmbassadorLandingSetting>,
    @InjectRepository(AmbassadorCase) private readonly ambassadorCases: Repository<AmbassadorCase>,
    @InjectRepository(AmbassadorApplication) private readonly ambassadorApplications: Repository<AmbassadorApplication>,
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(HomepageSection) private readonly homepageSections: Repository<HomepageSection>,
    @InjectRepository(MarketingPopup) private readonly marketingPopups: Repository<MarketingPopup>,
    @InjectRepository(AdCampaign) private readonly adCampaigns: Repository<AdCampaign>,
    @InjectRepository(AdDailyStat) private readonly adDailyStats: Repository<AdDailyStat>,
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
    @InjectRepository(MiniprogramReleaseSetting) private readonly miniprogramReleaseSettings: Repository<MiniprogramReleaseSetting>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    @InjectRepository(ActivityChannel) private readonly activityChannels: Repository<ActivityChannel>,
    @InjectRepository(ConversionEvent) private readonly conversionEvents: Repository<ConversionEvent>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseChapter) private readonly courseChapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private readonly courseLessons: Repository<CourseLesson>,
    @InjectRepository(CourseOrder) private readonly courseOrders: Repository<CourseOrder>,
    @InjectRepository(CourseRefund) private readonly courseRefunds: Repository<CourseRefund>,
    @InjectRepository(UserLearning) private readonly userLearning: Repository<UserLearning>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(CommunityPost) private readonly communityPosts: Repository<CommunityPost>,
    @InjectRepository(UserFavorite) private readonly userFavorites: Repository<UserFavorite>,
    @InjectRepository(VolunteerProfile) private readonly volunteerProfiles: Repository<VolunteerProfile>,
    @InjectRepository(VolunteerTrainingRecord) private readonly volunteerTrainingRecords: Repository<VolunteerTrainingRecord>,
    @InjectRepository(VolunteerBadgeAward) private readonly volunteerBadgeAwards: Repository<VolunteerBadgeAward>,
    @InjectRepository(VolunteerTask) private readonly volunteerTasksRepo: Repository<VolunteerTask>,
    @InjectRepository(VolunteerTaskApplication) private readonly volunteerTaskApplicationsRepo: Repository<VolunteerTaskApplication>,
    @InjectRepository(VolunteerAttendanceRecord) private readonly volunteerAttendanceRecords: Repository<VolunteerAttendanceRecord>,
    @InjectRepository(VolunteerServiceRecord) private readonly volunteerServiceRecords: Repository<VolunteerServiceRecord>,
    @InjectRepository(VolunteerHourAdjustment) private readonly volunteerHourAdjustments: Repository<VolunteerHourAdjustment>,
    @InjectRepository(VolunteerServiceProof) private readonly volunteerServiceProofs: Repository<VolunteerServiceProof>,
    private readonly notificationProvider: NotificationProviderService,
    private readonly paymentProvider: PaymentProviderService,
    private readonly refundCompletion: RefundCompletionService,
    private readonly memberPoints: MemberPointsService,
    private readonly charityFund: CharityFundService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly objectStorage: ObjectStorageService,
    private readonly credentialTemplates: CredentialTemplateService
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
    if (!user) user = this.users.create({ phone, nickname: dto.nickname || `本地用户${phone.slice(-4)}`, sourceChannel: "h5" });
    else if (dto.nickname && !user.nickname) user.nickname = dto.nickname;
    user.lastLoginChannel = "h5";
    user.lastLoginAt = new Date();
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
        passwordHash: await bcrypt.hash(password, 10),
        sourceChannel: "h5",
        lastLoginChannel: "h5",
        lastLoginAt: new Date()
      });
      return this.userLoginResponse(await this.users.save(user));
    }
    if (!user.passwordHash) throw new BadRequestException("该手机号尚未设置密码，请联系管理员设置初始密码或使用验证码登录");
    if (!(await bcrypt.compare(password, user.passwordHash))) throw new BadRequestException("手机号或密码错误");
    if (dto.nickname && !user.nickname) {
      user.nickname = dto.nickname;
    }
    user.lastLoginChannel = "h5";
    user.lastLoginAt = new Date();
    user = await this.users.save(user);
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

  async myProfile(user: User, context?: PublicTenantContext) {
    const fresh = await this.users.findOneBy({ id: user.id });
    if (!fresh) throw new UnauthorizedException("登录已失效，请重新登录");
    const tenant = await this.resolveTenantContext(context);
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    let profile = await this.memberProfiles.findOne({ where: { user: { id: fresh.id }, tenantScopeKey } });
    if (!profile) profile = await this.refreshMemberProfile(fresh, tenant);
    const levels = await this.memberLevels.find({ where: { enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) }, order: { minGrowth: "ASC" } });
    const nextLevel = levels.find(level => level.minGrowth > Number(profile?.growthValue || 0)) || null;
    return {
      id: fresh.id,
      phone: fresh.phone,
      nickname: fresh.nickname,
      avatarUrl: fresh.avatarUrl,
      sourceChannel: fresh.sourceChannel,
      lastLoginChannel: fresh.lastLoginChannel,
      wechatBound: Boolean(fresh.openid),
      wechatAppId: fresh.wechatAppId,
      hasPassword: Boolean(fresh.passwordHash),
      memberLevel: profile?.level ? { ...memberLevelSnapshot(profile.level), ...(profile.levelSnapshot || {}), id: profile.level.id, expiresAt: profile.levelExpiresAt } : null,
      points: profile?.points || 0,
      growthValue: profile?.growthValue || 0,
      nextLevel: nextLevel ? { id: nextLevel.id, name: nextLevel.name, minGrowth: nextLevel.minGrowth, remainingGrowth: Math.max(nextLevel.minGrowth - Number(profile?.growthValue || 0), 0) } : null,
      memberScope: tenant ? { tenantId: tenant.id, tenantCode: tenant.code, tenantName: tenant.name } : { tenantId: null, tenantCode: null, tenantName: "平台" }
    };
  }

  async createCourseOrder(courseId: number, dto: CreateCourseOrderDto, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const course = await this.courses.findOne({ where: this.tenantCourseWhere({ id: courseId, status: "published" }, tenant) });
    if (!course) throw new NotFoundException("内容不存在或未发布");
    const clientOrderKey = String(dto.clientOrderKey || "").trim().slice(0, 120) || null;
    if (clientOrderKey) {
      const idempotentOrder = await this.courseOrders.findOne({ where: { user: { id: user.id }, clientOrderKey } });
      if (idempotentOrder) {
        if (idempotentOrder.course.id !== course.id) throw new ConflictException("课程订单业务键已被其他课程使用");
        return { owned: await this.hasCourseAccess(user.id, course.id), order: this.publicCourseOrder(idempotentOrder), course: this.publicCourse(course), idempotent: true };
      }
    }
    if (await this.hasCourseAccess(user.id, course.id)) {
      return { owned: true, order: null, course: this.publicCourse(course) };
    }

    if (course.accessMode === "redeem") throw new BadRequestException("该课程仅支持兑换码加入，请在个人中心输入课程兑换码");
    const memberProfile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey: memberLevelScopeKey(tenant) } });
    const currentMemberLevelSnapshot = memberProfile?.levelSnapshot || memberLevelSnapshot(memberProfile?.level);
    let entitlementSource = "purchase";
    if (course.accessMode === "member") {
      const levelSnapshot = memberProfile?.levelSnapshot as Record<string, unknown> | null | undefined;
      const allowed = memberCanAccessCourse({ accessMode: course.accessMode, requiredLevelSort: course.requiredMemberLevel?.sortOrder, memberLevelSort: Number(levelSnapshot?.sortOrder ?? memberProfile?.level?.sortOrder ?? 0), benefits: Array.isArray(levelSnapshot?.benefits) ? levelSnapshot.benefits as any[] : memberProfile?.level?.benefits });
      if (!allowed) throw new ForbiddenException(course.requiredMemberLevel ? `该课程仅限「${course.requiredMemberLevel.name}」及以上会员` : "当前会员等级未包含该课程权益");
      entitlementSource = "member";
    }

    const amount = course.accessMode === "member" ? 0 : Number(course.price || 0);
    const paymentMethod = amount > 0 ? dto.paymentMethod || PaymentMethod.Offline : PaymentMethod.Free;
    const courseOrderSnapshot = {
      amount: amount.toFixed(2),
      paymentMethod,
      courseId: course.id,
      courseTitle: course.title,
      tenantId: course.tenant?.id || null,
      entitlementSource,
      accessMode: course.accessMode,
      requiredMemberLevelId: course.requiredMemberLevel?.id || null,
      requiredMemberLevel: memberLevelSnapshot(course.requiredMemberLevel),
      memberLevel: currentMemberLevelSnapshot,
      clientOrderKey
    };
    if (amount <= 0) {
      let order: CourseOrder;
      try {
        order = await this.courseOrders.save(this.courseOrders.create({
        orderNo: this.generateCourseOrderNo(),
        user,
        course,
        amount: "0.00",
        paymentMethod,
        status: CourseOrderStatus.Paid,
        transactionNo: `FREE-${Date.now()}`,
        paidAt: new Date(),
        expiresAt: null,
        closedAt: null,
        closeReason: null,
        clientOrderKey,
        businessSnapshot: courseOrderSnapshot
        }));
      } catch (error: any) {
        if (!clientOrderKey || !["ER_DUP_ENTRY", "23505"].includes(String(error?.code || ""))) throw error;
        const existingOrder = await this.courseOrders.findOne({ where: { user: { id: user.id }, clientOrderKey } });
        if (!existingOrder) throw error;
        return { owned: await this.hasCourseAccess(user.id, course.id), order: this.publicCourseOrder(existingOrder), course: this.publicCourse(course), idempotent: true };
      }
      await this.grantCourseAccess(user, course);
      return { owned: true, order: this.publicCourseOrder(order), course: this.publicCourse(course) };
    }
    if (![PaymentMethod.Wechat, PaymentMethod.Alipay, PaymentMethod.Balance, PaymentMethod.Offline].includes(paymentMethod)) throw new BadRequestException("当前课程不支持该支付方式");
    await this.assertPaymentMethodEnabled(paymentMethod, tenant);

    const existing = await this.courseOrders.findOne({
      where: { user: { id: user.id }, course: { id: course.id }, status: CourseOrderStatus.PendingPayment },
      order: { createdAt: "DESC" }
    });
    if (existing && !this.isExpiredCourseOrder(existing)) return { owned: false, order: this.publicCourseOrder(existing), course: this.publicCourse(course) };

    let order: CourseOrder;
    try {
      order = await this.courseOrders.save(this.courseOrders.create({
        orderNo: this.generateCourseOrderNo(),
        user,
        course,
        amount: amount.toFixed(2),
        paymentMethod,
        status: CourseOrderStatus.PendingPayment,
        transactionNo: null,
        paidAt: null,
        expiresAt: this.paymentExpiresAt(amount),
        closedAt: null,
        closeReason: null,
        clientOrderKey,
        businessSnapshot: courseOrderSnapshot
      }));
    } catch (error: any) {
      if (!clientOrderKey || !["ER_DUP_ENTRY", "23505"].includes(String(error?.code || ""))) throw error;
      const existingOrder = await this.courseOrders.findOne({ where: { user: { id: user.id }, clientOrderKey } });
      if (!existingOrder) throw error;
      if (existingOrder.course.id !== course.id) throw new ConflictException("课程订单业务键已被其他课程使用");
      return { owned: await this.hasCourseAccess(user.id, course.id), order: this.publicCourseOrder(existingOrder), course: this.publicCourse(course), idempotent: true };
    }
    return { owned: false, order: this.publicCourseOrder(order), course: this.publicCourse(course) };
  }

  async courseOrderDetail(orderId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("内容订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    return { order: this.publicCourseOrder(order), course: this.publicCourse(order.course), owned: await this.hasCourseAccess(user.id, order.course.id) };
  }

  async mockPayCourseOrder(orderId: number, dto: MockPayDto, user: User, context?: PublicTenantContext) {
    this.paymentProvider.assertSandboxAllowed("内容 mock 支付");
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("内容订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    if (order.status === CourseOrderStatus.Paid) {
      await this.grantCourseAccess(user, order.course);
      return { order: this.publicCourseOrder(order), course: this.publicCourse(order.course), owned: true };
    }
    if (order.status !== CourseOrderStatus.PendingPayment) throw new BadRequestException("当前内容订单不可支付");
    if (this.isExpiredCourseOrder(order)) {
      order.status = CourseOrderStatus.Closed;
      order.closedAt = new Date();
      order.closeReason = "内容订单超时关闭";
      await this.courseOrders.save(order);
      throw new BadRequestException("内容订单已超时，请重新下单");
    }
    const saved = await this.applySuccessfulCoursePayment(order, dto.transactionNo || `COURSE-MOCK-${Date.now()}`);
    return { order: this.publicCourseOrder(saved), course: this.publicCourse(saved.course), owned: true };
  }

  async createCourseProviderPayment(orderId: number, provider: SupportedPaymentProvider, dto: ProviderPayDto, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("内容订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    if (order.status === CourseOrderStatus.Paid) return { alreadyPaid: true, order: this.publicCourseOrder(order) };
    if (order.status !== CourseOrderStatus.PendingPayment) throw new BadRequestException("当前内容订单不可支付");
    if (this.isExpiredCourseOrder(order)) {
      await this.closeCourseOrder(order, "内容订单超时关闭");
      throw new BadRequestException("内容订单已超时，请重新下单");
    }
    if (order.paymentMethod !== provider) throw new BadRequestException("内容订单支付方式不匹配");
    const paymentDto = provider === "wechat" && dto.paymentScene === "jsapi" && !dto.openId && user.openid ? { ...dto, openId: user.openid } : dto;
    return this.paymentProvider.createPayment(provider, this.courseOrderPaymentView(order), paymentDto, {
      notifyUrl: this.coursePaymentNotifyUrl(provider),
      callbackPath: `/payment/course/${provider}/callback`
    });
  }

  async payCourseOrderWithBalance(orderId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("内容订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    await this.assertPaymentMethodEnabled(PaymentMethod.Balance, tenant);
    if (order.paymentMethod !== PaymentMethod.Balance) throw new BadRequestException("内容订单支付方式不匹配");
    const idempotencyKey = `course_balance_pay:${order.id}`;
    if (order.status === CourseOrderStatus.Paid) {
      const existing = await this.walletTransactions.findOne({ where: { idempotencyKey }, loadEagerRelations: false });
      return { order: this.publicCourseOrder(order), walletTransaction: this.publicWalletTransaction(existing), owned: true, idempotent: true };
    }
    if (order.status !== CourseOrderStatus.PendingPayment) throw new BadRequestException("当前内容订单不能使用余额支付");
    if (this.isExpiredCourseOrder(order)) {
      await this.closeCourseOrder(order, "内容订单超时关闭");
      throw new BadRequestException("内容订单已超时，请重新下单");
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(CourseOrder);
      const walletRepo = manager.getRepository(UserWallet);
      const walletTxRepo = manager.getRepository(WalletTransaction);
      const paymentTxRepo = manager.getRepository(PaymentTransaction);
      const learningRepo = manager.getRepository(UserLearning);
      const locked = await orderRepo.findOne({ where: { id: order.id }, relations: ["user", "course", "course.tenant"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!locked) throw new NotFoundException("内容订单不存在");
      if (locked.status === CourseOrderStatus.Paid) return { order: locked, walletTransaction: await walletTxRepo.findOne({ where: { idempotencyKey }, loadEagerRelations: false }), idempotent: true };
      if (locked.status !== CourseOrderStatus.PendingPayment || locked.paymentMethod !== PaymentMethod.Balance) throw new BadRequestException("当前内容订单不能使用余额支付");
      if (this.isExpiredCourseOrder(locked)) throw new BadRequestException("内容订单已超时，请重新下单");

      const tenantScopeKey = this.walletTenantScopeKey(locked.course.tenant);
      let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant: locked.course.tenant, tenantScopeKey }));
      const amountFen = Number(locked.amountFen || yuanToFen(locked.amount));
      const cashBeforeFen = yuanToFen(wallet.availableBalance || 0);
      const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
      if (cashBeforeFen + giftBeforeFen < amountFen) throw new BadRequestException("余额不足，请选择其他支付方式或联系后台充值");
      const giftUsedFen = Math.min(giftBeforeFen, amountFen);
      const cashUsedFen = amountFen - giftUsedFen;
      const cashAfterFen = cashBeforeFen - cashUsedFen;
      const giftAfterFen = giftBeforeFen - giftUsedFen;
      wallet.availableBalance = fenToYuan(cashAfterFen);
      wallet.giftBalance = fenToYuan(giftAfterFen);
      wallet.totalSpent = (Number(wallet.totalSpent || 0) + amountFen / 100).toFixed(2);
      await walletRepo.save(wallet);
      const walletTransaction = await walletTxRepo.save(walletTxRepo.create({
        wallet,
        user,
        tenant: locked.course.tenant,
        order: null,
        transactionNo: `COURSEBAL${Date.now()}${locked.id}`,
        direction: "debit",
        type: "balance_pay",
        amount: fenToYuan(amountFen),
        balanceBefore: fenToYuan(cashBeforeFen),
        balanceAfter: fenToYuan(cashAfterFen),
        frozenBefore: wallet.frozenBalance || "0.00",
        frozenAfter: wallet.frozenBalance || "0.00",
        giftBefore: fenToYuan(giftBeforeFen),
        giftAfter: fenToYuan(giftAfterFen),
        frozenGiftBefore: wallet.frozenGiftBalance || "0.00",
        frozenGiftAfter: wallet.frozenGiftBalance || "0.00",
        operator: "user",
        remark: `课程订单余额支付：${locked.orderNo}`,
        idempotencyKey
      }));
      locked.status = CourseOrderStatus.Paid;
      locked.transactionNo = walletTransaction.transactionNo;
      locked.paidAt = new Date();
      locked.expiresAt = null;
      const savedOrder = await orderRepo.save(locked);
      await paymentTxRepo.save(paymentTxRepo.create({ order: null, tenant: locked.course.tenant, transactionNo: walletTransaction.transactionNo, provider: "balance", paymentMethod: PaymentMethod.Balance, amount: savedOrder.amount, businessType: "course", businessOrderNo: savedOrder.orderNo, businessSnapshot: { courseId: locked.course.id, courseTitle: locked.course.title, orderNo: savedOrder.orderNo, amount: savedOrder.amount, paymentMethod: PaymentMethod.Balance }, status: "success", reconciliationStatus: "matched", remark: "课程余额支付" }));
      let learning = await learningRepo.findOne({ where: { userId: user.id, courseId: locked.course.id, lessonId: 0 } });
      if (!learning) learning = learningRepo.create({ userId: user.id, courseId: locked.course.id, lessonId: 0, progress: 0, completedAt: null });
      await learningRepo.save(learning);
      return { order: savedOrder, walletTransaction, idempotent: false };
    });
    return { order: this.publicCourseOrder(result.order), walletTransaction: this.publicWalletTransaction(result.walletTransaction), owned: true, idempotent: result.idempotent };
  }

  async courseProviderPaymentCallback(provider: SupportedPaymentProvider, dto: ProviderPaymentCallbackDto | Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    const realProvider = await this.paymentProvider.usesRealProvider(provider);
    const context = { body: dto as Record<string, unknown>, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const extractedOrderNo = realProvider ? await this.paymentProvider.extractRealCallbackOrderNo(provider, context) : null;
    const preloaded = extractedOrderNo ? await this.courseOrders.findOne({ where: { orderNo: extractedOrderNo } }) : null;
    if (realProvider && !preloaded) throw new NotFoundException("内容订单不存在");
    const callback = realProvider
      ? await this.paymentProvider.parseRealPaymentCallbackForOrder(provider, this.courseOrderPaymentView(preloaded!), context)
      : this.paymentProvider.parsePaymentCallback(provider, dto as ProviderPaymentCallbackDto);
    if (!callback.signatureValid) throw new BadRequestException("内容支付回调签名验证失败");
    if (extractedOrderNo && callback.orderNo !== extractedOrderNo) throw new BadRequestException("内容支付回调订单号不一致");
    const order = preloaded || await this.courseOrders.findOne({ where: { orderNo: callback.orderNo } });
    if (!order) throw new NotFoundException("内容订单不存在");
    if (order.paymentMethod !== provider) throw new BadRequestException("内容订单支付方式不匹配");
    if (!sameMoneyAmount(order.amount, callback.amount)) throw new BadRequestException("内容支付回调金额与订单金额不一致");
    const saved = await this.applySuccessfulCoursePayment(order, callback.transactionNo);
    return { success: true, idempotent: order.status === CourseOrderStatus.Paid, order: this.publicCourseOrder(saved) };
  }

  async queryCourseOrderPayment(orderId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("内容订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    if (![PaymentMethod.Wechat, PaymentMethod.Alipay].includes(order.paymentMethod)) {
      return { provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, transactionNo: order.transactionNo, amount: order.amount, status: order.status === CourseOrderStatus.Paid ? "success" : order.status === CourseOrderStatus.Closed ? "closed" : "pending", localStatus: order.status };
    }
    const result = await this.paymentProvider.queryPayment(order.paymentMethod as SupportedPaymentProvider, this.courseOrderPaymentView(order));
    if (result.status === "success" && order.status === CourseOrderStatus.PendingPayment) {
      if (!sameMoneyAmount(order.amount, result.amount)) throw new BadRequestException("支付渠道金额与内容订单金额不一致，请联系管理员处理");
      await this.applySuccessfulCoursePayment(order, result.transactionNo || `QUERY_${order.orderNo}`);
    }
    const fresh = await this.courseOrders.findOneByOrFail({ id: order.id });
    return { ...result, localStatus: fresh.status, owned: fresh.status === CourseOrderStatus.Paid };
  }

  async closeCourseOrderPayment(orderId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("内容订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    if (order.status === CourseOrderStatus.Paid) throw new BadRequestException("内容订单已支付，不能关闭");
    if (order.status === CourseOrderStatus.Closed) return { status: "already_closed", order: this.publicCourseOrder(order) };
    let providerResult: Record<string, unknown> = { provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, status: "closed" };
    if ([PaymentMethod.Wechat, PaymentMethod.Alipay].includes(order.paymentMethod)) {
      const result = await this.paymentProvider.closePayment(order.paymentMethod as SupportedPaymentProvider, this.courseOrderPaymentView(order));
      if (result.status === "paid") throw new BadRequestException("支付渠道显示内容订单已支付，请先刷新支付状态");
      providerResult = result;
    }
    const saved = await this.closeCourseOrder(order, "用户关闭内容支付订单");
    return { ...providerResult, order: this.publicCourseOrder(saved) };
  }

  async myCourses(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    return this.myCoursesForTenant(user, tenant);
  }

  async myOrdersOverview(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    return buildMemberOrderOverview(user, tenant, {
      registrations: (userId, scopedTenant) => this.myRegistrationsForTenant(userId, scopedTenant),
      courses: (scopedUser, scopedTenant) => this.myCoursesForTenant(scopedUser, scopedTenant),
      courseOrders: (scopedUser, scopedTenant) => this.myCourseOrdersForTenant(scopedUser, scopedTenant)
    });
  }

  private async myCoursesForTenant(user: User, tenant: Tenant | null) {
    const rows = await this.userLearning.find({ where: { userId: user.id, lessonId: 0 }, order: { updatedAt: "DESC" } });
    if (!rows.length) return [];
    const courseIds = rows.map((row) => row.courseId);
    const courses = await this.courses.find({ where: this.tenantCourseWhere({ id: In(courseIds) }, tenant) });
    const lessonLearning = await this.userLearning.createQueryBuilder("learning").where("learning.userId = :userId", { userId: user.id }).andWhere("learning.courseId IN (:...courseIds)", { courseIds }).andWhere("learning.lessonId > 0").orderBy("learning.updatedAt", "DESC").getMany();
    const lessonIds = Array.from(new Set(lessonLearning.map((row) => row.lessonId)));
    const lessons = lessonIds.length ? await this.courseLessons.find({ where: { id: In(lessonIds) } }) : [];
    return rows
      .map((row) => {
        const course = courses.find((item) => item.id === row.courseId);
        if (!course) return null;
        return {
          ...this.publicCourse(course),
          learning: {
            id: row.id,
            progress: Number(row.progress || 0),
            completedAt: row.completedAt,
            updatedAt: row.updatedAt,
            recentLesson: (() => { const latest = lessonLearning.find((item) => item.courseId === row.courseId); const lesson = latest ? lessons.find((item) => item.id === latest.lessonId) : null; return latest && lesson ? { id: lesson.id, title: lesson.title, progress: Number(latest.progress || 0), updatedAt: latest.updatedAt } : null; })(),
            completionThreshold: Number(course.completionThreshold || 100)
          }
        };
      })
      .filter(Boolean);
  }

  async myCertificates(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const rows = await this.certificates.find({ where: { userId: user.id, tenantId: tenant?.id ?? IsNull() }, loadEagerRelations: false, order: { issuedAt: "DESC" } });
    return rows.map((row) => this.publicCertificate(row, false));
  }

  async verifyCertificate(certificateNo: string) {
    const no = String(certificateNo || "").trim();
    if (!no) throw new BadRequestException("请输入证书编号");
    const certificate = await this.certificates.findOne({ where: { certificateNo: no }, loadEagerRelations: false });
    if (!certificate) throw new NotFoundException("证书不存在");
    const holder = certificate.holderName ? null : await this.users.findOne({ where: { id: certificate.userId } });
    const template = await this.credentialTemplates.ensureCertificateSnapshot(certificate);
    const fullName = certificate.holderName || holder?.nickname || holder?.phone || null;
    const result = certificateVerificationView(certificate, fullName);
    result.holderName = template.config.publicHolderMode === "full" ? fullName : template.config.publicHolderMode === "hidden" ? null : result.holderName;
    return result;
  }

  async certificateImage(certificateNo: string) {
    const no = String(certificateNo || "").trim();
    if (!no) throw new BadRequestException("请输入证书编号");
    const certificate = await this.certificates.findOne({ where: { certificateNo: no }, loadEagerRelations: false });
    if (!certificate) throw new NotFoundException("证书不存在");
    const holder = certificate.holderName ? null : await this.users.findOne({ where: { id: certificate.userId } });
    const template = await this.credentialTemplates.ensureCertificateSnapshot(certificate);
    const fullName = certificate.holderName || holder?.nickname || holder?.phone || null;
    const verification = certificateVerificationView(certificate, fullName);
    const displayName = template.config.publicHolderMode === "full" ? fullName : template.config.publicHolderMode === "hidden" ? "获证人" : verification.holderName;
    return renderCertificateSvg({ certificate, displayName: displayName || (certificate.status === "revoked" ? "已撤销" : "获证人"), template: template.config });
  }

  async myCertificateDownload(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const certificate = await this.certificates.findOne({ where: { id, userId: user.id, tenantId: tenant?.id ?? IsNull() }, loadEagerRelations: false });
    if (!certificate) throw new NotFoundException("证书不存在");
    const displayName = certificate.holderName || user.nickname || user.phone || `用户${user.id}`;
    const template = await this.credentialTemplates.ensureCertificateSnapshot(certificate);
    return renderCertificateSvg({ certificate, displayName, template: template.config });
  }

  private publicCertificate(certificate: Certificate, masked: boolean) {
    return {
      id: certificate.id,
      name: certificate.name,
      certificateNo: certificate.certificateNo,
      templateKey: certificate.templateKey,
      holderName: masked ? this.maskName(certificate.holderName || "") : certificate.holderName,
      serviceHours: Number(certificate.serviceHours || 0),
      level: certificate.level,
      imageUrl: certificate.imageUrl,
      previewUrl: certificate.certificateNo ? `/api/public/certificates/${encodeURIComponent(certificate.certificateNo)}/image` : null,
      threshold: certificate.threshold,
      courseId: certificate.courseId,
      tenantId: certificate.tenantId,
      businessSnapshot: certificate.businessSnapshot,
      status: certificate.status || "active",
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
      verify: { valid: certificate.status !== "revoked", checkedAt: new Date().toISOString() }
    };
  }

  private maskName(value: string) {
    const name = String(value || "").trim();
    if (!name) return "";
    if (name.length <= 1) return "*";
    if (name.length === 2) return `${name[0]}*`;
    return `${name[0]}*${name[name.length - 1]}`;
  }

  async myFavoriteCourses(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const rows = await this.userFavorites.find({ where: { userId: user.id }, order: { createdAt: "DESC" } });
    if (!rows.length) return [];
    const courses = await this.courses.find({ where: this.tenantCourseWhere({ id: In(rows.map((row) => row.courseId)), status: "published" }, tenant) });
    return rows.map((row) => courses.find((course) => course.id === row.courseId)).filter(Boolean);
  }

  async favoriteCourseState(courseId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const course = await this.courses.findOne({ where: this.tenantCourseWhere({ id: courseId, status: "published" }, tenant) });
    if (!course) throw new NotFoundException("内容不存在或未发布");
    const count = await this.userFavorites.count({ where: { userId: user.id, courseId } });
    return { courseId, favorited: count > 0 };
  }

  async toggleFavoriteCourse(courseId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    return this.dataSource.transaction(async (manager) => {
      const courseRepo = manager.getRepository(Course);
      const favoriteRepo = manager.getRepository(UserFavorite);
      const course = await courseRepo.findOne({
        where: this.tenantCourseWhere({ id: courseId, status: "published" }, tenant),
        lock: { mode: "pessimistic_write" }
      });
      if (!course) throw new NotFoundException("内容不存在或未发布");
      const row = await favoriteRepo.findOne({ where: { userId: user.id, courseId }, lock: { mode: "pessimistic_write" } });
      if (row) {
        await favoriteRepo.delete(row.id);
        return { courseId, favorited: false };
      }
      try {
        await favoriteRepo.save(favoriteRepo.create({ userId: user.id, courseId }));
      } catch (error: any) {
        if (!this.isDuplicateKeyError(error)) throw error;
      }
      return { courseId, favorited: true };
    });
  }

  async updateMyProfile(user: User, dto: UpdateProfileDto, context?: PublicTenantContext) {
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    const nickname = dto.nickname === undefined ? row.nickname : String(dto.nickname || "").trim();
    const avatarUrl = dto.avatarUrl === undefined ? row.avatarUrl : String(dto.avatarUrl || "").trim();
    if (nickname && nickname.length > 40) throw new BadRequestException("昵称不能超过 40 个字");
    if (avatarUrl && avatarUrl.length > 500) throw new BadRequestException("头像地址过长");
    row.nickname = nickname || null;
    row.avatarUrl = avatarUrl || null;
    return this.myProfile(await this.users.save(row), context);
  }

  async updateMyPassword(user: User, dto: UpdatePasswordDto) {
    const password = String(dto.password || "");
    if (password.length < 6 || password.length > 64) throw new BadRequestException("密码长度需为 6-64 位");
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    row.passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(row);
    return { id: row.id, hasPassword: true };
  }

  async phoneChangeCode(dto: PhoneChangeCodeDto, clientIp?: string | null) {
    return this.h5Code({ phone: dto.phone }, clientIp);
  }

  async updateMyPhone(user: User, dto: UpdatePhoneDto, context?: PublicTenantContext) {
    const phone = this.normalizePhone(dto.phone);
    this.verifyH5Token(phone, dto.verificationCode, dto.verificationToken);
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    const exists = await this.users.findOne({ where: { phone } });
    if (exists && exists.id !== row.id) throw new BadRequestException("该手机号已绑定其他账号");
    row.phone = phone;
    if (!row.nickname) row.nickname = `本地用户${phone.slice(-4)}`;
    const saved = await this.users.save(row);
    return this.myProfile(saved, context);
  }

  async bindWechatPhone(user: User, dto: WechatPhoneDto, context?: PublicTenantContext) {
    const code = String(dto.code || "").trim();
    if (!code) throw new BadRequestException("缺少微信手机号授权 code");
    const phone = await this.resolveWechatPhoneNumber(code, dto.appId);
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    const exists = await this.users.findOne({ where: { phone } });
    if (exists && exists.id !== row.id) {
      throw new BadRequestException("该手机号已有账号，请使用手机号登录或联系管理员处理");
    }
    row.phone = phone;
    if (!row.nickname) row.nickname = `微信用户${phone.slice(-4)}`;
    row.lastLoginChannel = row.lastLoginChannel || "mp_weixin";
    row.lastLoginAt = new Date();
    const saved = await this.users.save(row);
    await this.refreshMemberProfile(saved);
    return this.myProfile(saved, context);
  }

  async uploadMyAvatar(user: User, file?: Express.Multer.File, context?: PublicTenantContext) {
    if (!file) throw new BadRequestException("请上传头像图片");
    const validated = validatedUploadFile(file, PUBLIC_IMAGE_MIMES);
    if (!validated) throw new BadRequestException("头像文件内容与格式不匹配，仅支持 JPG、PNG 或 WebP 图片");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const tenant = await this.resolveTenantContext(context);
    const stored = await this.objectStorage.store(validated, `avatars-t${tenant?.id || "platform"}-u${user.id}`);
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    row.avatarUrl = stored.url;
    await this.users.save(row);
    return { url: stored.url, size: validated.size, mimetype: validated.mimetype };
  }

  async uploadMallReviewImage(user: User, file?: Express.Multer.File, context?: PublicTenantContext) {
    if (!file) throw new BadRequestException("请上传评价图片，支持 JPG/PNG/WebP，单张不超过 5MB");
    const validated = validatedUploadFile(file, PUBLIC_IMAGE_MIMES);
    if (!validated) throw new BadRequestException("评价图片内容与格式不匹配，仅支持 JPG、PNG 或 WebP 图片");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const tenant = await this.resolveTenantContext(context);
    const stored = await this.objectStorage.store(validated, `mall-reviews-t${tenant?.id || "platform"}-u${user.id}`);
    return { url: stored.url, size: validated.size, mimetype: validated.mimetype };
  }

  async uploadMallRefundImage(user: User, file?: Express.Multer.File, context?: PublicTenantContext) {
    if (!file) throw new BadRequestException("请上传售后凭证图片，支持 JPG/PNG/WebP，单张不超过 5MB");
    const validated = validatedUploadFile(file, PUBLIC_IMAGE_MIMES);
    if (!validated) throw new BadRequestException("售后凭证内容与格式不匹配，仅支持 JPG、PNG 或 WebP 图片");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const tenant = await this.resolveTenantContext(context);
    const stored = await this.objectStorage.store(validated, `mall-refunds-t${tenant?.id || "platform"}-u${user.id}`);
    return { url: stored.url, size: validated.size, mimetype: validated.mimetype };
  }

  async uploadRegistrationAttachment(user: User, file?: Express.Multer.File, context?: PublicTenantContext) {
    if (!file) throw new BadRequestException("请上传 JPG、PNG、WebP 或 PDF 文件，大小不超过 10MB");
    const validated = validatedUploadFile(file, PUBLIC_ATTACHMENT_MIMES);
    if (!validated) throw new BadRequestException("报名附件内容与格式不匹配，仅支持 JPG、PNG、WebP 或 PDF 文件");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const tenant = await this.resolveTenantContext(context);
    const reference = storePrivateDocument(validated, "registration-attachments");
    const token = createPrivateAssetToken({ v: 1, purpose: "registration_attachment", reference, tenantId: tenant?.id || null, ownerUserId: user.id, originalName: validated.originalname, mimetype: validated.mimetype, size: validated.size }, this.privateAssetSecret());
    return { url: `/api/public/me/registration-attachments/${token}/download`, originalName: validated.originalname, size: validated.size, mimetype: validated.mimetype, private: true };
  }

  async readMyRegistrationAttachment(token: string, user: User, context?: PublicTenantContext) {
    const payload = verifyPrivateAssetToken(token, this.privateAssetSecret());
    if (!payload || payload.purpose !== "registration_attachment" || payload.ownerUserId !== user.id) throw new NotFoundException("报名附件不存在");
    const tenant = await this.resolveTenantContext(context);
    if ((payload.tenantId || null) !== (tenant?.id || null) || !privateDocumentExists(payload.reference)) throw new NotFoundException("报名附件不存在");
    return { buffer: readPrivateDocument(payload.reference), originalName: payload.originalName, mimetype: payload.mimetype };
  }

  async wechatLogin(dto: WechatLoginDto) {
    const identity = await this.resolveWechatIdentity(dto.code, dto.appId);
    const openid = identity.openid;
    let user = await this.users.findOne({ where: { openid } });
    if (!user && identity.unionid) user = await this.users.findOne({ where: { unionid: identity.unionid } });
    if (!user) user = this.users.create({ openid, sourceChannel: "mp_weixin" });
    user.openid = openid;
    user.wechatAppId = identity.appId || user.wechatAppId;
    user.unionid = identity.unionid || user.unionid;
    user.sourceChannel = user.sourceChannel || "mp_weixin";
    user.lastLoginChannel = "mp_weixin";
    user.lastLoginAt = new Date();
    user.nickname = dto.nickname || user.nickname || `微信用户${openid.slice(-6).toUpperCase()}`;
    user.avatarUrl = dto.avatarUrl || user.avatarUrl;
    const saved = await this.users.save(user);
    await this.refreshMemberProfile(saved);
    return this.userLoginResponse(saved);
  }

  async categoriesList(context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const builder = this.categories
      .createQueryBuilder("category")
      .leftJoin("category.tenant", "tenant")
      .where("category.enabled = :enabled", { enabled: true })
      .andWhere("category.publicVisible = :publicVisible", { publicVisible: true })
      .andWhere("category.scene = :scene", { scene: "activity" })
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

  async publicTenantBootstrap() {
    const tenants = await this.publicTenants();
    const setting = await this.operationSettings.findOne({ where: { id: 1 } });
    const configuredCode = String(setting?.defaultTenantCode || "").trim();
    const defaultTenant = tenants.find((tenant) => tenant?.code === configuredCode) || tenants[0] || null;
    return {
      tenants,
      defaultTenant,
      policy: {
        precedence: ["route", "manual", "location", "server_default", "build_default", "first_enabled"],
        serverDefaultTenantCode: defaultTenant?.code || null,
        selectionPersistence: "device",
        assetScope: "tenant",
        assetScopeMessage: "报名、订单、钱包、积分、课程和优惠权益按当前城市商家分别展示，切换不会删除原城市数据"
      }
    };
  }

  async resolveTenantByLocation(latitudeText?: string, longitudeText?: string, tracking: TenantLocationTrackingContext = {}) {
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new BadRequestException("定位纬度无效");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new BadRequestException("定位经度无效");
    const regions = await this.tenantRegions
      .createQueryBuilder("region")
      .leftJoinAndSelect("region.tenant", "tenant")
      .where("region.enabled = :enabled", { enabled: true })
      .andWhere("region.authorizationStatus = :authorizationStatus", { authorizationStatus: "approved" })
      .andWhere("(region.validFrom IS NULL OR region.validFrom <= CURRENT_DATE())")
      .andWhere("(region.validUntil IS NULL OR region.validUntil >= CURRENT_DATE())")
      .andWhere("tenant.enabled = :tenantEnabled", { tenantEnabled: true })
      .orderBy("region.priority", "DESC")
      .addOrderBy("region.id", "ASC")
      .getMany();
    const matches = regions
      .map((region) => {
        const distanceMeters = Math.round(this.geoDistanceMeters(latitude, longitude, Number(region.latitude), Number(region.longitude)));
        const boundaryPoints = this.tenantRegionBoundaryPoints(region);
        return {
          region,
          distanceMeters,
          matchedByPolygon: boundaryPoints.length >= 3 && this.pointInPolygon(latitude, longitude, boundaryPoints),
          matchedByRadius: boundaryPoints.length < 3 && distanceMeters <= Number(region.radiusMeters || 0)
        };
      })
      .filter((item) => item.matchedByPolygon || item.matchedByRadius)
      .sort((a, b) => b.region.priority - a.region.priority || a.distanceMeters - b.distanceMeters || a.region.id - b.region.id);
    const match = matches[0] || null;
    void this.recordTenantRegionHitLog(latitude, longitude, match, tracking);
    return {
      matched: Boolean(match),
      fallback: !match,
      tenant: match ? this.publicHomepageTenant(match.region.tenant) : null,
      region: match ? this.publicTenantRegion(match.region, match.distanceMeters) : null,
      candidates: matches.slice(0, 5).map((item) => ({ tenant: this.publicHomepageTenant(item.region.tenant), region: this.publicTenantRegion(item.region, item.distanceMeters) })),
      tenants: match ? [] : await this.publicTenants(),
      message: match ? `已根据当前位置匹配：${match.region.tenant.name}` : "当前位置暂无匹配商家，请手动选择城市/商家"
    };
  }

  async operationSetting(context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const setting = await this.ensureOperationSetting(tenant);
    const [platformSetting, miniprogramRelease] = await Promise.all([
      this.platformOperationSetting(setting),
      this.miniprogramReleaseSettings.findOne({ where: {}, order: { id: "ASC" } })
    ]);
    const result = {
      ...this.publicOperationSetting(setting, platformSetting),
      miniprogramVersion: String(miniprogramRelease?.version || "").trim() || null
    };
    const launchConfig = (result as Record<string, any>).launchConfig;
    if (tenant && launchConfig?.featureGates) {
      for (const key of Object.keys(defaultFeatureGates) as FeatureGateKey[]) {
        const entitlementFeature = tenantEntitlementFeatureForGate(key);
        if (entitlementFeature && !tenantFeatureAccess(tenant.settings as any, entitlementFeature).allowed) launchConfig.featureGates[key] = false;
      }
    }
    return result;
  }

  async isFeatureGateEnabled(context: PublicTenantContext | undefined, key: FeatureGateKey) {
    const tenant = await this.resolveTenantContext(context);
    const setting = await this.ensureOperationSetting(tenant);
    const launchConfig = this.publicLaunchConfig(setting.launchConfig, (await this.platformOperationSetting(setting))?.launchConfig);
    if (launchConfig.featureGates[key] === false) return false;
    const entitlementFeature = tenantEntitlementFeatureForGate(key);
    if (!tenant || !entitlementFeature) return true;
    return tenantFeatureAccess(tenant.settings as any, entitlementFeature).allowed;
  }

  async assertFeatureGateEnabled(context: PublicTenantContext | undefined, key: FeatureGateKey, message = "功能暂未开放") {
    if (!(await this.isFeatureGateEnabled(context, key))) throw new NotFoundException(message);
    return this.resolveTenantContext(context);
  }

  async marketingPopup(context?: PublicTenantContext, pageKey = "home", platform = "h5") {
    const tenant = await this.resolveTenantContext(context);
    const now = new Date();
    const builder = this.marketingPopups
      .createQueryBuilder("popup")
      .leftJoinAndSelect("popup.tenant", "tenant")
      .where("popup.enabled = :enabled", { enabled: true })
      .andWhere("(popup.startAt IS NULL OR popup.startAt <= :now)", { now })
      .andWhere("(popup.endAt IS NULL OR popup.endAt >= :now)", { now })
      .orderBy("popup.priority", "DESC")
      .addOrderBy("popup.updatedAt", "DESC")
      .addOrderBy("popup.id", "DESC")
      .take(30);
    if (tenant) builder.andWhere("popup.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("popup.tenantId IS NULL");
    const rows = await builder.getMany();
    const memberLevelId = await this.publicAudienceMemberLevelId(context?.userId, tenant?.id);
    const row = rows.find((item) => this.marketingPopupMatches(item.platforms, platform) && this.marketingPopupMatches(item.placements, pageKey) && contentAudienceMatches(item.audience, context?.userId, memberLevelId));
    return row ? this.publicMarketingPopup(row) : null;
  }

  async recordMarketingPopupEvent(id: number, event: string, pageKey: string, platform: string, context?: PublicTenantContext) {
    if (!["impression", "click", "close"].includes(event)) throw new BadRequestException("不支持的营销弹窗事件");
    if (!["home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "mall_product_detail", "community_home", "user_my"].includes(pageKey)) throw new BadRequestException("不支持的营销弹窗页面");
    if (!["h5", "mp-weixin"].includes(platform)) throw new BadRequestException("不支持的营销弹窗平台");
    const tenant = await this.resolveTenantContext(context);
    const memberLevelId = await this.publicAudienceMemberLevelId(context?.userId, tenant?.id);
    const now = new Date();
    const counter = marketingPopupEventCounter(event);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(MarketingPopup);
      const builder = repository.createQueryBuilder("popup").leftJoinAndSelect("popup.tenant", "tenant").where("popup.id = :id", { id }).setLock("pessimistic_write");
      if (tenant) builder.andWhere("popup.tenantId = :tenantId", { tenantId: tenant.id });
      else builder.andWhere("popup.tenantId IS NULL");
      const row = await builder.getOne();
      if (!row || !row.enabled || row.startAt && row.startAt > now || row.endAt && row.endAt < now) return { ok: true, ignored: true };
      if (!this.marketingPopupMatches(row.platforms, platform) || !this.marketingPopupMatches(row.placements, pageKey)) return { ok: true, ignored: true };
      if (!contentAudienceMatches(row.audience, context?.userId, memberLevelId)) return { ok: true, ignored: true };
      row[counter] = Number(row[counter] || 0) + 1;
      await repository.save(row);
      return { ok: true };
    });
  }

  async adSlot(context?: PublicTenantContext, pageKey = "home", slotKey = "home_top_banner", platform = "h5") {
    if (!(await this.isFeatureGateEnabled(context, "adCenter"))) return null;
    const tenant = await this.resolveTenantContext(context);
    const now = new Date();
    const builder = this.adCampaigns
      .createQueryBuilder("campaign")
      .leftJoinAndSelect("campaign.tenant", "tenant")
      .leftJoinAndSelect("campaign.advertiser", "advertiser")
      .leftJoinAndSelect("campaign.contract", "contract")
      .where("campaign.enabled = :enabled", { enabled: true })
      .andWhere("(campaign.startAt IS NULL OR campaign.startAt <= :now)", { now })
      .andWhere("(campaign.endAt IS NULL OR campaign.endAt >= :now)", { now })
      .andWhere("campaign.slotKey = :slotKey", { slotKey })
      .orderBy("campaign.priority", "DESC")
      .addOrderBy("campaign.updatedAt", "DESC")
      .addOrderBy("campaign.id", "DESC")
      .take(30);
    if (tenant) builder.andWhere("campaign.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("campaign.tenantId IS NULL");
    const rows = await builder.getMany();
    const memberLevelId = await this.publicAudienceMemberLevelId(context?.userId, tenant?.id);
    let row: AdCampaign | undefined;
    for (const item of rows) {
      if (!this.adCampaignMatches(item, pageKey, platform) || !contentAudienceMatches(item.audience, context?.userId, memberLevelId)) continue;
      const stat = await this.adDailyStats.createQueryBuilder("stat").where("stat.campaignId = :campaignId", { campaignId: item.id }).andWhere("stat.statDate = :statDate", { statDate: this.todayDateText() }).getOne();
      if (!this.adBudgetExceeded(item, stat)) { row = item; break; }
    }
    return row ? this.publicAdCampaign(row) : null;
  }

  async recordAdSlotEvent(id: number, event: string, platform = "h5", context?: PublicTenantContext) {
    if (!(await this.isFeatureGateEnabled(context, "adCenter"))) return { ok: true, ignored: true };
    const tenant = await this.resolveTenantContext(context);
    return this.dataSource.transaction(async (manager) => {
    const campaignRepo = manager.getRepository(AdCampaign);
    const statRepo = manager.getRepository(AdDailyStat);
    const campaignQuery = campaignRepo.createQueryBuilder("campaign").setLock("pessimistic_write").leftJoinAndSelect("campaign.tenant", "tenant").leftJoinAndSelect("campaign.advertiser", "advertiser").leftJoinAndSelect("campaign.contract", "contract").where("campaign.id = :id", { id });
    if (tenant) campaignQuery.andWhere("campaign.tenantId = :tenantId", { tenantId: tenant.id });
    else campaignQuery.andWhere("campaign.tenantId IS NULL");
    const row = await campaignQuery.getOne();
    if (!row) return { ok: true, ignored: true };
    const now = new Date();
    if (!row.enabled || (row.startAt && row.startAt > now) || (row.endAt && row.endAt < now)) return { ok: true, ignored: true };
    const normalizedEvent = this.normalizeAdEvent(event);
    const statDate = this.todayDateText();
    let stat = await statRepo
      .createQueryBuilder("stat")
      .leftJoinAndSelect("stat.campaign", "campaign")
      .where("stat.campaignId = :campaignId", { campaignId: row.id })
      .andWhere("stat.statDate = :statDate", { statDate })
      .andWhere("stat.platform = :platform", { platform })
      .getOne();
    if (this.adBudgetExceeded(row, stat)) {
      row.enabled = false;
      await campaignRepo.save(row);
      return { ok: true, ignored: true, disabled: true };
    }
    const spentDelta = this.adEventSpentDelta(row, normalizedEvent);
    if (normalizedEvent === "impression") row.impressionCount = Number(row.impressionCount || 0) + 1;
    else if (normalizedEvent === "click") row.clickCount = Number(row.clickCount || 0) + 1;
    else if (normalizedEvent === "skip") row.skipCount = Number(row.skipCount || 0) + 1;
    else if (normalizedEvent === "close") row.closeCount = Number(row.closeCount || 0) + 1;
    else if (normalizedEvent === "load") row.loadCount = Number(row.loadCount || 0) + 1;
    else if (normalizedEvent === "error") row.errorCount = Number(row.errorCount || 0) + 1;
    else if (normalizedEvent === "reward") row.rewardCount = Number(row.rewardCount || 0) + 1;
    row.spentAmount = this.adRoundMoney(this.adMoney(row.spentAmount) + spentDelta).toFixed(2);
    if (!stat) {
      stat = statRepo.create({
        tenant: row.tenant,
        advertiser: row.advertiser,
        contract: row.contract,
        campaign: row,
        statDate,
        source: row.source,
        format: row.format,
        slotKey: row.slotKey,
        pageKey: row.pageKey,
        platform,
        impressionCount: 0,
        clickCount: 0,
        skipCount: 0,
        closeCount: 0,
        loadCount: 0,
        errorCount: 0,
        rewardCount: 0,
        spentAmount: "0.00"
      });
    }
    if (normalizedEvent === "impression") stat.impressionCount = Number(stat.impressionCount || 0) + 1;
    else if (normalizedEvent === "click") stat.clickCount = Number(stat.clickCount || 0) + 1;
    else if (normalizedEvent === "skip") stat.skipCount = Number(stat.skipCount || 0) + 1;
    else if (normalizedEvent === "close") stat.closeCount = Number(stat.closeCount || 0) + 1;
    else if (normalizedEvent === "load") stat.loadCount = Number(stat.loadCount || 0) + 1;
    else if (normalizedEvent === "error") stat.errorCount = Number(stat.errorCount || 0) + 1;
    else if (normalizedEvent === "reward") stat.rewardCount = Number(stat.rewardCount || 0) + 1;
    stat.spentAmount = this.adRoundMoney(this.adMoney(stat.spentAmount) + spentDelta).toFixed(2);

    if (this.adBudgetExceeded(row, stat)) row.enabled = false;
    await statRepo.save(stat);
    await campaignRepo.save(row);
    return { ok: true, disabled: !row.enabled };
    });
  }

  charitySummary() {
    return this.charityFund.publicSummary();
  }

  charityProjects() {
    return this.charityFund.publicProjects();
  }

  charityProjectUpdates(projectId: number) {
    return this.charityFund.publicProjectUpdates(projectId);
  }

  async ambassadorLanding() {
    const setting = await this.ambassadorSettings.findOne({ where: {}, order: { id: "ASC" } });
    const cases = await this.ambassadorCases.find({ where: { enabled: true }, order: { sortOrder: "ASC", id: "ASC" } });
    return {
      setting: {
        enabled: setting?.enabled !== false,
        config: this.mergeAmbassadorConfig(setting?.config)
      },
      cases
    };
  }

  async submitAmbassadorApplication(dto: AmbassadorApplicationDto) {
    let businessKey: string;
    try { businessKey = ecosystemBusinessKey(dto.businessKey, "申请业务键"); } catch (error: any) { throw new BadRequestException(error.message); }
    const replay = await this.ambassadorApplications.findOne({ where: { businessKey } });
    if (replay) return { id: replay.id, status: replay.status, kind: replay.kind, submittedAt: replay.createdAt, replayed: true };
    const phone = this.normalizePhone(dto.phone);
    const name = String(dto.name || "").trim();
    const city = String(dto.city || "").trim();
    const expertise = String(dto.expertise || "").trim();
    const experience = String(dto.experience || "").trim();
    const wechat = String(dto.wechat || "").trim();
    const source = this.cleanTrackingText(dto.source, 80) || null;
    const channelCode = this.cleanTrackingText(dto.channelCode, 80) || null;
    const kind = dto.kind || (["dean_recruit", "partner_apply", "brand_story_contact"].includes(String(source || "")) ? "partner" : "ambassador");
    if (!name) throw new BadRequestException("请填写姓名");
    if (!city) throw new BadRequestException("请填写城市");
    if (!expertise) throw new BadRequestException("请填写擅长领域");
    if (!experience) throw new BadRequestException("请填写经验介绍");
    if (!wechat) throw new BadRequestException("请填写微信号");
    const recentCount = await this.ambassadorApplications.count({ where: { phone, kind, createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) } });
    if (recentCount >= 3) throw new BadRequestException("同一手机号 24 小时内最多提交 3 次同类招募申请");
    const row = this.ambassadorApplications.create({
      businessKey, kind, name, phone, city,
      province: this.cleanTrackingText(dto.province, 80) || null,
      district: this.cleanTrackingText(dto.district, 80) || null,
      organizationName: this.cleanTrackingText(dto.organizationName, 160) || null,
      cooperationIntent: this.cleanTrackingText(dto.cooperationIntent, 160) || null,
      expertise, experience, wechat, source, channelCode, assignee: null, ownerAdmin: null, priority: "normal",
      cityResourceScore: 0, communityScore: 0, contentScore: 0, charityScore: 0, deliveryScore: 0,
      nextFollowAt: null, status: "pending", remark: null, remarkEncrypted: null, reviewedBy: null, reviewedAt: null,
      convertedTenant: null, convertedMerchant: null, conversionBusinessKey: null, convertedAt: null
    });
    try {
      const saved = await this.ambassadorApplications.save(row);
      return { id: saved.id, status: saved.status, kind: saved.kind, submittedAt: saved.createdAt };
    } catch (error: any) {
      const duplicate = error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || error?.driverError?.code === "ER_DUP_ENTRY" || error?.driverError?.errno === 1062;
      if (!duplicate) throw error;
      const existing = await this.ambassadorApplications.findOne({ where: { businessKey } });
      if (!existing) throw new BadRequestException("申请编号冲突，请重新提交");
      return { id: existing.id, status: existing.status, kind: existing.kind, submittedAt: existing.createdAt, replayed: true };
    }
  }

  async volunteerTasks(city?: string, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const now = new Date();
    const builder = this.volunteerTasksRepo.createQueryBuilder("task")
      .select("task.id", "id").addSelect("task.taskNo", "taskNo").addSelect("task.title", "title").addSelect("task.type", "type")
      .addSelect("task.city", "city").addSelect("task.address", "address").addSelect("task.startAt", "startAt").addSelect("task.endAt", "endAt")
      .addSelect("task.recruitmentStartsAt", "recruitmentStartsAt").addSelect("task.recruitmentEndsAt", "recruitmentEndsAt")
      .addSelect("task.quota", "quota").addSelect("task.waitlistEnabled", "waitlistEnabled").addSelect("task.requiredSkills", "requiredSkills")
      .addSelect("task.qualificationRequired", "qualificationRequired").addSelect("task.minimumTrainingHours", "minimumTrainingHours")
      .addSelect("task.cancellationDeadlineHours", "cancellationDeadlineHours").addSelect("task.checkInOpensMinutesBefore", "checkInOpensMinutesBefore")
      .addSelect("task.checkOutClosesMinutesAfter", "checkOutClosesMinutesAfter").addSelect("task.latitude", "latitude").addSelect("task.longitude", "longitude")
      .addSelect("task.status", "status").addSelect("task.requirement", "requirement").addSelect("task.description", "description")
      .where("task.status = :status", { status: "open" }).andWhere("(task.recruitmentStartsAt IS NULL OR task.recruitmentStartsAt <= :now)", { now }).andWhere("(task.recruitmentEndsAt IS NULL OR task.recruitmentEndsAt >= :now)", { now }).orderBy("task.startAt", "ASC").addOrderBy("task.id", "DESC").take(100);
    if (tenant) builder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("task.tenantId IS NULL");
    if (city?.trim()) builder.andWhere("task.city LIKE :city", { city: `%${city.trim()}%` });
    const rows = await builder.getRawMany<any>();
    return Promise.all(rows.map(async (task) => {
      const [admittedCount, waitlistCount] = await Promise.all([
        this.volunteerTaskApplicationsRepo.createQueryBuilder("application").where("application.taskId = :taskId", { taskId: task.id }).andWhere("application.status IN (:...statuses)", { statuses: ["admitted", "checked_in", "completed"] }).getCount(),
        this.volunteerTaskApplicationsRepo.createQueryBuilder("application").where("application.taskId = :taskId", { taskId: task.id }).andWhere("application.status = :status", { status: "waitlisted" }).getCount()
      ]);
      return { ...task, id: Number(task.id), quota: Number(task.quota), waitlistEnabled: Boolean(task.waitlistEnabled), qualificationRequired: Boolean(task.qualificationRequired), requiredSkills: task.requiredSkills || [], admittedCount, waitlistCount, remainingQuota: Math.max(Number(task.quota) - admittedCount, 0) };
    }));
  }

  async applyVolunteer(dto: VolunteerApplyDto, user?: User | null, context?: PublicTenantContext) {
    await this.resolveTenantContext(context);
    const phone = this.normalizePhone(dto.phone);
    const name = String(dto.name || "").trim();
    const city = String(dto.city || "").trim();
    if (!name) throw new BadRequestException("请填写姓名");
    if (!city) throw new BadRequestException("请填写城市");
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey || `volunteer:profile:${user?.id || volunteerPhoneHash(phone)}:${uuidv4()}`, "申请业务键");
    const replay = await this.volunteerProfiles.createQueryBuilder("profile").select("profile.id", "id").addSelect("profile.status", "status").addSelect("profile.createdAt", "createdAt").where("profile.applicationBusinessKey = :businessKey", { businessKey }).getRawOne<any>();
    if (replay) return { id: replay.id, applicationId: replay.application?.id || null, status: replay.status, submittedAt: replay.createdAt, replayed: true };
    const savedProfile = await this.upsertVolunteerProfile(dto, user || null, businessKey);
    const application = await this.ambassadorApplications.save(this.ambassadorApplications.create({
      name,
      phone,
      city,
      expertise: savedProfile.serviceIntent || savedProfile.expertise || "志愿服务",
      experience: this.cleanTrackingText(dto.message, 500) || "申请成为公益志愿者",
      wechat: phone,
      source: "volunteer_apply",
      channelCode: null,
      status: "pending"
    }));
    savedProfile.application = application;
    await this.volunteerProfiles.save(savedProfile);
    return { id: savedProfile.id, applicationId: application.id, status: savedProfile.status, submittedAt: savedProfile.createdAt };
  }

  async applyVolunteerTask(taskId: number, dto: VolunteerTaskApplyDto, user?: User | null, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const phone = this.normalizePhone(dto.phone);
    const name = String(dto.name || "").trim();
    const city = String(dto.city || "").trim();
    if (!name) throw new BadRequestException("请填写姓名");
    if (!city) throw new BadRequestException("请填写城市");
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey || `volunteer:task:${taskId}:${user?.id || volunteerPhoneHash(phone)}:${uuidv4()}`, "报名业务键");
    const replay = await this.volunteerTaskApplicationsRepo.createQueryBuilder("application")
      .select("application.id", "id").addSelect("application.status", "status").addSelect("application.waitlistPosition", "waitlistPosition")
      .addSelect("application.createdAt", "createdAt").addSelect("task.tenantId", "tenantId")
      .leftJoin("application.task", "task").where("application.businessKey = :businessKey", { businessKey }).getRawOne<any>();
    if (replay) {
      if (Number(replay.tenantId || 0) !== Number(tenant?.id || 0)) throw new NotFoundException("志愿任务报名不存在");
      return { id: replay.id, status: replay.status, waitlistPosition: replay.waitlistPosition, submittedAt: replay.createdAt, replayed: true };
    }
    const accessBuilder = this.volunteerTasksRepo.createQueryBuilder("task").select("task.id", "id").addSelect("task.status", "status").where("task.id = :taskId", { taskId });
    if (tenant) accessBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
    else accessBuilder.andWhere("task.tenantId IS NULL");
    const accessibleTask = await accessBuilder.getRawOne<{ id: number; status: string }>();
    if (!accessibleTask || accessibleTask.status !== "open") throw new NotFoundException("志愿任务不存在或暂未开放");
    const profile = await this.upsertVolunteerProfile({ name, phone, city, message: dto.message }, user || null, `volunteer:profile-from-task:${businessKey}`);
    return this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(VolunteerTask);
      const applicationRepo = manager.getRepository(VolunteerTaskApplication);
      const taskBuilder = taskRepo.createQueryBuilder("task").setLock("pessimistic_write").where("task.id = :taskId", { taskId });
      if (tenant) taskBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
      else taskBuilder.andWhere("task.tenantId IS NULL");
      const task = await taskBuilder.getOne();
      if (!task || task.status !== "open") throw new NotFoundException("志愿任务不存在或暂未开放");
      const now = new Date();
      if (task.recruitmentStartsAt && task.recruitmentStartsAt > now) throw new BadRequestException("任务报名尚未开始");
      if (task.recruitmentEndsAt && task.recruitmentEndsAt < now) throw new BadRequestException("任务报名已截止");
      if (task.qualificationRequired && !volunteerQualificationEffective({ status: profile.qualificationStatus, expiresAt: profile.qualificationExpiresAt }, now)) throw new BadRequestException("该任务要求有效志愿服务资格");
      const requiredSkills = task.requiredSkills || [];
      if (requiredSkills.length && !requiredSkills.every((skill) => (profile.skills || []).includes(skill))) throw new BadRequestException(`该任务要求技能：${requiredSkills.join("、")}`);
      if (Number(task.minimumTrainingHours || 0) > 0) {
        const training = await manager.getRepository(VolunteerTrainingRecord).createQueryBuilder("training").select("COALESCE(SUM(training.trainingHours), 0)", "hours").where("training.profileId = :profileId", { profileId: profile.id }).andWhere("training.status = 'approved'").andWhere("(training.expiresAt IS NULL OR training.expiresAt >= :now)", { now }).getRawOne<{ hours: string }>();
        if (Number(training?.hours || 0) < Number(task.minimumTrainingHours)) throw new BadRequestException(`该任务要求至少 ${Number(task.minimumTrainingHours)} 小时有效培训`);
      }
      const identityKey = `volunteer:task:${task.id}:profile:${profile.id}`;
      const existing = await applicationRepo.createQueryBuilder("application").select("application.id", "id").addSelect("application.status", "status").addSelect("application.waitlistPosition", "waitlistPosition").addSelect("application.createdAt", "createdAt").where("application.applicationIdentityKey = :identityKey", { identityKey }).getRawOne<any>();
      if (existing) return { id: existing.id, status: existing.status, waitlistPosition: existing.waitlistPosition, submittedAt: existing.createdAt, replayed: true };
      const admittedCount = await applicationRepo.createQueryBuilder("application").where("application.taskId = :taskId", { taskId: task.id }).andWhere("application.status IN (:...statuses)", { statuses: ["admitted", "checked_in", "completed"] }).getCount();
      const status = admittedCount >= task.quota ? "waitlisted" : "pending";
      if (status === "waitlisted" && !task.waitlistEnabled) throw new BadRequestException("该志愿任务名额已满");
      const waitlistPosition = status === "waitlisted" ? await applicationRepo.createQueryBuilder("application").where("application.taskId = :taskId", { taskId: task.id }).andWhere("application.status = :status", { status: "waitlisted" }).getCount() + 1 : null;
      const message = this.cleanTrackingText(dto.message, 500) || null;
      const application = await applicationRepo.save(applicationRepo.create({ task, profile, user: user || null, businessKey, applicationIdentityKey: identityKey, name, phone: maskPhone(phone), phoneMasked: maskPhone(phone), phoneLookupHash: volunteerPhoneHash(phone), city, status, message: null, messageEncrypted: encryptStoredSecret(message), remark: null, remarkEncrypted: null, waitlistPosition, admittedAt: null, cancelledAt: null, cancellationReason: null, replacedBy: null, checkedInAt: null, completedAt: null }));
      return { id: application.id, status: application.status, waitlistPosition: application.waitlistPosition, submittedAt: application.createdAt };
    });
  }

  async myVolunteer(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const profileBuilder = this.volunteerProfiles.createQueryBuilder("profile").where("profile.userId = :userId", { userId: user.id });
    if (user.phone) profileBuilder.orWhere("profile.phoneLookupHash = :phoneHash OR profile.phone = :phone", { phoneHash: volunteerPhoneHash(user.phone), phone: user.phone });
    const profile = await profileBuilder.getOne();
    if (!profile) return { profile: null, applications: [], records: [] };
    const applicationBuilder = this.volunteerTaskApplicationsRepo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").where("application.profileId = :profileId", { profileId: profile.id }).orderBy("application.createdAt", "DESC");
    const recordBuilder = this.volunteerServiceRecords.createQueryBuilder("record").leftJoinAndSelect("record.task", "task").leftJoinAndSelect("record.application", "application").where("record.profileId = :profileId", { profileId: profile.id }).orderBy("record.createdAt", "DESC");
    const attendanceBuilder = this.volunteerAttendanceRecords.createQueryBuilder("attendance").leftJoinAndSelect("attendance.application", "application").leftJoinAndSelect("application.task", "task").where("application.profileId = :profileId", { profileId: profile.id }).orderBy("attendance.occurredAt", "DESC");
    if (tenant) {
      applicationBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
      recordBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
      attendanceBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
    } else {
      applicationBuilder.andWhere("task.tenantId IS NULL");
      recordBuilder.andWhere("task.tenantId IS NULL");
      attendanceBuilder.andWhere("task.tenantId IS NULL");
    }
    const [applications, records, trainingRecords, attendanceRecords, adjustments, badges, proofs] = await Promise.all([
      applicationBuilder.getMany(),
      recordBuilder.getMany(),
      this.volunteerTrainingRecords.createQueryBuilder("training").where("training.profileId = :profileId", { profileId: profile.id }).orderBy("training.createdAt", "DESC").getMany(),
      attendanceBuilder.getMany(),
      this.volunteerHourAdjustments.createQueryBuilder("adjustment").where("adjustment.profileId = :profileId", { profileId: profile.id }).orderBy("adjustment.createdAt", "DESC").getMany(),
      this.volunteerBadgeAwards.createQueryBuilder("award").leftJoinAndSelect("award.definition", "definition").where("award.profileId = :profileId", { profileId: profile.id }).orderBy("award.awardedAt", "DESC").getMany(),
      this.volunteerServiceProofs.createQueryBuilder("proof").where("proof.profileId = :profileId", { profileId: profile.id }).orderBy("proof.issuedAt", "DESC").getMany()
    ]);
    return {
      profile: this.publicVolunteerProfile(profile),
      applications: applications.map((row) => this.publicVolunteerApplication(row)),
      records: records.map((row) => this.publicVolunteerServiceRecord(row)),
      trainingRecords: trainingRecords.map((row) => ({ id: row.id, title: row.title, provider: row.provider, trainingHours: row.trainingHours, completedAt: row.completedAt, expiresAt: row.expiresAt, status: row.status })),
      attendanceRecords: attendanceRecords.map((row) => ({ id: row.id, applicationId: row.application.id, action: row.action, method: row.method, occurredAt: row.occurredAt, status: row.status })),
      adjustments: adjustments.map((row) => ({ id: row.id, deltaHours: row.deltaHours, action: row.action, createdAt: row.createdAt })),
      badges: badges.filter((row) => row.status === "active").map((row) => ({ id: row.id, code: row.definition.code, name: row.definition.name, description: row.definition.description, iconUrl: row.definition.iconUrl, awardedAt: row.awardedAt })),
      proofs: proofs.map((row) => ({ proofNo: row.proofNo, title: row.title, hours: row.hours, status: row.status, issuedAt: row.issuedAt, snapshot: row.status === "active" ? row.snapshot : null }))
    };
  }

  async verifyVolunteerProof(proofNo: string) {
    const no = String(proofNo || "").trim();
    if (!no) throw new BadRequestException("请输入证明编号");
    const proof = await this.volunteerServiceProofs.createQueryBuilder("proof").leftJoinAndSelect("proof.profile", "profile").where("proof.proofNo = :proofNo", { proofNo: no }).getOne();
    if (!proof) throw new NotFoundException("证明不存在");
    const name = String(proof.profile.name || "");
    const active = proof.status === "active";
    const holderName = active ? (name.length <= 1 ? "*" : `${name.slice(0, 1)}${"*".repeat(Math.max(name.length - 2, 1))}${name.slice(-1)}`) : null;
    return { proofNo: proof.proofNo, title: active ? proof.title : null, hours: active ? proof.hours : null, status: proof.status, issuedAt: proof.issuedAt, holderName, snapshot: active ? { taskTitle: proof.snapshot?.taskTitle || null, serviceTitle: proof.snapshot?.serviceTitle || proof.title, hours: proof.snapshot?.hours || proof.hours, serviceDate: proof.snapshot?.serviceDate || null } : null, verify: { valid: active, revoked: !active } };
  }

  async cancelVolunteerTaskApplication(id: number, dto: VolunteerTaskCancelDto, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "取消业务键");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerTaskApplication);
      const row = await repo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").leftJoinAndSelect("task.tenant", "taskTenant").leftJoinAndSelect("application.user", "user").setLock("pessimistic_write").where("application.id = :id", { id }).getOne();
      if (!row || row.user?.id !== user.id) throw new NotFoundException("志愿任务报名不存在");
      assertTenantOwnedResourceAccess(row.task, tenant, "志愿任务报名不存在");
      if (row.cancellationReason?.startsWith(`${businessKey}:`)) return this.publicVolunteerApplication(row);
      if (!canTransitionVolunteerApplication(row.status, "cancelled")) throw new BadRequestException("当前报名状态不能取消");
      const deadline = row.task.startAt ? new Date(row.task.startAt.getTime() - Math.max(row.task.cancellationDeadlineHours, 0) * 3_600_000) : null;
      if (deadline && deadline < new Date()) throw new BadRequestException("已超过任务取消截止时间，请联系运营人员处理");
      const released = ["admitted", "checked_in"].includes(row.status);
      row.status = "cancelled";
      row.cancelledAt = new Date();
      row.cancellationReason = `${businessKey}:${this.cleanTrackingText(dto.reason, 400)}`;
      await repo.save(row);
      if (released) await this.promoteVolunteerWaitlist(manager, row.task.id);
      return this.publicVolunteerApplication(row);
    });
  }

  async submitVolunteerAttendance(id: number, dto: VolunteerAttendanceSubmitDto, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "签到业务键");
    let payload;
    try { payload = verifyVolunteerAttendanceToken(dto.token); } catch (error: any) { throw new BadRequestException(error.message); }
    if (payload.applicationId !== id) throw new BadRequestException("签到凭证与报名记录不匹配");
    return this.dataSource.transaction(async (manager) => {
      const attendanceRepo = manager.getRepository(VolunteerAttendanceRecord);
      const applicationRepo = manager.getRepository(VolunteerTaskApplication);
      const application = await applicationRepo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").leftJoinAndSelect("task.tenant", "taskTenant").leftJoinAndSelect("application.user", "user").leftJoinAndSelect("application.profile", "profile").setLock("pessimistic_write").where("application.id = :id", { id }).getOne();
      if (!application || application.user?.id !== user.id) throw new NotFoundException("志愿任务报名不存在");
      assertTenantOwnedResourceAccess(application.task, tenant, "志愿任务报名不存在");
      const replay = await attendanceRepo.findOne({ where: { businessKey, application: { id } } });
      if (replay) return replay;
      const now = new Date();
      this.assertVolunteerAttendanceWindow(application.task, payload.action, now);
      const expectedStatus = payload.action === "check_in" ? "admitted" : "checked_in";
      if (application.status !== expectedStatus) throw new BadRequestException(payload.action === "check_in" ? "当前状态不能签到" : "请先完成签到");
      const duplicate = await attendanceRepo.findOne({ where: { application: { id }, action: payload.action } });
      if (duplicate) return duplicate;
      const record = await attendanceRepo.save(attendanceRepo.create({ businessKey, application, action: payload.action, method: "signed_token", tokenNonce: payload.nonce, occurredAt: now, locationSnapshot: dto.latitude === undefined && dto.longitude === undefined ? null : { latitude: dto.latitude, longitude: dto.longitude }, evidenceEncrypted: null, recordedByUser: user, recordedByAdmin: null, status: "valid", reversalReasonEncrypted: null }));
      if (payload.action === "check_in") {
        application.status = "checked_in";
        application.checkedInAt = now;
      } else {
        const checkIn = await attendanceRepo.findOne({ where: { application: { id }, action: "check_in", status: "valid" } });
        if (!checkIn) throw new BadRequestException("缺少有效签到记录");
        const hours = volunteerHoursFromAttendance(checkIn.occurredAt, now);
        const serviceRepo = manager.getRepository(VolunteerServiceRecord);
        const recordKey = `volunteer:service:application:${application.id}`;
        let serviceRecord = await serviceRepo.findOne({ where: { applicationRecordKey: recordKey } });
        if (!serviceRecord) serviceRecord = await serviceRepo.save(serviceRepo.create({ businessKey: `volunteer:service:${businessKey}`, applicationRecordKey: recordKey, profile: application.profile!, task: application.task, application, hours: "0.00", submittedHours: hours.toFixed(2), confirmedHours: "0.00", status: "pending_volunteer", title: application.task.title, proofUrl: null, proofEncrypted: null, feedback: null, feedbackEncrypted: null, volunteerConfirmedBy: null, volunteerConfirmedAt: null, volunteerConfirmationKey: null, supervisorConfirmedBy: null, supervisorConfirmedAt: null, supervisorConfirmationKey: null, rejectionReasonEncrypted: null }));
        application.completedAt = now;
        await serviceRepo.save(serviceRecord);
      }
      await applicationRepo.save(application);
      return record;
    });
  }

  async confirmVolunteerServiceRecord(id: number, dto: VolunteerServiceConfirmDto, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "工时确认业务键");
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerServiceRecord);
      const row = await repo.createQueryBuilder("record").leftJoinAndSelect("record.task", "task").leftJoinAndSelect("task.tenant", "taskTenant").leftJoinAndSelect("record.application", "application").leftJoinAndSelect("application.user", "user").setLock("pessimistic_write").where("record.id = :id", { id }).getOne();
      if (!row || row.application?.user?.id !== user.id) throw new NotFoundException("志愿服务记录不存在");
      if (!row.task) throw new NotFoundException("志愿服务记录不存在");
      assertTenantOwnedResourceAccess(row.task, tenant, "志愿服务记录不存在");
      if (row.volunteerConfirmationKey === businessKey) return this.publicVolunteerServiceRecord(row);
      if (row.status !== "pending_volunteer") throw new BadRequestException("当前服务记录无需志愿者确认");
      const hours = dto.hours === undefined ? Number(row.submittedHours) : Number(dto.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new BadRequestException("确认工时必须大于 0 且不超过 24 小时");
      row.submittedHours = hours.toFixed(2);
      row.volunteerConfirmedBy = user;
      row.volunteerConfirmedAt = new Date();
      row.volunteerConfirmationKey = businessKey;
      row.status = "pending_supervisor";
      return this.publicVolunteerServiceRecord(await repo.save(row));
    });
  }

  private async upsertVolunteerProfile(dto: Pick<VolunteerApplyDto, "name" | "phone" | "city"> & Partial<VolunteerApplyDto>, user: User | null, businessKey: string) {
    const phone = this.normalizePhone(dto.phone);
    const phoneHash = volunteerPhoneHash(phone);
    const name = this.cleanTrackingText(dto.name, 40);
    const city = this.cleanTrackingText(dto.city, 80);
    const profileBuilder = this.volunteerProfiles.createQueryBuilder("profile");
    if (user) profileBuilder.where("profile.userId = :userId OR profile.phoneLookupHash = :phoneHash OR profile.phone = :phone", { userId: user.id, phoneHash, phone });
    else profileBuilder.where("profile.phoneLookupHash = :phoneHash OR profile.phone = :phone", { phoneHash, phone });
    let profile = await profileBuilder.getOne();
    const message = this.cleanTrackingText(dto.message, 500) || null;
    const expertise = this.cleanTrackingText(dto.expertise, 160) || null;
    const normalizedSkills = Array.from(new Set((dto.skills || (expertise ? expertise.split(/[、,，/]/) : [])).map((item) => this.cleanTrackingText(item, 40)).filter(Boolean))).slice(0, 20);
    if (!profile) profile = this.volunteerProfiles.create({
      profileNo: nextVolunteerNo("VLP"), applicationBusinessKey: businessKey, user, application: null, name, phone: maskPhone(phone), phoneMasked: maskPhone(phone), phoneLookupHash: phoneHash, phoneEncrypted: encryptStoredSecret(phone), city,
      expertise, skills: normalizedSkills, availableTime: this.cleanTrackingText(dto.availableTime, 160) || null, availability: dto.availability || null, serviceIntent: this.cleanTrackingText(dto.serviceIntent, 160) || null,
      status: "pending", level: "participant", identityStatus: "pending", identityVerifiedAt: null, qualificationStatus: "unqualified", qualificationExpiresAt: null, emergencyContactEncrypted: dto.emergencyContact ? encryptStoredSecret(JSON.stringify(dto.emergencyContact)) : null,
      serviceHours: "0.00", remark: null, remarkEncrypted: encryptStoredSecret(message), statusReason: null
    });
    else {
      if (user) profile.user = user;
      profile.profileNo = profile.profileNo || nextVolunteerNo("VLP");
      if (!profile.applicationBusinessKey || profile.applicationBusinessKey.startsWith("legacy-")) profile.applicationBusinessKey = businessKey;
      profile.name = name;
      profile.phone = maskPhone(phone);
      profile.phoneMasked = maskPhone(phone);
      profile.phoneLookupHash = phoneHash;
      profile.phoneEncrypted = encryptStoredSecret(phone);
      profile.city = city;
      profile.expertise = expertise || profile.expertise;
      profile.skills = normalizedSkills.length ? normalizedSkills : profile.skills;
      profile.availableTime = this.cleanTrackingText(dto.availableTime, 160) || profile.availableTime;
      profile.availability = dto.availability || profile.availability;
      profile.serviceIntent = this.cleanTrackingText(dto.serviceIntent, 160) || profile.serviceIntent;
      profile.remark = null;
      profile.remarkEncrypted = message ? encryptStoredSecret(message) : profile.remarkEncrypted;
      profile.emergencyContactEncrypted = dto.emergencyContact ? encryptStoredSecret(JSON.stringify(dto.emergencyContact)) : profile.emergencyContactEncrypted;
    }
    try { return await this.volunteerProfiles.save(profile); } catch (error: any) {
      const duplicate = error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || error?.driverError?.code === "ER_DUP_ENTRY" || error?.driverError?.errno === 1062;
      if (!duplicate) throw error;
      const replay = await this.volunteerProfiles.createQueryBuilder("profile").where("profile.applicationBusinessKey = :businessKey OR profile.phoneLookupHash = :phoneHash", { businessKey, phoneHash }).getOne();
      if (!replay) throw new BadRequestException("志愿者档案冲突，请重新提交");
      return replay;
    }
  }

  private publicVolunteerProfile(profile: VolunteerProfile) {
    return { id: profile.id, profileNo: profile.profileNo, name: profile.name, phone: profile.phoneMasked || maskPhone(profile.phone), city: profile.city, expertise: profile.expertise, skills: profile.skills || [], availableTime: profile.availableTime, availability: profile.availability, serviceIntent: profile.serviceIntent, status: profile.status, level: profile.level, identityStatus: profile.identityStatus, qualificationStatus: profile.qualificationStatus, qualificationExpiresAt: profile.qualificationExpiresAt, serviceHours: profile.serviceHours, createdAt: profile.createdAt, updatedAt: profile.updatedAt };
  }

  private publicVolunteerTask(task?: VolunteerTask | null) {
    if (!task) return null;
    return {
      id: task.id,
      taskNo: task.taskNo,
      title: task.title,
      type: task.type,
      city: task.city,
      address: task.address,
      startAt: task.startAt,
      endAt: task.endAt,
      recruitmentStartsAt: task.recruitmentStartsAt,
      recruitmentEndsAt: task.recruitmentEndsAt,
      quota: task.quota,
      waitlistEnabled: task.waitlistEnabled,
      requiredSkills: task.requiredSkills || [],
      qualificationRequired: task.qualificationRequired,
      minimumTrainingHours: task.minimumTrainingHours,
      cancellationDeadlineHours: task.cancellationDeadlineHours,
      checkInOpensMinutesBefore: task.checkInOpensMinutesBefore,
      checkOutClosesMinutesAfter: task.checkOutClosesMinutesAfter,
      latitude: task.latitude,
      longitude: task.longitude,
      status: task.status,
      requirement: task.requirement,
      description: task.description,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  private publicVolunteerApplication(row: VolunteerTaskApplication) {
    return { id: row.id, task: this.publicVolunteerTask(row.task), name: row.name, phone: row.phoneMasked || maskPhone(row.phone), city: row.city, status: row.status, message: decryptStoredSecret(row.messageEncrypted) || row.message || null, waitlistPosition: row.waitlistPosition, admittedAt: row.admittedAt, cancelledAt: row.cancelledAt, cancellationReason: row.cancellationReason ? row.cancellationReason.split(":").slice(3).join(":") : null, checkedInAt: row.checkedInAt, completedAt: row.completedAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private publicVolunteerServiceRecord(row: VolunteerServiceRecord) {
    return { id: row.id, task: this.publicVolunteerTask(row.task), applicationId: row.application?.id || null, title: row.title, submittedHours: row.submittedHours, confirmedHours: row.confirmedHours, hours: row.confirmedHours || row.hours, status: row.status, feedback: decryptStoredSecret(row.feedbackEncrypted) || row.feedback || null, volunteerConfirmedAt: row.volunteerConfirmedAt, supervisorConfirmedAt: row.supervisorConfirmedAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private async promoteVolunteerWaitlist(manager: EntityManager, taskId: number) {
    const repo = manager.getRepository(VolunteerTaskApplication);
    const task = await manager.getRepository(VolunteerTask).findOne({ where: { id: taskId } });
    if (!task) return null;
    const admittedCount = await repo.count({ where: { task: { id: taskId }, status: In(["admitted", "checked_in", "completed"]) as any } });
    if (admittedCount >= task.quota) return null;
    const next = await repo.createQueryBuilder("application").setLock("pessimistic_write").where("application.taskId = :taskId", { taskId }).andWhere("application.status = 'waitlisted'").orderBy("application.waitlistPosition", "ASC").addOrderBy("application.createdAt", "ASC").getOne();
    if (!next) return null;
    next.status = "admitted";
    next.admittedAt = new Date();
    next.waitlistPosition = null;
    return repo.save(next);
  }

  private assertVolunteerAttendanceWindow(task: VolunteerTask, action: "check_in" | "check_out", now: Date) {
    if (action === "check_in" && task.startAt) {
      const opensAt = new Date(task.startAt.getTime() - Math.max(task.checkInOpensMinutesBefore, 0) * 60_000);
      if (now < opensAt) throw new BadRequestException("签到尚未开放");
      if (task.endAt && now > task.endAt) throw new BadRequestException("签到已结束");
    }
    if (action === "check_out") {
      if (task.startAt && now < task.startAt) throw new BadRequestException("任务尚未开始，不能签退");
      if (task.endAt && now > new Date(task.endAt.getTime() + Math.max(task.checkOutClosesMinutesAfter, 0) * 60_000)) throw new BadRequestException("签退窗口已关闭");
    }
  }

  private parseVolunteerBusinessKey(value: unknown, label: string) {
    try { return volunteerBusinessKey(value, label); } catch (error: any) { throw new BadRequestException(error.message); }
  }

  myCharity(user: User) {
    return this.charityFund.userContribution(user);
  }

  myCharityTransactions(user: User, page?: number, pageSize?: number) {
    return this.charityFund.userTransactions(user, page, pageSize);
  }

  myCharityContributionCertificate(user: User, transactionId: number) {
    return this.charityFund.userContributionCertificate(user, transactionId);
  }

  verifyCharityContributionCertificate(certificateNo: string) {
    return this.charityFund.verifyContributionCertificate(certificateNo);
  }

  charityContributionCertificateImage(certificateNo: string) {
    return this.charityFund.contributionCertificateImage(certificateNo);
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
    const scopedTenantId = tenant?.id ?? null;
    const sectionsBuilder = this.homepageSections
      .createQueryBuilder("section")
      .leftJoin("section.tenant", "tenant")
      .where("section.pageKey = :pageKey", { pageKey: normalizedPageKey })
      .andWhere("(section.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .orderBy("section.sortOrder", "ASC")
      .addOrderBy("section.id", "ASC");
    if (tenant) sectionsBuilder.andWhere("section.tenantId = :tenantId", { tenantId: tenant.id });
    else sectionsBuilder.andWhere("section.tenantId IS NULL");
    const sections = (await sectionsBuilder.getMany()).filter(homepageSectionIsPublicCandidate);
    const publication = await this.dataSource.getRepository(HomepagePublication).findOne({ where: { tenantScopeKey: homepagePublicationScopeKey(tenant?.id), pageKey: normalizedPageKey } });
    const configuredCount = await this.homepageConfiguredCount(normalizedPageKey, scopedTenantId);
    let source = publication ? (publication.sections || []).filter(homepageSectionIsPublicCandidate).map((item, index) => this.homepageSections.create({ ...item, id: -(10000 + index), tenant, pageKey: normalizedPageKey, config: item.config || {}, layout: item.layout || {} })) : sections;
    let fallback = false;
    if (!source.length && tenant && configuredCount === 0) {
      fallback = true;
      source = await this.homepageSections
        .createQueryBuilder("section")
        .where("section.pageKey = :pageKey", { pageKey: normalizedPageKey })
        .andWhere("section.tenantId IS NULL")
        .orderBy("section.sortOrder", "ASC")
        .addOrderBy("section.id", "ASC")
        .getMany();
      source = source.filter(homepageSectionIsPublicCandidate);
      const platformConfiguredCount = await this.homepageConfiguredCount(normalizedPageKey, null);
      if (!source.length && platformConfiguredCount > 0) fallback = true;
      if (!source.length && platformConfiguredCount === 0) {
        source = defaultHomepageSections(normalizedPageKey).filter((item) => item.enabled).map((item, index) => this.homepageSections.create({ ...item, id: -(index + 1), pageKey: normalizedPageKey }));
      }
    } else if (!source.length && configuredCount === 0) {
      fallback = true;
      source = defaultHomepageSections(normalizedPageKey).filter((item) => item.enabled).map((item, index) => this.homepageSections.create({ ...item, id: -(index + 1), pageKey: normalizedPageKey }));
    }
    const [announcements, categories, latest, featured, testimonials] = await Promise.all([
      this.homepageAnnouncements(10, true, tenant, context?.userId),
      this.categoriesList(tenant ? { tenantId: tenant.id } : context),
      this.activitiesList({ pageSize: 20 }, tenant ? { tenantId: tenant.id } : context),
      this.activitiesList({ featured: true, pageSize: 12 }, tenant ? { tenantId: tenant.id } : context),
      this.homepageTestimonials(tenant)
    ]);
    const latestItems = Array.isArray(latest) ? latest : latest.items;
    const featuredItems = Array.isArray(featured) ? featured : featured.items;
    const publicSections = this.normalizeHomepagePublicSections(source);
    return {
      sections: publicSections.map((section) => this.homepageSectionView(section, { announcements, categories, latest: latestItems, featured: featuredItems, testimonials })),
      fallback,
      pageKey: normalizedPageKey,
      tenant: this.publicHomepageTenant(tenant)
    };
  }

  private normalizeHomepagePublicSections(sections: HomepageSection[]) {
    const singletonTypes = new Set(["bottom_nav", "my_page", "inner_pages"]);
    const latestSingleton = new Map<string, HomepageSection>();
    for (const section of sections) {
      if (singletonTypes.has(section.type)) latestSingleton.set(section.type, section);
    }
    return sections.filter((section) => !singletonTypes.has(section.type) || latestSingleton.get(section.type) === section);
  }

  private homepageConfiguredCount(pageKey: string, tenantId: number | null) {
    const builder = this.homepageSections
      .createQueryBuilder("section")
      .where("section.pageKey = :pageKey", { pageKey });
    if (tenantId) builder.andWhere("section.tenantId = :tenantId", { tenantId });
    else builder.andWhere("section.tenantId IS NULL");
    return builder.getCount();
  }

  private async homepageAnnouncements(limit: number, pinnedFirst: boolean, tenant?: Tenant | null, userId?: number | null) {
    const builder = this.announcements
      .createQueryBuilder("announcement")
      .leftJoin("announcement.tenant", "tenant")
      .where("announcement.enabled = :enabled", { enabled: true })
      .andWhere("(announcement.publishAt IS NULL OR announcement.publishAt <= :now)", { now: new Date() })
      .andWhere("(announcement.endAt IS NULL OR announcement.endAt >= :now)", { now: new Date() })
      .andWhere("(announcement.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true });
    if (tenant) builder.andWhere("announcement.tenantId = :tenantId", { tenantId: tenant.id });
    if (pinnedFirst) builder.orderBy("announcement.pinned", "DESC").addOrderBy("announcement.publishAt", "DESC").addOrderBy("announcement.createdAt", "DESC");
    else builder.orderBy("announcement.publishAt", "DESC").addOrderBy("announcement.createdAt", "DESC");
    const rows = await builder.take(Math.min(Math.max(limit * 3, 1), 60)).getMany();
    const memberLevelId = await this.publicAudienceMemberLevelId(userId, tenant?.id);
    return rows.filter((row) => contentAudienceMatches(row.audience, userId, memberLevelId)).slice(0, Math.min(Math.max(limit, 1), 20));
  }

  private async publicAudienceMemberLevelId(userId?: number | null, tenantId?: number | null) {
    if (!userId) return null;
    const builder = this.memberProfiles.createQueryBuilder("profile").leftJoinAndSelect("profile.level", "level").where("profile.userId = :userId", { userId });
    if (tenantId) builder.andWhere("profile.tenantId = :tenantId", { tenantId });
    else builder.andWhere("profile.tenantId IS NULL");
    const profile = await builder.getOne();
    return profile?.level?.id || null;
  }

  private async homepageTestimonials(tenant?: Tenant | null) {
    const builder = this.communityPosts
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.activity", "activity")
      .leftJoin("post.tenant", "tenant")
      .where("post.visible = :visible", { visible: true })
      .andWhere("post.status = :status", { status: "approved" })
      .andWhere("post.source = :source", { source: "participant" })
      .andWhere("(post.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .orderBy("post.createdAt", "DESC")
      .take(12);
    if (tenant) builder.andWhere("post.tenantId = :tenantId", { tenantId: tenant.id });
    return builder.getMany();
  }

  private homepageSectionView(section: HomepageSection, payload: { announcements: unknown[]; categories: unknown[]; latest: any[]; featured: any[]; testimonials: any[] }) {
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
    } else if (section.type === "testimonial_feed" || section.type === "featured_testimonials" || section.type === "activity_testimonials") {
      data.posts = payload.testimonials.slice(0, this.configLimit(config, 3, 12));
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

  private publicTenantRegion(region: TenantRegion, distanceMeters?: number) {
    return {
      id: region.id,
      name: region.name,
      province: region.province,
      city: region.city,
      district: region.district,
      latitude: Number(region.latitude),
      longitude: Number(region.longitude),
      radiusMeters: region.radiusMeters,
      boundaryPoints: region.boundaryPoints || null,
      exclusive: region.exclusive,
      priority: region.priority,
      authorizationStatus: region.authorizationStatus,
      validFrom: region.validFrom,
      validUntil: region.validUntil,
      distanceMeters: distanceMeters ?? null
    };
  }

  private async recordTenantRegionHitLog(
    latitude: number,
    longitude: number,
    match: { region: TenantRegion; distanceMeters: number } | null,
    tracking: TenantLocationTrackingContext
  ) {
    try {
      await this.tenantRegionHitLogs.save(
        this.tenantRegionHitLogs.create({
          tenant: match?.region.tenant || null,
          region: match?.region || null,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          matched: Boolean(match),
          distanceMeters: match?.distanceMeters ?? null,
          source: this.trimLength(tracking.source || "public_tenant_resolve", 40),
          clientIp: this.trimLength(tracking.clientIp, 64),
          userAgent: this.trimLength(tracking.userAgent, 255)
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to record tenant region hit log: ${message}`);
    }
  }

  private trimLength(value: unknown, maxLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    return text ? text.slice(0, maxLength) : null;
  }

  private tenantRegionBoundaryPoints(region: TenantRegion) {
    return Array.isArray(region.boundaryPoints) ? region.boundaryPoints : [];
  }

  private pointInPolygon(latitude: number, longitude: number, points: TenantRegionBoundaryPoint[]) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const yi = points[i].lat;
      const xi = points[i].lng;
      const yj = points[j].lat;
      const xj = points[j].lng;
      const intersects = yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  private geoDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadius * Math.asin(Math.sqrt(a));
  }

  private configLimit(config: Record<string, unknown>, fallback: number, max: number) {
    const value = Number(config.limit || fallback);
    return Math.min(Math.max(Number.isFinite(value) ? value : fallback, 1), max);
  }

  private findPublicActivity(id: number, options?: { status?: ActivityStatus; withFields?: boolean }) {
    const builder = this.activities
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.tenant", "tenant")
      .leftJoinAndSelect("activity.category", "category")
      .leftJoinAndSelect("activity.agent", "agent")
      .leftJoinAndSelect("activity.minMemberLevel", "minMemberLevel")
      .leftJoinAndSelect("activity.priorityMemberLevel", "priorityMemberLevel")
      .where("activity.id = :id", { id });
    if (options?.status) builder.andWhere("activity.status = :status", { status: options.status });
    if (options?.withFields) builder.leftJoinAndSelect("activity.fields", "fields").addOrderBy("fields.sortOrder", "ASC").addOrderBy("fields.id", "ASC");
    return builder.getOne();
  }

  async activityDetail(id: number, userId?: number, context?: PublicTenantContext, tracking?: PublicTrackingContext) {
    const activity = await this.findPublicActivity(id, { status: ActivityStatus.Open, withFields: true });
    if (!activity) throw new NotFoundException("活动不存在或未开放");
    await this.assertPublicTenantAccess(activity, context);
    const user = userId ? await this.users.findOneBy({ id: userId }) : null;
    await this.recordActivityView(activity, user || null, tracking);
    activity.fields = activity.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const [ticketTypes, memberAccess, operationSetting] = await Promise.all([
      this.findPublicTicketTypes(id),
      this.memberAccessSnapshot(activity, userId),
      this.ensureOperationSetting(activity.tenant || null)
    ]);
    return { ...(await this.withPublicStats(activity)), ticketTypes: ticketTypes.map(({ ticketType, availability }) => this.publicTicketType(ticketType, availability)), memberAccess, hasGroupQrCode: this.hasGroupQrCode(activity, operationSetting) };
  }

  async quote(activityId: number, dto: QuoteDto, user: User, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(activityId, { status: ActivityStatus.Open });
    if (!activity) throw new NotFoundException("活动不存在或未开放");
    await this.assertPublicTenantAccess(activity, context);
    return this.publicQuote(await this.calculateQuote(activity, { ...dto, userId: user.id }));
  }

  async register(activityId: number, dto: RegisterDto, user: User, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(activityId, { withFields: true });
    if (!activity || activity.status !== ActivityStatus.Open) throw new BadRequestException("活动暂不可报名");
    const tenant = await this.assertPublicTenantAccess(activity, context);
    await this.assertRegistrationEnabled(tenant);
    if (new Date(activity.registrationDeadline).getTime() < Date.now()) throw new BadRequestException("报名已截止");
    await this.ensureActivityMemberAccess(activity, user);

    const activeStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const existing = await this.registrations.findOne({ where: { activity: { id: activityId }, user: { id: user.id }, status: In(activeStatuses) } });
    if (existing) throw new BadRequestException("你已报名该活动");
    const existingWaitlist = await this.waitlists.findOne({ where: { activity: { id: activityId }, user: { id: user.id }, status: WaitlistStatus.Waiting } });
    if (existingWaitlist) throw new BadRequestException("你已在该活动候补名单中");

    await this.validateAnswers(activity.fields, dto.answers, user, tenant);
    const eligibilityError = validateRegistrationEligibility({ rules: activity.eligibilityRules || null, answers: dto.answers, phone: user.phone, privacyAccepted: dto.privacyAccepted, companions: dto.companions });
    if (eligibilityError) throw new BadRequestException(eligibilityError);
    const maxRegistrations = Number(activity.eligibilityRules?.maxRegistrationsPerUser || 0);
    if (maxRegistrations > 0) {
      const historicalCount = await this.registrations.createQueryBuilder("registration").where("registration.activityId = :activityId", { activityId }).andWhere("registration.userId = :userId", { userId: user.id }).andWhere("registration.status != :cancelled", { cancelled: RegistrationStatus.Cancelled }).getCount();
      if (historicalCount >= maxRegistrations) throw new BadRequestException(`每人最多报名 ${maxRegistrations} 次`);
    }
    const stats = await this.withPublicStats(activity);
    if (stats.remainingSeats <= 0) {
      const waitlist = await this.waitlists.save(this.waitlists.create({ activity, user, answers: dto.answers, status: WaitlistStatus.Waiting, remark: "活动满员自动候补" }));
      return { waitlist: this.publicWaitlist(waitlist), registration: null, order: null, waitlisted: true };
    }

    const quote = await this.calculateQuote(activity, { ...dto, userId: user.id });
    const price = Number(quote.payableAmount);
    const paymentMethod = price > 0 ? dto.paymentMethod || PaymentMethod.Offline : PaymentMethod.Free;
    await this.assertPaymentMethodEnabled(paymentMethod, activity.tenant);
    if (price > 0 && paymentMethod === PaymentMethod.Balance) await this.assertSufficientBalance(user, activity.tenant, price);
    const status = price > 0 ? RegistrationStatus.PendingPayment : activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    const channel = await this.resolveActivityChannel(activity, dto.channelCode, dto.source);
    const attributionSource = this.cleanTrackingText(dto.source || channel?.source || (dto.inviteCode ? "invite" : "direct"), 80) || "direct";
    const { registration, order } = await this.dataSource.transaction(async (manager) => {
      const activityRepo = manager.getRepository(Activity);
      const ticketRepo = manager.getRepository(TicketType);
      const registrationRepo = manager.getRepository(Registration);
      const orderRepo = manager.getRepository(Order);
      const couponRepo = manager.getRepository(Coupon);
      const couponClaimRepo = manager.getRepository(CouponClaim);
      const couponUsageRepo = manager.getRepository(CouponUsage);
      const lockedActivity = await activityRepo.findOne({ where: { id: activity.id }, lock: { mode: "pessimistic_write" } });
      if (!lockedActivity || lockedActivity.status !== ActivityStatus.Open) throw new BadRequestException("活动暂不可报名");
      let couponClaim: CouponClaim | null = null;
      if (quote.coupon) {
        const lockedCoupon = await couponRepo.findOne({ where: { id: quote.coupon.id }, lock: { mode: "pessimistic_write" } });
        if (!lockedCoupon) throw new BadRequestException("优惠码不存在");
        this.validateCoupon(lockedCoupon, lockedActivity, Number(quote.originalAmount) - Number(quote.memberDiscountAmount));
        const usedByUser = await couponUsageRepo.count({ where: { coupon: { id: lockedCoupon.id }, user: { id: user.id }, status: "used" } });
        couponClaim = await couponClaimRepo.findOne({ where: { coupon: { id: lockedCoupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
        const limitError = couponLimitError({ usageLimit: lockedCoupon.usageLimit, usedCount: lockedCoupon.usedCount, perUserLimit: lockedCoupon.perUserLimit, usedByUser, claimRequired: lockedCoupon.claimMode === "claim", claimedCount: couponClaim?.claimedCount || 0, claimUsedCount: couponClaim?.usedCount || 0 });
        if (limitError) throw new BadRequestException(limitError);
        quote.coupon = lockedCoupon;
      }
      const activeStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
      const duplicate = await registrationRepo.findOne({ where: { activity: { id: activity.id }, user: { id: user.id }, status: In(activeStatuses) } });
      if (duplicate) throw new BadRequestException("你已报名该活动");
      const used = await registrationRepo.count({ where: { activity: { id: activity.id }, status: In(activeStatuses) } });
      if (used >= lockedActivity.capacity) throw new BadRequestException("活动名额已满，请加入候补");
      let lockedTicket: TicketType | null = null;
      if (quote.ticketType) {
        lockedTicket = await ticketRepo.findOne({ where: { id: quote.ticketType.id }, lock: { mode: "pessimistic_write" } });
        if (!lockedTicket || !lockedTicket.enabled) throw new BadRequestException("票种不可用");
        const sold = await orderRepo.createQueryBuilder("order").where("order.ticketTypeId = :ticketTypeId", { ticketTypeId: lockedTicket.id }).andWhere("order.status IN (:...statuses)", { statuses: [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.PartiallyRefunded] }).getCount();
        if (lockedTicket.capacity !== null && sold >= lockedTicket.capacity) throw new BadRequestException("该票种已售罄");
        const lockedPricing = resolveTicketPrice({ basePrice: Number(lockedTicket.price), soldCount: sold, now: new Date(), isMember: Boolean(quote.memberLevel), memberPrice: lockedTicket.memberPrice === null ? null : Number(lockedTicket.memberPrice), earlyBirdPrice: lockedTicket.earlyBirdPrice === null ? null : Number(lockedTicket.earlyBirdPrice), earlyBirdEndsAt: lockedTicket.earlyBirdEndsAt, tierPrices: lockedTicket.tierPrices });
        if (Math.abs(lockedPricing.price - Number(quote.originalAmount)) > 0.001) throw new BadRequestException("票价已变化，请重新确认订单");
        const userCount = await orderRepo.createQueryBuilder("order").leftJoin("order.registration", "registration").where("order.ticketTypeId = :ticketTypeId", { ticketTypeId: lockedTicket.id }).andWhere("registration.userId = :userId", { userId: user.id }).andWhere("order.status IN (:...statuses)", { statuses: [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.PartiallyRefunded] }).getCount();
        if (userCount >= Number(lockedTicket.perUserLimit || 1)) throw new BadRequestException("已达到该票种每人限购数量");
      }
      const savedRegistration = await registrationRepo.save(registrationRepo.create({ activity: lockedActivity, tenant: lockedActivity.tenant, user, channel, attributionSource, attributionChannelCode: channel?.code || null, attributionChannelName: channel?.name || null, attributionProvince: lockedActivity.locationProvince || null, attributionCity: lockedActivity.locationCity || null, attributionDistrict: lockedActivity.locationDistrict || null, attributionCapturedAt: new Date(), status, answers: dto.answers, formSchemaVersion: Number(lockedActivity.formSchemaVersion || 1), formSnapshot: (activity.fields || []).map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required, options: field.options || [], sortOrder: field.sortOrder })), companions: dto.companions?.length ? dto.companions.map((item) => ({ name: String(item.name || "").trim(), phone: item.phone?.trim() || undefined, idCard: item.idCard?.trim() || undefined })) : null, privacyConsentAt: dto.privacyAccepted ? new Date() : null, checkInCode: uuidv4() }));
      const savedOrder = await orderRepo.save(orderRepo.create({ orderNo: `OD${Date.now()}${savedRegistration.id}`, registration: savedRegistration, tenant: lockedActivity.tenant, agent: lockedActivity.agent, amount: quote.payableAmount, originalAmount: quote.originalAmount, discountAmount: quote.discountAmount, memberDiscountAmount: quote.memberDiscountAmount, pointsUsed: quote.pointsUsed, pointsDiscountAmount: quote.pointsDiscountAmount, paymentMethod, status: price > 0 ? OrderStatus.PendingPayment : OrderStatus.Paid, paidAt: price > 0 ? null : new Date(), expiresAt: this.paymentExpiresAt(price), ticketType: lockedTicket, coupon: quote.coupon, memberLevel: quote.memberLevel, businessSnapshot: { amount: quote.payableAmount, originalAmount: quote.originalAmount, discountAmount: quote.discountAmount, memberDiscountAmount: quote.memberDiscountAmount, pointsDiscountAmount: quote.pointsDiscountAmount, pointsUsed: quote.pointsUsed, paymentMethod, ticketTypeId: lockedTicket?.id || null, couponId: quote.coupon?.id || null, ticketPricingRule: quote.ticketPricingRule, memberLevel: quote.memberLevelSnapshot } }));
      if (quote.coupon) {
        quote.coupon.usedCount += 1;
        await couponRepo.save(quote.coupon);
        await couponUsageRepo.save(couponUsageRepo.create({ tenant: lockedActivity.tenant, coupon: quote.coupon, order: savedOrder, user, discountAmount: quote.couponDiscountAmount, status: "used", releasedAt: null, releaseReason: null }));
        if (couponClaim) { couponClaim.usedCount += 1; await couponClaimRepo.save(couponClaim); }
      }
      return { registration: savedRegistration, order: savedOrder };
    });
    let attributedInvite: InviteCode | null = null;
    const inviteText = this.cleanTrackingText(dto.inviteCode, 32);
    if (inviteText) {
      attributedInvite = await this.dataSource.getRepository(InviteCode).findOne({ where: { code: inviteText, activity: { id: activity.id } } });
      if (attributedInvite) { attributedInvite.registrationCount += 1; await this.dataSource.getRepository(InviteCode).save(attributedInvite); }
    }
    await this.recordConversionEvent("register", { activity, user, registration, order, channel, amount: quote.payableAmount, source: attributionSource, idempotencyKey: `register:${registration.id}`, payload: { inviteCode: attributedInvite?.code || null, inviterUserId: attributedInvite?.user?.id || null } });
    if (order.status === OrderStatus.Paid) await this.recordConversionEvent("pay", { activity, user, registration, order, channel, amount: order.amount, source: attributionSource, idempotencyKey: `pay:${order.id}`, payload: { paymentProvider: "free" } });
    if (quote.pointsUsed > 0) await this.awardPoints(user, -quote.pointsUsed, "points_redeem", order.id, "报名积分抵扣", activity.tenant || null);
    if (price > 0 && paymentMethod === PaymentMethod.Balance) {
      try {
        const balanceResult = await this.payWithBalance(order.id, user, context);
        return { registration: balanceResult.order.registration, order: balanceResult.order, walletTransaction: balanceResult.walletTransaction, waitlisted: false };
      } catch (error) {
        await this.rollbackPendingRegistration(order, quote.coupon, quote.pointsUsed, "余额支付失败，报名已取消");
        throw error;
      }
    }
    return { registration: this.publicRegistration(registration), order: this.publicOrder(order), waitlisted: false };
  }

  async mockPay(orderId: number, dto: MockPayDto, user: User, context?: PublicTenantContext) {
    this.paymentProvider.assertSandboxAllowed("mock 支付");
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.assertOrderTenantAccess(order, context);
    this.assertOrderUserAccess(order, user);
    return this.publicPaymentResult(await this.applySuccessfulPayment(order, dto.transactionNo || `MOCK${Date.now()}${order.id}`, "mock", "本地 mock 支付"));
  }

  async mockPaymentCallback(dto: MockPaymentCallbackDto) {
    this.paymentProvider.assertSandboxAllowed("mock 支付回调");
    const order = await this.orders.findOne({ where: { orderNo: dto.orderNo } });
    const callbackLog = await this.createPaymentCallbackLog(dto.provider || "mock-callback", dto, order, null);
    if (!order) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", "订单不存在", null);
      throw new NotFoundException("订单不存在");
    }
    if (!sameMoneyAmount(order.amount, dto.amount)) {
      await this.recordPaymentDiscrepancy(order, dto.transactionNo, dto.provider || "mock-callback", dto.amount, "amount_mismatch", "回调金额与订单金额不一致");
      await this.finishPaymentCallbackLog(callbackLog, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致，已记录对账差异");
    }
    try {
      const result = await this.applySuccessfulPayment(order, dto.transactionNo, dto.provider || "mock-callback", "mock 支付回调");
      await this.finishPaymentCallbackLog(callbackLog, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "支付回调处理成功", result.order);
      return this.publicPaymentResult(result);
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
    await this.assertPaymentMethodEnabled(provider === "wechat" ? PaymentMethod.Wechat : PaymentMethod.Alipay, order.tenant);
    if (order.status !== OrderStatus.PendingPayment && order.status !== OrderStatus.Paid) throw new BadRequestException("当前订单不能发起支付");
    if (order.paymentMethod !== provider) throw new BadRequestException("订单支付方式不匹配，请重新报名或联系主办方处理");
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
    await this.assertPaymentMethodEnabled(PaymentMethod.Balance, order.tenant);
    if (order.paymentMethod !== PaymentMethod.Balance) throw new BadRequestException("订单支付方式不匹配，请重新报名或联系主办方处理");
    if (order.status === OrderStatus.Paid) {
      const existing = await this.walletTransactions.findOne({ where: { idempotencyKey: `balance_pay:${order.id}` }, loadEagerRelations: false });
      return { order: this.publicOrder(order), walletTransaction: this.publicWalletTransaction(existing), idempotent: true };
    }
    if (order.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能使用余额支付");
    if (this.isExpiredPendingOrder(order)) {
      await this.closeExpiredOrder(order, "订单超时未付款，系统已关闭");
      throw new BadRequestException("订单已超时关闭，名额已释放，请重新报名");
    }

    const amount = Number(order.amount);
    if (amount <= 0) return this.publicPaymentResult(await this.applySuccessfulPayment(order, `FREE${Date.now()}${order.id}`, "balance", "零元订单确认", PaymentMethod.Free));
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
        return { order: lockedOrder, walletTransaction: await walletTxRepo.findOne({ where: { idempotencyKey: `balance_pay:${lockedOrder.id}` }, loadEagerRelations: false }), idempotent: true };
      }
      if (lockedOrder.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能使用余额支付");
      let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant, tenantScopeKey }));
      const amountFen = yuanToFen(amount);
      const beforeFen = yuanToFen(wallet.availableBalance || 0);
      const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
      if (beforeFen + giftBeforeFen < amountFen) throw new BadRequestException("余额不足，请选择微信支付或联系后台充值");
      const giftUsedFen = Math.min(giftBeforeFen, amountFen);
      const cashUsedFen = amountFen - giftUsedFen;
      const afterFen = beforeFen - cashUsedFen;
      const giftAfterFen = giftBeforeFen - giftUsedFen;
      wallet.availableBalance = fenToYuan(afterFen);
      wallet.giftBalance = fenToYuan(giftAfterFen);
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
        balanceBefore: fenToYuan(beforeFen),
        balanceAfter: fenToYuan(afterFen),
        frozenBefore: wallet.frozenBalance || "0.00",
        frozenAfter: wallet.frozenBalance || "0.00",
        giftBefore: fenToYuan(giftBeforeFen),
        giftAfter: fenToYuan(giftAfterFen),
        frozenGiftBefore: wallet.frozenGiftBalance || "0.00",
        frozenGiftAfter: wallet.frozenGiftBalance || "0.00",
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
    if (!result.idempotent && Number(result.order.amount) > 0) await this.memberPoints.awardEvent({ user, tenant: result.order.tenant || result.order.registration.activity?.tenant || null, eventType: "activity_order_paid", amountFen: Number(result.order.amountFen || yuanToFen(result.order.amount)), sourceType: "order_paid", sourceId: result.order.id, remark: "活动消费积分" });
    if (!result.idempotent) await this.charityFund.recordOrderAccrual(result.order, "balance");
    return { order: this.publicOrder(result.order), walletTransaction: this.publicWalletTransaction(result.walletTransaction), idempotent: result.idempotent };
  }

  async providerPaymentCallback(provider: SupportedPaymentProvider, dto: ProviderPaymentCallbackDto | Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    const realProvider = await this.paymentProvider.usesRealProvider(provider);
    const context = { body: dto as Record<string, unknown>, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const extractedOrderNo = realProvider ? await this.paymentProvider.extractRealCallbackOrderNo(provider, context) : null;
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
    if (!sameMoneyAmount(order.amount, callback.amount)) {
      await this.recordPaymentDiscrepancy(order, callback.transactionNo, provider, Number(callback.amount), "amount_mismatch", `${provider} 回调金额与订单金额不一致`);
      await this.finishPaymentCallbackLog(callbackLog, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致，已记录对账差异");
    }
    try {
      const result = await this.applySuccessfulPayment(order, callback.transactionNo, provider, `${provider} 沙箱支付回调`, provider);
      await this.finishPaymentCallbackLog(callbackLog, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "支付回调处理成功", result.order);
      return this.publicPaymentResult(result);
    } catch (error: any) {
      await this.finishPaymentCallbackLog(callbackLog, "failed", error.message || "支付回调处理失败", order);
      throw error;
    }
  }

  async providerRefundNotification(provider: SupportedPaymentProvider, dto: Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    if (!(await this.paymentProvider.usesRealProvider(provider))) throw new BadRequestException("真实退款通知需要先启用真实支付渠道");
    const context = { body: dto, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const extractedOrderNo = await this.paymentProvider.extractRealRefundNotificationOrderNo(provider, context);
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
    // Platform orders remain accessible to their owner after the client selects a tenant.
    if (!order.tenant?.id) return;
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
    return this.myRegistrationsForTenant(userId, tenant);
  }

  private async myRegistrationsForTenant(userId: number, tenant: Tenant | null) {
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
    if (tenant) {
      builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId OR (registration.tenantId IS NULL AND activity.tenantId IS NULL))", { tenantId: tenant.id });
    }
    const rows = await builder.getMany();
    if (!rows.length) return [];
    const orders = await this.orders.find({ where: rows.map((registration) => ({ registration: { id: registration.id } })) });
    const refundRows = orders.length ? await this.refunds.createQueryBuilder("refund")
      .select("refund.id", "id")
      .addSelect("refund.orderId", "orderId")
      .addSelect("refund.refundNo", "refundNo")
      .addSelect("refund.amount", "amount")
      .addSelect("refund.status", "status")
      .addSelect("refund.reviewRemark", "reviewRemark")
      .addSelect("refund.createdAt", "createdAt")
      .where("refund.orderId IN (:...orderIds)", { orderIds: orders.map((order) => order.id) })
      .orderBy("refund.createdAt", "DESC")
      .addOrderBy("refund.id", "DESC")
      .getRawMany<{ id: string; orderId: string; refundNo: string; amount: string; status: string; reviewRemark: string | null; createdAt: Date }>() : [];
    const latestRefundByOrder = new Map<number, any>();
    for (const refund of refundRows) {
      const orderId = Number(refund.orderId);
      if (!latestRefundByOrder.has(orderId)) latestRefundByOrder.set(orderId, { ...refund, id: Number(refund.id), orderId });
    }
    return rows.map((registration) => ({
      ...this.publicRegistration(registration),
      order: this.publicOrderSummary(orders.find((order) => order.registration.id === registration.id) || null),
      latestRefund: latestRefundByOrder.get(orders.find((order) => order.registration.id === registration.id)?.id || 0) || null
    }));
  }

  async myCourseOrders(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    return this.myCourseOrdersForTenant(user, tenant);
  }

  private async myCourseOrdersForTenant(user: User, tenant: Tenant | null) {
    const orders = await this.courseOrders.find({
      where: { user: { id: user.id } },
      order: { createdAt: "DESC" },
      take: 100
    });
    const scopedOrders = tenant ? orders.filter((order) => order.course?.tenant?.id === tenant.id) : orders;
    const refundRows = scopedOrders.length ? await this.courseRefunds.createQueryBuilder("refund")
      .select("refund.id", "id")
      .addSelect("refund.orderId", "orderId")
      .addSelect("refund.refundNo", "refundNo")
      .addSelect("refund.amountFen", "amountFen")
      .addSelect("refund.status", "status")
      .addSelect("refund.reviewRemark", "reviewRemark")
      .addSelect("refund.failureReason", "failureReason")
      .addSelect("refund.createdAt", "createdAt")
      .where("refund.orderId IN (:...orderIds)", { orderIds: scopedOrders.map((order) => order.id) })
      .orderBy("refund.createdAt", "DESC")
      .addOrderBy("refund.id", "DESC")
      .getRawMany<{ id: string; orderId: string; refundNo: string; amountFen: string; status: string; reviewRemark: string | null; failureReason: string | null; createdAt: Date }>() : [];
    const latestRefundByOrder = new Map<number, any>();
    const completedRefundFenByOrder = new Map<number, number>();
    for (const refund of refundRows) {
      const orderId = Number(refund.orderId);
      if (!latestRefundByOrder.has(orderId)) latestRefundByOrder.set(orderId, { ...refund, id: Number(refund.id), orderId, amountFen: Number(refund.amountFen) });
      if (refund.status === "completed") completedRefundFenByOrder.set(orderId, Number(completedRefundFenByOrder.get(orderId) || 0) + Number(refund.amountFen || 0));
    }
    return Promise.all(scopedOrders.map(async (order) => ({
      ...this.publicCourseOrder(order),
      course: this.publicCourse(order.course),
      owned: await this.hasCourseAccess(user.id, order.course.id),
      latestRefund: latestRefundByOrder.get(order.id) || null,
      refundedAmountFen: Number(completedRefundFenByOrder.get(order.id) || 0),
      refundableAmountFen: Math.max(Number(order.amountFen || 0) - Number(completedRefundFenByOrder.get(order.id) || 0), 0)
    })));
  }

  async myWallet(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveWalletTenantContext(context);
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const wallet = await this.userWallets.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    return this.publicWallet(wallet, tenant);
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
    return (await builder.getMany()).map((transaction) => this.publicWalletTransaction(transaction));
  }

  private async resolveWalletTenantContext(context?: PublicTenantContext) {
    const code = normalizeTenantCode(context?.tenantCode);
    if (code && code !== "platform") return this.resolveTenantContext(context);
    const multiTenantEnabled = this.config.get("MULTI_TENANT_ENABLED", "false") === "true";
    if (!multiTenantEnabled || code === "platform") return null;
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
    if (coupon) await this.releaseActivityCouponUsage(order, reason);
    if (pointsUsed > 0) await this.awardPoints(order.registration.user, pointsUsed, "points_return", order.id, reason, order.tenant || order.registration.activity?.tenant || null);
  }

  async registrationDetail(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.findUserRegistration(id, userId);
    if (!registration) throw new NotFoundException("报名记录不存在");
    const tenant = await this.assertRegistrationTenantAccess(registration, context);
    const [order, operationSetting] = await Promise.all([this.findRegistrationOrder(id), this.ensureOperationSetting(tenant)]);
    const refunds = order ? await this.findOrderRefunds(order.id) : [];
    const charityRefund = order ? await this.registrationCharityRefundView(order, refunds) : null;
    const groupVisible = ![RegistrationStatus.Cancelled, RegistrationStatus.Rejected].includes(registration.status);
    const groupQrCodeUrl = groupVisible ? registration.activity.groupQrCodeUrl || operationSetting.defaultGroupQrCodeUrl || null : null;
    return { registration: this.publicRegistration(registration), order: order ? this.publicOrder(order) : null, refunds: refunds.map((refund) => this.publicRefund(refund)), charityRefund, operationSetting: this.publicOperationSetting(operationSetting), groupQrCodeUrl };
  }

  async requestRegistrationRefund(id: number, user: User, context?: PublicTenantContext) {
    const registration = await this.findUserRegistration(id, user.id);
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    const order = await this.findRegistrationOrder(id);
    if (!order) throw new NotFoundException("订单不存在");
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const refundRepo = manager.getRepository(Refund);
      const lockedOrder = await orderRepo.findOne({ where: { id: order.id }, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder) throw new NotFoundException("订单不存在");
      this.assertOrderUserAccess(lockedOrder, user);
      if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(lockedOrder.status)) throw new BadRequestException("当前订单不能申请退款");
      if (lockedOrder.registration.status === RegistrationStatus.CheckedIn) throw new BadRequestException("已签到报名不能在线申请退款");

      const refunds = await refundRepo.createQueryBuilder("refund")
        .where("refund.orderId = :orderId", { orderId: lockedOrder.id })
        .andWhere("refund.status IN (:...statuses)", { statuses: ["pending", "processing", "completed"] })
        .orderBy("refund.createdAt", "DESC")
        .getMany();
      const pendingRefund = refunds.find((item) => ["pending", "processing"].includes(item.status));
      const preview = await this.charityFund.previewRetainedActivityRefund(lockedOrder);
      if (pendingRefund) return { refund: this.publicRefund(pendingRefund), order: this.publicOrder(lockedOrder), charityRefund: { ...preview, canRequest: false, pendingRefund: this.publicRefund(pendingRefund) }, idempotent: true };
      if (!preview.enabled) throw new BadRequestException("当前订单暂不支持公益退款申请");
      const completedAmount = refunds.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0);
      const availableAmount = Math.max(Number(lockedOrder.amount || 0) - completedAmount, 0);
      const amount = Math.min(Number(preview.refundAmount || 0), availableAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("当前订单暂无可退金额");

      const refundNo = `URF${Date.now()}${lockedOrder.id}`;
      const refund = await refundRepo.save(refundRepo.create({
        order: lockedOrder,
        tenant: lockedOrder.tenant || null,
        refundNo,
        amount: amount.toFixed(2),
        status: "pending",
        operator: `user:${user.id}`,
        reason: `[charity_retained] 用户申请活动公益退款，公益金保留 ${preview.charityAmount} 元`
      }));
      return { refund: this.publicRefund(refund), order: this.publicOrder(lockedOrder), charityRefund: { ...preview, canRequest: false, pendingRefund: this.publicRefund(refund) }, idempotent: false };
    });
  }

  async cancelRegistration(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.findUserRegistration(id, userId);
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    if (!registration.activity.allowCancel) throw new BadRequestException("该活动不允许用户取消报名");
    if ([RegistrationStatus.Cancelled, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("当前状态不能取消");
    registration.status = RegistrationStatus.Cancelled;
    registration.cancelReason = "用户取消";
    const order = await this.findRegistrationOrder(id);
    if (order && order.status === OrderStatus.PendingPayment) {
      order.status = OrderStatus.Cancelled;
      await this.orders.save(order);
      await this.refundRedeemedPoints(order, "用户取消报名返还积分");
    }
    const saved = await this.registrations.save(registration);
    await this.recordConversionEvent("cancel", { activity: saved.activity, user: saved.user, registration: saved, channel: saved.channel || null, order, source: "member", idempotencyKey: `cancel:${saved.id}`, payload: { reason: saved.cancelReason } });
    return this.publicRegistration(saved);
  }

  async checkInCode(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.findUserRegistration(id, userId);
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    if (![RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("报名成功后才会生成签到码");
    const secret = this.config.get<string>("CHECKIN_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const expiresAt = new Date(registration.activity.endTime ? new Date(registration.activity.endTime).getTime() + 24 * 60 * 60 * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000);
    return { code: createCheckInTicket({ registrationId: registration.id, activityId: registration.activity.id, expiresAt, nonce: checkInNonce(registration.checkInCode, secret) }, secret), expiresAt: expiresAt.toISOString(), activityId: registration.activity.id, registrationId: registration.id };
  }

  private findUserRegistration(id: number, userId: number) {
    return this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.channel", "channel")
      .where("registration.id = :id", { id })
      .andWhere("user.id = :userId", { userId })
      .getOne();
  }

  private findRegistrationOrder(registrationId: number) {
    return this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .leftJoinAndSelect("order.coupon", "coupon")
      .leftJoinAndSelect("order.memberLevel", "memberLevel")
      .where("registration.id = :registrationId", { registrationId })
      .getOne();
  }

  private findOrderRefunds(orderId: number, statuses?: string[]) {
    const builder = this.refunds
      .createQueryBuilder("refund")
      .where("refund.orderId = :orderId", { orderId })
      .orderBy("refund.createdAt", "DESC");
    if (statuses?.length) builder.andWhere("refund.status IN (:...statuses)", { statuses });
    return builder.getMany();
  }

  private async assertRegistrationTenantAccess(registration: Registration, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    if (registration.tenant && !registration.tenant.enabled) throw new NotFoundException("Registration not found");
    if (registration.activity?.tenant && !registration.activity.tenant.enabled) throw new NotFoundException("Registration not found");
    const platformRegistration = !registration.tenant?.id && !registration.activity?.tenant?.id;
    if (tenant && !platformRegistration && registration.tenant?.id !== tenant.id && registration.activity?.tenant?.id !== tenant.id) throw new NotFoundException("Registration not found");
    if (platformRegistration) return null;
    return tenant || registration.tenant || registration.activity?.tenant || null;
  }

  private async validateAnswers(fields: any[], answers: RegistrationAnswer[], user: User, tenant: Tenant | null) {
    const expected = new Map(fields.map((field) => [Number(field.id), field]));
    const seen = new Set<number>();
    for (const answer of answers || []) {
      const field = expected.get(Number(answer.fieldId));
      if (!field || seen.has(Number(answer.fieldId))) throw new BadRequestException("报名表单字段无效，请刷新后重试");
      seen.add(Number(answer.fieldId));
      if (answer.type !== field.type) throw new BadRequestException(`字段「${field.label}」类型不匹配，请刷新后重试`);
      const values = Array.isArray(answer.value) ? answer.value.map(String) : [String(answer.value ?? "").trim()];
      if ([FieldType.SingleChoice, FieldType.MultipleChoice].includes(field.type)) {
        const allowed = new Set((field.options || []).flatMap((item: any) => [String(item.label || ""), String(item.value || "")]).filter(Boolean));
        if (values.some((value) => value && !allowed.has(value))) throw new BadRequestException(`字段「${field.label}」包含无效选项`);
      }
      const value = values[0] || "";
      if (value && field.type === FieldType.Phone && !/^1\d{10}$/.test(value)) throw new BadRequestException(`请输入正确的${field.label}`);
      if (value && field.type === FieldType.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new BadRequestException(`请输入正确的${field.label}`);
      if (value && field.type === FieldType.Number && !Number.isFinite(Number(value))) throw new BadRequestException(`${field.label}必须是数字`);
      if (value && field.type === FieldType.Date && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException(`${field.label}日期格式无效`);
      if (value && field.type === FieldType.DateTime && !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) throw new BadRequestException(`${field.label}日期时间格式无效`);
      if (value && field.type === FieldType.Attachment) {
        const token = value.match(/^\/api\/public\/me\/registration-attachments\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\/download$/)?.[1];
        if (token) {
          const payload = verifyPrivateAssetToken(token, this.privateAssetSecret());
          if (!payload || payload.purpose !== "registration_attachment" || payload.ownerUserId !== user.id || (payload.tenantId || null) !== (tenant?.id || null) || !privateDocumentExists(payload.reference)) throw new BadRequestException(`${field.label}附件无效或不属于当前账号`);
          claimPrivateDocument(payload.reference);
        } else if (!/^(https?:\/\/|\/uploads\/)/i.test(value)) throw new BadRequestException(`${field.label}附件地址无效`);
      }
    }
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

  private async registrationCharityRefundView(order: Order, refunds: Refund[]) {
    const preview = await this.charityFund.previewRetainedActivityRefund(order);
    const activeRefund = refunds.find((item) => ["pending", "processing"].includes(item.status)) || null;
    const completedAmount = refunds.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0);
    const availableAmount = Math.max(Number(order.amount || 0) - completedAmount, 0);
    const canRequest = Boolean(
      preview.enabled &&
      !activeRefund &&
      [OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status) &&
      Number(preview.refundAmount || 0) > 0 &&
      availableAmount > 0
    );
    return {
      ...preview,
      canRequest,
      pendingRefund: this.publicRefund(activeRefund),
      completedRefundAmount: completedAmount.toFixed(2),
      availableRefundAmount: availableAmount.toFixed(2),
      actualRefundAmount: Math.min(Number(preview.refundAmount || 0), availableAmount).toFixed(2)
    };
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

  async optionalUserFromAuthorization(authorization?: string | string[] | null) {
    const id = this.optionalUserIdFromAuthorization(authorization);
    return id ? this.users.findOneBy({ id }) : null;
  }

  optionalUserIdFromAuthorization(authorization?: string | string[] | null) {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = this.extractBearerToken(header);
    if (!token) return undefined;
    try {
      return this.verifyUserAccessToken(token).sub;
    } catch {
      return undefined;
    }
  }

  private userLoginResponse(user: User) {
    return {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        sourceChannel: user.sourceChannel,
        lastLoginChannel: user.lastLoginChannel,
        wechatBound: Boolean(user.openid),
        wechatAppId: user.wechatAppId
      },
      userAccessToken: this.signUserAccessToken(user)
    };
  }

  private privateAssetSecret() {
    return this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
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

  private async resolveWechatMiniProgramConfig(requestedAppId?: string) {
    const releaseSetting = await this.miniprogramReleaseSettings.findOne({ where: {}, order: { id: "ASC" } });
    const appId = requestedAppId?.trim() || this.config.get<string>("WECHAT_APP_ID") || releaseSetting?.appId || this.config.get<string>("WECHAT_PAY_APP_ID") || "";
    const appSecret = this.config.get<string>("WECHAT_APP_SECRET") || (releaseSetting?.appId === appId ? releaseSetting?.appSecret : "") || "";
    return { appId, appSecret };
  }

  private async resolveWechatIdentity(code: string, requestedAppId?: string) {
    const realWechatLogin = this.config.get("WECHAT_LOGIN_REAL_ENABLED", this.config.get("NODE_ENV") === "production" ? "true" : "false") === "true";
    const { appId, appSecret } = await this.resolveWechatMiniProgramConfig(requestedAppId);
    if (!realWechatLogin) return { openid: `dev_${code}`, unionid: null, appId: appId || "dev" };
    if (!appId || !appSecret) throw new BadRequestException("微信登录配置未完成");
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const response = await fetch(url);
    const payload = await response.json() as Record<string, unknown>;
    const openid = typeof payload.openid === "string" ? payload.openid.trim() : "";
    const unionid = typeof payload.unionid === "string" ? payload.unionid.trim() : null;
    if (!response.ok || !openid) throw new BadRequestException(String(payload.errmsg || "微信登录失败"));
    return { openid, unionid, appId };
  }

  private async resolveWechatAccessToken(requestedAppId?: string) {
    const { appId, appSecret } = await this.resolveWechatMiniProgramConfig(requestedAppId);
    if (!appId || !appSecret) throw new BadRequestException("微信手机号授权配置未完成");
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
    const response = await fetch(url);
    const payload = await response.json() as Record<string, unknown>;
    const accessToken = typeof payload.access_token === "string" ? payload.access_token.trim() : "";
    if (!response.ok || !accessToken) throw new BadRequestException(String(payload.errmsg || "获取微信 access_token 失败"));
    return accessToken;
  }

  private async resolveWechatPhoneNumber(code: string, requestedAppId?: string) {
    const realWechatLogin = this.config.get("WECHAT_LOGIN_REAL_ENABLED", this.config.get("NODE_ENV") === "production" ? "true" : "false") === "true";
    if (!realWechatLogin) {
      const devPhone = this.config.get<string>("WECHAT_PHONE_DEV_NUMBER", "");
      if (/^1\d{10}$/.test(devPhone)) return devPhone;
      throw new BadRequestException("微信手机号授权需要配置真实小程序 AppID/AppSecret");
    }
    const accessToken = await this.resolveWechatAccessToken(requestedAppId);
    const response = await fetch(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    });
    const payload = await response.json() as Record<string, any>;
    const phone = typeof payload?.phone_info?.phoneNumber === "string" ? payload.phone_info.phoneNumber.trim() : "";
    if (!response.ok || !/^1\d{10}$/.test(phone)) throw new BadRequestException(String(payload.errmsg || "微信手机号授权失败"));
    return phone;
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

    // Keep the cooldown predicate in parameterized SQL so ORM date mapping cannot bypass it.
    const latestRows: Array<{ createdAt: Date | string }> = cooldownSeconds > 0
      ? await this.dataSource.query(
          `SELECT createdAt FROM h5_auth_code_logs WHERE phone = ? AND status = ? AND createdAt > NOW() - INTERVAL ${cooldownSeconds} SECOND ORDER BY createdAt DESC LIMIT 1`,
          [phone, "sent"]
        )
      : [];
    const latest = latestRows[0] || null;
    if (latest) {
      const createdAtMs = latest.createdAt instanceof Date ? latest.createdAt.getTime() : new Date(String(latest.createdAt)).getTime();
      const waitSeconds = Number.isFinite(createdAtMs)
        ? Math.max(Math.ceil((createdAtMs + cooldownSeconds * 1000 - now) / 1000), 1)
        : cooldownSeconds;
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
    }, {
      sms: {
        enabled: setting.smsProviderEnabled,
        provider: setting.smsProvider,
        accessKeyId: setting.smsAccessKeyId,
        accessKeySecret: decryptStoredSecret(setting.smsAccessKeySecret),
        signName: setting.smsSignName,
        templateId: setting.smsTemplateId,
        appId: setting.smsSdkAppId
      }
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
    if (!dto.ticketTypeId) {
      const configuredTicketCount = await this.ticketTypes.count({ where: { activity: { id: activity.id }, enabled: true } });
      if (configuredTicketCount > 0) throw new BadRequestException("请选择可售票种");
    }
    const memberProfile = dto.userId ? await this.memberProfiles.findOne({ where: { user: { id: dto.userId }, tenantScopeKey: activity.tenant ? `tenant:${activity.tenant.id}` : "platform" } }) : null;
    const memberLevel = memberProfile?.level && memberProfile.level.enabled ? memberProfile.level : null;
    const memberLevelSnapshotData = memberProfile?.levelSnapshot as Record<string, unknown> | null | undefined;
    const now = new Date();
    let soldCount = 0;
    if (ticketType) {
      if (ticketType.saleStartsAt && now < ticketType.saleStartsAt) throw new BadRequestException("该票种尚未开售");
      if (ticketType.saleEndsAt && now > ticketType.saleEndsAt) throw new BadRequestException("该票种已停止销售");
      soldCount = await this.orders.createQueryBuilder("order").where("order.ticketTypeId = :ticketTypeId", { ticketTypeId: ticketType.id }).andWhere("order.status IN (:...statuses)", { statuses: [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.PartiallyRefunded] }).getCount();
      if (ticketType.capacity !== null && soldCount >= ticketType.capacity) throw new BadRequestException("该票种已售罄");
      if (dto.userId) {
        const userCount = await this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").where("order.ticketTypeId = :ticketTypeId", { ticketTypeId: ticketType.id }).andWhere("registration.userId = :userId", { userId: dto.userId }).andWhere("order.status IN (:...statuses)", { statuses: [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.PartiallyRefunded] }).getCount();
        if (userCount >= Number(ticketType.perUserLimit || 1)) throw new BadRequestException("已达到该票种每人限购数量");
      }
    }
    const pricing = ticketType ? resolveTicketPrice({ basePrice: Number(ticketType.price), soldCount, now, isMember: Boolean(memberLevel), memberPrice: ticketType.memberPrice === null ? null : Number(ticketType.memberPrice), earlyBirdPrice: ticketType.earlyBirdPrice === null ? null : Number(ticketType.earlyBirdPrice), earlyBirdEndsAt: ticketType.earlyBirdEndsAt, tierPrices: ticketType.tierPrices }) : { price: Number(activity.price), rule: "activity_base" };
    const original = pricing.price;
    const memberDiscountRate = Number(memberLevelSnapshotData?.discountRate ?? memberLevel?.discountRate ?? 1);
    const memberDiscount = memberLevel && pricing.rule !== "member" ? Math.max(original - original * memberDiscountRate, 0) : 0;
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
      ticketPricingRule: pricing.rule,
      coupon,
      memberLevel,
      memberLevelSnapshot: memberLevelSnapshotData || memberLevelSnapshot(memberLevel)
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
    if (existingTransaction) return { order: existingTransaction.order || order, transaction: existingTransaction, idempotent: true };
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
    if (Number(savedOrder.amount) > 0) await this.memberPoints.awardEvent({ user: savedOrder.registration.user, tenant: savedOrder.tenant || savedOrder.registration.activity?.tenant || null, eventType: "activity_order_paid", amountFen: Number(savedOrder.amountFen || yuanToFen(savedOrder.amount)), sourceType: "order_paid", sourceId: savedOrder.id, remark: "活动消费积分" });
    if (savedOrder.registration.status === RegistrationStatus.PendingPayment) {
      savedOrder.registration.status = savedOrder.registration.activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
      await this.registrations.save(savedOrder.registration);
    }
    await this.recordConversionEvent("pay", { activity: savedOrder.registration.activity, user: savedOrder.registration.user, registration: savedOrder.registration, order: savedOrder, channel: savedOrder.registration.channel || null, amount: savedOrder.amount, source: savedOrder.registration.attributionSource || provider, idempotencyKey: `pay:${savedOrder.id}`, payload: { paymentProvider: provider } });
    await this.charityFund.recordOrderAccrual(savedOrder, provider);
    return { order: savedOrder, transaction, idempotent: false };
  }

  private async recordActivityView(activity: Activity, user: User | null, tracking?: PublicTrackingContext) {
    const channel = await this.resolveActivityChannel(activity, tracking?.channelCode, tracking?.source);
    const source = this.cleanTrackingText(tracking?.source || channel?.source || tracking?.inviteCode || "direct", 80);
    const visitorKey = user?.id ? `u${user.id}` : this.cleanTrackingText(tracking?.clientIp || "anonymous", 40);
    const day = analyticsDateText(new Date());
    const channelKey = channel?.id || "none";
    const idempotencyKey = `view:${activity.id}:${visitorKey}:${day}:${channelKey}`;
    const event = await this.recordConversionEvent("view", {
      activity,
      user,
      channel,
      source,
      idempotencyKey,
      clientIp: tracking?.clientIp,
      userAgent: tracking?.userAgent,
      payload: { inviteCode: tracking?.inviteCode || null }
    });
    if (!event) return;
    await this.activityViewLogs.save(this.activityViewLogs.create({ activity, user, channel, source }));
  }

  private async resolveActivityChannel(activity: Activity, channelCode?: string | null, source?: string | null) {
    const code = this.cleanTrackingText(channelCode, 48);
    if (code) {
      const channel = await this.activityChannels
        .createQueryBuilder("channel")
        .where("channel.activityId = :activityId", { activityId: activity.id })
        .andWhere("channel.code = :code", { code })
        .andWhere("channel.enabled = :enabled", { enabled: true })
        .getOne();
      if (channel) return channel;
    }
    const sourceText = this.cleanTrackingText(source, 80);
    if (!sourceText) return null;
    return this.activityChannels
      .createQueryBuilder("channel")
      .where("channel.activityId = :activityId", { activityId: activity.id })
      .andWhere("channel.source = :source", { source: sourceText })
      .andWhere("channel.enabled = :enabled", { enabled: true })
      .getOne();
  }

  private async recordConversionEvent(type: ConversionEventType, input: { activity?: Activity | null; user?: User | null; registration?: Registration | null; order?: Order | null; channel?: ActivityChannel | null; amount?: string | number | null; source?: string | null; idempotencyKey?: string | null; clientIp?: string | null; userAgent?: string | null; payload?: Record<string, unknown> | null }) {
    const registration = input.registration || input.order?.registration || null;
    const activity = input.activity || registration?.activity || null;
    const channel = input.channel || registration?.channel || null;
    const ticketType = input.order?.ticketType || null;
    const result = await this.conversionEvents.createQueryBuilder().insert().values({
      type,
      tenant: this.relationId(activity?.tenant || input.order?.tenant || registration?.tenant || channel?.tenant || null),
      activity: this.relationId(activity),
      user: this.relationId(input.user || registration?.user || null),
      registration: this.relationId(registration),
      order: this.relationId(input.order || null),
      channel: this.relationId(channel),
      ticketTypeIdSnapshot: ticketType?.id || null,
      ticketTypeNameSnapshot: ticketType?.name || null,
      channelCodeSnapshot: registration?.attributionChannelCode || channel?.code || null,
      channelNameSnapshot: registration?.attributionChannelName || channel?.name || null,
      provinceSnapshot: registration?.attributionProvince || activity?.locationProvince || null,
      citySnapshot: registration?.attributionCity || activity?.locationCity || null,
      districtSnapshot: registration?.attributionDistrict || activity?.locationDistrict || null,
      amount: Number(input.amount || 0).toFixed(2),
      source: this.cleanTrackingText(registration?.attributionSource || input.source, 80) || null,
      idempotencyKey: input.idempotencyKey || null,
      clientIp: this.cleanTrackingText(input.clientIp, 80) || null,
      userAgent: this.cleanTrackingText(input.userAgent, 255) || null,
      payload: input.payload || null
    } as any).orIgnore().updateEntity(false).execute();
    const id = Number(result.identifiers[0]?.id || result.raw?.insertId || 0);
    return id ? { id } : null;
  }

  private relationId<T extends { id: number }>(entity: T | null | undefined) { return entity ? ({ id: entity.id } as T) : null; }

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
      paymentMethods: this.defaultPaymentMethods(),
      customerServiceName: "活动运营客服",
      customerServicePhone: "13800000000",
      customerServiceWechat: "activity_service",
      defaultGroupQrCodeUrl: null,
      pageTheme: {},
      launchConfig: {},
      defaultTenantCode: null,
      refundInstructions: "如需取消报名或申请退款，请先联系主办方客服。已签到或活动开始后的退款规则以活动报名须知为准。",
      invoiceInstructions: "如需发票，请在付款后联系客服登记抬头、税号和接收邮箱。",
      smsProviderEnabled: false,
      smsProvider: "luosimao-sms",
      smsAccessKeyId: null,
      smsAccessKeySecret: null,
      smsSignName: null,
      smsTemplateId: null,
      smsSdkAppId: null
    });
    return this.operationSettings.save(setting);
  }

  private async assertRegistrationEnabled(tenant?: Tenant | null) {
    const setting = await this.ensureOperationSetting(tenant || null);
    if (setting.registrationEnabled !== false && (setting.registrationEnabled as unknown) !== 0 && (setting.registrationEnabled as unknown) !== "0") return;
    throw new BadRequestException(setting.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。");
  }

  private async assertPaymentMethodEnabled(method: PaymentMethod, tenant?: Tenant | null) {
    const setting = await this.ensureOperationSetting(tenant || null);
    const methods = this.normalizePaymentMethods(setting.paymentMethods);
    if (method === PaymentMethod.Free && methods.free) return;
    if (method === PaymentMethod.Wechat && methods.wechat) {
      await this.assertProviderPaymentReady("wechat", method);
      return;
    }
    if (method === PaymentMethod.Alipay && methods.alipay) {
      await this.assertProviderPaymentReady("alipay", method);
      return;
    }
    if (method === PaymentMethod.Balance && methods.balance) return;
    if (method === PaymentMethod.Offline && methods.offline) return;
    throw new BadRequestException(`${this.paymentMethodLabel(method)}暂未开放，请选择其他支付方式`);
  }

  private async assertProviderPaymentReady(provider: SupportedPaymentProvider, method: PaymentMethod) {
    if (await this.paymentProvider.canCreatePayment(provider)) return;
    throw new BadRequestException(`${this.paymentMethodLabel(method)}尚未完成真实支付配置，请选择线下收款或联系主办方`);
  }

  private defaultPaymentMethods() {
    return { free: true, wechat: false, alipay: false, balance: true, offline: true };
  }

  private normalizePaymentMethods(value: unknown) {
    const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const defaults = this.defaultPaymentMethods();
    return {
      free: input.free === undefined ? defaults.free : Boolean(input.free),
      wechat: input.wechat === undefined ? defaults.wechat : Boolean(input.wechat),
      alipay: input.alipay === undefined ? defaults.alipay : Boolean(input.alipay),
      balance: input.balance === undefined ? defaults.balance : Boolean(input.balance),
      offline: input.offline === undefined ? defaults.offline : Boolean(input.offline)
    };
  }

  private paymentMethodLabel(method: PaymentMethod) {
    const map: Record<string, string> = {
      [PaymentMethod.Free]: "免费报名",
      [PaymentMethod.Wechat]: "微信支付",
      [PaymentMethod.Alipay]: "支付宝",
      [PaymentMethod.Balance]: "余额支付",
      [PaymentMethod.Offline]: "线下收款"
    };
    return map[method] || "该支付方式";
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

  private async awardPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string, tenant: Tenant | null = null) {
    const result = await this.memberPoints.post({ user, tenant, points, sourceType, sourceId, remark, negativePolicy: sourceType.includes("refund") ? "debt" : "reject" });
    await this.refreshMemberProfile(user, tenant);
    return result.log;
  }

  private async refundRedeemedPoints(order: Order, remark: string) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardPoints(order.registration.user, order.pointsUsed, "points_return", order.id, remark, order.tenant || order.registration.activity?.tenant || null);
    order.pointsRefundedAt = new Date();
    await this.orders.save(order);
    return order;
  }

  private async refreshMemberProfile(user: User, tenant: Tenant | null = null) {
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) profile = this.memberProfiles.create({ user, tenant, tenantScopeKey, level: null, growthValue: 0, growthCycleStartedAt: null, levelStartedAt: null, levelExpiresAt: null, levelSource: "growth" });
    const tenantFilter = tenant ? " = :memberTenantId" : " IS NULL";
    const [registrationCount, pointSum, growthSum, paidAmount] = await Promise.all([
      this.registrations.createQueryBuilder("r").where("r.userId = :userId", { userId: user.id }).andWhere(`r.tenantId${tenantFilter}`, { memberTenantId: tenant?.id }).getCount(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").andWhere("(p.expiresAt IS NULL OR p.expiresAt > :now)", { now: new Date() }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.growthValue), 0)", "sum").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").andWhere("(:growthCycle IS NULL OR p.createdAt >= :growthCycle)", { growthCycle: profile.growthCycleStartedAt }).getRawOne<{ sum: string }>(),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere(`o.tenantId${tenantFilter}`, { memberTenantId: tenant?.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>()
    ]);
    profile.points = Number(pointSum?.sum || 0);
    profile.growthValue = Number(growthSum?.sum || 0);
    profile.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    profile.registrationCount = registrationCount;
    if (!manualLevelOverrideActive(profile.levelSource, profile.levelExpiresAt)) {
      const previousLevelId = profile.level?.id || null;
      profile.level = await this.resolveMemberLevel(profile.growthValue, tenant);
      if ((profile.level?.id || null) !== previousLevelId) { profile.levelStartedAt = new Date(); profile.levelExpiresAt = levelExpiry(profile.level, profile.levelStartedAt); profile.levelSource = "growth"; profile.levelSnapshot = memberLevelSnapshot(profile.level); }
    }
    profile.lastActiveAt = new Date();
    return this.memberProfiles.save(profile);
  }

  private async resolveMemberLevel(growthValue: number, tenant: Tenant | null) {
    const levels = await this.memberLevels.find({ where: { enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) }, order: { minGrowth: "DESC" } });
    return resolveGrowthLevel(levels, growthValue) as MemberLevel | null;
  }

  private async ensureActivityMemberAccess(activity: Activity, user: User) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    if (!requiredLevel) return;
    const tenantScopeKey = activity.tenant ? `tenant:${activity.tenant.id}` : "platform";
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) profile = await this.refreshMemberProfile(user, activity.tenant || null);
    const currentMinGrowth = Number((profile.levelSnapshot as Record<string, unknown> | null)?.minGrowth ?? profile.level?.minGrowth ?? -1);
    if (!profile.level || currentMinGrowth < requiredLevel.minGrowth) {
      const message = this.isPriorityBookingActive(activity)
        ? `优先报名截止前仅限${requiredLevel.name}及以上会员报名`
        : `该活动仅限${requiredLevel.name}及以上会员报名`;
      throw new BadRequestException(message);
    }
  }

  private async memberAccessSnapshot(activity: Activity, userId?: number) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    const priorityActive = this.isPriorityBookingActive(activity);
    if (!requiredLevel) return { requiredLevel: null, currentLevel: null, eligible: true, message: "不限会员等级", priorityActive: false, priorityMemberLevel: this.publicMemberLevel(activity.priorityMemberLevel), priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    if (!userId) {
      return { requiredLevel: this.publicMemberLevel(requiredLevel), currentLevel: null, eligible: false, message: priorityActive ? `优先报名截止前仅限${requiredLevel.name}及以上会员报名` : `该活动仅限${requiredLevel.name}及以上会员报名`, priorityActive, priorityMemberLevel: this.publicMemberLevel(activity.priorityMemberLevel), priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    }
    const user = await this.users.findOneBy({ id: userId });
    if (!user) return { requiredLevel: this.publicMemberLevel(requiredLevel), currentLevel: null, eligible: false, message: "用户不存在", priorityActive, priorityMemberLevel: this.publicMemberLevel(activity.priorityMemberLevel), priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    const tenantScopeKey = activity.tenant ? `tenant:${activity.tenant.id}` : "platform";
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) profile = await this.refreshMemberProfile(user, activity.tenant || null);
    const currentLevel = profile.level || null;
    const eligible = Boolean(currentLevel && currentLevel.minGrowth >= requiredLevel.minGrowth);
    return {
      requiredLevel: this.publicMemberLevel(requiredLevel),
      currentLevel: this.publicMemberLevel(currentLevel),
      eligible,
      priorityActive,
      priorityMemberLevel: this.publicMemberLevel(activity.priorityMemberLevel),
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

  private async findPublicTicketTypes(activityId: number) {
    const soldStatuses = [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.PartiallyRefunded];
    const [ticketTypes, soldRows] = await Promise.all([
      this.ticketTypes
        .createQueryBuilder("ticketType")
        .where("ticketType.activityId = :activityId", { activityId })
        .andWhere("ticketType.enabled = :enabled", { enabled: true })
        .orderBy("ticketType.price", "ASC")
        .addOrderBy("ticketType.id", "ASC")
        .getMany(),
      this.orders
        .createQueryBuilder("order")
        .innerJoin("order.ticketType", "ticketType")
        .select("order.ticketTypeId", "ticketTypeId")
        .addSelect("COUNT(*)", "soldCount")
        .where("ticketType.activityId = :activityId", { activityId })
        .andWhere("order.status IN (:...statuses)", { statuses: soldStatuses })
        .groupBy("order.ticketTypeId")
        .getRawMany<{ ticketTypeId: string; soldCount: string }>()
    ]);
    const soldCounts = new Map(soldRows.map((row) => [Number(row.ticketTypeId), Number(row.soldCount)]));
    const now = new Date();
    return ticketTypes.map((ticketType) => {
      const soldCount = soldCounts.get(ticketType.id) || 0;
      const remainingSeats = ticketType.capacity === null ? null : Math.max(ticketType.capacity - soldCount, 0);
      const saleStatus: PublicTicketAvailability["saleStatus"] = ticketType.saleStartsAt && now < ticketType.saleStartsAt
        ? "not_started"
        : ticketType.saleEndsAt && now > ticketType.saleEndsAt
          ? "ended"
          : remainingSeats !== null && remainingSeats <= 0
            ? "sold_out"
            : "available";
      return { ticketType, availability: { soldCount, remainingSeats, saleStatus } };
    });
  }

  private async withPublicStats(activity: Activity) {
    const usedStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const [registeredCount, waitingCount] = await Promise.all([
      this.registrations
        .createQueryBuilder("registration")
        .where("registration.activityId = :activityId", { activityId: activity.id })
        .andWhere("registration.status IN (:...statuses)", { statuses: usedStatuses })
        .getCount(),
      this.waitlists.createQueryBuilder("waitlist").where("waitlist.activityId = :activityId", { activityId: activity.id }).andWhere("waitlist.status = :status", { status: WaitlistStatus.Waiting }).getCount()
    ]);
    const remainingSeats = Math.max(activity.capacity - registeredCount, 0);
    const now = Date.now();
    const displayStatus = new Date(activity.registrationDeadline).getTime() < now || new Date(activity.endTime).getTime() < now ? "ended" : remainingSeats <= 0 ? "full" : "open";
    return { ...this.publicActivity(activity), registeredCount, waitingCount, remainingSeats, displayStatus };
  }

  private publicRegistration(registration: Registration) {
    return {
      id: registration.id,
      activity: this.publicActivity(registration.activity),
      status: registration.status,
      answers: registration.answers || [],
      formSchemaVersion: registration.formSchemaVersion,
      formSnapshot: registration.formSnapshot || [],
      companions: registration.companions || [],
      privacyConsentAt: registration.privacyConsentAt,
      reviewRemark: registration.reviewRemark,
      cancelReason: registration.cancelReason,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt
    };
  }

  private publicOrder(order: Order) {
    return { ...this.publicOrderSummary(order), registration: this.publicRegistration(order.registration) };
  }

  private publicOrderSummary(order?: Order | null) {
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
      ticketType: this.publicTicketType(order.ticketType),
      coupon: this.publicCoupon(order.coupon),
      memberLevel: this.publicMemberLevel(order.memberLevel)
    };
  }

  private publicRefund(refund?: Refund | null) {
    if (!refund) return null;
    return {
      id: refund.id,
      refundNo: refund.refundNo,
      amount: refund.amount,
      amountFen: Number(refund.amountFen || 0),
      status: refund.status,
      reason: refund.reason,
      reviewRemark: refund.reviewRemark,
      reviewedAt: refund.reviewedAt,
      completedAt: refund.completedAt,
      providerRefundStatus: refund.providerRefundStatus,
      providerRefundFailureReason: refund.providerRefundFailureReason,
      createdAt: refund.createdAt
    };
  }

  private publicTicketType(ticketType?: TicketType | null, availability?: PublicTicketAvailability) {
    if (!ticketType) return null;
    return {
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      capacity: ticketType.capacity,
      perUserLimit: ticketType.perUserLimit,
      saleStartsAt: ticketType.saleStartsAt,
      saleEndsAt: ticketType.saleEndsAt,
      earlyBirdPrice: ticketType.earlyBirdPrice,
      earlyBirdEndsAt: ticketType.earlyBirdEndsAt,
      memberPrice: ticketType.memberPrice,
      tierPrices: ticketType.tierPrices || [],
      enabled: ticketType.enabled,
      ...(availability || {})
    };
  }

  private publicCoupon(coupon?: Coupon | null) {
    if (!coupon) return null;
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minAmount: coupon.minAmount,
      claimMode: coupon.claimMode,
      perUserLimit: coupon.perUserLimit,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt
    };
  }

  private publicMemberLevel(level?: MemberLevel | null) {
    if (!level) return null;
    return { id: level.id, name: level.name, minPoints: level.minPoints, minGrowth: level.minGrowth, priorityBooking: level.priorityBooking, sortOrder: level.sortOrder };
  }

  private publicWallet(wallet?: UserWallet | null, tenant?: Tenant | null) {
    return {
      id: wallet?.id || null,
      tenant: this.publicHomepageTenant(wallet?.tenant || tenant || null),
      availableBalance: wallet?.availableBalance || "0.00",
      frozenBalance: wallet?.frozenBalance || "0.00",
      giftBalance: wallet?.giftBalance || "0.00",
      frozenGiftBalance: wallet?.frozenGiftBalance || "0.00",
      totalRecharge: wallet?.totalRecharge || "0.00",
      totalSpent: wallet?.totalSpent || "0.00",
      createdAt: wallet?.createdAt || null,
      updatedAt: wallet?.updatedAt || null
    };
  }

  private publicWalletTransaction(transaction?: WalletTransaction | null) {
    if (!transaction) return null;
    return {
      id: transaction.id,
      transactionNo: transaction.transactionNo,
      direction: transaction.direction,
      type: transaction.type,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      frozenBefore: transaction.frozenBefore,
      frozenAfter: transaction.frozenAfter,
      giftBefore: transaction.giftBefore,
      giftAfter: transaction.giftAfter,
      frozenGiftBefore: transaction.frozenGiftBefore,
      frozenGiftAfter: transaction.frozenGiftAfter,
      status: transaction.status,
      remark: transaction.remark,
      createdAt: transaction.createdAt
    };
  }

  private publicPaymentResult(result: { order: Order; transaction?: PaymentTransaction | null; idempotent: boolean }) {
    return {
      order: this.publicOrder(result.order),
      transaction: result.transaction ? {
        id: result.transaction.id,
        transactionNo: result.transaction.transactionNo,
        provider: result.transaction.provider,
        paymentMethod: result.transaction.paymentMethod,
        amount: result.transaction.amount,
        amountFen: Number(result.transaction.amountFen || 0),
        status: result.transaction.status,
        createdAt: result.transaction.createdAt
      } : null,
      walletTransaction: null,
      idempotent: result.idempotent
    };
  }

  private publicCouponClaim(claim?: CouponClaim | null) {
    if (!claim) return null;
    return {
      id: claim.id,
      coupon: this.publicCoupon(claim.coupon),
      claimedCount: claim.claimedCount,
      usedCount: claim.usedCount,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt
    };
  }

  private publicWaitlist(waitlist?: Waitlist | null) {
    if (!waitlist) return null;
    return {
      id: waitlist.id,
      activity: this.publicActivity(waitlist.activity),
      status: waitlist.status,
      answers: waitlist.answers || [],
      remark: waitlist.remark,
      promotedRegistration: waitlist.promotedRegistration ? this.publicRegistration(waitlist.promotedRegistration) : null,
      createdAt: waitlist.createdAt,
      updatedAt: waitlist.updatedAt
    };
  }

  private publicQuote(quote: any) {
    return {
      originalAmount: quote.originalAmount,
      discountAmount: quote.discountAmount,
      memberDiscountAmount: quote.memberDiscountAmount,
      couponDiscountAmount: quote.couponDiscountAmount,
      pointsUsed: quote.pointsUsed,
      pointsDiscountAmount: quote.pointsDiscountAmount,
      availablePoints: quote.availablePoints,
      payableAmount: quote.payableAmount,
      ticketType: this.publicTicketType(quote.ticketType),
      ticketPricingRule: quote.ticketPricingRule,
      coupon: this.publicCoupon(quote.coupon),
      memberLevel: this.publicMemberLevel(quote.memberLevel)
    };
  }

  private publicCourse(course: Course) {
    return course;
  }

  private publicCourseOrder(order: CourseOrder) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      transactionNo: order.transactionNo,
      paidAt: order.paidAt,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  private generateCourseOrderNo() {
    return `CO${Date.now()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  private isExpiredCourseOrder(order: CourseOrder) {
    return order.status === CourseOrderStatus.PendingPayment && Boolean(order.expiresAt && order.expiresAt.getTime() <= Date.now());
  }

  private async hasCourseAccess(userId: number, courseId: number) {
    const count = await this.userLearning.count({ where: { userId, courseId, lessonId: 0 } });
    return count > 0;
  }

  private async grantCourseAccess(user: User, course: Course) {
    let row = await this.userLearning.findOne({ where: { userId: user.id, courseId: course.id, lessonId: 0 } });
    if (!row) row = this.userLearning.create({ userId: user.id, courseId: course.id, lessonId: 0, progress: 0, completedAt: null });
    const saved = await this.userLearning.save(row);
    await this.refreshMemberProfile(user, course.tenant || null);
    return saved;
  }

  private tenantCourseWhere<T extends Record<string, unknown>>(where: T, tenant?: Tenant | null) {
    return tenant ? { ...where, tenant: { id: tenant.id } } : where;
  }

  private assertCourseTenantAccess(course: Course, tenant?: Tenant | null) {
    if (tenant && course.tenant?.id !== tenant.id) throw new NotFoundException("内容订单不存在");
  }

  private publicActivity(activity: Activity) {
    const rules = activity.eligibilityRules || null;
    return {
      id: activity.id,
      title: activity.title,
      tenant: this.publicHomepageTenant(activity.tenant),
      coverUrl: activity.coverUrl,
      shareTitle: activity.shareTitle,
      shareDescription: activity.shareDescription,
      shareImageUrl: activity.shareImageUrl,
      description: activity.description,
      notice: activity.notice,
      location: activity.location,
      locationProvince: activity.locationProvince,
      locationCity: activity.locationCity,
      locationDistrict: activity.locationDistrict,
      locationLatitude: activity.locationLatitude,
      locationLongitude: activity.locationLongitude,
      locationMapUrl: activity.locationMapUrl,
      startTime: activity.startTime,
      endTime: activity.endTime,
      registrationDeadline: activity.registrationDeadline,
      capacity: activity.capacity,
      price: activity.price,
      status: activity.status,
      cancelledAt: activity.cancelledAt,
      cancellationReason: activity.cancellationReason,
      featured: activity.featured,
      requireReview: activity.requireReview,
      allowCancel: activity.allowCancel,
      category: activity.category ? { id: activity.category.id, name: activity.category.name, iconUrl: activity.category.iconUrl, coverUrl: activity.category.coverUrl } : null,
      agent: activity.agent ? { id: activity.agent.id, name: activity.agent.name, region: activity.agent.region } : null,
      minMemberLevel: this.publicMemberLevel(activity.minMemberLevel),
      priorityMemberLevel: this.publicMemberLevel(activity.priorityMemberLevel),
      priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt,
      fields: (activity.fields || []).map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required, options: field.options || [], sortOrder: field.sortOrder })),
      formSchemaVersion: activity.formSchemaVersion,
      eligibilityRules: rules ? {
        minAge: rules.minAge,
        maxAge: rules.maxAge,
        allowedRegions: rules.allowedRegions || [],
        maxRegistrationsPerUser: rules.maxRegistrationsPerUser,
        requirePrivacyConsent: rules.requirePrivacyConsent,
        allowCompanions: rules.allowCompanions,
        maxCompanions: rules.maxCompanions
      } : null
    };
  }

  private hasGroupQrCode(activity: Activity, setting?: OperationSetting | null) {
    return Boolean(activity.groupQrCodeUrl?.trim() || setting?.defaultGroupQrCodeUrl?.trim());
  }

  private publicOperationSetting(setting: OperationSetting, platformSetting?: OperationSetting | null) {
    return {
      offlinePaymentInstructions: setting.offlinePaymentInstructions,
      paymentMethods: this.normalizePaymentMethods(setting.paymentMethods),
      registrationEnabled: setting.registrationEnabled,
      registrationDisabledMessage: setting.registrationDisabledMessage,
      customerServiceName: setting.customerServiceName,
      customerServicePhone: setting.customerServicePhone,
      customerServiceWechat: setting.customerServiceWechat,
      pageTheme: setting.pageTheme || {},
      launchConfig: this.publicLaunchConfig(setting.launchConfig, platformSetting?.launchConfig),
      refundInstructions: setting.refundInstructions,
      invoiceInstructions: setting.invoiceInstructions,
      userAgreementUrl: setting.userAgreementUrl,
      privacyPolicyUrl: setting.privacyPolicyUrl,
      merchantAgreementUrl: setting.merchantAgreementUrl
    };
  }

  async availableActivityCoupons(user: User, context?: PublicTenantContext, activityId?: number) {
    const tenant = await this.resolveTenantContext(context);
    const now = new Date();
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("coupon.tenant", "tenant").where("coupon.enabled = :enabled", { enabled: true }).andWhere("coupon.claimMode = :claimMode", { claimMode: "claim" }).andWhere("(coupon.startsAt IS NULL OR coupon.startsAt <= :now)", { now }).andWhere("(coupon.endsAt IS NULL OR coupon.endsAt >= :now)").andWhere("(coupon.usageLimit IS NULL OR coupon.claimedCount < coupon.usageLimit)");
    if (tenant) builder.andWhere("coupon.tenantId = :tenantId", { tenantId: tenant.id }); else builder.andWhere("coupon.tenantId IS NULL");
    if (activityId) builder.andWhere("(coupon.activityId IS NULL OR coupon.activityId = :activityId)", { activityId });
    const coupons = await builder.orderBy("coupon.createdAt", "DESC").take(100).getMany();
    const claims = coupons.length ? await this.dataSource.getRepository(CouponClaim).find({ where: { user: { id: user.id }, coupon: { id: In(coupons.map(item => item.id)) } } }) : [];
    const claimMap = new Map(claims.map(claim => [claim.coupon.id, claim]));
    return coupons.map((coupon) => {
      const claim = claimMap.get(coupon.id) || null;
      return { ...this.publicCoupon(coupon), claim: this.publicCouponClaim(claim), remainingUses: Math.max((claim?.claimedCount || 0) - (claim?.usedCount || 0), 0) };
    });
  }

  async claimActivityCoupon(couponId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    return this.dataSource.transaction(async manager => {
      const couponRepo = manager.getRepository(Coupon); const claimRepo = manager.getRepository(CouponClaim);
      const coupon = await couponRepo.findOne({ where: { id: couponId }, lock: { mode: "pessimistic_write" } });
      if (!coupon || coupon.claimMode !== "claim" || !coupon.enabled) throw new NotFoundException("可领取优惠券不存在");
      if ((coupon.tenant?.id || null) !== (tenant?.id || null)) throw new NotFoundException("可领取优惠券不存在");
      const now = Date.now();
      if (coupon.startsAt && coupon.startsAt.getTime() > now) throw new BadRequestException("优惠券尚未开始领取");
      if (coupon.endsAt && coupon.endsAt.getTime() < now) throw new BadRequestException("优惠券已过期");
      if (coupon.usageLimit !== null && coupon.claimedCount >= coupon.usageLimit) throw new BadRequestException("优惠券已领完");
      let claim = await claimRepo.findOne({ where: { coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
      if (claim && claim.claimedCount >= Math.max(coupon.perUserLimit || 1, 1)) throw new BadRequestException("已达到每人领取上限");
      if (!claim) claim = claimRepo.create({ tenant: coupon.tenant, coupon, user, claimedCount: 0, usedCount: 0 });
      claim.claimedCount += 1; coupon.claimedCount += 1;
      await couponRepo.save(coupon);
      return this.publicCouponClaim(await claimRepo.save(claim));
    });
  }

  async redeemCode(codeInput: string, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const codeText = String(codeInput || "").trim().toUpperCase();
    if (!codeText) throw new BadRequestException("请输入兑换码");
    const result = await this.dataSource.transaction(async manager => {
      const codeRepo = manager.getRepository(RedemptionCode); const usageRepo = manager.getRepository(RedemptionCodeUsage);
      const codeBuilder = codeRepo.createQueryBuilder("code").leftJoinAndSelect("code.tenant", "tenant").where("code.code = :code", { code: codeText }).setLock("pessimistic_write");
      if (tenant?.id) codeBuilder.andWhere("code.tenantId = :tenantId", { tenantId: tenant.id }); else codeBuilder.andWhere("code.tenantId IS NULL");
      const code = await codeBuilder.getOne();
      if (!code || !code.enabled) throw new NotFoundException("兑换码不存在");
      const now = Date.now();
      if (code.startsAt && code.startsAt.getTime() > now) throw new BadRequestException("兑换码尚未生效");
      if (code.endsAt && code.endsAt.getTime() < now) throw new BadRequestException("兑换码已过期");
      let usage = await usageRepo.findOne({ where: { redemptionCode: { id: code.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
      const redemptionError = redemptionLimitError({ usageLimit: code.usageLimit, usedCount: code.usedCount, perUserLimit: code.perUserLimit, usedByUser: usage?.usedCount || 0 });
      if (redemptionError) throw new BadRequestException(redemptionError);
      if (!usage) usage = usageRepo.create({ tenant, redemptionCode: code, user, usedCount: 0 });
      let benefit: Record<string, unknown>;
      if (code.targetType === "activity_coupon") {
        const coupon = await manager.getRepository(Coupon).findOne({ where: { id: Number(code.targetId) }, lock: { mode: "pessimistic_write" } });
        if (!coupon || !coupon.enabled || (coupon.tenant?.id || null) !== (tenant?.id || null)) throw new BadRequestException("兑换目标活动券不存在或已停用");
        if (coupon.startsAt && coupon.startsAt.getTime() > now) throw new BadRequestException("兑换目标活动券尚未生效");
        if (coupon.endsAt && coupon.endsAt.getTime() < now) throw new BadRequestException("兑换目标活动券已过期");
        if (coupon.usageLimit !== null && coupon.claimedCount >= coupon.usageLimit) throw new BadRequestException("兑换目标活动券已领完");
        let claim = await manager.getRepository(CouponClaim).findOne({ where: { coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
        if (claim && claim.claimedCount >= Math.max(coupon.perUserLimit || 1, 1)) throw new BadRequestException("已达到目标活动券每人领取上限");
        if (!claim) claim = manager.getRepository(CouponClaim).create({ tenant, coupon, user, claimedCount: 0, usedCount: 0 });
        claim.claimedCount += 1; coupon.claimedCount += 1; await manager.getRepository(Coupon).save(coupon); await manager.getRepository(CouponClaim).save(claim);
        benefit = { type: code.targetType, couponId: coupon.id, couponName: coupon.name };
      } else if (code.targetType === "mall_coupon") {
        const coupon = await manager.getRepository(MallCoupon).findOne({ where: { id: Number(code.targetId) }, lock: { mode: "pessimistic_write" } });
        if (!coupon || !coupon.enabled || coupon.tenant.id !== tenant?.id) throw new BadRequestException("兑换目标商城券不存在或已停用");
        if (coupon.startsAt && coupon.startsAt.getTime() > now) throw new BadRequestException("兑换目标商城券尚未生效");
        if (coupon.endsAt && coupon.endsAt.getTime() < now) throw new BadRequestException("兑换目标商城券已过期");
        let claim = await manager.getRepository(MallCouponClaim).findOne({ where: { coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
        const claimError = mallCouponClaimError({ issuanceLimit: coupon.issuanceLimit, claimedCount: coupon.claimedCount, hasClaim: false });
        if (claimError) throw new BadRequestException(claimError);
        if (coupon.perUserLimit > 0 && Number(claim?.claimedCount || 0) >= coupon.perUserLimit) throw new BadRequestException("已达到目标商城券每人领取上限");
        if (!claim) claim = manager.getRepository(MallCouponClaim).create({ tenant: coupon.tenant, merchant: coupon.merchant, coupon, user, claimedCount: 0, usedCount: 0 });
        claim.claimedCount += 1; coupon.claimedCount += 1; await manager.getRepository(MallCoupon).save(coupon); await manager.getRepository(MallCouponClaim).save(claim);
        benefit = { type: code.targetType, couponId: coupon.id, couponName: coupon.name };
      } else if (code.targetType === "course_access") {
        const course = await manager.getRepository(Course).findOne({ where: { id: Number(code.targetId) } });
        if (!course || (course.tenant?.id || null) !== (tenant?.id || null)) throw new BadRequestException("兑换目标课程不存在");
        let learning = await manager.getRepository(UserLearning).findOne({ where: { userId: user.id, courseId: course.id, lessonId: 0 }, lock: { mode: "pessimistic_write" } });
        if (learning) throw new BadRequestException("已拥有该课程学习权限");
        if (!learning) learning = manager.getRepository(UserLearning).create({ userId: user.id, courseId: course.id, lessonId: 0, progress: 0, completedAt: null });
        await manager.getRepository(UserLearning).save(learning);
        benefit = { type: code.targetType, courseId: course.id, courseTitle: course.title };
      } else {
        const points = Math.max(Number(code.points || 0), 1);
        await manager.getRepository(MemberPointLog).save(manager.getRepository(MemberPointLog).create({ user, tenant, tenantScopeKey: tenant ? `tenant:${tenant.id}` : "platform", points, growthValue: 0, expiresAt: null, reversedAt: null, type: "earn", sourceType: "redemption_code", sourceId: `${code.id}:${usage.usedCount + 1}:${user.id}`, remark: `兑换码：${code.name}` }));
        benefit = { type: "points", points };
      }
      usage.usedCount += 1; code.usedCount += 1; await usageRepo.save(usage); await codeRepo.save(code);
      return { code: code.code, name: code.name, benefit };
    });
    if (result.benefit.type === "points") await this.refreshMemberProfile(user, tenant);
    return result;
  }

  private async releaseActivityCouponUsage(order: Order, reason: string) {
    await this.dataSource.transaction(async manager => {
      const usageRepo = manager.getRepository(CouponUsage);
      const usage = await usageRepo.findOne({ where: { order: { id: order.id } }, lock: { mode: "pessimistic_write" } });
      if (!usage || usage.status === "released") return;
      usage.status = "released"; usage.releasedAt = new Date(); usage.releaseReason = reason;
      await usageRepo.save(usage);
      const couponRepo = manager.getRepository(Coupon);
      const coupon = await couponRepo.findOne({ where: { id: usage.coupon.id }, lock: { mode: "pessimistic_write" } });
      if (coupon && coupon.usedCount > 0) { coupon.usedCount -= 1; await couponRepo.save(coupon); }
      const claimRepo = manager.getRepository(CouponClaim);
      const claim = await claimRepo.findOne({ where: { coupon: { id: usage.coupon.id }, user: { id: usage.user.id } }, lock: { mode: "pessimistic_write" } });
      if (claim && claim.usedCount > 0) { claim.usedCount -= 1; await claimRepo.save(claim); }
    });
  }

  private courseOrderPaymentView(order: CourseOrder): Order {
    return { id: order.id, orderNo: order.orderNo, amount: order.amount, status: order.status, transactionNo: order.transactionNo, tenant: order.course.tenant, registration: { activity: { title: `课程 ${order.course.title}` } } } as unknown as Order;
  }

  private coursePaymentNotifyUrl(provider: SupportedPaymentProvider) {
    const key = provider === "wechat" ? "WECHAT_PAY_NOTIFY_URL" : "ALIPAY_NOTIFY_URL";
    const configured = String(this.config.get(key, "") || "").trim();
    if (!configured) return null;
    return configured.replace(/\/payment\/(?:wechat|alipay)\/callback(?:\?.*)?$/, `/payment/course/${provider}/callback`);
  }

  private async applySuccessfulCoursePayment(order: CourseOrder, transactionNo: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CourseOrder);
      const locked = await repo.findOne({ where: { id: order.id }, relations: ["user", "course", "course.tenant"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!locked) throw new NotFoundException("内容订单不存在");
      if (locked.status === CourseOrderStatus.Paid) return locked;
      if (locked.status !== CourseOrderStatus.PendingPayment) throw new BadRequestException("当前内容订单不可支付");
      locked.status = CourseOrderStatus.Paid;
      locked.transactionNo = transactionNo;
      locked.paidAt = new Date();
      locked.expiresAt = null;
      const saved = await repo.save(locked);
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const existingPayment = await paymentRepo.findOne({ where: { transactionNo } });
      if (!existingPayment) await paymentRepo.save(paymentRepo.create({ order: null, tenant: locked.course.tenant, transactionNo, provider: locked.paymentMethod === PaymentMethod.Alipay ? "alipay" : locked.paymentMethod === PaymentMethod.Wechat ? "wechat" : "mock", paymentMethod: locked.paymentMethod, amount: locked.amount, businessType: "course", businessOrderNo: locked.orderNo, businessSnapshot: { courseId: locked.course.id, courseTitle: locked.course.title, orderNo: locked.orderNo, amount: locked.amount, paymentMethod: locked.paymentMethod }, status: "success", reconciliationStatus: "matched", remark: "课程支付" }));
      const learningRepo = manager.getRepository(UserLearning);
      let learning = await learningRepo.findOne({ where: { userId: locked.user.id, courseId: locked.course.id, lessonId: 0 } });
      if (!learning) learning = learningRepo.create({ userId: locked.user.id, courseId: locked.course.id, lessonId: 0, progress: 0, completedAt: null });
      await learningRepo.save(learning);
      return saved;
    });
  }

  private async closeCourseOrder(order: CourseOrder, reason: string) {
    order.status = CourseOrderStatus.Closed;
    order.closedAt = new Date();
    order.closeReason = reason;
    order.expiresAt = null;
    return this.courseOrders.save(order);
  }

  async queryRegistrationPayment(registrationId: number, user: User, context?: PublicTenantContext) {
    const order = await this.orders.findOne({ where: { registration: { id: registrationId } } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.assertOrderTenantAccess(order, context);
    this.assertOrderUserAccess(order, user);
    if (this.isExpiredPendingOrder(order)) await this.closeExpiredOrder(order, "订单超时未付款，查单时自动关闭");
    if (![PaymentMethod.Wechat, PaymentMethod.Alipay].includes(order.paymentMethod)) return { provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, transactionNo: order.transactionNo, amount: order.amount, amountFen: Number(order.amountFen || 0), status: order.status === OrderStatus.Paid ? "success" : [OrderStatus.Closed, OrderStatus.Cancelled].includes(order.status) ? "closed" : "pending", localOrder: this.publicOrder(order) };
    const provider = order.paymentMethod as SupportedPaymentProvider;
    const result = await this.paymentProvider.queryPayment(provider, order);
    return { ...result, amountFen: Number(order.amountFen || 0), localOrder: this.publicOrder(order) };
  }

  async closeRegistrationPayment(registrationId: number, user: User, context?: PublicTenantContext) {
    const order = await this.orders.findOne({ where: { registration: { id: registrationId } } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.assertOrderTenantAccess(order, context);
    this.assertOrderUserAccess(order, user);
    if (order.status === OrderStatus.Paid) throw new BadRequestException("订单已付款，不能关闭支付");
    if ([OrderStatus.Closed, OrderStatus.Cancelled].includes(order.status)) return { order: this.publicOrder(order), idempotent: true };
    if (order.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能关闭支付");
    let providerResult: unknown = null;
    if ([PaymentMethod.Wechat, PaymentMethod.Alipay].includes(order.paymentMethod)) providerResult = await this.paymentProvider.closePayment(order.paymentMethod as SupportedPaymentProvider, order);
    const saved = await this.closeExpiredOrder(order, "用户主动关闭待支付订单");
    return { order: this.publicOrder(saved), providerResult, idempotent: false };
  }

  private async platformOperationSetting(setting?: OperationSetting | null) {
    if (setting?.id === 1) return setting;
    return this.operationSettings.findOneBy({ id: 1 });
  }

  private publicLaunchConfig(tenantLaunchConfig: unknown, platformLaunchConfig?: unknown) {
    const platformConfig = normalizeLaunchConfig(platformLaunchConfig);
    const tenantConfig = normalizeLaunchConfig(tenantLaunchConfig);
    const featureGates = normalizeFeatureGates(tenantConfig.featureGates, normalizeFeatureGates(platformConfig.featureGates, defaultFeatureGates));
    return {
      deliveryMode: tenantConfig.deliveryMode ?? platformConfig.deliveryMode ?? "production",
      reviewSafeMode: Boolean(tenantConfig.reviewSafeMode ?? platformConfig.reviewSafeMode ?? false),
      reviewSafeRemark: String(tenantConfig.reviewSafeRemark ?? platformConfig.reviewSafeRemark ?? ""),
      featureGates
    };
  }

  private marketingPopupMatches(value: unknown, target?: string) {
    const list = Array.isArray(value) ? value.map((item) => String(item)) : [];
    const normalized = String(target || "").trim();
    return list.includes("all") || (normalized ? list.includes(normalized) : false);
  }

  private adCampaignMatches(row: AdCampaign, pageKey: string, platform: string) {
    if (platform === "h5" && row.source === "wechat_official") return false;
    const platformMatched = this.marketingPopupMatches(row.platforms, platform);
    const pageMatched = row.pageKey === "all" || row.pageKey === pageKey;
    return platformMatched && pageMatched;
  }

  private publicAdCampaign(row: AdCampaign) {
    const resolvedImageUrls = this.resolvedAdImages(row);
    const resolvedImageUrl = resolvedImageUrls[0] || "";
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrls || [],
      resolvedImageUrl,
      resolvedImageUrls,
      source: row.source,
      format: row.format,
      slotKey: row.slotKey,
      pageKey: row.pageKey,
      platforms: row.platforms || ["all"],
      link: row.link,
      officialAdUnitId: row.officialAdUnitId,
      officialAdType: row.officialAdType,
      frequency: row.frequency,
      priority: row.priority,
      updatedAt: row.updatedAt
    };
  }

  private resolvedAdImage(row: AdCampaign) {
    return this.resolvedAdImages(row)[0] || "";
  }

  private resolvedAdImages(row: AdCampaign) {
    const directImages = [
      ...(Array.isArray(row.imageUrls) ? row.imageUrls : []),
      row.imageUrl
    ].map((item) => this.usableAdImage(item)).filter(Boolean);
    if (directImages.length) return Array.from(new Set(directImages));
    const settings = row.tenant?.settings && typeof row.tenant.settings === "object" && !Array.isArray(row.tenant.settings) ? row.tenant.settings as Record<string, unknown> : {};
    const fallback = this.usableAdImage(settings.defaultAdImageUrl) || this.usableAdImage(settings.defaultShareImageUrl) || this.usableAdImage(settings.shareImageUrl);
    return [fallback || "https://dummyimage.com/900x500/fff2b8/9e1b12.png&text=AD"];
  }

  private usableAdImage(value: unknown) {
    const text = typeof value === "string" ? value.trim() : "";
    return text && (text.startsWith("https://") || text.startsWith("/uploads/")) ? text : "";
  }

  private normalizeAdEvent(event: string) {
    const text = String(event || "").trim();
    return ["impression", "click", "skip", "close", "load", "error", "reward"].includes(text) ? text : "impression";
  }

  private adEventSpentDelta(row: AdCampaign, event: string) {
    if (event === "impression" && ["cpm", "mixed"].includes(row.billingModel)) return this.adMoney(row.cpmPrice) / 1000;
    if (event === "click" && ["cpc", "mixed"].includes(row.billingModel)) return this.adMoney(row.cpcPrice);
    return 0;
  }

  private adBudgetExceeded(row: AdCampaign, stat?: AdDailyStat | null) {
    const spent = this.adMoney(row.spentAmount);
    const totalBudget = this.adMoney(row.totalBudget);
    if (totalBudget > 0 && spent >= totalBudget) return true;
    const dailyBudget = this.adMoney(row.dailyBudget);
    if (dailyBudget > 0 && stat && this.adMoney(stat.spentAmount) >= dailyBudget) return true;
    if (row.impressionLimit > 0 && row.impressionCount >= row.impressionLimit) return true;
    if (row.clickLimit > 0 && row.clickCount >= row.clickLimit) return true;
    return false;
  }

  private adMoney(value: unknown) {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
  }

  private adRoundMoney(value: unknown) {
    return Math.round(this.adMoney(value) * 100) / 100;
  }

  private todayDateText() {
    const date = new Date();
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private publicMarketingPopup(row: MarketingPopup) {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      content: row.content,
      emphasis: row.emphasis,
      imageUrl: row.imageUrl,
      type: row.type,
      platforms: row.platforms || ["all"],
      placements: row.placements || ["home"],
      buttons: row.buttons || [],
      frequency: row.frequency,
      priority: row.priority,
      dismissible: row.dismissible,
      startAt: row.startAt,
      endAt: row.endAt,
      updatedAt: row.updatedAt
    };
  }

  private mergeAmbassadorConfig(input?: Record<string, unknown> | null) {
    const defaults = this.defaultAmbassadorConfig();
    const next = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const merged: Record<string, unknown> = { ...defaults, ...next };
    for (const key of ["painPoints", "solutionItems", "benefits", "requirements"]) merged[key] = this.normalizeStringArray(merged[key], defaults[key] as string[]);
    merged.faqs = this.normalizeFaqs(merged.faqs, defaults.faqs as Array<{ question: string; answer: string }>);
    merged.entryPages = this.normalizeEntryPages(merged.entryPages, defaults.entryPages as Record<string, Record<string, unknown>>);
    return merged;
  }

  private defaultAmbassadorConfig(): Record<string, unknown> {
    return {
      heroTitle: "寻找100位“慢π大使”",
      heroSubtitle: "一起用7把钥匙，打开中国人的精神家园",
      heroCopy: "不用辞职、不用囤货，只需把你的热爱变成活动服务，平台帮你梳理运营工具和本地触达。",
      ctaText: "立即申请，锁定早鸟名额",
      originalPrice: "2999",
      earlyBirdPrice: "999",
      quotaText: "首期限额100人，审核制入驻",
      refundText: "入驻30天内，觉得不合适，可申请全额退款。",
      customerWechat: "",
      customerPhone: "",
      backgroundImageUrl: "",
      painPoints: ["你在传统文化、书法、亲子沟通、健康、创业或技能领域有积累，却缺一个被看见的舞台。", "你试过做内容，但流量不稳定，转化不系统。", "你想把内容做成线下活动，却被技术、运营和服务流程卡住。", "你不想只做单次销售，更想进入一个共创、成长、长期沉淀品牌的圈子。"],
      solutionItems: ["独立小程序店铺 + 专属H5主页，一键发布活动。", "平台全域流量扶持，结合城市线下活动导流。", "每月闭门共创会，表达与服务训练，关键阶段策略陪跑。", "链接传统文化、书法、亲子沟通、健康、创业、技能等领域的共创者。"],
      benefits: ["官方认证身份：颁发“慢π·特聘文化大使”证书，并获得平台个人品牌展示机会。", "活动收益支持：首批入驻享平台扶持政策，具体规则以审核沟通为准。", "高端私密社群：进入慢π共创圈，资源互换、经验复盘。", "全年赋能陪跑：闭门策略会、线下分享会、活动打磨与运营指导。"],
      requirements: ["有真才实学：在传统文化、东方哲学、民俗文化、书法、亲子沟通、健康、创业、技能任一领域有扎实积累。", "有利他之心：愿意分享，愿意帮助他人成长。", "有长期主义：不是来赚快钱，而是想打造个人品牌、沉淀长期资产。"],
      faqs: [
        { question: "我没有活动经验，怎么办？", answer: "平台会协助你梳理活动大纲、设计表达结构，并陪跑第一场样板活动上线。" },
        { question: "入驻后多久能看到收益？", answer: "收益取决于活动质量、运营投入和受众匹配度，平台会提供流量、工具和运营建议。" },
        { question: "首期费用是一次性还是每年？", answer: "默认展示为首年首期费用，具体续费和权益可在后台文案中调整。" }
      ],
      entryPages: {
        brandStory: {
          eyebrow: "慢π · 品牌故事",
          title: "把传统文化，做成可体验、可参与、可持续运营的现代活动空间。",
          copy: "慢π连接活动、共修、公益与本地服务，让每一座城市都能拥有自己的文化空间。",
          primaryActionText: "申请成为院长",
          secondaryActionText: "了解帮扶计划",
          sectionTitle: "我们相信",
          items: ["文化要落到日常：不是只停留在口号里，而是变成一次晨读、一次分享、一次共修和一段长期陪伴。", "空间要能运营：活动获客、内容服务、报名收款、退款审核、参与者服务都应该有清晰后台承接。", "善意要可追踪：公益帮扶、参与者成长和本地资源连接，都需要被记录、被服务、被持续改进。"],
          flowTitle: "一套完整的慢π闭环",
          flowItems: ["品牌认知", "活动体验", "内容参与", "共修打卡", "公益帮扶", "本地慢π"],
          joinTitle: "你可以如何参与"
        },
        deanRecruit: {
          eyebrow: "院长招募",
          title: "招募一批真正愿意把慢π服务落在本地的人。",
          copy: "院长不是普通代理，而是本地活动空间的负责人：组织活动、服务参与者、链接主理人和公益资源。",
          sectionTitle: "适合谁",
          items: ["有本地文化空间或稳定社群", "愿意长期做好活动服务", "能服务参与者并维护当地口碑", "认同慢π品牌与公益理念"],
          formTitle: "提交院长申请",
          submitText: "提交院长申请",
          successMessage: "院长招募申请已进入后台，我们会尽快联系你。"
        },
        ambassadorApply: {
          eyebrow: "大使申请",
          title: "把你的热爱，变成能被更多人看见的文化服务。",
          copy: "适合讲师、主理人、内容创作者、社群组织者申请成为慢π大使。",
          sectionTitle: "你将参与",
          items: ["内容共创", "活动共办", "品牌露出", "参与者服务", "公益参与", "长期成长"],
          formTitle: "提交大使申请",
          submitText: "提交大使申请",
          successMessage: "大使申请已进入后台，我们会尽快联系你。"
        },
        aidApply: {
          eyebrow: "帮扶申请",
          title: "让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。",
          copy: "个人可申请活动帮扶/公益名额，项目方可提交公益项目合作需求。",
          sectionTitle: "申请类型",
          items: ["个人活动帮扶", "公益项目合作", "活动名额支持", "本地资源连接"],
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
        const row = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return { question: String(row.question || "").trim(), answer: String(row.answer || "").trim() };
      })
      .filter((item) => item.question && item.answer);
    return list.length ? list.slice(0, 20) : fallback;
  }

  private normalizeEntryPages(value: unknown, fallback: Record<string, Record<string, unknown>>) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(fallback).map(([key, defaults]) => [key, this.normalizeEntryPage(source[key], defaults)]));
  }

  private normalizeEntryPage(value: unknown, fallback: Record<string, unknown>) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const merged: Record<string, unknown> = { ...fallback, ...source };
    if ("items" in fallback) merged.items = this.normalizeStringArray(merged.items, fallback.items as string[]);
    if ("flowItems" in fallback) merged.flowItems = this.normalizeStringArray(merged.flowItems, fallback.flowItems as string[]);
    return merged;
  }

  private isDuplicateKeyError(error: any) {
    return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || error?.driverError?.code === "ER_DUP_ENTRY" || error?.driverError?.errno === 1062;
  }
}


