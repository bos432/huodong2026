import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
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
import { AmbassadorApplication } from "../../entities/ambassador-application.entity";
import { AmbassadorCase } from "../../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../../entities/ambassador-landing-setting.entity";
import { Announcement } from "../../entities/announcement.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { Coupon } from "../../entities/coupon.entity";
import { ConversionEvent, ConversionEventType } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
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
import { TenantRegionHitLog } from "../../entities/tenant-region-hit-log.entity";
import { TenantRegion, TenantRegionBoundaryPoint } from "../../entities/tenant-region.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { User } from "../../entities/user.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { UserFavorite } from "../../entities/user-favorite.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { VolunteerProfile } from "../../entities/volunteer-profile.entity";
import { VolunteerServiceRecord } from "../../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../../entities/volunteer-task.entity";
import { Waitlist, WaitlistStatus } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { ActivityStatus, OrderStatus, PaymentMethod, RegistrationAnswer, RegistrationStatus } from "../../shared/domain";
import { assertTenantOwnedResourceAccess, normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";
import { defaultHomepageSections, normalizePageKey } from "../homepage-defaults";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { RefundCompletionService } from "../refund-completion.service";
import { CharityFundService } from "../charity-fund.service";
import { AmbassadorApplicationDto, CreateCourseOrderDto, H5CodeDto, H5LoginDto, H5PasswordLoginDto, MockPayDto, MockPaymentCallbackDto, PhoneChangeCodeDto, ProviderPayDto, ProviderPaymentCallbackDto, QuoteDto, RegisterDto, UpdatePasswordDto, UpdatePhoneDto, UpdateProfileDto, VolunteerApplyDto, VolunteerTaskApplyDto, WechatLoginDto, WechatPhoneDto } from "./dto";
import { PaymentProviderService, RealPaymentCallbackContext, SupportedPaymentProvider } from "./payment-provider.service";

export type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };
type PublicTrackingContext = { channelCode?: string | null; source?: string | null; inviteCode?: string | null; clientIp?: string | null; userAgent?: string | null };
type TenantLocationTrackingContext = { source?: string | null; clientIp?: string | null; userAgent?: string | null };

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
    @InjectRepository(UserLearning) private readonly userLearning: Repository<UserLearning>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(CommunityPost) private readonly communityPosts: Repository<CommunityPost>,
    @InjectRepository(UserFavorite) private readonly userFavorites: Repository<UserFavorite>,
    @InjectRepository(VolunteerProfile) private readonly volunteerProfiles: Repository<VolunteerProfile>,
    @InjectRepository(VolunteerTask) private readonly volunteerTasksRepo: Repository<VolunteerTask>,
    @InjectRepository(VolunteerTaskApplication) private readonly volunteerTaskApplicationsRepo: Repository<VolunteerTaskApplication>,
    @InjectRepository(VolunteerServiceRecord) private readonly volunteerServiceRecords: Repository<VolunteerServiceRecord>,
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
    if (!user) user = this.users.create({ phone, nickname: dto.nickname || `本地用户${phone.slice(-4)}`, sourceChannel: "h5" });
    user.nickname = dto.nickname || user.nickname;
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

  async myProfile(user: User) {
    const fresh = await this.users.findOneBy({ id: user.id });
    if (!fresh) throw new UnauthorizedException("登录已失效，请重新登录");
    const profile = await this.memberProfiles.findOne({ where: { user: { id: fresh.id } } });
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
      memberLevel: profile?.level ? { id: profile.level.id, name: profile.level.name } : null,
      points: profile?.points || 0
    };
  }

  async createCourseOrder(courseId: number, dto: CreateCourseOrderDto, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const course = await this.courses.findOne({ where: this.tenantCourseWhere({ id: courseId, status: "published" }, tenant) });
    if (!course) throw new NotFoundException("课程不存在或未发布");
    if (await this.hasCourseAccess(user.id, course.id)) {
      return { owned: true, order: null, course: this.publicCourse(course) };
    }

    const amount = Number(course.price || 0);
    const paymentMethod = amount > 0 ? dto.paymentMethod || PaymentMethod.Offline : PaymentMethod.Free;
    if (amount <= 0) {
      const order = await this.courseOrders.save(this.courseOrders.create({
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
        closeReason: null
      }));
      await this.grantCourseAccess(user, course);
      return { owned: true, order: this.publicCourseOrder(order), course: this.publicCourse(course) };
    }
    if (paymentMethod !== PaymentMethod.Offline) throw new BadRequestException("课程在线支付暂未接入，请选择线下收款");
    await this.assertPaymentMethodEnabled(PaymentMethod.Offline, tenant);

    const existing = await this.courseOrders.findOne({
      where: { user: { id: user.id }, course: { id: course.id }, status: CourseOrderStatus.PendingPayment },
      order: { createdAt: "DESC" }
    });
    if (existing && !this.isExpiredCourseOrder(existing)) return { owned: false, order: this.publicCourseOrder(existing), course: this.publicCourse(course) };

    const order = await this.courseOrders.save(this.courseOrders.create({
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
      closeReason: null
    }));
    return { owned: false, order: this.publicCourseOrder(order), course: this.publicCourse(course) };
  }

  async courseOrderDetail(orderId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("课程订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    return { order: this.publicCourseOrder(order), course: this.publicCourse(order.course), owned: await this.hasCourseAccess(user.id, order.course.id) };
  }

  async mockPayCourseOrder(orderId: number, dto: MockPayDto, user: User, context?: PublicTenantContext) {
    this.paymentProvider.assertSandboxAllowed("课程 mock 支付");
    const tenant = await this.resolveTenantContext(context);
    const order = await this.courseOrders.findOne({ where: { id: orderId, user: { id: user.id } } });
    if (!order) throw new NotFoundException("课程订单不存在");
    this.assertCourseTenantAccess(order.course, tenant);
    if (order.status === CourseOrderStatus.Paid) {
      await this.grantCourseAccess(user, order.course);
      return { order: this.publicCourseOrder(order), course: this.publicCourse(order.course), owned: true };
    }
    if (order.status !== CourseOrderStatus.PendingPayment) throw new BadRequestException("当前课程订单不可支付");
    if (this.isExpiredCourseOrder(order)) {
      order.status = CourseOrderStatus.Closed;
      order.closedAt = new Date();
      order.closeReason = "课程订单超时关闭";
      await this.courseOrders.save(order);
      throw new BadRequestException("课程订单已超时，请重新下单");
    }
    order.status = CourseOrderStatus.Paid;
    order.transactionNo = dto.transactionNo || `COURSE-MOCK-${Date.now()}`;
    order.paidAt = new Date();
    const saved = await this.courseOrders.save(order);
    await this.grantCourseAccess(user, order.course);
    return { order: this.publicCourseOrder(saved), course: this.publicCourse(saved.course), owned: true };
  }

  async myCourses(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const rows = await this.userLearning.find({ where: { userId: user.id, lessonId: 0 }, order: { updatedAt: "DESC" } });
    if (!rows.length) return [];
    const courses = await this.courses.find({ where: this.tenantCourseWhere({ id: In(rows.map((row) => row.courseId)) }, tenant) });
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
            updatedAt: row.updatedAt
          }
        };
      })
      .filter(Boolean);
  }

  async myCertificates(user: User) {
    return this.certificates.find({ where: { userId: user.id }, order: { issuedAt: "DESC" } });
  }

  async myCertificateDownload(user: User, id: number) {
    const certificate = await this.certificates.findOne({ where: { id, userId: user.id } });
    if (!certificate) throw new NotFoundException("证书不存在");
    const displayName = user.nickname || user.phone || `用户${user.id}`;
    const issuedAt = certificate.issuedAt ? new Date(certificate.issuedAt) : new Date();
    const issuedDate = Number.isNaN(issuedAt.getTime()) ? "" : issuedAt.toLocaleDateString("zh-CN");
    const safeTitle = this.escapeSvg(certificate.name);
    const safeName = this.escapeSvg(displayName);
    const safeDate = this.escapeSvg(issuedDate);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840">
  <rect width="1200" height="840" fill="#fbf7ef"/>
  <rect x="54" y="54" width="1092" height="732" rx="26" fill="#fffdf8" stroke="#9f6b43" stroke-width="6"/>
  <rect x="84" y="84" width="1032" height="672" rx="18" fill="none" stroke="#d8b98c" stroke-width="2"/>
  <text x="600" y="172" text-anchor="middle" fill="#214b4e" font-size="42" font-weight="700">慢π</text>
  <text x="600" y="250" text-anchor="middle" fill="#8b4a3e" font-size="58" font-weight="800">志愿服务证书</text>
  <text x="600" y="344" text-anchor="middle" fill="#263d3c" font-size="34">授予</text>
  <text x="600" y="420" text-anchor="middle" fill="#101828" font-size="52" font-weight="800">${safeName}</text>
  <text x="600" y="506" text-anchor="middle" fill="#475467" font-size="30">感谢你参与公益服务与城市共建</text>
  <text x="600" y="566" text-anchor="middle" fill="#8b4a3e" font-size="34" font-weight="700">${safeTitle}</text>
  <line x1="370" y1="646" x2="830" y2="646" stroke="#d8b98c" stroke-width="2"/>
  <text x="600" y="696" text-anchor="middle" fill="#667085" font-size="26">发放日期：${safeDate}</text>
</svg>`;
    return { filename: `${certificate.name || "certificate"}.svg`, svg };
  }

  async myFavoriteCourses(user: User) {
    const rows = await this.userFavorites.find({ where: { userId: user.id }, order: { createdAt: "DESC" } });
    if (!rows.length) return [];
    const courses = await this.courses.find({ where: { id: In(rows.map((row) => row.courseId)), status: "published" } });
    return rows.map((row) => courses.find((course) => course.id === row.courseId)).filter(Boolean);
  }

  async favoriteCourseState(courseId: number, user: User) {
    const course = await this.courses.findOne({ where: { id: courseId, status: "published" } });
    if (!course) throw new NotFoundException("课程不存在或未发布");
    const count = await this.userFavorites.count({ where: { userId: user.id, courseId } });
    return { courseId, favorited: count > 0 };
  }

  async toggleFavoriteCourse(courseId: number, user: User) {
    const course = await this.courses.findOne({ where: { id: courseId, status: "published" } });
    if (!course) throw new NotFoundException("课程不存在或未发布");
    const row = await this.userFavorites.findOne({ where: { userId: user.id, courseId } });
    if (row) {
      await this.userFavorites.delete(row.id);
      return { courseId, favorited: false };
    }
    await this.userFavorites.save(this.userFavorites.create({ userId: user.id, courseId }));
    return { courseId, favorited: true };
  }

  async updateMyProfile(user: User, dto: UpdateProfileDto) {
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    const nickname = dto.nickname === undefined ? row.nickname : String(dto.nickname || "").trim();
    const avatarUrl = dto.avatarUrl === undefined ? row.avatarUrl : String(dto.avatarUrl || "").trim();
    if (nickname && nickname.length > 40) throw new BadRequestException("昵称不能超过 40 个字");
    if (avatarUrl && avatarUrl.length > 500) throw new BadRequestException("头像地址过长");
    row.nickname = nickname || null;
    row.avatarUrl = avatarUrl || null;
    return this.myProfile(await this.users.save(row));
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

  async updateMyPhone(user: User, dto: UpdatePhoneDto) {
    const phone = this.normalizePhone(dto.phone);
    this.verifyH5Token(phone, dto.verificationCode, dto.verificationToken);
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    const exists = await this.users.findOne({ where: { phone } });
    if (exists && exists.id !== row.id) throw new BadRequestException("该手机号已绑定其他账号");
    row.phone = phone;
    if (!row.nickname) row.nickname = `本地用户${phone.slice(-4)}`;
    const saved = await this.users.save(row);
    return this.myProfile(saved);
  }

  async bindWechatPhone(user: User, dto: WechatPhoneDto) {
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
    return this.myProfile(saved);
  }

  async uploadMyAvatar(user: User, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传头像图片");
    const publicBase = this.config.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
    const urlPath = `/uploads/avatars/${file.filename}`;
    const row = await this.users.findOneBy({ id: user.id });
    if (!row) throw new UnauthorizedException("登录已失效，请重新登录");
    row.avatarUrl = publicBase ? `${publicBase}${urlPath}` : urlPath;
    await this.users.save(row);
    return { url: row.avatarUrl, path: urlPath, filename: file.filename, size: file.size, mimetype: file.mimetype };
  }

  uploadMallReviewImage(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传评价图片，支持 JPG/PNG/WebP，单张不超过 5MB");
    const publicBase = this.config.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
    const path = `/uploads/mall-reviews/${file.filename}`;
    return { url: publicBase ? `${publicBase}${path}` : path, path, filename: file.filename, size: file.size, mimetype: file.mimetype };
  }

  uploadMallRefundImage(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传售后凭证图片，支持 JPG/PNG/WebP，单张不超过 5MB");
    const publicBase = this.config.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
    const path = `/uploads/mall-refunds/${file.filename}`;
    return { url: publicBase ? `${publicBase}${path}` : path, path, filename: file.filename, size: file.size, mimetype: file.mimetype };
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

  async resolveTenantByLocation(latitudeText?: string, longitudeText?: string, tracking: TenantLocationTrackingContext = {}) {
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new BadRequestException("定位纬度无效");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new BadRequestException("定位经度无效");
    const regions = await this.tenantRegions
      .createQueryBuilder("region")
      .leftJoinAndSelect("region.tenant", "tenant")
      .where("region.enabled = :enabled", { enabled: true })
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
    return this.publicOperationSetting(await this.ensureOperationSetting(tenant));
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
    const phone = this.normalizePhone(dto.phone);
    const name = String(dto.name || "").trim();
    const city = String(dto.city || "").trim();
    const expertise = String(dto.expertise || "").trim();
    const experience = String(dto.experience || "").trim();
    const wechat = String(dto.wechat || "").trim();
    const source = this.cleanTrackingText(dto.source, 80) || null;
    const channelCode = this.cleanTrackingText(dto.channelCode, 80) || null;
    if (!name) throw new BadRequestException("请填写姓名");
    if (!city) throw new BadRequestException("请填写城市");
    if (!expertise) throw new BadRequestException("请填写擅长领域");
    if (!experience) throw new BadRequestException("请填写经验介绍");
    if (!wechat) throw new BadRequestException("请填写微信号");
    const row = this.ambassadorApplications.create({ name, phone, city, expertise, experience, wechat, source, channelCode, status: "pending" });
    const saved = await this.ambassadorApplications.save(row);
    return { id: saved.id, status: saved.status, submittedAt: saved.createdAt };
  }

  async volunteerTasks(city?: string) {
    const builder = this.volunteerTasksRepo.createQueryBuilder("task").where("task.status = :status", { status: "open" }).orderBy("task.startAt", "ASC").addOrderBy("task.id", "DESC").take(100);
    if (city?.trim()) builder.andWhere("task.city LIKE :city", { city: `%${city.trim()}%` });
    const rows = await builder.getMany();
    return rows.map((task) => ({ ...task, appliedCount: 0 }));
  }

  async applyVolunteer(dto: VolunteerApplyDto, user?: User | null) {
    const phone = this.normalizePhone(dto.phone);
    const name = String(dto.name || "").trim();
    const city = String(dto.city || "").trim();
    if (!name) throw new BadRequestException("请填写姓名");
    if (!city) throw new BadRequestException("请填写城市");
    let profile = await this.volunteerProfiles.findOne({ where: { phone } });
    if (!profile) {
      profile = this.volunteerProfiles.create({ user: user || null, name, phone, city, expertise: this.cleanTrackingText(dto.expertise, 160) || null, availableTime: this.cleanTrackingText(dto.availableTime, 160) || null, serviceIntent: this.cleanTrackingText(dto.serviceIntent, 160) || null, status: "pending", level: "participant", serviceHours: "0.00", remark: this.cleanTrackingText(dto.message, 500) || null });
    } else {
      profile.user = profile.user || user || null;
      profile.name = name;
      profile.city = city;
      profile.expertise = this.cleanTrackingText(dto.expertise, 160) || profile.expertise;
      profile.availableTime = this.cleanTrackingText(dto.availableTime, 160) || profile.availableTime;
      profile.serviceIntent = this.cleanTrackingText(dto.serviceIntent, 160) || profile.serviceIntent;
      profile.remark = this.cleanTrackingText(dto.message, 500) || profile.remark;
    }
    const savedProfile = await this.volunteerProfiles.save(profile);
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

  async applyVolunteerTask(taskId: number, dto: VolunteerTaskApplyDto, user?: User | null) {
    const task = await this.volunteerTasksRepo.findOne({ where: { id: taskId, status: "open" } });
    if (!task) throw new NotFoundException("志愿任务不存在或暂未开放");
    const phone = this.normalizePhone(dto.phone);
    const name = String(dto.name || "").trim();
    const city = String(dto.city || "").trim();
    if (!name) throw new BadRequestException("请填写姓名");
    if (!city) throw new BadRequestException("请填写城市");
    let profile = await this.volunteerProfiles.findOne({ where: { phone } });
    if (!profile) {
      profile = await this.volunteerProfiles.save(this.volunteerProfiles.create({ user: user || null, name, phone, city, expertise: task.type, availableTime: null, serviceIntent: task.title, status: "pending", level: "participant", serviceHours: "0.00", remark: this.cleanTrackingText(dto.message, 500) || null }));
    }
    const existing = await this.volunteerTaskApplicationsRepo.findOne({ where: { task: { id: task.id }, phone, status: "pending" } });
    if (existing) return { id: existing.id, status: existing.status, submittedAt: existing.createdAt };
    const application = await this.volunteerTaskApplicationsRepo.save(this.volunteerTaskApplicationsRepo.create({ task, profile, user: user || null, name, phone, city, status: "pending", message: this.cleanTrackingText(dto.message, 500) || null }));
    return { id: application.id, status: application.status, submittedAt: application.createdAt };
  }

  async myVolunteer(user: User) {
    const where: any[] = [{ user: { id: user.id } }];
    if (user.phone) where.push({ phone: user.phone });
    const profile = await this.volunteerProfiles.findOne({ where });
    if (!profile) return { profile: null, applications: [], records: [] };
    const [applications, records] = await Promise.all([
      this.volunteerTaskApplicationsRepo.find({ where: { profile: { id: profile.id } }, order: { createdAt: "DESC" } }),
      this.volunteerServiceRecords.find({ where: { profile: { id: profile.id } }, order: { createdAt: "DESC" } })
    ]);
    return { profile, applications, records };
  }

  myCharity(user: User) {
    return this.charityFund.userContribution(user);
  }

  myCharityTransactions(user: User, page?: number, pageSize?: number) {
    return this.charityFund.userTransactions(user, page, pageSize);
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
      .where("section.enabled = :enabled", { enabled: true })
      .andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey })
      .andWhere("(section.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true })
      .orderBy("section.sortOrder", "ASC")
      .addOrderBy("section.id", "ASC");
    if (tenant) sectionsBuilder.andWhere("section.tenantId = :tenantId", { tenantId: tenant.id });
    else sectionsBuilder.andWhere("section.tenantId IS NULL");
    const sections = await sectionsBuilder.getMany();
    const configuredCount = await this.homepageConfiguredCount(normalizedPageKey, scopedTenantId);
    let source = sections;
    let fallback = false;
    if (!source.length && tenant && configuredCount === 0) {
      fallback = true;
      source = await this.homepageSections
        .createQueryBuilder("section")
        .where("section.enabled = :enabled", { enabled: true })
        .andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey })
        .andWhere("section.tenantId IS NULL")
        .orderBy("section.sortOrder", "ASC")
        .addOrderBy("section.id", "ASC")
        .getMany();
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
      this.homepageAnnouncements(10, true, tenant),
      this.categoriesList(tenant ? { tenantId: tenant.id } : context),
      this.activitiesList({ pageSize: 20 }, tenant ? { tenantId: tenant.id } : context),
      this.activitiesList({ featured: true, pageSize: 12 }, tenant ? { tenantId: tenant.id } : context),
      this.homepageTestimonials(tenant)
    ]);
    const latestItems = Array.isArray(latest) ? latest : latest.items;
    const featuredItems = Array.isArray(featured) ? featured : featured.items;
    return {
      sections: source.map((section) => this.homepageSectionView(section, { announcements, categories, latest: latestItems, featured: featuredItems, testimonials })),
      fallback,
      pageKey: normalizedPageKey,
      tenant: this.publicHomepageTenant(tenant)
    };
  }

  private homepageConfiguredCount(pageKey: string, tenantId: number | null) {
    const builder = this.homepageSections
      .createQueryBuilder("section")
      .where("section.pageKey = :pageKey", { pageKey });
    if (tenantId) builder.andWhere("section.tenantId = :tenantId", { tenantId });
    else builder.andWhere("section.tenantId IS NULL");
    return builder.getCount();
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
    const [ticketTypes, memberAccess] = await Promise.all([
      this.findPublicTicketTypes(id),
      this.memberAccessSnapshot(activity, userId)
    ]);
    return { ...(await this.withPublicStats(activity)), ticketTypes, memberAccess };
  }

  async quote(activityId: number, dto: QuoteDto, user: User, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(activityId, { status: ActivityStatus.Open });
    if (!activity) throw new NotFoundException("活动不存在或未开放");
    await this.assertPublicTenantAccess(activity, context);
    return this.calculateQuote(activity, { ...dto, userId: user.id });
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

    this.validateAnswers(activity.fields, dto.answers);
    const stats = await this.withPublicStats(activity);
    if (stats.remainingSeats <= 0) {
      const waitlist = await this.waitlists.save(this.waitlists.create({ activity, user, answers: dto.answers, status: WaitlistStatus.Waiting, remark: "活动满员自动候补" }));
      return { waitlist, registration: null, order: null, waitlisted: true };
    }

    const quote = await this.calculateQuote(activity, { ...dto, userId: user.id });
    const price = Number(quote.payableAmount);
    const paymentMethod = price > 0 ? dto.paymentMethod || PaymentMethod.Offline : PaymentMethod.Free;
    await this.assertPaymentMethodEnabled(paymentMethod, activity.tenant);
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
    const rows = await builder.getMany();
    if (!rows.length) return [];
    const orders = await this.orders.find({ where: rows.map((registration) => ({ registration: { id: registration.id } })) });
    return rows.map((registration) => ({
      ...this.publicRegistration(registration),
      order: this.publicOrderSummary(orders.find((order) => order.registration.id === registration.id) || null)
    }));
  }

  async myCourseOrders(user: User, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const orders = await this.courseOrders.find({
      where: { user: { id: user.id } },
      order: { createdAt: "DESC" },
      take: 100
    });
    const scopedOrders = tenant ? orders.filter((order) => order.course?.tenant?.id === tenant.id) : orders;
    return Promise.all(scopedOrders.map(async (order) => ({
      ...this.publicCourseOrder(order),
      course: this.publicCourse(order.course),
      owned: await this.hasCourseAccess(user.id, order.course.id)
    })));
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
    if (coupon) await this.coupons.decrement({ id: coupon.id }, "usedCount", 1);
    if (pointsUsed > 0) await this.awardPoints(order.registration.user, pointsUsed, "points_return", order.id, reason);
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
    return { registration: this.publicRegistration(registration), order: order ? this.publicOrder(order) : null, refunds, charityRefund, operationSetting: this.publicOperationSetting(operationSetting), groupQrCodeUrl };
  }

  async requestRegistrationRefund(id: number, user: User, context?: PublicTenantContext) {
    const registration = await this.findUserRegistration(id, user.id);
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    const order = await this.findRegistrationOrder(id);
    if (!order) throw new NotFoundException("订单不存在");
    if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) throw new BadRequestException("当前订单不能申请退款");
    if (registration.status === RegistrationStatus.CheckedIn) throw new BadRequestException("已签到报名不能在线申请退款");

    const refunds = await this.findOrderRefunds(order.id, ["pending", "processing", "completed"]);
    if (refunds.some((item) => ["pending", "processing"].includes(item.status))) throw new BadRequestException("已有退款申请处理中，请勿重复提交");

    const preview = await this.charityFund.previewRetainedActivityRefund(order);
    if (!preview.enabled) throw new BadRequestException("当前订单暂不支持公益退款申请");
    const completedAmount = refunds.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0);
    const availableAmount = Math.max(Number(order.amount || 0) - completedAmount, 0);
    const amount = Math.min(Number(preview.refundAmount || 0), availableAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("当前订单暂无可退金额");

    const refundNo = `URF${Date.now()}${order.id}`;
    const refund = await this.refunds.save(this.refunds.create({
      order,
      tenant: order.tenant || null,
      refundNo,
      amount: amount.toFixed(2),
      status: "pending",
      operator: `user:${user.id}`,
      reason: `[charity_retained] 用户申请活动公益退款，公益金保留 ${preview.charityAmount} 元`
    }));
    return { refund, order: this.publicOrder(order), charityRefund: { ...preview, canRequest: false, pendingRefund: refund } };
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
    return this.registrations.save(registration);
  }

  async checkInCode(id: number, userId: number, context?: PublicTenantContext) {
    const registration = await this.findUserRegistration(id, userId);
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertRegistrationTenantAccess(registration, context);
    if (![RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("报名成功后才会生成签到码");
    return { code: registration.checkInCode };
  }

  private findUserRegistration(id: number, userId: number) {
    return this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
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
      pendingRefund: activeRefund,
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
    const exists = await this.conversionEventExists(idempotencyKey);
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
    if (input.idempotencyKey && await this.conversionEventExists(input.idempotencyKey)) return null;
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

  private async conversionEventExists(idempotencyKey: string) {
    const count = await this.conversionEvents.createQueryBuilder("event").where("event.idempotencyKey = :idempotencyKey", { idempotencyKey }).getCount();
    return count > 0;
  }

  private cleanTrackingText(value: unknown, max = 80) {
    return String(value || "").trim().replace(/[^\w\u4e00-\u9fa5:.-]/g, "").slice(0, max);
  }

  private escapeSvg(value: unknown) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  private findPublicTicketTypes(activityId: number) {
    return this.ticketTypes
      .createQueryBuilder("ticketType")
      .where("ticketType.activityId = :activityId", { activityId })
      .andWhere("ticketType.enabled = :enabled", { enabled: true })
      .orderBy("ticketType.price", "ASC")
      .addOrderBy("ticketType.id", "ASC")
      .getMany();
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
    return { ...registration, activity: this.publicActivity(registration.activity) };
  }

  private publicOrder(order: Order) {
    return { ...order, registration: this.publicRegistration(order.registration) };
  }

  private publicOrderSummary(order?: Order | null) {
    if (!order) return null;
    return {
      id: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
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
      ticketType: order.ticketType,
      coupon: order.coupon,
      memberLevel: order.memberLevel
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
    return this.userLearning.save(row);
  }

  private tenantCourseWhere<T extends Record<string, unknown>>(where: T, tenant?: Tenant | null) {
    return tenant ? { ...where, tenant: { id: tenant.id } } : where;
  }

  private assertCourseTenantAccess(course: Course, tenant?: Tenant | null) {
    if (tenant && course.tenant?.id !== tenant.id) throw new NotFoundException("课程订单不存在");
  }

  private publicActivity(activity: Activity) {
    const { groupQrCodeUrl: _groupQrCodeUrl, ...publicActivity } = activity as Activity & { groupQrCodeUrl?: string | null };
    return publicActivity;
  }

  private publicOperationSetting(setting: OperationSetting) {
    const { defaultGroupQrCodeUrl: _defaultGroupQrCodeUrl, smsProviderEnabled: _smsProviderEnabled, smsProvider: _smsProvider, smsAccessKeyId: _smsAccessKeyId, smsAccessKeySecret: _smsAccessKeySecret, smsSignName: _smsSignName, smsTemplateId: _smsTemplateId, ...publicSetting } = setting as OperationSetting & { defaultGroupQrCodeUrl?: string | null };
    publicSetting.paymentMethods = this.normalizePaymentMethods(setting.paymentMethods);
    return publicSetting;
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
      heroCopy: "不用辞职、不用囤货，只需把你的热爱变成课程，平台帮你搞定技术、流量和变现。",
      ctaText: "立即申请，锁定早鸟名额",
      originalPrice: "2999",
      earlyBirdPrice: "999",
      quotaText: "首期限额100人，审核制入驻",
      refundText: "入驻30天内，觉得不合适，可申请全额退款。",
      customerWechat: "",
      customerPhone: "",
      backgroundImageUrl: "",
      painPoints: ["你在传统文化、书法、教育、健康、创业或技能领域有积累，却缺一个被看见的舞台。", "你试过做内容，但流量不稳定，转化不系统。", "你想把知识做成课程，却被技术、运营和交付卡住。", "你不想只做卖课的人，更想进入一个共创、成长、长期沉淀品牌的圈子。"],
      solutionItems: ["独立小程序店铺 + 专属H5主页，一键开课。", "平台全域流量扶持，结合城市线下活动导流。", "每月闭门共创会，授课技能训练，关键阶段策略陪跑。", "链接传统文化、书法、教育、健康、创业、技能等领域的共创者。"],
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
}


