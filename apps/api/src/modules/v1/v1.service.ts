import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import ExcelJS from "exceljs";
import { In, Repository } from "typeorm";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Activity } from "../../entities/activity.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { InviteCode } from "../../entities/invite-code.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { NotificationSchedule } from "../../entities/notification-schedule.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { Notification } from "../../entities/notification.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { OrderStatus, RegistrationStatus } from "../../shared/domain";
import { applyTenantScopeToQuery, assertTenantAccessForActor, assertTenantOwnedResourceAccess, isTenantScopedActor, normalizeTenantCode, normalizeTenantHost, tenantRelationForActor } from "../../shared/tenant-scope";
import { NotificationProviderService } from "./notification-provider.service";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };

export interface AnnouncementInput {
  title: string;
  content: string;
  type?: string;
  enabled?: boolean;
  pinned?: boolean;
}

export interface ReviewInput {
  userId?: number;
  rating: number;
  content: string;
}

export interface ReviewModerationInput {
  status: string;
  adminReply?: string;
}

export interface TrackShareInput {
  code?: string;
  userId?: number;
  source?: string;
  scene?: string;
}

export interface NotificationTemplateInput {
  name: string;
  channel?: string;
  title: string;
  content: string;
  enabled?: boolean;
}

export interface SendNotificationInput {
  templateId?: number;
  userId?: number;
  activityId?: number;
  channel?: string;
  title?: string;
  content?: string;
  remark?: string;
}

export interface PreviewNotificationInput extends SendNotificationInput {
  registrationId?: number;
}

export interface SendActivityReminderInput {
  templateId?: number;
  channel?: string;
  title?: string;
  content?: string;
  remark?: string;
  statuses?: RegistrationStatus[];
}

export interface NotificationScheduleInput {
  activityId: number;
  templateId?: number;
  name: string;
  channel?: string;
  beforeHours?: number;
  enabled?: boolean;
  title?: string;
  content?: string;
  remark?: string;
}

const NOTIFICATION_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const NOTIFICATION_RATE_LIMIT_COUNT = 5;

@Injectable()
export class V1Service implements OnModuleInit, OnModuleDestroy {
  private scheduleTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityHost) private readonly hosts: Repository<ActivityHost>,
    @InjectRepository(ActivitySection) private readonly sections: Repository<ActivitySection>,
    @InjectRepository(ActivityReview) private readonly reviews: Repository<ActivityReview>,
    @InjectRepository(ActivityViewLog) private readonly viewLogs: Repository<ActivityViewLog>,
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(InviteCode) private readonly inviteCodes: Repository<InviteCode>,
    @InjectRepository(ShareVisit) private readonly shareVisits: Repository<ShareVisit>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(NotificationTemplate) private readonly notificationTemplates: Repository<NotificationTemplate>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(NotificationSchedule) private readonly notificationSchedules: Repository<NotificationSchedule>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    private readonly notificationProvider: NotificationProviderService,
    private readonly config: ConfigService
  ) {}

  async onModuleInit() {
    await this.ensureV1Seeds();
    this.startScheduleWorker();
  }

  onModuleDestroy() {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
  }

  async publicAnnouncements(context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    const builder = this.announcements
      .createQueryBuilder("announcement")
      .leftJoin("announcement.tenant", "tenant")
      .where("announcement.enabled = :enabled", { enabled: true })
      .andWhere("(announcement.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true });
    if (tenant) builder.andWhere("announcement.tenantId = :tenantId", { tenantId: tenant.id });
    return builder.orderBy("announcement.pinned", "DESC").addOrderBy("announcement.publishAt", "DESC").addOrderBy("announcement.createdAt", "DESC").take(6).getMany();
  }

  async adminAnnouncements(admin?: AdminContext) {
    const builder = this.announcements.createQueryBuilder("announcement").orderBy("announcement.pinned", "DESC").addOrderBy("announcement.createdAt", "DESC");
    applyTenantScopeToQuery(builder, "announcement", admin);
    return builder.getMany();
  }

  async saveAnnouncement(input: AnnouncementInput, id?: number, admin?: AdminContext) {
    const row = id ? await this.announcements.findOneBy({ id }) : this.announcements.create();
    if (!row) throw new NotFoundException("公告不存在");
    assertTenantAccessForActor(row, admin, "Announcement not found or not in current tenant");
    if (!input.title?.trim() || !input.content?.trim()) {
      throw new BadRequestException("请填写公告标题和内容");
    }

    row.tenant = row.tenant || tenantRelationForActor<Tenant>(admin);
    row.title = input.title.trim();
    row.content = input.content.trim();
    row.type = input.type || "notice";
    row.enabled = input.enabled ?? true;
    row.pinned = input.pinned ?? false;
    row.publishAt = row.publishAt || new Date();
    return this.announcements.save(row);
  }

  private async resolveTenantContext(context?: PublicTenantContext | null) {
    if (!context?.tenantId && !context?.tenantCode && !context?.host) return null;
    if (context.tenantId) {
      const tenant = await this.tenants.findOne({ where: { id: context.tenantId, enabled: true } });
      if (!tenant) throw new NotFoundException("Tenant not found or disabled");
      return tenant;
    }
    const code = normalizeTenantCode(context.tenantCode);
    if (code) {
      const tenant = await this.tenants.findOne({ where: { code, enabled: true } });
      if (!tenant) throw new NotFoundException("Tenant not found or disabled");
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

  private async assertPublicActivityTenantAccess(activity: Activity, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    if (activity.tenant && !activity.tenant.enabled) throw new NotFoundException("Activity not found");
    assertTenantOwnedResourceAccess(activity, tenant, "Activity not found");
    return tenant;
  }

  async enhancedActivity(id: number, userId?: number, source?: string, inviteCode?: string, context?: PublicTenantContext) {
    const activity = await this.activities.findOne({ where: { id }, relations: ["fields"] });
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);

    const user = userId ? await this.users.findOneBy({ id: userId }) : null;
    await this.viewLogs.save(this.viewLogs.create({ activity, user, source: inviteCode ? "invite" : source || "h5" }));
    if (inviteCode) await this.trackShare(id, { code: inviteCode, userId, source: "detail", scene: "activity_detail" }, context);

    activity.fields = activity.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const [hosts, sections, stats, reviews, memberAccess] = await Promise.all([
      this.hosts.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } }),
      this.sections.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } }),
      this.activityStats(id, activity.capacity),
      this.activityReviews(id, context),
      this.memberAccessSnapshot(activity, user || undefined)
    ]);

    return { ...activity, ...stats, displayStatus: this.displayStatus(activity, stats.remainingSeats), hosts, sections, reviews, memberAccess };
  }

  async activityReviews(activityId: number, context?: PublicTenantContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("Activity not found");
    await this.assertPublicActivityTenantAccess(activity, context);
    return this.reviews.find({
      where: { activity: { id: activityId }, status: "visible" },
      order: { createdAt: "DESC" },
      take: 20
    });
  }

  private async assertPublicRegistrationTenantAccess(registration: Registration, context?: PublicTenantContext) {
    const tenant = await this.resolveTenantContext(context);
    if (registration.tenant && !registration.tenant.enabled) throw new NotFoundException("Registration not found");
    if (registration.activity?.tenant && !registration.activity.tenant.enabled) throw new NotFoundException("Registration not found");
    if (tenant && registration.tenant?.id !== tenant.id && registration.activity?.tenant?.id !== tenant.id) throw new NotFoundException("Registration not found");
    return tenant;
  }

  async createReview(registrationId: number, input: ReviewInput, user: User, context?: PublicTenantContext) {
    const registration = await this.registrations.findOne({ where: { id: registrationId } });
    if (!registration) throw new NotFoundException("报名记录不存在");
    await this.assertPublicRegistrationTenantAccess(registration, context);
    if (registration.user.id !== user.id) throw new BadRequestException("只能评价自己的报名");
    if (![RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(registration.status)) {
      throw new BadRequestException("报名成功或签到后才能评价");
    }
    if (await this.reviews.findOne({ where: { registration: { id: registrationId } } })) {
      throw new BadRequestException("该报名已评价");
    }
    if (input.rating < 1 || input.rating > 5) throw new BadRequestException("评分必须在 1 到 5 之间");
    if (!input.content?.trim()) throw new BadRequestException("请填写评价内容");

    const review = await this.reviews.save(
      this.reviews.create({
        activity: registration.activity,
        registration,
        user: registration.user,
        rating: input.rating,
        content: input.content.trim(),
        status: "visible"
      })
    );
    await this.awardPoints(registration.user, 10, "activity_review", review.id, "活动评价奖励");
    return review;
  }

  async adminReviews(status?: string, activityId?: number, admin?: AdminContext) {
    const builder = this.reviews
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.activity", "activity")
      .leftJoinAndSelect("review.registration", "registration")
      .leftJoinAndSelect("review.user", "user")
      .orderBy("review.createdAt", "DESC");
    if (status) builder.where("review.status = :status", { status });
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    if (isTenantScopedActor(admin)) builder.andWhere("(activity.tenantId = :tenantId OR registration.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  async moderateReview(id: number, input: ReviewModerationInput, admin?: AdminContext) {
    const row = await this.reviews.findOneBy({ id });
    this.assertReviewTenantAccess(row, admin);
    if (!row) throw new NotFoundException("评价不存在");
    if (!["visible", "hidden"].includes(input.status)) throw new BadRequestException("评价状态不正确");

    row.status = input.status;
    row.adminReply = input.adminReply || null;
    return this.reviews.save(row);
  }

  private assertReviewTenantAccess(row: ActivityReview | null, admin?: AdminContext) {
    if (!row || !isTenantScopedActor(admin)) return;
    if (row.activity.tenant?.id === admin?.tenantId || row.registration.tenant?.id === admin?.tenantId) return;
    throw new NotFoundException("Review not found or not in current tenant");
  }

  async sharePoster(activityId: number, user: User, context?: PublicTenantContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);

    const invite = await this.ensureInviteCode(activity, user);
    return {
      code: invite.code,
      shareUrl: `/pages/activity/detail?id=${activity.id}&inviteCode=${invite.code}`,
      title: activity.title,
      coverUrl: activity.coverUrl,
      inviteText: `${user.nickname || user.phone || "好友"} 邀请你参加《${activity.title}》`
    };
  }

  async trackShare(activityId: number, input: TrackShareInput, context?: PublicTenantContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);

    const invite = input.code ? await this.inviteCodes.findOne({ where: { code: input.code } }) : null;
    const visitor = input.userId ? await this.users.findOneBy({ id: input.userId }) : null;
    if (invite) {
      invite.visitCount += 1;
      await this.inviteCodes.save(invite);
    }

    return this.shareVisits.save(
      this.shareVisits.create({ activity, inviteCode: invite, visitor, source: input.source || "share", scene: input.scene || null })
    );
  }

  async dashboard(admin?: AdminContext) {
    const tenantId = admin?.tenantId || 0;
    const activityCountBuilder = this.activities.createQueryBuilder("activity");
    const registrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity");
    const approvedCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] });
    const orderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const paidOrderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.status = :status", { status: OrderStatus.Paid });
    const checkInCountBuilder = this.checkIns.createQueryBuilder("checkIn").leftJoin("checkIn.registration", "registration").leftJoin("registration.activity", "activity");
    const reviewCountBuilder = this.reviews.createQueryBuilder("review").leftJoin("review.registration", "registration").leftJoin("review.activity", "activity");
    const viewCountBuilder = this.viewLogs.createQueryBuilder("viewLog").leftJoin("viewLog.activity", "activity");
    const inviteCountBuilder = this.inviteCodes.createQueryBuilder("invite").leftJoin("invite.activity", "activity");
    const shareVisitCountBuilder = this.shareVisits.createQueryBuilder("shareVisit").leftJoin("shareVisit.activity", "activity");
    const notificationCountBuilder = this.notifications.createQueryBuilder("notification").leftJoin("notification.activity", "activity");
    const amountBuilder = this.orders.createQueryBuilder("o").leftJoin("o.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(o.amount), 0)", "sum").where("o.status = :status", { status: OrderStatus.Paid });
    const recentActivityBuilder = this.activities.createQueryBuilder("activity").orderBy("activity.createdAt", "DESC").take(8);

    if (isTenantScopedActor(admin)) {
      activityCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      registrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      approvedCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      orderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      paidOrderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      checkInCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      reviewCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      viewCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      inviteCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      shareVisitCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      notificationCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      amountBuilder.andWhere("(o.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      recentActivityBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
    }

    const [
      activityCount,
      registrationCount,
      approvedCount,
      orderCount,
      paidOrderCount,
      checkInCount,
      reviewCount,
      viewCount,
      inviteCount,
      shareVisitCount,
      notificationCount,
      amount,
      activities
    ] = await Promise.all([
      activityCountBuilder.getCount(),
      registrationCountBuilder.getCount(),
      approvedCountBuilder.getCount(),
      orderCountBuilder.getCount(),
      paidOrderCountBuilder.getCount(),
      checkInCountBuilder.getCount(),
      reviewCountBuilder.getCount(),
      viewCountBuilder.getCount(),
      inviteCountBuilder.getCount(),
      shareVisitCountBuilder.getCount(),
      notificationCountBuilder.getCount(),
      amountBuilder.getRawOne<{ sum: string }>(),
      recentActivityBuilder.getMany()
    ]);
    const recentActivities = await Promise.all(
      activities.map(async (activity) => ({ ...activity, ...(await this.activityStats(activity.id, activity.capacity)) }))
    );

    return {
      totals: {
        activityCount,
        registrationCount,
        approvedCount,
        orderCount,
        paidOrderCount,
        checkInCount,
        reviewCount,
        viewCount,
        inviteCount,
        shareVisitCount,
        notificationCount,
        paidAmount: Number(amount?.sum || 0).toFixed(2),
        signupRate: viewCount ? Math.min((registrationCount / viewCount) * 100, 100).toFixed(1) : "0.0",
        checkInRate: approvedCount ? ((checkInCount / approvedCount) * 100).toFixed(1) : "0.0"
      },
      recentActivities
    };
  }

  async activityFunnel(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
    if (!activity) throw new NotFoundException("活动不存在");

    const [viewCount, shareVisitCount, inviteCount, registrationCount, paidCount, approvedCount, checkInCount, reviewCount] =
      await Promise.all([
        this.viewLogs.count({ where: { activity: { id: activityId } } }),
        this.shareVisits.count({ where: { activity: { id: activityId } } }),
        this.inviteCodes.count({ where: { activity: { id: activityId } } }),
        this.registrations.count({ where: { activity: { id: activityId } } }),
        this.orders.count({ where: { registration: { activity: { id: activityId } }, status: OrderStatus.Paid } }),
        this.registrations.count({
          where: { activity: { id: activityId }, status: In([RegistrationStatus.Approved, RegistrationStatus.CheckedIn]) }
        }),
        this.registrations.count({ where: { activity: { id: activityId }, status: RegistrationStatus.CheckedIn } }),
        this.reviews.count({ where: { activity: { id: activityId }, status: "visible" } })
      ]);
    const topInvites = await this.inviteCodes.find({
      where: { activity: { id: activityId } },
      order: { registrationCount: "DESC", visitCount: "DESC" },
      take: 10
    });

    return {
      activity,
      funnel: { viewCount, shareVisitCount, inviteCount, registrationCount, paidCount, approvedCount, checkInCount, reviewCount },
      rates: {
        signupRate: viewCount ? ((registrationCount / viewCount) * 100).toFixed(1) : "0.0",
        paymentRate: registrationCount ? ((paidCount / registrationCount) * 100).toFixed(1) : "0.0",
        checkInRate: approvedCount ? ((checkInCount / approvedCount) * 100).toFixed(1) : "0.0",
        reviewRate: checkInCount ? ((reviewCount / checkInCount) * 100).toFixed(1) : "0.0"
      },
      topInvites
    };
  }

  async activityRecap(activityId: number, admin?: AdminContext) {
    const funnel = await this.activityFunnel(activityId, admin);
    const reviews = await this.reviews.find({
      where: { activity: { id: activityId }, status: "visible" },
      order: { createdAt: "DESC" },
      take: 20
    });
    const averageRating = reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1) : "0.0";
    const notifications = await this.notifications.count({ where: { activity: { id: activityId } } });
    return { ...funnel, reviewSummary: { averageRating, latestReviews: reviews }, notifications };
  }

  async exportActivityRecap(activityId: number, admin?: AdminContext) {
    const recap = await this.activityRecap(activityId, admin);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "activity-registration-platform";
    workbook.created = new Date();

    const overview = workbook.addWorksheet("复盘概览");
    overview.columns = [
      { header: "指标", key: "name", width: 24 },
      { header: "数值", key: "value", width: 24 }
    ];
    overview.addRows([
      { name: "活动", value: recap.activity.title },
      { name: "地点", value: recap.activity.location },
      { name: "浏览", value: recap.funnel.viewCount },
      { name: "分享访问", value: recap.funnel.shareVisitCount },
      { name: "邀请码", value: recap.funnel.inviteCount },
      { name: "报名", value: recap.funnel.registrationCount },
      { name: "付款", value: recap.funnel.paidCount },
      { name: "报名成功", value: recap.funnel.approvedCount },
      { name: "签到", value: recap.funnel.checkInCount },
      { name: "评价", value: recap.funnel.reviewCount },
      { name: "通知触达", value: recap.notifications },
      { name: "报名转化率", value: `${recap.rates.signupRate}%` },
      { name: "付款转化率", value: `${recap.rates.paymentRate}%` },
      { name: "签到率", value: `${recap.rates.checkInRate}%` },
      { name: "评价率", value: `${recap.rates.reviewRate}%` },
      { name: "评价均分", value: recap.reviewSummary.averageRating }
    ]);

    const invites = workbook.addWorksheet("邀请榜");
    invites.columns = [
      { header: "邀请码", key: "code", width: 18 },
      { header: "用户", key: "user", width: 24 },
      { header: "访问", key: "visitCount", width: 12 },
      { header: "报名", key: "registrationCount", width: 12 },
      { header: "生成时间", key: "createdAt", width: 24 }
    ];
    recap.topInvites.forEach((item) => {
      invites.addRow({
        code: item.code,
        user: item.user?.nickname || item.user?.phone || "-",
        visitCount: item.visitCount,
        registrationCount: item.registrationCount,
        createdAt: item.createdAt
      });
    });

    const reviewSheet = workbook.addWorksheet("评价");
    reviewSheet.columns = [
      { header: "用户", key: "user", width: 24 },
      { header: "评分", key: "rating", width: 10 },
      { header: "评价内容", key: "content", width: 50 },
      { header: "时间", key: "createdAt", width: 24 }
    ];
    recap.reviewSummary.latestReviews.forEach((item) => {
      reviewSheet.addRow({
        user: item.user?.nickname || item.user?.phone || "-",
        rating: item.rating,
        content: item.content,
        createdAt: item.createdAt
      });
    });

    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }

    return workbook.xlsx.writeBuffer();
  }

  async listNotificationTemplates(admin?: AdminContext) {
    const builder = this.notificationTemplates.createQueryBuilder("template").leftJoinAndSelect("template.tenant", "tenant").orderBy("template.createdAt", "DESC");
    if (isTenantScopedActor(admin)) builder.andWhere("(template.tenantId IS NULL OR template.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  async saveNotificationTemplate(input: NotificationTemplateInput, id?: number, admin?: AdminContext) {
    const row = id ? await this.notificationTemplates.findOneBy({ id }) : this.notificationTemplates.create();
    this.assertNotificationTemplateWriteAccess(row, admin);
    if (!row) throw new NotFoundException("通知模板不存在");
    if (!input.name?.trim() || !input.title?.trim() || !input.content?.trim()) {
      throw new BadRequestException("请填写模板名称、标题和内容");
    }

    row.tenant = row.tenant || tenantRelationForActor<Tenant>(admin);
    row.name = input.name.trim();
    row.channel = input.channel || "site";
    row.title = input.title.trim();
    row.content = input.content.trim();
    row.enabled = input.enabled ?? true;
    return this.notificationTemplates.save(row);
  }

  async listNotifications(admin?: AdminContext) {
    const builder = this.notifications
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.activity", "activity")
      .leftJoinAndSelect("notification.user", "user")
      .orderBy("notification.createdAt", "DESC")
      .take(100);
    if (isTenantScopedActor(admin)) builder.andWhere("activity.tenantId = :tenantId", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  async notificationProviderStatus(admin?: AdminContext) {
    const id = isTenantScopedActor(admin) ? admin?.tenantId || 1 : 1;
    const setting = await this.operationSettings.findOne({ where: { id } });
    return this.notificationProvider.providerStatus({
      sms: setting
        ? {
            enabled: setting.smsProviderEnabled,
            provider: setting.smsProvider,
            accessKeyId: setting.smsAccessKeyId,
            accessKeySecret: setting.smsAccessKeySecret,
            signName: setting.smsSignName,
            templateId: setting.smsTemplateId
          }
        : null
    });
  }

  async previewNotification(input: PreviewNotificationInput, admin?: AdminContext) {
    const prepared = await this.prepareNotification(input, admin);
    return {
      channel: prepared.channel,
      title: prepared.title,
      content: prepared.content,
      variables: prepared.variables
    };
  }

  async sendNotification(input: SendNotificationInput, admin?: AdminContext) {
    const prepared = await this.prepareNotification(input, admin);
    const user = input.userId ? await this.users.findOneBy({ id: input.userId }) : null;
    const activity = input.activityId ? await this.activities.findOneBy({ id: input.activityId }) : null;
    if (input.userId && !user) throw new NotFoundException("用户不存在");
    if (input.activityId && !activity) throw new NotFoundException("活动不存在");

    return this.createAndDeliverNotification({ channel: prepared.channel, title: prepared.title, content: prepared.content, user, activity, remark: input.remark || null });
  }

  async sendActivityReminder(activityId: number, input: SendActivityReminderInput, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
    if (!activity) throw new NotFoundException("活动不存在");

    const statuses = input.statuses?.length ? input.statuses : [RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const registrations = await this.registrations.find({
      where: { activity: { id: activityId }, status: In(statuses) },
      order: { createdAt: "ASC" }
    });
    if (registrations.length === 0) throw new BadRequestException("当前活动没有可提醒的报名用户");

    const rows: Notification[] = [];
    for (const registration of registrations) {
      const prepared = await this.prepareNotification({
        ...input,
        activityId,
        userId: registration.user.id,
        registrationId: registration.id
      }, admin);
      rows.push(
        await this.createAndDeliverNotification({
          channel: prepared.channel,
          title: prepared.title,
          content: prepared.content,
          user: registration.user,
          activity,
          remark: input.remark || "活动提醒"
        })
      );
    }

    return {
      activityId,
      sentCount: rows.filter((row) => row.status === "sent").length,
      failedCount: rows.filter((row) => row.status === "failed").length,
      records: rows
    };
  }

  async retryNotification(id: number, admin?: AdminContext) {
    const notification = await this.notifications.findOneBy({ id });
    this.assertNotificationTenantAccess(notification, admin);
    if (!notification) throw new NotFoundException("通知记录不存在");
    if (notification.status !== "failed") throw new BadRequestException("只有发送失败的通知可以重试");

    notification.retryCount += 1;
    notification.status = "pending";
    notification.errorMessage = null;
    notification.failedAt = null;
    const saved = await this.notifications.save(notification);
    return this.deliverNotification(saved);
  }

  async listNotificationSchedules(activityId?: number, admin?: AdminContext) {
    const builder = this.notificationSchedules
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.activity", "activity")
      .leftJoinAndSelect("schedule.template", "template")
      .orderBy("schedule.enabled", "DESC")
      .addOrderBy("schedule.createdAt", "DESC");
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    if (isTenantScopedActor(admin)) builder.andWhere("activity.tenantId = :tenantId", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  async saveNotificationSchedule(input: NotificationScheduleInput, id?: number, admin?: AdminContext) {
    const row = id ? await this.notificationSchedules.findOneBy({ id }) : this.notificationSchedules.create();
    if (id) assertTenantAccessForActor(row?.activity, admin, "Notification schedule not found or not in current tenant");
    if (!row) throw new NotFoundException("提醒规则不存在");

    const activity = await this.activities.findOneBy({ id: input.activityId });
    assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
    if (!activity) throw new NotFoundException("活动不存在");
    const template = await this.notificationTemplateForActor(input.templateId, admin);
    if (input.templateId && !template) throw new NotFoundException("通知模板不存在");
    if (!input.name?.trim()) throw new BadRequestException("请填写提醒规则名称");
    if (!template && (!input.title?.trim() || !input.content?.trim())) {
      throw new BadRequestException("未选择模板时，请填写提醒标题和内容");
    }

    row.activity = activity;
    row.template = template;
    row.name = input.name.trim();
    row.channel = input.channel || template?.channel || "site";
    row.beforeHours = Math.max(Number(input.beforeHours ?? 24), 0);
    row.enabled = input.enabled ?? true;
    row.title = input.title?.trim() || null;
    row.content = input.content?.trim() || null;
    row.remark = input.remark?.trim() || null;
    row.lastRunAt = id ? null : row.lastRunAt || null;
    row.lastSentCount = id ? 0 : row.lastSentCount || 0;
    row.lastFailedCount = id ? 0 : row.lastFailedCount || 0;
    return this.notificationSchedules.save(row);
  }

  async runDueNotificationSchedules(now = new Date(), admin?: AdminContext) {
    const schedules = await this.listDueNotificationSchedules(admin);
    const due = schedules.filter((schedule) => {
      if (schedule.lastRunAt) return false;
      const triggerAt = new Date(schedule.activity.startTime).getTime() - schedule.beforeHours * 60 * 60 * 1000;
      return triggerAt <= now.getTime();
    });

    const results = [];
    for (const schedule of due) {
      const result = await this.sendActivityReminder(schedule.activity.id, {
        templateId: schedule.template?.id,
        channel: schedule.channel,
        title: schedule.title || undefined,
        content: schedule.content || undefined,
        remark: schedule.remark || schedule.name
      }, admin);
      schedule.lastRunAt = now;
      schedule.lastSentCount = result.sentCount;
      schedule.lastFailedCount = result.failedCount;
      await this.notificationSchedules.save(schedule);
      results.push({ scheduleId: schedule.id, name: schedule.name, ...result });
    }
    return { checkedCount: schedules.length, dueCount: due.length, results };
  }

  private listDueNotificationSchedules(admin?: AdminContext) {
    const builder = this.notificationSchedules
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.activity", "activity")
      .leftJoinAndSelect("schedule.template", "template")
      .where("schedule.enabled = :enabled", { enabled: true })
      .orderBy("schedule.createdAt", "ASC");
    if (isTenantScopedActor(admin)) builder.andWhere("activity.tenantId = :tenantId", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private assertNotificationTenantAccess(notification: Notification | null, admin?: AdminContext) {
    if (!notification || !isTenantScopedActor(admin)) return;
    if (notification.activity?.tenant?.id === admin?.tenantId) return;
    throw new NotFoundException("Notification not found or not in current tenant");
  }

  private async notificationTemplateForActor(templateId?: number, admin?: AdminContext) {
    if (!templateId) return null;
    const template = await this.notificationTemplates.findOneBy({ id: templateId });
    this.assertNotificationTemplateReadAccess(template, admin);
    return template;
  }

  private assertNotificationTemplateReadAccess(template: NotificationTemplate | null, admin?: AdminContext) {
    if (!template || !isTenantScopedActor(admin)) return;
    if (!template.tenant?.id || template.tenant.id === admin?.tenantId) return;
    throw new NotFoundException("Notification template not found or not in current tenant");
  }

  private assertNotificationTemplateWriteAccess(template: NotificationTemplate | null, admin?: AdminContext) {
    if (!template || !isTenantScopedActor(admin)) return;
    if (template.tenant?.id === admin?.tenantId) return;
    throw new NotFoundException("Notification template not found or not in current tenant");
  }

  private async activityStats(activityId: number, capacity: number) {
    const active = [
      RegistrationStatus.PendingPayment,
      RegistrationStatus.PendingReview,
      RegistrationStatus.Approved,
      RegistrationStatus.CheckedIn
    ];
    const [registeredCount, checkInCount, reviewCount, viewCount, shareVisitCount] = await Promise.all([
      this.registrations.count({ where: { activity: { id: activityId }, status: In(active) } }),
      this.registrations.count({ where: { activity: { id: activityId }, status: RegistrationStatus.CheckedIn } }),
      this.reviews.count({ where: { activity: { id: activityId }, status: "visible" } }),
      this.viewLogs.count({ where: { activity: { id: activityId } } }),
      this.shareVisits.count({ where: { activity: { id: activityId } } })
    ]);
    return { registeredCount, checkInCount, reviewCount, viewCount, shareVisitCount, remainingSeats: Math.max(capacity - registeredCount, 0) };
  }

  private displayStatus(activity: Activity, remainingSeats: number) {
    const now = Date.now();
    if (new Date(activity.registrationDeadline).getTime() < now || new Date(activity.endTime).getTime() < now) return "ended";
    if (remainingSeats <= 0) return "full";
    return "open";
  }

  private async createAndDeliverNotification(input: {
    channel: string;
    title: string;
    content: string;
    user?: User | null;
    activity?: Activity | null;
    remark?: string | null;
  }) {
    const rateLimitError = await this.notificationRateLimitError(input.channel, input.user, input.activity);
    const row = await this.notifications.save(
      this.notifications.create({
        channel: input.channel,
        title: input.title,
        content: input.content,
        user: input.user || null,
        activity: input.activity || null,
        status: "pending",
        provider: null,
        providerMessageId: null,
        errorMessage: null,
        retryCount: 0,
        sentAt: null,
        failedAt: null,
        remark: input.remark || null
      })
    );
    if (rateLimitError) {
      row.status = "failed";
      row.provider = "rate-limit";
      row.errorMessage = rateLimitError;
      row.failedAt = new Date();
      return this.notifications.save(row);
    }
    return this.deliverNotification(row);
  }

  private async deliverNotification(row: Notification) {
    const result = await this.notificationProvider.deliver({
      channel: row.channel,
      title: row.title,
      content: row.content,
      to: {
        userId: row.user?.id,
        phone: row.user?.phone,
        openid: row.user?.openid
      }
    });

    row.status = result.status;
    row.provider = result.provider;
    row.providerMessageId = result.providerMessageId || null;
    row.errorMessage = result.errorMessage || null;
    row.sentAt = result.status === "sent" ? new Date() : null;
    row.failedAt = result.status === "failed" ? new Date() : null;
    return this.notifications.save(row);
  }

  private async notificationRateLimitError(channel: string, user?: User | null, activity?: Activity | null) {
    if (!user || !activity) return null;
    const since = new Date(Date.now() - NOTIFICATION_RATE_LIMIT_WINDOW_MS);
    const count = await this.notifications
      .createQueryBuilder("n")
      .where("n.channel = :channel", { channel })
      .andWhere("n.userId = :userId", { userId: user.id })
      .andWhere("n.activityId = :activityId", { activityId: activity.id })
      .andWhere("n.createdAt >= :since", { since })
      .getCount();
    if (count >= NOTIFICATION_RATE_LIMIT_COUNT) {
      return "发送过于频繁，请稍后再试";
    }
    return null;
  }

  private async prepareNotification(input: PreviewNotificationInput, admin?: AdminContext) {
    let title = input.title?.trim();
    let content = input.content?.trim();
    let channel = input.channel || "site";

    if (input.templateId) {
      const template = await this.notificationTemplateForActor(input.templateId, admin);
      if (!template || !template.enabled) throw new BadRequestException("通知模板不存在或已停用");
      title ||= template.title;
      content ||= template.content;
      channel = input.channel || template.channel;
    }

    if (!title || !content) throw new BadRequestException("请填写通知标题和内容");

    const activity = input.activityId ? await this.activities.findOneBy({ id: input.activityId }) : null;
    const user = input.userId ? await this.users.findOneBy({ id: input.userId }) : null;
    const registration = input.registrationId ? await this.registrations.findOne({ where: { id: input.registrationId } }) : null;
    if (isTenantScopedActor(admin)) {
      const scopedActivity = activity || registration?.activity || null;
      if (!scopedActivity) throw new BadRequestException("Tenant notification must be associated with an activity or registration");
      assertTenantAccessForActor(scopedActivity, admin, "Activity not found or not in current tenant");
    }
    if (input.activityId && !activity) throw new NotFoundException("活动不存在");
    if (input.userId && !user) throw new NotFoundException("用户不存在");
    if (input.registrationId && !registration) throw new NotFoundException("报名记录不存在");

    const variables = this.notificationVariables({ activity: activity || registration?.activity || null, user: user || registration?.user || null, registration });
    return {
      channel,
      title: this.renderTemplate(title, variables),
      content: this.renderTemplate(content, variables),
      variables
    };
  }

  private notificationVariables(input: { activity?: Activity | null; user?: User | null; registration?: Registration | null }) {
    const { activity, user, registration } = input;
    return {
      activityTitle: activity?.title || "",
      activityLocation: activity?.location || "",
      location: activity?.location || "",
      startTime: activity?.startTime ? this.formatDateTime(activity.startTime) : "",
      endTime: activity?.endTime ? this.formatDateTime(activity.endTime) : "",
      userName: user?.nickname || user?.phone || "用户",
      userPhone: user?.phone || "",
      registrationStatus: registration?.status || "",
      checkInCode: registration?.checkInCode || ""
    };
  }

  private renderTemplate(template: string, variables: Record<string, string>) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(value));
  }

  private startScheduleWorker() {
    if (this.config.get("NOTIFICATION_SCHEDULE_WORKER_ENABLED", "false") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS", 300)), 30);
    this.scheduleTimer = setInterval(() => {
      this.runDueNotificationSchedules().catch((error) => {
        console.error("Notification schedule worker failed", error);
      });
    }, intervalSeconds * 1000);
  }

  private async ensureInviteCode(activity: Activity, user: User) {
    const exists = await this.inviteCodes.findOne({ where: { activity: { id: activity.id }, user: { id: user.id } } });
    if (exists) return exists;

    const code = `A${activity.id}U${user.id}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return this.inviteCodes.save(this.inviteCodes.create({ activity, user, code }));
  }

  private async awardPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string) {
    const key = String(sourceId);
    const exists = await this.memberPointLogs.findOne({ where: { sourceType, sourceId: key } });
    if (exists) return exists;
    const log = await this.memberPointLogs.save(this.memberPointLogs.create({ user, points, type: points >= 0 ? "earn" : "deduct", sourceType, sourceId: key, remark }));
    await this.refreshMemberProfile(user);
    return log;
  }

  private async refreshMemberProfile(user: User) {
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = this.memberProfiles.create({ user, level: null });
    const [registrationCount, checkInCount, reviewCount, paidAmount, pointSum] = await Promise.all([
      this.registrations.count({ where: { user: { id: user.id } } }),
      this.checkIns.count({ where: { registration: { user: { id: user.id } } } }),
      this.reviews.count({ where: { user: { id: user.id } } }),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).getRawOne<{ sum: string }>()
    ]);
    profile.points = Number(pointSum?.sum || 0);
    profile.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    profile.registrationCount = registrationCount;
    profile.checkInCount = checkInCount;
    profile.reviewCount = reviewCount;
    profile.level = await this.resolveMemberLevel(profile.points);
    profile.lastActiveAt = new Date();
    return this.memberProfiles.save(profile);
  }

  private async resolveMemberLevel(points: number) {
    const levels = await this.memberLevels.find({ where: { enabled: true }, order: { minPoints: "DESC" } });
    return levels.find((level) => points >= level.minPoints) || null;
  }

  private async memberAccessSnapshot(activity: Activity, user?: User) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    const priorityActive = this.isPriorityBookingActive(activity);
    if (!requiredLevel) return { requiredLevel: null, currentLevel: null, eligible: true, message: "不限会员等级", priorityActive: false, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    if (!user) {
      return { requiredLevel, currentLevel: null, eligible: false, message: priorityActive ? `优先报名截止前仅限${requiredLevel.name}及以上会员报名` : `该活动仅限${requiredLevel.name}及以上会员报名`, priorityActive, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    }
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

  private async ensureV1Seeds() {
    if ((await this.announcements.count()) === 0) {
      await this.announcements.save([
        this.announcements.create({
          title: "六月活动开放报名",
          content: "读书会、创作者沙龙和线下训练营已开放报名，名额有限，欢迎参加。",
          type: "notice",
          enabled: true,
          pinned: true,
          publishAt: new Date()
        }),
        this.announcements.create({
          title: "现场签到提醒",
          content: "报名成功后请在活动当天出示签到码，工作人员核销后即可入场。",
          type: "guide",
          enabled: true,
          pinned: false,
          publishAt: new Date()
        })
      ]);
    }

    if ((await this.notificationTemplates.count()) === 0) {
      await this.notificationTemplates.save([
        this.notificationTemplates.create({
          name: "报名成功提醒",
          channel: "site",
          title: "报名成功：{{activityTitle}}",
          content: "{{userName}}，你报名的活动已确认成功。活动时间：{{startTime}}，地点：{{location}}。请按时参加。",
          enabled: true
        }),
        this.notificationTemplates.create({
          name: "活动前提醒",
          channel: "site",
          title: "活动即将开始：{{activityTitle}}",
          content: "{{userName}}，你报名的活动即将开始。时间：{{startTime}}，地点：{{location}}，签到码：{{checkInCode}}。",
          enabled: true
        })
      ]);
    }

    const activities = await this.activities.find();
    for (const activity of activities) {
      if ((await this.hosts.count({ where: { activity: { id: activity.id } } })) === 0) {
        await this.hosts.save(
          this.hosts.create({
            activity,
            name: "林知夏",
            title: "活动主理人",
            avatarUrl: null,
            bio: "长期策划读书会和创作者线下活动，关注知识分享与社群连接。",
            sortOrder: 1
          })
        );
      }

      if ((await this.sections.count({ where: { activity: { id: activity.id } } })) === 0) {
        await this.sections.save([
          this.sections.create({ activity, type: "highlights", title: "活动亮点", content: "小班交流、现场案例、可带走的行动清单", sortOrder: 1 }),
          this.sections.create({
            activity,
            type: "audience",
            title: "适合人群",
            content: "社群主理人、内容创作者、活动运营，以及希望认识同频朋友的人。",
            sortOrder: 2
          }),
          this.sections.create({
            activity,
            type: "agenda",
            title: "活动流程",
            content: "签到入场 - 主题分享 - 分组讨论 - 自由交流 - 合影复盘",
            sortOrder: 3
          }),
          this.sections.create({
            activity,
            type: "faq",
            title: "常见问题",
            content: "报名后可在我的活动中查看状态；如需取消，请在活动开始前操作。",
            sortOrder: 4
          })
        ]);
      }
    }
  }
}
