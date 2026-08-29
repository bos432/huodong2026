import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import ExcelJS from "exceljs";
import { EntityManager, In, Repository } from "typeorm";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivityReviewReport } from "../../entities/activity-review-report.entity";
import { ActivitySpaceAnnouncement } from "../../entities/activity-space-announcement.entity";
import { ActivitySpacePost } from "../../entities/activity-space-post.entity";
import { ActivitySpacePostReport } from "../../entities/activity-space-post-report.entity";
import { ActivityRecapVersion } from "../../entities/activity-recap-version.entity";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Activity } from "../../entities/activity.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { InviteCode } from "../../entities/invite-code.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { NotificationSchedule } from "../../entities/notification-schedule.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { Notification } from "../../entities/notification.entity";
import { NotificationPreference } from "../../entities/notification-preference.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TenantFollower } from "../../entities/tenant-follower.entity";
import { User } from "../../entities/user.entity";
import { UserTag } from "../../entities/user-tag.entity";
import { ConversionEvent, ConversionEventType } from "../../entities/conversion-event.entity";
import { ActivityStatus, OrderStatus, RegistrationStatus } from "../../shared/domain";
import { maskPhone } from "../../shared/data-masking";
import { renderNotificationTemplate, unknownNotificationTemplateVariables } from "../../shared/notification-template";
import { notificationTenantScopeMatches } from "../../shared/notification-scope";
import { applyTenantScopeToQuery, assertTenantAccessForActor, assertTenantOwnedResourceAccess, isTenantScopedActor, normalizeTenantCode, normalizeTenantHost, tenantRelationForActor } from "../../shared/tenant-scope";
import { NotificationProviderService } from "./notification-provider.service";
import { BusinessJobService } from "../reliability/business-job.service";
import { MemberPointsService } from "../member-points/member-points.service";
import { memberLevelScopeKey } from "../../shared/member-level-engine";
import { contentAudienceMatches } from "../../shared/content-audience";
import { boundedPercentage } from "../admin/dashboard-metrics";
import { adminCanAccessActivity, applyAdminActivityDataScope, normalizeAdminDataScope } from "../admin/admin-data-scope";
import { yuanToFen } from "../../shared/money";
import { isDuplicateEntryError } from "../../shared/database-errors";
import { isWechatTemplateFieldKey } from "../../shared/wechat-template-field";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown>; clientIp?: string | null; userAgent?: string | null; requestId?: string | null };
type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };
type ActivityTrackingInput = { source?: string; inviteCode?: string; channelCode?: string; clientIp?: string | null };
type ReviewAdminQuery = { status?: string; activityId?: number; page?: number; pageSize?: number };
type ReviewReportAdminQuery = { status?: string; page?: number; pageSize?: number };

export interface ReviewInput {
  userId?: number;
  rating: number;
  content: string;
}

export interface ReviewModerationInput {
  status: string;
  adminReply?: string;
  featured?: boolean;
}

export interface TrackShareInput {
  code?: string;
  userId?: number;
  source?: string;
  scene?: string;
}

export interface ActivitySpaceAnnouncementInput {
  title: string;
  content: string;
  status?: "draft" | "published" | "cancelled";
  pinned?: boolean;
  publishAt?: string | null;
}

export interface ActivitySpacePostInput { content: string; }

export interface RecapVersionInput {
  summary?: string;
  problems?: string[];
  actionItems?: string[];
  images?: string[];
}

export interface NotificationTemplateInput {
  name: string;
  channel?: string;
  scene?: string | null;
  title: string;
  content: string;
  enabled?: boolean;
  providerTemplateId?: string | null;
  approvalStatus?: "draft" | "pending" | "approved" | "rejected" | "retired";
  dataKeys?: Record<string, string> | null;
  page?: string | null;
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

export interface SendTaggedNotificationInput extends SendNotificationInput {
  tagName: string;
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
const NOTIFICATION_RETRY_COOLDOWN_MS = 5 * 1000;

@Injectable()
export class V1Service implements OnModuleInit, OnModuleDestroy {
  private scheduleTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityChannel) private readonly activityChannels: Repository<ActivityChannel>,
    @InjectRepository(ActivityHost) private readonly hosts: Repository<ActivityHost>,
    @InjectRepository(ActivitySection) private readonly sections: Repository<ActivitySection>,
    @InjectRepository(ActivityReview) private readonly reviews: Repository<ActivityReview>,
    @InjectRepository(ActivitySpaceAnnouncement) private readonly spaceAnnouncements: Repository<ActivitySpaceAnnouncement>,
    @InjectRepository(ActivitySpacePost) private readonly spacePosts: Repository<ActivitySpacePost>,
    @InjectRepository(ActivitySpacePostReport) private readonly spacePostReports: Repository<ActivitySpacePostReport>,
    @InjectRepository(ActivityRecapVersion) private readonly recapVersions: Repository<ActivityRecapVersion>,
    @InjectRepository(ActivityViewLog) private readonly viewLogs: Repository<ActivityViewLog>,
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantFollower) private readonly tenantFollowers: Repository<TenantFollower>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(InviteCode) private readonly inviteCodes: Repository<InviteCode>,
    @InjectRepository(ShareVisit) private readonly shareVisits: Repository<ShareVisit>,
    @InjectRepository(ConversionEvent) private readonly conversionEvents: Repository<ConversionEvent>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(NotificationTemplate) private readonly notificationTemplates: Repository<NotificationTemplate>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(NotificationSchedule) private readonly notificationSchedules: Repository<NotificationSchedule>,
    @InjectRepository(NotificationPreference) private readonly notificationPreferences: Repository<NotificationPreference>,
    @InjectRepository(UserTag) private readonly userTags: Repository<UserTag>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    private readonly notificationProvider: NotificationProviderService,
    private readonly config: ConfigService,
    private readonly businessJobs: BusinessJobService,
    private readonly memberPoints: MemberPointsService
  ) {}

  async onModuleInit() {
    this.businessJobs.register("notification.deliver", async (payload, job) => {
      const notificationId = Number(payload.notificationId);
      const claimed = await this.notifications.manager.transaction(async (manager) => {
        const notification = await manager.getRepository(Notification).createQueryBuilder("notification")
          .setLock("pessimistic_write")
          .leftJoinAndSelect("notification.tenant", "tenant")
          .leftJoinAndSelect("notification.activity", "activity")
          .leftJoinAndSelect("activity.tenant", "activityTenant")
          .leftJoinAndSelect("notification.user", "user")
          .where("notification.id = :notificationId", { notificationId })
          .getOne();
        if (!notification) return { notification: null, reason: "notification_not_found" };
        const notificationTenantId = notification.tenant?.id || notification.activity?.tenant?.id || 0;
        if (notificationTenantId !== Number(job.tenantId || 0)) throw new NotFoundException("通知补偿任务不属于当前商家");
        if (notification.status === "sent") return { notification: null, reason: "already_sent" };
        if (notification.status !== "failed") return { notification: null, reason: "notification_not_failed" };
        if (this.notificationRetryCoolingDown(notification)) throw new BadRequestException("通知刚完成重试，请稍后再试");
        notification.retryCount += 1;
        notification.status = "pending";
        notification.errorMessage = null;
        notification.failedAt = null;
        return { notification: await manager.getRepository(Notification).save(notification), reason: null };
      });
      if (!claimed.notification) return { skipped: true, reason: claimed.reason };
      const saved = await this.deliverNotification(claimed.notification, false);
      if (saved.status !== "sent") throw new Error(saved.errorMessage || "Notification delivery failed");
      return { notificationId: saved.id, provider: saved.provider || null, providerMessageId: saved.providerMessageId || null };
    });
    await this.ensureV1Seeds();
    this.startScheduleWorker();
  }

  onModuleDestroy() {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
  }

  async publicAnnouncements(context?: PublicTenantContext, userId?: number | null) {
    const tenant = await this.resolveTenantContext(context);
    const now = new Date();
    const builder = this.announcements
      .createQueryBuilder("announcement")
      .leftJoin("announcement.tenant", "tenant")
      .where("announcement.enabled = :enabled", { enabled: true })
      .andWhere("(announcement.publishAt IS NULL OR announcement.publishAt <= :now)", { now })
      .andWhere("(announcement.endAt IS NULL OR announcement.endAt >= :now)", { now })
      .andWhere("(announcement.tenantId IS NULL OR tenant.enabled = :tenantEnabled)", { tenantEnabled: true });
    if (tenant) builder.andWhere("announcement.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("announcement.tenantId IS NULL");
    const rows = await builder.orderBy("announcement.pinned", "DESC").addOrderBy("announcement.publishAt", "DESC").addOrderBy("announcement.createdAt", "DESC").take(60).getMany();
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    const profile = userId ? await this.memberProfiles.findOne({ where: { user: { id: userId }, tenantScopeKey } }) : null;
    return rows
      .filter((row) => contentAudienceMatches(row.audience, userId, profile?.level?.id))
      .slice(0, 50)
      .map((row) => this.publicAnnouncement(row));
  }

  private publicAnnouncement(row: Announcement) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      pinned: row.pinned,
      publishAt: row.publishAt,
      endAt: row.endAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
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

  private findPublicActivity(id: number, withFields = false) {
    const relations = ["tenant", "category", "agent", "minMemberLevel", "priorityMemberLevel"];
    if (withFields) relations.push("fields");
    return this.activities.findOne({
      where: { id },
      relations,
      loadEagerRelations: false
    });
  }

  async enhancedActivity(id: number, userId?: number, tracking?: ActivityTrackingInput, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(id, true);
    if (!activity) throw new NotFoundException("活动不存在");
    const tenant = await this.assertPublicActivityTenantAccess(activity, context);

    const user = userId ? await this.users.findOneBy({ id: userId }) : null;
    const [stats, operationSetting] = await Promise.all([
      this.activityStats(id, activity.capacity),
      this.findOperationSetting(tenant || activity.tenant || null)
    ]);
    if (this.displayStatus(activity, stats.remainingSeats) === "ended" && !operationSetting?.publicActivityArchiveEnabled && !(await this.activitySpaceAccess(id, user?.id)).allowed) {
      throw new NotFoundException("活动不存在");
    }
    const channel = await this.resolveActivityChannel(activity, tracking?.channelCode);
    await this.recordEnhancedActivityView(activity, user, channel, tracking);
    if (tracking?.inviteCode) await this.trackShare(id, { code: tracking.inviteCode, userId, source: "detail", scene: "activity_detail" }, context);

    activity.fields = activity.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const [hosts, sections, reviews, memberAccess, spaceSummary, organizerTrust, relatedActivities] = await Promise.all([
      this.hosts.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } }),
      this.sections.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } }),
      this.activityReviews(id, context),
      this.memberAccessSnapshot(activity, user || undefined),
      this.activitySpaceSummary(activity, user?.id || null),
      this.organizerTrustSnapshot(activity, user?.id || null),
      this.relatedActivities(activity)
    ]);

    const reviewSummary = {
      count: reviews.length,
      averageRating: reviews.length ? Number((reviews.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviews.length).toFixed(1)) : 0
    };
    return {
      ...this.publicActivity(activity), ...stats, displayStatus: this.displayStatus(activity, stats.remainingSeats), hosts, sections, reviews,
      reviewSummary, organizerTrust, relatedActivities, refundInstructions: operationSetting?.refundInstructions || null,
      memberAccess, hasGroupQrCode: this.hasGroupQrCode(activity, operationSetting), space: spaceSummary
    };
  }

  async toggleOrganizerFollow(tenantId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.tenants.findOne({ where: { id: tenantId, enabled: true } });
    if (!tenant) throw new NotFoundException("主办方不存在或未开放");
    const scopedTenant = await this.resolveTenantContext(context);
    if (scopedTenant && scopedTenant.id !== tenant.id) throw new NotFoundException("主办方不存在或未开放");
    const result = await this.tenantFollowers.manager.transaction(async (manager) => {
      const repository = manager.getRepository(TenantFollower);
      const existing = await repository.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, loadEagerRelations: false });
      if (existing) {
        await repository.delete(existing.id);
        return false;
      }
      try {
        await repository.save(repository.create({ tenant, user }));
        return true;
      } catch (error) {
        if (!isDuplicateEntryError(error)) throw error;
        return true;
      }
    });
    return { tenantId: tenant.id, followed: result, followerCount: await this.tenantFollowers.count({ where: { tenant: { id: tenant.id } } }) };
  }

  private async organizerTrustSnapshot(activity: Activity, userId?: number | null) {
    const tenant = activity.tenant;
    if (!tenant) return null;
    const now = new Date();
    const pastBuilder = this.activities.createQueryBuilder("pastActivity")
      .select("COUNT(*)", "scheduledCount")
      .addSelect("SUM(CASE WHEN pastActivity.status <> :cancelled THEN 1 ELSE 0 END)", "fulfilledCount")
      .where("pastActivity.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("pastActivity.endTime <= :now", { now })
      .andWhere("pastActivity.status IN (:...statuses)", { statuses: [ActivityStatus.Open, ActivityStatus.Ended, ActivityStatus.Cancelled], cancelled: ActivityStatus.Cancelled });
    const reviewBuilder = this.reviews.createQueryBuilder("trustReview")
      .leftJoin("trustReview.activity", "trustActivity")
      .select("COUNT(trustReview.id)", "reviewCount")
      .addSelect("COALESCE(AVG(trustReview.rating), 0)", "averageRating")
      .where("trustReview.status = :status", { status: "visible" })
      .andWhere("trustActivity.tenantId = :tenantId", { tenantId: tenant.id });
    const [past, review, followerCount, followed] = await Promise.all([
      pastBuilder.getRawOne<{ scheduledCount: string; fulfilledCount: string }>(),
      reviewBuilder.getRawOne<{ reviewCount: string; averageRating: string }>(),
      this.tenantFollowers.count({ where: { tenant: { id: tenant.id } } }),
      userId ? this.tenantFollowers.exist({ where: { tenant: { id: tenant.id }, user: { id: userId } } }) : Promise.resolve(false)
    ]);
    const scheduledCount = Number(past?.scheduledCount || 0);
    const fulfilledCount = Number(past?.fulfilledCount || 0);
    const profile = this.publicOrganizerProfile(tenant);
    return {
      verified: Boolean(tenant.enabled && (profile?.intro || profile?.servicePromise)),
      historicalActivityCount: fulfilledCount,
      fulfillmentRate: scheduledCount ? Number((fulfilledCount / scheduledCount * 100).toFixed(1)) : null,
      reviewCount: Number(review?.reviewCount || 0),
      averageRating: Number(Number(review?.averageRating || 0).toFixed(1)),
      followerCount,
      followed
    };
  }

  private async relatedActivities(activity: Activity) {
    const builder = this.activities.createQueryBuilder("related")
      .leftJoinAndSelect("related.tenant", "tenant")
      .leftJoinAndSelect("related.category", "category")
      .where("related.id <> :activityId", { activityId: activity.id })
      .andWhere("related.status = :status", { status: ActivityStatus.Open })
      .andWhere("related.registrationDeadline > :now", { now: new Date() })
      .orderBy("related.featured", "DESC")
      .addOrderBy("related.startTime", "ASC")
      .take(4);
    activity.tenant ? builder.andWhere("related.tenantId = :tenantId", { tenantId: activity.tenant.id }) : builder.andWhere("related.tenantId IS NULL");
    if (activity.category?.id) builder.andWhere("related.categoryId = :categoryId", { categoryId: activity.category.id });
    const rows = await builder.getMany();
    return Promise.all(rows.map(async (row) => {
      const stats = await this.activityStats(row.id, row.capacity);
      return { id: row.id, title: row.title, coverUrl: row.coverUrl, startTime: row.startTime, location: row.location, price: row.price, category: row.category ? { id: row.category.id, name: row.category.name } : null, remainingSeats: stats.remainingSeats, displayStatus: this.displayStatus(row, stats.remainingSeats) };
    }));
  }

  private async activitySpaceAccess(activityId: number, userId?: number | null) {
    if (!userId) return { allowed: false, registration: null };
    const registration = await this.registrations.findOne({ where: { activity: { id: activityId }, user: { id: userId }, status: In([RegistrationStatus.Approved, RegistrationStatus.CheckedIn]) } });
    return { allowed: Boolean(registration), registration };
  }

  private async activitySpaceSummary(activity: Activity, userId?: number | null) {
    const now = new Date();
    const [access, participants, announcementCount, postCount] = await Promise.all([
      this.activitySpaceAccess(activity.id, userId),
      this.registrations.count({ where: { activity: { id: activity.id }, status: In([RegistrationStatus.Approved, RegistrationStatus.CheckedIn]) } }),
      this.spaceAnnouncements.createQueryBuilder("announcement").where("announcement.activityId = :id", { id: activity.id }).andWhere("announcement.status = 'published'").andWhere("(announcement.publishAt IS NULL OR announcement.publishAt <= :now)", { now }).getCount(),
      this.spacePosts.count({ where: { activity: { id: activity.id }, status: "visible" } })
    ]);
    return { canAccess: access.allowed, participantCount: participants, announcementCount, postCount };
  }

  async publicActivitySpace(id: number, user: User, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(id, true);
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);
    const access = await this.activitySpaceAccess(id, user.id);
    if (!access.allowed) throw new BadRequestException("报名审核通过后才能进入活动空间");
    const now = new Date();
    const [announcements, posts, registrations, stats, operationSetting] = await Promise.all([
      this.spaceAnnouncements.createQueryBuilder("announcement").where("announcement.activityId = :id", { id }).andWhere("announcement.status = 'published'").andWhere("(announcement.publishAt IS NULL OR announcement.publishAt <= :now)", { now }).orderBy("announcement.pinned", "DESC").addOrderBy("announcement.publishAt", "DESC").take(30).getMany(),
      this.spacePosts.createQueryBuilder("post").leftJoinAndSelect("post.user", "user").where("post.activityId = :id", { id }).andWhere("(post.status = 'visible' OR (post.status = 'pending' AND post.userId = :userId))", { userId: user.id }).orderBy("post.createdAt", "DESC").take(50).getMany(),
      this.registrations.createQueryBuilder("registration").leftJoinAndSelect("registration.user", "user").where("registration.activityId = :id", { id }).andWhere("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] }).orderBy("registration.createdAt", "ASC").take(24).getMany(),
      this.activityStats(id, activity.capacity),
      this.findOperationSetting(activity.tenant || null)
    ]);
    const groupQrCodeUrl = activity.groupQrCodeUrl?.trim() || operationSetting?.defaultGroupQrCodeUrl?.trim() || null;
    return {
      activity: { id: activity.id, title: activity.title, coverUrl: activity.coverUrl, startTime: activity.startTime, endTime: activity.endTime, location: activity.location, locationLatitude: activity.locationLatitude, locationLongitude: activity.locationLongitude, locationMapUrl: activity.locationMapUrl, groupQrCodeUrl, hasGroupQrCode: Boolean(groupQrCodeUrl), hosts: (await this.hosts.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } })).map((host) => ({ name: host.name, title: host.title, avatarUrl: host.avatarUrl })) },
      stats: { participantCount: stats.registeredCount, remainingSeats: stats.remainingSeats },
      announcements: announcements.map((row) => this.publicSpaceAnnouncement(row)),
      participants: registrations.map((row) => ({ nickname: this.publicUserDisplayName(row.user), avatarUrl: row.user?.avatarUrl || null, checkedIn: row.status === RegistrationStatus.CheckedIn })),
      posts: posts.map((row) => this.publicSpacePost(row, user.id)),
      checkIn: access.registration?.status === RegistrationStatus.Approved ? { available: true, registrationId: access.registration.id } : { available: false, registrationId: access.registration?.id || null }
    };
  }

  async createActivitySpacePost(id: number, input: ActivitySpacePostInput, user: User, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(id);
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);
    if (!(await this.activitySpaceAccess(id, user.id)).allowed) throw new BadRequestException("报名审核通过后才能发布问答");
    const content = String(input.content || "").trim().slice(0, 1000);
    if (!content) throw new BadRequestException("请填写内容");
    const row = await this.spacePosts.save(this.spacePosts.create({ activity, tenant: activity.tenant, user, content, status: "pending", adminReply: null, reportCount: 0 }));
    return this.publicSpacePost(row, user.id);
  }

  async reportActivitySpacePost(activityId: number, postId: number, reason: string, user: User, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(activityId);
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);
    if (!(await this.activitySpaceAccess(activityId, user.id)).allowed) throw new BadRequestException("报名审核通过后才能举报");
    const post = await this.spacePosts.findOne({ where: { id: postId, activity: { id: activityId } } });
    if (!post || post.status !== "visible") throw new NotFoundException("问答不存在");
    if (post.user.id === user.id) throw new BadRequestException("不能举报自己的内容");
    const cleaned = String(reason || "").trim().slice(0, 500);
    if (!cleaned) throw new BadRequestException("请选择举报原因");
    const existing = await this.spacePostReports.findOne({ where: { post: { id: postId }, user: { id: user.id } } });
    if (existing) return { idempotent: true };
    try {
      await this.spacePostReports.save(this.spacePostReports.create({ post, user, reason: cleaned, status: "pending", resolution: null, handledByAdminId: null, handledAt: null }));
    } catch (error) {
      if (!isDuplicateEntryError(error)) throw error;
      return { idempotent: true };
    }
    post.reportCount += 1;
    await this.spacePosts.save(post);
    return { idempotent: false };
  }

  private publicSpaceAnnouncement(row: ActivitySpaceAnnouncement) { return { id: row.id, title: row.title, content: row.content, pinned: row.pinned, publishAt: row.publishAt, createdAt: row.createdAt }; }
  private publicSpacePost(row: ActivitySpacePost, viewerId?: number) {
    const mine = row.user?.id === viewerId;
    return { id: row.id, content: row.content, createdAt: row.createdAt, adminReply: row.adminReply, mine, status: mine ? row.status : "visible", user: { nickname: this.publicUserDisplayName(row.user), avatarUrl: row.user?.avatarUrl || null } };
  }

  private publicActivity(activity: Activity) {
    return {
      id: activity.id,
      title: activity.title,
      tenant: activity.tenant ? { id: activity.tenant.id, code: activity.tenant.code, name: activity.tenant.name, region: activity.tenant.region, organizerProfile: this.publicOrganizerProfile(activity.tenant) } : null,
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
      eligibilityRules: this.publicEligibilityRules(activity.eligibilityRules),
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };
  }

  private publicOrganizerProfile(tenant: Tenant) {
    const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings) ? tenant.settings as Record<string, unknown> : {};
    const raw = settings.organizerProfile && typeof settings.organizerProfile === "object" && !Array.isArray(settings.organizerProfile) ? settings.organizerProfile as Record<string, unknown> : {};
    return {
      logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : null,
      intro: typeof raw.intro === "string" ? raw.intro : null,
      servicePromise: typeof raw.servicePromise === "string" ? raw.servicePromise : null
    };
  }

  private publicMemberLevel(level?: MemberLevel | null) {
    if (!level) return null;
    return { id: level.id, name: level.name, discountRate: level.discountRate, priorityBooking: level.priorityBooking, benefits: level.benefits || [] };
  }

  private publicEligibilityRules(rules?: Activity["eligibilityRules"]) {
    if (!rules) return null;
    return {
      minAge: rules.minAge,
      maxAge: rules.maxAge,
      allowedRegions: rules.allowedRegions || [],
      maxRegistrationsPerUser: rules.maxRegistrationsPerUser,
      requirePrivacyConsent: Boolean(rules.requirePrivacyConsent),
      allowCompanions: Boolean(rules.allowCompanions),
      maxCompanions: rules.maxCompanions
    };
  }

  private findOperationSetting(tenant?: Tenant | null) {
    return this.operationSettings.findOneBy({ id: tenant?.id || 1 });
  }

  private hasGroupQrCode(activity: Activity, setting?: OperationSetting | null) {
    return Boolean(activity.groupQrCodeUrl?.trim() || setting?.defaultGroupQrCodeUrl?.trim());
  }

  private async resolveActivityChannel(activity: Activity, channelCode?: string) {
    const code = this.cleanTrackingText(channelCode, 48);
    if (!code) return null;
    return this.activityChannels.findOne({ where: { activity: { id: activity.id }, code, enabled: true } });
  }

  private async recordEnhancedActivityView(activity: Activity, user: User | null, channel: ActivityChannel | null, tracking?: ActivityTrackingInput) {
    const source = this.cleanTrackingText(tracking?.inviteCode ? "invite" : tracking?.source || channel?.source || "h5", 80) || "h5";
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const duplicate = await this.viewLogs
      .createQueryBuilder("view")
      .where("view.activityId = :activityId", { activityId: activity.id })
      .andWhere(user ? "view.userId = :userId" : "view.userId IS NULL", user ? { userId: user.id } : {})
      .andWhere(channel ? "view.channelId = :channelId" : "view.channelId IS NULL", channel ? { channelId: channel.id } : {})
      .andWhere("view.source = :source", { source })
      .andWhere("view.createdAt >= :since", { since })
      .getExists();
    if (duplicate) return;
    await this.viewLogs.save(this.viewLogs.create({ activity, user, channel, source }));
  }

  private cleanTrackingText(value: unknown, maxLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return "";
    return text.replace(/[^\w\u4e00-\u9fa5:./-]/g, "").slice(0, maxLength);
  }

  async activityReviews(activityId: number, context?: PublicTenantContext) {
    const activity = await this.findPublicActivity(activityId);
    if (!activity) throw new NotFoundException("Activity not found");
    await this.assertPublicActivityTenantAccess(activity, context);
    const rows = await this.reviews.find({
      where: { activity: { id: activityId }, status: "visible" },
      order: { featured: "DESC", createdAt: "DESC" },
      take: 20
    });
    return rows.map((row) => this.publicActivityReview(row));
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
    if (registration.status !== RegistrationStatus.CheckedIn) throw new BadRequestException("完成现场签到后才能评价");
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
    await this.memberPoints.awardEvent({
      user: registration.user,
      tenant: registration.tenant || registration.activity?.tenant || null,
      eventType: "activity_review",
      sourceType: "activity_review",
      sourceId: review.id,
      remark: "活动评价奖励"
    });
    const order = await this.orders.findOne({ where: { registration: { id: registration.id } } });
    await this.recordConversionEvent("review", { activity: registration.activity, user: registration.user, registration, order, source: "member", idempotencyKey: `review:${review.id}`, payload: { rating: review.rating } });
    return this.publicActivityReview(review);
  }

  async reportReview(reviewId: number, reason: string, user: User, context?: PublicTenantContext) {
    const review = await this.reviews.findOneBy({ id: reviewId });
    if (!review || review.status !== "visible") throw new NotFoundException("评价不存在");
    await this.assertPublicActivityTenantAccess(review.activity, context);
    if (review.user.id === user.id) throw new BadRequestException("不能举报自己的评价");
    const repo = this.reviews.manager.getRepository(ActivityReviewReport);
    const existing = await repo.findOne({ where: { review: { id: reviewId }, user: { id: user.id } } });
    if (existing) return { report: this.publicActivityReviewReport(existing), idempotent: true };
    const cleaned = String(reason || "").trim();
    if (!cleaned) throw new BadRequestException("请填写举报原因");
    const report = await repo.save(repo.create({ review, user, reason: cleaned.slice(0, 500), status: "pending", resolution: null, handledBy: null, handledAt: null }));
    return { report: this.publicActivityReviewReport(report), idempotent: false };
  }

  private publicActivityReview(review: ActivityReview) {
    return {
      id: review.id,
      user: { nickname: this.publicUserDisplayName(review.user), avatarUrl: review.user?.avatarUrl || null },
      rating: review.rating,
      content: review.content,
      adminReply: review.adminReply,
      featured: review.featured,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
  }

  private publicActivityReviewReport(report: ActivityReviewReport) {
    return { id: report.id, reviewId: report.review?.id || null, reason: report.reason, status: report.status, resolution: report.resolution, createdAt: report.createdAt, updatedAt: report.updatedAt };
  }

  private publicUserDisplayName(user?: User | null) {
    const nickname = String(user?.nickname || "").trim();
    if (nickname) return nickname;
    const phone = String(user?.phone || "");
    return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : "参与者";
  }

  async reviewOptions(admin?: AdminContext) {
    const builder = this.activities.createQueryBuilder("activity")
      .leftJoin("activity.tenant", "tenant")
      .select(["activity.id", "activity.title", "activity.status", "tenant.id", "tenant.code", "tenant.name"])
      .orderBy("activity.createdAt", "DESC");
    applyTenantScopeToQuery(builder, "activity", admin);
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    const rows = await builder.getMany();
    return { activities: rows.map((row) => ({ id: row.id, title: row.title, status: row.status, tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null })) };
  }

  async adminReviews(query: ReviewAdminQuery = {}, admin?: AdminContext) {
    const { page, pageSize } = this.reviewPagination(query.page, query.pageSize);
    if (query.status && !["visible", "hidden"].includes(query.status)) throw new BadRequestException("评价状态不正确");
    if (query.activityId !== undefined && (!Number.isInteger(query.activityId) || query.activityId <= 0)) throw new BadRequestException("活动 ID 不正确");
    const builder = this.reviews.createQueryBuilder("review")
      .leftJoin("review.activity", "activity")
      .leftJoin("activity.tenant", "tenant")
      .leftJoin("review.registration", "registration")
      .leftJoin("review.user", "user")
      .select([
        "review.id", "review.rating", "review.content", "review.status", "review.adminReply", "review.featured", "review.createdAt", "review.updatedAt",
        "activity.id", "activity.title", "activity.status", "tenant.id", "tenant.code", "tenant.name",
        "registration.id", "registration.status", "user.id", "user.nickname", "user.phone"
      ])
      .orderBy("review.createdAt", "DESC");
    if (query.status) builder.andWhere("review.status = :status", { status: query.status });
    if (query.activityId) builder.andWhere("activity.id = :activityId", { activityId: query.activityId });
    if (isTenantScopedActor(admin)) builder.andWhere("(activity.tenantId = :tenantId OR registration.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    applyAdminActivityDataScope(builder, "review", admin?.dataScope);
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = Boolean(admin?.permissions?.includes("review.sensitive"));
    return { items: rows.map((row) => this.publicAdminReview(row, includeSensitive)), total, page, pageSize };
  }

  async moderateReview(id: number, input: ReviewModerationInput, admin?: AdminContext) {
    if (!["visible", "hidden"].includes(input.status)) throw new BadRequestException("评价状态不正确");
    const reply = String(input.adminReply || "").trim();
    if (reply.length > 255) throw new BadRequestException("管理员回复不能超过 255 个字符");
    const saved = await this.reviews.manager.transaction(async (manager) => {
      const row = await manager.getRepository(ActivityReview).createQueryBuilder("review")
        .setLock("pessimistic_write")
        .innerJoinAndSelect("review.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "activityTenant")
        .innerJoinAndSelect("review.registration", "registration")
        .leftJoinAndSelect("registration.tenant", "registrationTenant")
        .innerJoinAndSelect("review.user", "user")
        .where("review.id = :id", { id })
        .getOne();
      this.assertReviewTenantAccess(row, admin);
      if (!row) throw new NotFoundException("评价不存在");
      row.status = input.status;
      row.adminReply = reply || null;
      if (input.featured !== undefined) row.featured = Boolean(input.featured);
      if (row.status === "hidden") row.featured = false;
      return manager.getRepository(ActivityReview).save(row);
    });
    await this.logReviewOperation(admin, "review.moderate", "activity_review", saved.id, `处置活动评价：${saved.activity.title}`, { status: saved.status, featured: saved.featured, replied: Boolean(saved.adminReply) });
    return this.publicAdminReview(saved, Boolean(admin?.permissions?.includes("review.sensitive")));
  }

  async reviewReports(query: ReviewReportAdminQuery = {}, admin?: AdminContext) {
    const { page, pageSize } = this.reviewPagination(query.page, query.pageSize);
    if (query.status && !["pending", "resolved", "rejected"].includes(query.status)) throw new BadRequestException("举报状态不正确");
    const builder = this.reviews.manager.getRepository(ActivityReviewReport).createQueryBuilder("report")
      .leftJoin("report.review", "review")
      .leftJoin("review.activity", "activity")
      .leftJoin("activity.tenant", "tenant")
      .leftJoin("review.registration", "registration")
      .leftJoin("report.user", "user")
      .select([
        "report.id", "report.reason", "report.status", "report.resolution", "report.handledBy", "report.handledAt", "report.createdAt", "report.updatedAt",
        "review.id", "review.rating", "review.content", "review.status", "review.adminReply", "review.featured", "review.createdAt", "review.updatedAt",
        "activity.id", "activity.title", "activity.status", "tenant.id", "tenant.code", "tenant.name",
        "registration.id", "registration.status", "user.id", "user.nickname", "user.phone"
      ])
      .orderBy("report.createdAt", "DESC");
    if (query.status) builder.andWhere("report.status = :status", { status: query.status });
    if (isTenantScopedActor(admin)) builder.andWhere("(activity.tenantId = :tenantId OR registration.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    applyAdminActivityDataScope(builder, "review", admin?.dataScope);
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = Boolean(admin?.permissions?.includes("review.sensitive"));
    return { items: rows.map((row) => this.publicAdminReviewReport(row, includeSensitive)), total, page, pageSize };
  }

  async handleReviewReport(id: number, input: { status: string; resolution?: string; hideReview?: boolean }, admin?: AdminContext) {
    if (!["resolved", "rejected"].includes(input.status)) throw new BadRequestException("举报处理状态不正确");
    const resolution = String(input.resolution || "").trim();
    if (!resolution) throw new BadRequestException("请填写举报处理说明");
    if (resolution.length > 500) throw new BadRequestException("举报处理说明不能超过 500 个字符");
    const saved = await this.reviews.manager.transaction(async (manager) => {
      const report = await manager.getRepository(ActivityReviewReport).createQueryBuilder("report")
        .setLock("pessimistic_write")
        .innerJoinAndSelect("report.review", "review")
        .innerJoinAndSelect("review.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "activityTenant")
        .innerJoinAndSelect("review.registration", "registration")
        .leftJoinAndSelect("registration.tenant", "registrationTenant")
        .innerJoinAndSelect("report.user", "user")
        .where("report.id = :id", { id })
        .getOne();
      if (!report) throw new NotFoundException("举报记录不存在");
      this.assertReviewTenantAccess(report.review, admin);
      if (report.status !== "pending") throw new BadRequestException("只有待处理举报可以处置");
      Object.assign(report, { status: input.status, resolution, handledBy: admin?.username || "system", handledAt: new Date() });
      if (input.hideReview && input.status === "resolved") {
        report.review.status = "hidden";
        report.review.featured = false;
        await manager.getRepository(ActivityReview).save(report.review);
      }
      return manager.getRepository(ActivityReviewReport).save(report);
    });
    await this.logReviewOperation(admin, "review_report.handle", "activity_review_report", saved.id, `处置评价举报：${saved.review.activity.title}`, { status: saved.status, hideReview: Boolean(input.hideReview && input.status === "resolved") });
    return this.publicAdminReviewReport(saved, Boolean(admin?.permissions?.includes("review.sensitive")));
  }

  private assertReviewTenantAccess(row: ActivityReview | null, admin?: AdminContext) {
    if (!row) return;
    if (isTenantScopedActor(admin) && row.activity.tenant?.id !== admin?.tenantId && row.registration.tenant?.id !== admin?.tenantId) throw new NotFoundException("评价不存在或不属于当前商家");
    if (!adminCanAccessActivity(admin?.dataScope, row.activity.id)) throw new NotFoundException("评价不存在或不在岗位活动范围内");
  }

  private reviewPagination(pageValue?: number, pageSizeValue?: number) {
    const page = pageValue ?? 1;
    const pageSize = pageSizeValue ?? 20;
    if (!Number.isInteger(page) || page < 1) throw new BadRequestException("页码不正确");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException("每页数量必须在 1 到 100 之间");
    return { page, pageSize };
  }

  private publicAdminReview(row: ActivityReview, includeSensitive = false) {
    return {
      id: row.id,
      activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status, tenant: row.activity.tenant ? { id: row.activity.tenant.id, code: row.activity.tenant.code, name: row.activity.tenant.name } : null } : null,
      registration: row.registration ? { id: row.registration.id, status: row.registration.status } : null,
      user: row.user ? { id: row.user.id, nickname: row.user.nickname, phone: includeSensitive ? row.user.phone : maskPhone(row.user.phone) } : null,
      rating: row.rating,
      content: row.content,
      status: row.status,
      adminReply: row.adminReply,
      featured: row.featured,
      sensitiveMasked: !includeSensitive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicAdminReviewReport(row: ActivityReviewReport, includeSensitive = false) {
    return {
      id: row.id,
      review: this.publicAdminReview(row.review, includeSensitive),
      user: row.user ? { id: row.user.id, nickname: row.user.nickname, phone: includeSensitive ? row.user.phone : maskPhone(row.user.phone) } : null,
      reason: row.reason,
      status: row.status,
      resolution: row.resolution,
      handledBy: includeSensitive ? row.handledBy : null,
      handledAt: row.handledAt,
      sensitiveMasked: !includeSensitive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private async logReviewOperation(admin: AdminContext | undefined, action: string, targetType: string, targetId: number, summary: string, detail: Record<string, unknown>) {
    const repo = this.reviews.manager.getRepository(AdminOperationLog);
    await repo.save(repo.create({ adminId: admin?.id || null, adminUsername: admin?.username || null, tenantId: admin?.tenantId ?? null, adminRole: admin?.role || null, clientIp: admin?.clientIp || null, userAgent: admin?.userAgent || null, requestId: admin?.requestId || null, action, targetType, targetId: String(targetId), summary, detail }));
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
      inviteText: `${this.publicUserDisplayName(user)} 邀请你参加《${activity.title}》`
    };
  }

  async trackShare(activityId: number, input: TrackShareInput, context?: PublicTenantContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    await this.assertPublicActivityTenantAccess(activity, context);

    const invite = input.code ? await this.inviteCodes.findOne({ where: { code: input.code, activity: { id: activity.id } } }) : null;
    const visitor = input.userId ? await this.users.findOneBy({ id: input.userId }) : null;
    if (invite) {
      invite.visitCount += 1;
      await this.inviteCodes.save(invite);
    }

    const saved = await this.shareVisits.save(
      this.shareVisits.create({ activity, inviteCode: invite, visitor, source: this.cleanTrackingText(input.source, 80) || "share", scene: this.cleanTrackingText(input.scene, 120) || null })
    );
    await this.recordConversionEvent("share_visit", { activity, user: visitor, source: saved.source || "share", idempotencyKey: `share_visit:${saved.id}`, payload: { scene: saved.scene, inviteCode: invite?.code || null } });
    return { id: saved.id, recorded: true, createdAt: saved.createdAt };
  }

  private async recordConversionEvent(type: ConversionEventType, input: { activity?: Activity | null; user?: User | null; registration?: Registration | null; order?: Order | null; channel?: ActivityChannel | null; amount?: string | number | null; source?: string | null; idempotencyKey: string; payload?: Record<string, unknown> | null }) {
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
      idempotencyKey: input.idempotencyKey,
      clientIp: null,
      userAgent: null,
      payload: input.payload || null
    } as any).orIgnore().updateEntity(false).execute();
    const id = Number(result.identifiers[0]?.id || result.raw?.insertId || 0);
    return id ? { id } : null;
  }

  private relationId<T extends { id: number }>(entity: T | null | undefined) { return entity ? ({ id: entity.id } as T) : null; }

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
        signupRate: boundedPercentage(registrationCount, viewCount).toFixed(1),
        checkInRate: approvedCount ? ((checkInCount / approvedCount) * 100).toFixed(1) : "0.0"
      },
      recentActivities
    };
  }

  async analyticsActivityOptions(admin?: AdminContext) {
    const builder = this.activities.createQueryBuilder("activity").leftJoin("activity.tenant", "tenant")
      .select(["activity.id", "activity.title", "activity.status", "activity.startTime", "activity.locationCity", "tenant.id", "tenant.code", "tenant.name"])
      .orderBy("activity.startTime", "DESC").addOrderBy("activity.id", "DESC");
    applyTenantScopeToQuery(builder, "activity", admin);
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    const rows = await builder.take(1000).getMany();
    return rows.map((row) => ({ id: row.id, title: row.title, status: row.status, startTime: row.startTime, locationCity: row.locationCity, tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null }));
  }

  async activityFunnel(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    this.assertAnalyticsActivityAccess(activity, admin);
    return this.buildActivityFunnel(activity!, this.conversionEvents.manager);
  }

  private assertAnalyticsActivityAccess(activity: Activity | null, admin?: AdminContext) {
    assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
    if (!activity || !adminCanAccessActivity(admin?.dataScope, activity.id)) throw new NotFoundException("活动不存在或不在岗位活动范围内");
  }

  private async buildActivityFunnel(activity: Activity, manager: EntityManager) {
    const eventRepo = manager.getRepository(ConversionEvent);
    const eventRows = await eventRepo.createQueryBuilder("event")
      .select("event.type", "type").addSelect("COUNT(event.id)", "count").addSelect("COALESCE(SUM(event.amount), 0)", "amount")
      .where("event.activityId = :activityId", { activityId: activity.id }).groupBy("event.type").getRawMany<any>();
    const eventMap = new Map(eventRows.map((row) => [String(row.type), { count: Number(row.count || 0), amountFen: yuanToFen(row.amount || 0) }]));
    const count = (type: ConversionEventType) => eventMap.get(type)?.count || 0;
    const amount = (type: ConversionEventType) => eventMap.get(type)?.amountFen || 0;

    const approvedCount = await manager.getRepository(Registration).createQueryBuilder("registration")
      .where("registration.activityId = :activityId", { activityId: activity.id })
      .andWhere("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] }).getCount();
    const inviteCount = await manager.getRepository(InviteCode).count({ where: { activity: { id: activity.id } } });

    const ticketEvents = await eventRepo.createQueryBuilder("event")
      .select("COALESCE(event.ticketTypeIdSnapshot, 0)", "dimensionId")
      .addSelect("COALESCE(MAX(event.ticketTypeNameSnapshot), '默认票/未指定')", "dimensionName")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN 1 ELSE 0 END)", "paidCount")
      .addSelect("SUM(CASE WHEN event.type = 'check_in' THEN 1 ELSE 0 END)", "checkInCount")
      .addSelect("SUM(CASE WHEN event.type = 'review' THEN 1 ELSE 0 END)", "reviewCount")
      .addSelect("SUM(CASE WHEN event.type = 'cancel' THEN 1 ELSE 0 END)", "cancelCount")
      .addSelect("SUM(CASE WHEN event.type = 'refund' THEN 1 ELSE 0 END)", "refundCount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END), 0)", "grossAmount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'refund' THEN event.amount ELSE 0 END), 0)", "refundAmount")
      .where("event.activityId = :activityId", { activityId: activity.id })
      .andWhere("event.type IN ('register','pay','check_in','review','cancel','refund')")
      .groupBy("COALESCE(event.ticketTypeIdSnapshot, 0)").getRawMany<any>();
    const approvedTickets = await manager.getRepository(Registration).createQueryBuilder("registration")
      .leftJoin(Order, "businessOrder", "businessOrder.registrationId = registration.id")
      .select("COALESCE(businessOrder.ticketTypeId, 0)", "dimensionId").addSelect("COUNT(DISTINCT registration.id)", "approvedCount")
      .where("registration.activityId = :activityId", { activityId: activity.id })
      .andWhere("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] })
      .groupBy("COALESCE(businessOrder.ticketTypeId, 0)").getRawMany<any>();
    const approvedTicketMap = new Map(approvedTickets.map((row) => [Number(row.dimensionId || 0), Number(row.approvedCount || 0)]));

    const channelEvents = await eventRepo.createQueryBuilder("event")
      .select("COALESCE(event.channelCodeSnapshot, CONCAT('source:', COALESCE(event.source, 'direct')))", "dimensionKey")
      .addSelect("COALESCE(MAX(event.channelNameSnapshot), MAX(event.source), '直接访问')", "dimensionName")
      .addSelect("COALESCE(MAX(event.channelCodeSnapshot), '')", "code").addSelect("COALESCE(MAX(event.source), 'direct')", "source")
      .addSelect("SUM(CASE WHEN event.type = 'view' THEN 1 ELSE 0 END)", "viewCount")
      .addSelect("SUM(CASE WHEN event.type = 'share_visit' THEN 1 ELSE 0 END)", "shareVisitCount")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN 1 ELSE 0 END)", "paidCount")
      .addSelect("SUM(CASE WHEN event.type = 'check_in' THEN 1 ELSE 0 END)", "checkInCount")
      .addSelect("SUM(CASE WHEN event.type = 'review' THEN 1 ELSE 0 END)", "reviewCount")
      .addSelect("SUM(CASE WHEN event.type = 'cancel' THEN 1 ELSE 0 END)", "cancelCount")
      .addSelect("SUM(CASE WHEN event.type = 'refund' THEN 1 ELSE 0 END)", "refundCount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END), 0)", "grossAmount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'refund' THEN event.amount ELSE 0 END), 0)", "refundAmount")
      .where("event.activityId = :activityId", { activityId: activity.id })
      .groupBy("COALESCE(event.channelCodeSnapshot, CONCAT('source:', COALESCE(event.source, 'direct')))").getRawMany<any>();
    const approvedChannels = await manager.getRepository(Registration).createQueryBuilder("registration")
      .select("COALESCE(registration.attributionChannelCode, CONCAT('source:', COALESCE(registration.attributionSource, 'direct')))", "dimensionKey")
      .addSelect("COUNT(registration.id)", "approvedCount").where("registration.activityId = :activityId", { activityId: activity.id })
      .andWhere("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] })
      .groupBy("COALESCE(registration.attributionChannelCode, CONCAT('source:', COALESCE(registration.attributionSource, 'direct')))").getRawMany<any>();
    const approvedChannelMap = new Map(approvedChannels.map((row) => [String(row.dimensionKey), Number(row.approvedCount || 0)]));

    const cityEvents = await eventRepo.createQueryBuilder("event")
      .select("COALESCE(event.provinceSnapshot, '未知')", "province").addSelect("COALESCE(event.citySnapshot, '未知')", "city").addSelect("COALESCE(event.districtSnapshot, '未知')", "district")
      .addSelect("SUM(CASE WHEN event.type = 'view' THEN 1 ELSE 0 END)", "viewCount")
      .addSelect("SUM(CASE WHEN event.type = 'share_visit' THEN 1 ELSE 0 END)", "shareVisitCount")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN 1 ELSE 0 END)", "paidCount")
      .addSelect("SUM(CASE WHEN event.type = 'check_in' THEN 1 ELSE 0 END)", "checkInCount")
      .addSelect("SUM(CASE WHEN event.type = 'review' THEN 1 ELSE 0 END)", "reviewCount")
      .addSelect("SUM(CASE WHEN event.type = 'cancel' THEN 1 ELSE 0 END)", "cancelCount")
      .addSelect("SUM(CASE WHEN event.type = 'refund' THEN 1 ELSE 0 END)", "refundCount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END), 0)", "grossAmount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'refund' THEN event.amount ELSE 0 END), 0)", "refundAmount")
      .where("event.activityId = :activityId", { activityId: activity.id })
      .groupBy("COALESCE(event.provinceSnapshot, '未知')").addGroupBy("COALESCE(event.citySnapshot, '未知')").addGroupBy("COALESCE(event.districtSnapshot, '未知')").getRawMany<any>();
    const approvedCities = await manager.getRepository(Registration).createQueryBuilder("registration")
      .select("COALESCE(registration.attributionProvince, '未知')", "province").addSelect("COALESCE(registration.attributionCity, '未知')", "city").addSelect("COALESCE(registration.attributionDistrict, '未知')", "district")
      .addSelect("COUNT(registration.id)", "approvedCount").where("registration.activityId = :activityId", { activityId: activity.id })
      .andWhere("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] })
      .groupBy("COALESCE(registration.attributionProvince, '未知')").addGroupBy("COALESCE(registration.attributionCity, '未知')").addGroupBy("COALESCE(registration.attributionDistrict, '未知')").getRawMany<any>();
    const cityKey = (row: any) => `${row.province}|${row.city}|${row.district}`;
    const approvedCityMap = new Map(approvedCities.map((row) => [cityKey(row), Number(row.approvedCount || 0)]));

    const dimensionRow = (row: any, approved: number) => {
      const grossAmountFen = yuanToFen(row.grossAmount || 0); const refundAmountFen = yuanToFen(row.refundAmount || 0);
      const registrationCount = Number(row.registrationCount || 0); const paidCount = Number(row.paidCount || 0); const checkInCount = Number(row.checkInCount || 0);
      return { viewCount: Number(row.viewCount || 0), shareVisitCount: Number(row.shareVisitCount || 0), registrationCount, paidCount, approvedCount: approved, checkInCount, reviewCount: Number(row.reviewCount || 0), cancelCount: Number(row.cancelCount || 0), refundCount: Number(row.refundCount || 0), grossAmountFen, refundAmountFen, netAmountFen: grossAmountFen - refundAmountFen, signupRate: boundedPercentage(registrationCount, Number(row.viewCount || 0)).toFixed(1), paymentRate: boundedPercentage(paidCount, registrationCount).toFixed(1), checkInRate: boundedPercentage(checkInCount, approved).toFixed(1) };
    };
    const ticketTypes = ticketEvents.map((row) => ({ id: Number(row.dimensionId || 0) || null, name: row.dimensionName, ...dimensionRow(row, approvedTicketMap.get(Number(row.dimensionId || 0)) || 0) })).sort((a, b) => b.paidCount - a.paidCount || b.registrationCount - a.registrationCount);
    const channels = channelEvents.map((row) => ({ key: row.dimensionKey, code: row.code || null, name: row.dimensionName, source: row.source, ...dimensionRow(row, approvedChannelMap.get(String(row.dimensionKey)) || 0) })).sort((a, b) => b.paidCount - a.paidCount || b.registrationCount - a.registrationCount || b.viewCount - a.viewCount);
    const cities = cityEvents.map((row) => ({ province: row.province, city: row.city, district: row.district, ...dimensionRow(row, approvedCityMap.get(cityKey(row)) || 0) })).sort((a, b) => b.registrationCount - a.registrationCount || b.viewCount - a.viewCount);

    const attributionMismatchCount = await eventRepo.createQueryBuilder("event").innerJoin("event.registration", "registration")
      .where("event.activityId = :activityId", { activityId: activity.id })
      .andWhere("event.type IN ('register','pay','check_in','review','cancel','refund')")
      .andWhere("(NOT (event.source <=> registration.attributionSource) OR NOT (event.channelCodeSnapshot <=> registration.attributionChannelCode) OR NOT (event.citySnapshot <=> registration.attributionCity))").getCount();

    const funnel = { viewCount: count("view"), shareVisitCount: count("share_visit"), inviteCount, registrationCount: count("register"), paidCount: count("pay"), approvedCount, checkInCount: count("check_in"), reviewCount: count("review"), cancelCount: count("cancel"), refundCount: count("refund"), grossAmountFen: amount("pay"), refundAmountFen: amount("refund"), netAmountFen: amount("pay") - amount("refund") };
    const sum = (rows: any[], key: string) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const reconciles = (rows: any[], includeViews: boolean) => ({ view: !includeViews || sum(rows, "viewCount") === funnel.viewCount, shareVisit: !includeViews || sum(rows, "shareVisitCount") === funnel.shareVisitCount, register: sum(rows, "registrationCount") === funnel.registrationCount, pay: sum(rows, "paidCount") === funnel.paidCount, approved: sum(rows, "approvedCount") === funnel.approvedCount, checkIn: sum(rows, "checkInCount") === funnel.checkInCount, review: sum(rows, "reviewCount") === funnel.reviewCount, cancel: sum(rows, "cancelCount") === funnel.cancelCount, refund: sum(rows, "refundCount") === funnel.refundCount, grossAmount: sum(rows, "grossAmountFen") === funnel.grossAmountFen, refundAmount: sum(rows, "refundAmountFen") === funnel.refundAmountFen, netAmount: sum(rows, "netAmountFen") === funnel.netAmountFen });

    const topInvites = (await manager.getRepository(InviteCode).find({ where: { activity: { id: activity.id } }, order: { registrationCount: "DESC", visitCount: "DESC" }, take: 10 }))
      .map((row) => ({ id: row.id, code: row.code, user: row.user ? { id: row.user.id, nickname: row.user.nickname, phone: maskPhone(row.user.phone) } : null, visitCount: row.visitCount, registrationCount: row.registrationCount, createdAt: row.createdAt }));
    return {
      activity: { id: activity.id, title: activity.title, location: activity.location, locationProvince: activity.locationProvince, locationCity: activity.locationCity, locationDistrict: activity.locationDistrict, startTime: activity.startTime, endTime: activity.endTime, tenant: activity.tenant ? { id: activity.tenant.id, code: activity.tenant.code, name: activity.tenant.name } : null },
      funnel,
      rates: { signupRate: boundedPercentage(funnel.registrationCount, funnel.viewCount).toFixed(1), paymentRate: boundedPercentage(funnel.paidCount, funnel.registrationCount).toFixed(1), checkInRate: boundedPercentage(funnel.checkInCount, funnel.approvedCount).toFixed(1), reviewRate: boundedPercentage(funnel.reviewCount, funnel.checkInCount).toFixed(1), refundRate: boundedPercentage(funnel.refundCount, funnel.paidCount).toFixed(1) },
      dimensions: { ticketTypes, channels, cities },
      reconciliation: { ticketTypes: reconciles(ticketTypes, false), channels: reconciles(channels, true), cities: reconciles(cities, true), attribution: { consistent: attributionMismatchCount === 0, mismatchCount: attributionMismatchCount } },
      topInvites
    };
  }

  async activityRecap(activityId: number, admin?: AdminContext, versionNo?: number) {
    if (versionNo !== undefined) {
      if (!Number.isInteger(versionNo) || versionNo < 1) throw new BadRequestException("复盘版本号不正确");
      const activity = await this.activities.findOneBy({ id: activityId });
      this.assertAnalyticsActivityAccess(activity, admin);
      const version = await this.recapVersions.findOne({ where: { activity: { id: activityId }, versionNo } });
      if (!version) throw new NotFoundException("复盘版本不存在");
      return { ...(version.metricSnapshot as any), version: this.publicRecapVersion(version, true), isHistorical: true };
    }
    const funnel = await this.activityFunnel(activityId, admin);
    const reviews = await this.reviews.find({ where: { activity: { id: activityId }, status: "visible" }, order: { createdAt: "DESC" }, take: 20 });
    const averageRating = reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1) : "0.0";
    const notifications = await this.notifications.count({ where: { activity: { id: activityId } } });
    const latestVersion = await this.recapVersions.findOne({ where: { activity: { id: activityId } }, order: { versionNo: "DESC" } });
    return { ...funnel, reviewSummary: { averageRating, latestReviews: reviews.map((row) => ({ id: row.id, user: row.user ? { id: row.user.id, nickname: row.user.nickname, phone: maskPhone(row.user.phone) } : null, rating: row.rating, content: row.content, createdAt: row.createdAt })) }, notifications, latestVersion: latestVersion ? this.publicRecapVersion(latestVersion, false) : null, generatedAt: new Date(), isHistorical: false };
  }

  async listActivityRecapVersions(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    this.assertAnalyticsActivityAccess(activity, admin);
    const rows = await this.recapVersions.find({ where: { activity: { id: activityId } }, order: { versionNo: "DESC" }, take: 200 });
    return rows.map((row) => this.publicRecapVersion(row, false));
  }

  async createActivityRecapVersion(activityId: number, input: RecapVersionInput, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    this.assertAnalyticsActivityAccess(activity, admin);
    const content = this.normalizeRecapVersionInput(input);
    const live = await this.activityRecap(activityId, admin);
    const metricSnapshot = { ...(live as any) };
    delete metricSnapshot.latestVersion;
    delete metricSnapshot.isHistorical;
    const saved = await this.recapVersions.manager.transaction(async (manager) => {
      const lockedActivity = await manager.getRepository(Activity).createQueryBuilder("activity").setLock("pessimistic_write").leftJoinAndSelect("activity.tenant", "tenant").where("activity.id = :activityId", { activityId }).getOne();
      this.assertAnalyticsActivityAccess(lockedActivity, admin);
      const raw = await manager.getRepository(ActivityRecapVersion).createQueryBuilder("version").select("COALESCE(MAX(version.versionNo), 0)", "versionNo").where("version.activityId = :activityId", { activityId }).getRawOne<{ versionNo: string }>();
      const versionNo = Number(raw?.versionNo || 0) + 1;
      return manager.getRepository(ActivityRecapVersion).save(manager.getRepository(ActivityRecapVersion).create({ activity: lockedActivity!, tenant: lockedActivity!.tenant || null, tenantScopeKey: lockedActivity!.tenant ? `tenant:${lockedActivity!.tenant.id}` : "platform", versionNo, ...content, metricSnapshot, createdBy: admin?.id ? ({ id: admin.id, username: admin.username } as AdminUser) : null }));
    });
    await this.logReviewOperation(admin, "activity_recap.version.create", "activity_recap_version", saved.id, `创建活动复盘版本：${activity!.title} v${saved.versionNo}`, { activityId, versionNo: saved.versionNo, problemCount: saved.problems.length, actionCount: saved.actionItems.length, imageCount: saved.images.length });
    return this.publicRecapVersion(saved, true);
  }

  private normalizeRecapVersionInput(input: RecapVersionInput) {
    const summary = String(input?.summary || "").trim();
    const list = (value: unknown, label: string, maxItems: number, maxLength: number) => {
      if (value !== undefined && !Array.isArray(value)) throw new BadRequestException(`${label}必须是数组`);
      const rows = (Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean);
      if (rows.length > maxItems) throw new BadRequestException(`${label}最多 ${maxItems} 条`);
      if (rows.some((item) => item.length > maxLength)) throw new BadRequestException(`${label}单条不能超过 ${maxLength} 个字符`);
      return rows;
    };
    if (summary.length > 10000) throw new BadRequestException("复盘总结不能超过 10000 个字符");
    const problems = list(input?.problems, "复盘问题", 20, 500); const actionItems = list(input?.actionItems, "行动项", 20, 500); const images = list(input?.images, "复盘图片", 9, 500);
    if (images.some((url) => !/^https:\/\//i.test(url) && !url.startsWith("/uploads/"))) throw new BadRequestException("复盘图片只支持 HTTPS 或站内上传地址");
    if (!summary && !problems.length && !actionItems.length && !images.length) throw new BadRequestException("请至少填写总结、问题、行动项或图片中的一项");
    return { summary, problems, actionItems, images };
  }

  private publicRecapVersion(row: ActivityRecapVersion, includeContent: boolean) {
    return { id: row.id, versionNo: row.versionNo, activityId: row.activity.id, tenantScopeKey: row.tenantScopeKey, createdBy: row.createdBy ? { id: row.createdBy.id, username: row.createdBy.username } : null, createdAt: row.createdAt, ...(includeContent ? { summary: row.summary, problems: row.problems || [], actionItems: row.actionItems || [], images: row.images || [] } : { summaryPreview: String(row.summary || "").slice(0, 120), problemCount: row.problems?.length || 0, actionCount: row.actionItems?.length || 0, imageCount: row.images?.length || 0 }) };
  }

  async exportActivityRecap(activityId: number, admin?: AdminContext, versionNo?: number) {
    const recap: any = await this.activityRecap(activityId, admin, versionNo);
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
      { name: "取消", value: recap.funnel.cancelCount },
      { name: "退款", value: recap.funnel.refundCount },
      { name: "支付毛额（分）", value: recap.funnel.grossAmountFen },
      { name: "退款额（分）", value: recap.funnel.refundAmountFen },
      { name: "净额（分）", value: recap.funnel.netAmountFen },
      { name: "通知触达", value: recap.notifications },
      { name: "报名转化率", value: `${recap.rates.signupRate}%` },
      { name: "付款转化率", value: `${recap.rates.paymentRate}%` },
      { name: "签到率", value: `${recap.rates.checkInRate}%` },
      { name: "评价率", value: `${recap.rates.reviewRate}%` },
      { name: "评价均分", value: recap.reviewSummary.averageRating }
    ]);

    const addDimensionSheet = (name: string, rows: any[], label: (row: any) => string) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = [{ header: "维度", key: "label", width: 28 }, { header: "浏览", key: "viewCount", width: 10 }, { header: "分享", key: "shareVisitCount", width: 10 }, { header: "报名", key: "registrationCount", width: 10 }, { header: "支付", key: "paidCount", width: 10 }, { header: "成功", key: "approvedCount", width: 10 }, { header: "核销", key: "checkInCount", width: 10 }, { header: "评价", key: "reviewCount", width: 10 }, { header: "取消", key: "cancelCount", width: 10 }, { header: "退款", key: "refundCount", width: 10 }, { header: "毛额分", key: "grossAmountFen", width: 14 }, { header: "退款分", key: "refundAmountFen", width: 14 }, { header: "净额分", key: "netAmountFen", width: 14 }];
      rows.forEach((row) => sheet.addRow({ label: label(row), ...row }));
    };
    addDimensionSheet("票种拆分", recap.dimensions.ticketTypes, (row) => row.name);
    addDimensionSheet("渠道拆分", recap.dimensions.channels, (row) => row.code ? `${row.name} (${row.code})` : `${row.name} (${row.source})`);
    addDimensionSheet("城市拆分", recap.dimensions.cities, (row) => [row.province, row.city, row.district].filter((value) => value && value !== "未知").join("/") || "未知");

    const invites = workbook.addWorksheet("邀请榜");
    invites.columns = [
      { header: "邀请码", key: "code", width: 18 },
      { header: "用户", key: "user", width: 24 },
      { header: "访问", key: "visitCount", width: 12 },
      { header: "报名", key: "registrationCount", width: 12 },
      { header: "生成时间", key: "createdAt", width: 24 }
    ];
    recap.topInvites.forEach((item: any) => {
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
    recap.reviewSummary.latestReviews.forEach((item: any) => {
      reviewSheet.addRow({
        user: item.user?.nickname || item.user?.phone || "-",
        rating: item.rating,
        content: item.content,
        createdAt: item.createdAt
      });
    });

    if (recap.version) {
      const content = workbook.addWorksheet("复盘内容");
      content.columns = [{ header: "分类", key: "type", width: 16 }, { header: "内容", key: "content", width: 90 }];
      content.addRow({ type: "版本", content: `v${recap.version.versionNo}` });
      content.addRow({ type: "总结", content: recap.version.summary || "" });
      (recap.version.problems || []).forEach((item: string) => content.addRow({ type: "问题", content: item }));
      (recap.version.actionItems || []).forEach((item: string) => content.addRow({ type: "行动项", content: item }));
      (recap.version.images || []).forEach((item: string) => content.addRow({ type: "图片", content: item }));
    }

    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }

    await this.logReviewOperation(admin, "activity_recap.export", "activity", activityId, `导出活动复盘：${recap.activity.title}`, { versionNo: recap.version?.versionNo || null, historical: Boolean(recap.isHistorical) });
    return workbook.xlsx.writeBuffer();
  }

  async listNotificationTemplates(admin?: AdminContext) {
    const builder = this.notificationTemplates.createQueryBuilder("template").leftJoin("template.tenant", "tenant")
      .select(["template.id", "template.name", "template.channel", "template.scene", "template.title", "template.content", "template.enabled", "template.providerTemplateId", "template.approvalStatus", "template.version", "template.dataKeys", "template.page", "template.versionHistory", "template.createdAt", "template.updatedAt", "tenant.id", "tenant.code", "tenant.name"])
      .orderBy("template.createdAt", "DESC");
    if (isTenantScopedActor(admin)) builder.andWhere("(template.tenantId IS NULL OR template.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return (await builder.take(200).getMany()).map((row) => this.publicNotificationTemplate(row));
  }

  async saveNotificationTemplate(input: NotificationTemplateInput, id?: number, admin?: AdminContext) {
    const row = id ? await this.notificationTemplates.findOneBy({ id }) : this.notificationTemplates.create();
    if (id) this.assertNotificationTemplateWriteAccess(row, admin);
    if (!row) throw new NotFoundException("通知模板不存在");
    if (!input.name?.trim() || !input.title?.trim() || !input.content?.trim()) {
      throw new BadRequestException("请填写模板名称、标题和内容");
    }
    this.assertNotificationTemplateVariables(input.title, input.content);

    const previousSnapshot = id ? this.notificationTemplateSnapshot(row) : null;
    row.tenant = row.tenant || tenantRelationForActor<Tenant>(admin);
    const name = input.name.trim();
    const title = input.title.trim();
    const content = input.content.trim();
    const channel = this.notificationChannel(input.channel || "site");
    const scene = String(input.scene || "").trim() || null;
    const allowedScenes = ["registrationSubmitted", "registrationApproved", "registrationRejected", "paymentSucceeded", "refundSucceeded", "refundRejected", "activityCancelled", "activityChanged", "checkInSucceeded", "activityReminder", "reviewInvitation", "certificateAvailable", "activityRecommendations"];
    if (scene && !allowedScenes.includes(scene)) throw new BadRequestException("通知模板场景不正确");
    const providerTemplateId = String(input.providerTemplateId || "").trim() || null;
    const approvalStatus = input.approvalStatus || (id ? row.approvalStatus || "draft" : "draft");
    if (!["draft", "pending", "approved", "rejected", "retired"].includes(approvalStatus)) throw new BadRequestException("模板审核状态不正确");
    if (channel === "wechat" && approvalStatus === "approved" && (!scene || !providerTemplateId)) throw new BadRequestException("微信模板审核通过前必须配置场景和服务商模板 ID");
    const dataKeys: Record<string, string> | null = input.dataKeys && typeof input.dataKeys === "object" && !Array.isArray(input.dataKeys)
      ? Object.fromEntries(Object.entries(input.dataKeys).map(([source, key]) => [String(source).slice(0, 40), String(key).trim().slice(0, 40)]).filter(([, key]) => Boolean(key)))
      : null;
    if (dataKeys && Object.values(dataKeys).some((key) => !isWechatTemplateFieldKey(key))) throw new BadRequestException("微信模板字段名格式不正确，例如 thing1、time2、character_string6");
    const page = String(input.page || "").trim() || null;
    if (name.length > 120) throw new BadRequestException("模板名称不能超过 120 个字符");
    if (title.length > 160) throw new BadRequestException("通知标题不能超过 160 个字符");
    if (content.length > 5000) throw new BadRequestException("通知内容不能超过 5000 个字符");
    row.name = name;
    row.channel = channel;
    row.scene = scene;
    row.title = title;
    row.content = content;
    row.enabled = input.enabled ?? true;
    row.providerTemplateId = providerTemplateId;
    row.approvalStatus = approvalStatus;
    row.dataKeys = dataKeys;
    row.page = page;
    const nextSnapshot = this.notificationTemplateSnapshot(row);
    const changed = !previousSnapshot || JSON.stringify(previousSnapshot) !== JSON.stringify(nextSnapshot);
    if (!id) {
      row.version = 1;
      row.versionHistory = [{ ...nextSnapshot, version: 1, changedAt: new Date().toISOString(), changedBy: admin?.username || "system" }];
    } else if (changed) {
      row.version = Math.max(Number(row.version || 1) + 1, 2);
      const history = Array.isArray(row.versionHistory) && row.versionHistory.length
        ? [...row.versionHistory]
        : [{ ...previousSnapshot, version: Math.max(Number(row.version || 2) - 1, 1), changedAt: row.createdAt?.toISOString?.() || new Date().toISOString(), changedBy: "history-backfill" }];
      history.push({ ...nextSnapshot, version: row.version, changedAt: new Date().toISOString(), changedBy: admin?.username || "system" });
      row.versionHistory = history.slice(-50);
    }
    const saved = await this.notificationTemplates.save(row);
    await this.logNotificationOperation(admin, id ? "notification_template.update" : "notification_template.create", "notification_template", saved.id, `${id ? "更新" : "创建"}通知模板：${saved.name}`, { channel: saved.channel, scene: saved.scene, version: saved.version, approvalStatus: saved.approvalStatus, enabled: saved.enabled });
    return this.publicNotificationTemplate(saved);
  }

  async notificationTemplateVersions(id: number, admin?: AdminContext) {
    const row = await this.notificationTemplates.findOneBy({ id });
    this.assertNotificationTemplateReadAccess(row, admin);
    if (!row) throw new NotFoundException("通知模板不存在");
    return { templateId: row.id, currentVersion: row.version, versions: [...(row.versionHistory || [])].reverse() };
  }

  async testNotificationTemplate(id: number, userId: number, admin?: AdminContext) {
    if (!Number.isInteger(userId) || userId <= 0) throw new BadRequestException("请选择测试会员");
    const template = await this.notificationTemplates.findOneBy({ id });
    this.assertNotificationTemplateReadAccess(template, admin);
    if (!template) throw new NotFoundException("通知模板不存在");
    return this.sendNotification({ templateId: id, userId, channel: template.channel, remark: `模板测试:v${template.version}` }, admin);
  }

  async notificationOptions(admin?: AdminContext) {
    const activityBuilder = this.activities.createQueryBuilder("activity").leftJoin("activity.tenant", "tenant")
      .select(["activity.id", "activity.title", "activity.status", "activity.createdAt", "tenant.id", "tenant.code", "tenant.name"])
      .orderBy("activity.createdAt", "DESC");
    applyTenantScopeToQuery(activityBuilder, "activity", admin);
    applyAdminActivityDataScope(activityBuilder, "activity", admin?.dataScope);
    const tagBuilder = this.userTags.createQueryBuilder("tag").leftJoin("tag.user", "user")
      .select("tag.name", "name").addSelect("MAX(tag.color)", "color").addSelect("COUNT(DISTINCT user.id)", "count")
      .where("tag.name <> ''").groupBy("tag.name").orderBy("count", "DESC").addOrderBy("tag.name", "ASC").limit(300);
    tagBuilder.andWhere("tag.tenantScopeKey = :tagScopeKey", { tagScopeKey: isTenantScopedActor(admin) ? `tenant:${admin?.tenantId}` : "platform" });
    this.applyNotificationMemberDataScope(tagBuilder, "user", admin);
    const [activities, tags] = await Promise.all([activityBuilder.take(500).getMany(), tagBuilder.getRawMany<{ name: string; color: string; count: string }>()]);
    return {
      activities: activities.map((row) => ({ id: row.id, title: row.title, status: row.status, tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null })),
      tags: tags.map((row) => ({ name: row.name, color: row.color || "default", count: Number(row.count || 0) }))
    };
  }

  async listNotifications(query: { page?: number; pageSize?: number; status?: string; channel?: string; scene?: string; keyword?: string } = {}, admin?: AdminContext) {
    const { page, pageSize } = this.notificationPagination(query.page, query.pageSize);
    if (query.status && !["pending", "sent", "failed", "suppressed"].includes(query.status)) throw new BadRequestException("通知状态不正确");
    if (query.channel) this.notificationChannel(query.channel);
    const keyword = String(query.keyword || "").trim();
    if (keyword.length > 120) throw new BadRequestException("通知关键词不能超过 120 个字符");
    const builder = this.notifications
      .createQueryBuilder("notification")
      .leftJoin("notification.activity", "activity")
      .leftJoin("activity.tenant", "activityTenant")
      .leftJoin("notification.user", "user")
      .select([
        "notification.id", "notification.channel", "notification.scene", "notification.tenantScopeKey", "notification.title", "notification.content", "notification.status", "notification.provider", "notification.providerMessageId", "notification.errorMessage", "notification.suppressedReason", "notification.variablesSnapshot", "notification.providerTemplateId", "notification.templateVersion", "notification.deliveryOptions", "notification.retryCount", "notification.sentAt", "notification.failedAt", "notification.remark", "notification.createdAt",
        "activity.id", "activity.title", "activity.status", "activityTenant.id", "activityTenant.code", "activityTenant.name",
        "user.id", "user.nickname", "user.phone"
      ])
      .orderBy("notification.createdAt", "DESC");
    if (isTenantScopedActor(admin)) builder.andWhere("notification.tenantScopeKey = :tenantScopeKey", { tenantScopeKey: `tenant:${admin?.tenantId}` });
    this.applyNotificationActivityDataScope(builder, "notification", admin);
    if (query.status) builder.andWhere("notification.status = :status", { status: query.status });
    if (query.channel) builder.andWhere("notification.channel = :channel", { channel: query.channel });
    if (query.scene) builder.andWhere("notification.scene = :scene", { scene: query.scene });
    if (keyword) builder.andWhere("(notification.title LIKE :keyword OR notification.remark LIKE :keyword OR user.nickname LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${keyword}%` });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.notificationIncludesSensitive(admin);
    return { items: rows.map((row) => this.notificationPublicPayload(row, includeSensitive)), total, page, pageSize, sensitiveMasked: !includeSensitive };
  }

  async notificationMonitor(admin?: AdminContext) {
    const builder = this.notifications.createQueryBuilder("notification")
      .select("notification.status", "status")
      .addSelect("notification.channel", "channel")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(notification.retryCount), 0)", "retries")
      .groupBy("notification.status").addGroupBy("notification.channel");
    if (isTenantScopedActor(admin)) builder.where("notification.tenantScopeKey = :tenantScopeKey", { tenantScopeKey: `tenant:${admin?.tenantId}` });
    const rows = await builder.getRawMany<{ status: string; channel: string; count: string; retries: string }>();
    const status: Record<string, number> = { pending: 0, sent: 0, failed: 0, suppressed: 0 };
    const channels: Record<string, number> = { site: 0, sms: 0, wechat: 0, email: 0 };
    let retries = 0;
    for (const row of rows) {
      status[row.status] = (status[row.status] || 0) + Number(row.count || 0);
      channels[row.channel] = (channels[row.channel] || 0) + Number(row.count || 0);
      retries += Number(row.retries || 0);
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBuilder = this.notifications.createQueryBuilder("notification").where("notification.createdAt >= :since", { since });
    if (isTenantScopedActor(admin)) recentBuilder.andWhere("notification.tenantScopeKey = :tenantScopeKey", { tenantScopeKey: `tenant:${admin?.tenantId}` });
    const recent24h = await recentBuilder.getCount();
    const jobs = await this.businessJobs.notificationSummary(admin?.tenantId);
    return { status, channels, retries, recent24h, jobs, generatedAt: new Date() };
  }

  async listNotificationPreferences(query: { userId?: number; page?: number; pageSize?: number } = {}, admin?: AdminContext) {
    const { page, pageSize } = this.notificationPagination(query.page, query.pageSize);
    const scopeKey = isTenantScopedActor(admin) ? `tenant:${admin?.tenantId}` : "platform";
    if (query.userId) await this.assertNotificationUserAccess(query.userId, admin);
    const builder = this.notificationPreferences.createQueryBuilder("preference").leftJoin("preference.user", "user")
      .select(["preference.id", "preference.tenantScopeKey", "preference.channel", "preference.subscribed", "preference.reason", "preference.unsubscribedAt", "preference.createdAt", "preference.updatedAt", "user.id", "user.nickname", "user.phone"])
      .where("preference.tenantScopeKey = :scopeKey", { scopeKey }).orderBy("preference.updatedAt", "DESC");
    this.applyNotificationMemberDataScope(builder, "user", admin);
    if (query.userId) builder.andWhere("user.id = :userId", { userId: query.userId });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.notificationIncludesSensitive(admin);
    return { items: rows.map((row) => ({
      id: row.id, user: this.publicNotificationUser(row.user, includeSensitive),
      tenantScopeKey: row.tenantScopeKey, channel: row.channel, subscribed: row.subscribed,
      reason: row.reason, unsubscribedAt: row.unsubscribedAt, createdAt: row.createdAt, updatedAt: row.updatedAt
    })), total, page, pageSize, sensitiveMasked: !includeSensitive };
  }

  async saveNotificationPreference(userId: number, input: { channel?: string; subscribed?: boolean; reason?: string }, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存在");
    await this.assertNotificationUserAccess(userId, admin);
    const channel = this.notificationChannel(input.channel || "");
    const tenant = isTenantScopedActor(admin) ? await this.tenants.findOneBy({ id: Number(admin?.tenantId) }) : null;
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    let row = await this.notificationPreferences.findOne({ where: { user: { id: userId }, tenantScopeKey, channel } });
    if (!row) row = this.notificationPreferences.create({ user, tenant, tenantScopeKey, channel });
    row.subscribed = input.subscribed !== false;
    row.reason = String(input.reason || "").trim().slice(0, 255) || null;
    row.unsubscribedAt = row.subscribed ? null : new Date();
    const saved = await this.notificationPreferences.save(row);
    await this.logNotificationOperation(admin, "notification_preference.update", "notification_preference", saved.id, `${saved.subscribed ? "恢复" : "关闭"}会员通知渠道：${channel}`, { userId, channel, subscribed: saved.subscribed });
    return { id: saved.id, user: this.publicNotificationUser(user, this.notificationIncludesSensitive(admin)), tenantScopeKey: saved.tenantScopeKey, channel: saved.channel, subscribed: saved.subscribed, reason: saved.reason, unsubscribedAt: saved.unsubscribedAt, createdAt: saved.createdAt, updatedAt: saved.updatedAt, sensitiveMasked: !this.notificationIncludesSensitive(admin) };
  }

  async notificationProviderStatus(admin?: AdminContext) {
    const id = isTenantScopedActor(admin) ? admin?.tenantId || 1 : 1;
    const setting = await this.operationSettings.findOne({ where: { id } });
    return await this.notificationProvider.providerStatus({
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
    const includeSensitive = this.notificationIncludesSensitive(admin);
    const variables = this.publicNotificationVariables(prepared.variables, includeSensitive);
    return {
      channel: prepared.channel,
      title: this.sanitizeNotificationText(prepared.title, prepared.variables, variables, includeSensitive),
      content: this.sanitizeNotificationText(prepared.content, prepared.variables, variables, includeSensitive),
      variables,
      sensitiveMasked: !includeSensitive
    };
  }

  async sendNotification(input: SendNotificationInput, admin?: AdminContext) {
    if (!input.userId) throw new BadRequestException("发送单条通知必须选择目标会员");
    const prepared = await this.prepareNotification(input, admin);
    const user = input.userId ? await this.users.findOneBy({ id: input.userId }) : null;
    const activity = input.activityId ? await this.activities.findOneBy({ id: input.activityId }) : null;
    if (input.userId && !user) throw new NotFoundException("用户不存在");
    if (input.activityId && !activity) throw new NotFoundException("活动不存在");

    await this.assertNotificationUserAccess(user!.id, admin);
    const saved = await this.createAndDeliverNotification({ channel: prepared.channel, scene: prepared.template?.scene || null, title: prepared.title, content: prepared.content, variables: prepared.variables, user, activity, tenant: activity?.tenant || (isTenantScopedActor(admin) ? await this.tenants.findOneBy({ id: Number(admin?.tenantId) }) : null), remark: input.remark || null, template: prepared.template });
    await this.logNotificationOperation(admin, "notification.send", "notification", saved.id, `发送单条通知：${saved.title}`, { channel: saved.channel, userId: user!.id, status: saved.status });
    return this.notificationPublicPayload(saved, this.notificationIncludesSensitive(admin));
  }

  async sendActivityReminder(activityId: number, input: SendActivityReminderInput, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertNotificationActivityAccess(activity, admin);

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
          variables: prepared.variables,
          user: registration.user,
          activity,
          tenant: activity.tenant || registration.tenant || null,
          remark: input.remark || "活动提醒"
        })
      );
    }

    const result = {
      activityId,
      sentCount: rows.filter((row) => row.status === "sent").length,
      failedCount: rows.filter((row) => row.status === "failed").length,
      records: rows.map((row) => this.notificationPublicPayload(row, this.notificationIncludesSensitive(admin)))
    };
    await this.logNotificationOperation(admin, "notification.activity_send", "activity", activity.id, `发送活动提醒：${activity.title}`, { channel: input.channel || "site", matchedCount: registrations.length, sentCount: result.sentCount, failedCount: result.failedCount });
    return result;
  }

  async sendTaggedNotification(input: SendTaggedNotificationInput, admin?: AdminContext) {
    const tagName = String(input.tagName || "").trim();
    if (!tagName) throw new BadRequestException("请选择会员分群标签");
    if (isTenantScopedActor(admin) && !input.activityId) throw new BadRequestException("商家按标签批量通知需选择关联活动，用于确认通知归属和变量范围");

    const activity = input.activityId ? await this.activities.findOneBy({ id: input.activityId }) : null;
    if (input.activityId && !activity) throw new NotFoundException("活动不存在");
    if (activity) {
      assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
      this.assertNotificationActivityAccess(activity, admin);
    }

    const builder = this.userTags
      .createQueryBuilder("tag")
      .leftJoinAndSelect("tag.user", "user")
      .leftJoinAndSelect("tag.tenant", "tenant")
      .where("tag.name = :tagName", { tagName })
      .orderBy("tag.createdAt", "ASC")
      .take(10001);
    const targetTenantId = activity?.tenant?.id || (isTenantScopedActor(admin) ? Number(admin?.tenantId || 0) : null);
    const targetScopeKey = targetTenantId ? `tenant:${targetTenantId}` : "platform";
    builder.andWhere("tag.tenantScopeKey = :targetScopeKey", { targetScopeKey });
    this.applyNotificationMemberDataScope(builder, "user", admin);
    const tags = await builder.getMany();
    const users = Array.from(new Map(tags.map((tag) => [tag.user.id, tag.user])).values());
    if (!users.length) throw new BadRequestException("当前标签下没有可通知的会员");
    if (users.length > 10000) throw new BadRequestException("当前标签会员超过 10000 人，请拆分人群后分批发送");

    const rows: Notification[] = [];
    for (const user of users) {
      const prepared = await this.prepareNotification({ ...input, activityId: activity?.id || input.activityId, userId: user.id }, admin);
      rows.push(
        await this.createAndDeliverNotification({
          channel: prepared.channel,
          title: prepared.title,
          content: prepared.content,
          variables: prepared.variables,
          user,
          activity,
          tenant: activity?.tenant || (isTenantScopedActor(admin) ? await this.tenants.findOneBy({ id: Number(admin?.tenantId) }) : null),
          remark: input.remark || `会员分群通知：${tagName}`
        })
      );
    }

    const result = {
      tagName,
      matchedCount: users.length,
      sentCount: rows.filter((row) => row.status === "sent").length,
      failedCount: rows.filter((row) => row.status === "failed").length,
      records: rows.map((row) => this.notificationPublicPayload(row, this.notificationIncludesSensitive(admin)))
    };
    await this.logNotificationOperation(admin, "notification.tag_send", "user_tag", 0, `发送标签通知：${tagName}`, { activityId: activity?.id || null, channel: input.channel || "site", matchedCount: result.matchedCount, sentCount: result.sentCount, failedCount: result.failedCount });
    return result;
  }

  async retryNotification(id: number, admin?: AdminContext) {
    let previousError: string | null = null;
    let previousFailedAt: Date | null = null;
    const saved = await this.notifications.manager.transaction(async (manager) => {
      const notification = await manager.getRepository(Notification).createQueryBuilder("notification")
        .setLock("pessimistic_write")
        .leftJoinAndSelect("notification.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "tenant")
        .leftJoinAndSelect("notification.user", "user")
        .where("notification.id = :id", { id }).getOne();
      this.assertNotificationTenantAccess(notification, admin);
      if (!notification) throw new NotFoundException("通知记录不存在");
      if (notification.activity) this.assertNotificationActivityAccess(notification.activity, admin);
      if (notification.status !== "failed") throw new BadRequestException("只有发送失败的通知可以重试");
      if (this.notificationRetryCoolingDown(notification)) throw new BadRequestException("通知刚完成重试，请稍后再试");
      previousError = notification.errorMessage;
      previousFailedAt = notification.failedAt;
      notification.retryCount += 1;
      notification.status = "pending";
      notification.errorMessage = null;
      notification.failedAt = null;
      return manager.getRepository(Notification).save(notification);
    });
    const identity = this.notificationJobIdentity(saved);
    try {
      await this.businessJobs.retryByIdentity(identity.type, identity.idempotencyKey, saved.tenant?.id || saved.activity?.tenant?.id || admin?.tenantId || null);
    } catch (error) {
      await this.notifications.createQueryBuilder().update().set({ status: "failed", errorMessage: previousError, failedAt: previousFailedAt }).where("id = :id AND status = 'pending'", { id: saved.id }).execute();
      throw error;
    }
    await this.logNotificationOperation(admin, "notification.retry", "notification", saved.id, `重试通知：${saved.title}`, { retryCount: saved.retryCount, status: saved.status, jobType: identity.type });
    return this.notificationPublicPayload(saved, this.notificationIncludesSensitive(admin));
  }

  async listNotificationSchedules(activityId?: number, admin?: AdminContext) {
    const builder = this.notificationSchedules
      .createQueryBuilder("schedule")
      .leftJoin("schedule.activity", "activity")
      .leftJoin("activity.tenant", "tenant")
      .leftJoin("schedule.template", "template")
      .select(["schedule.id", "schedule.name", "schedule.channel", "schedule.beforeHours", "schedule.enabled", "schedule.title", "schedule.content", "schedule.remark", "schedule.lastRunAt", "schedule.lastSentCount", "schedule.lastFailedCount", "schedule.createdAt", "schedule.updatedAt", "activity.id", "activity.title", "activity.status", "tenant.id", "tenant.code", "tenant.name", "template.id", "template.name", "template.channel", "template.enabled"])
      .orderBy("schedule.enabled", "DESC")
      .addOrderBy("schedule.createdAt", "DESC");
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    if (isTenantScopedActor(admin)) builder.andWhere("activity.tenantId = :tenantId", { tenantId: admin?.tenantId });
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    return (await builder.take(200).getMany()).map((row) => this.publicNotificationSchedule(row));
  }

  async saveNotificationSchedule(input: NotificationScheduleInput, id?: number, admin?: AdminContext) {
    const row = id ? await this.notificationSchedules.findOneBy({ id }) : this.notificationSchedules.create();
    if (id) assertTenantAccessForActor(row?.activity, admin, "Notification schedule not found or not in current tenant");
    if (!row) throw new NotFoundException("提醒规则不存在");

    const activity = await this.activities.findOneBy({ id: input.activityId });
    assertTenantAccessForActor(activity, admin, "Activity not found or not in current tenant");
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertNotificationActivityAccess(activity, admin);
    const template = await this.notificationTemplateForActor(input.templateId, admin);
    if (input.templateId && !template) throw new NotFoundException("通知模板不存在");
    if (!input.name?.trim()) throw new BadRequestException("请填写提醒规则名称");
    if (!template && (!input.title?.trim() || !input.content?.trim())) {
      throw new BadRequestException("未选择模板时，请填写提醒标题和内容");
    }

    row.activity = activity;
    row.template = template;
    const name = input.name.trim();
    const title = input.title?.trim() || null;
    const content = input.content?.trim() || null;
    const remark = input.remark?.trim() || null;
    if (name.length > 80) throw new BadRequestException("提醒规则名称不能超过 80 个字符");
    if (title && title.length > 160) throw new BadRequestException("提醒标题不能超过 160 个字符");
    if (content && content.length > 5000) throw new BadRequestException("提醒内容不能超过 5000 个字符");
    if (remark && remark.length > 255) throw new BadRequestException("提醒备注不能超过 255 个字符");
    const beforeHours = Number(input.beforeHours ?? 24);
    if (!Number.isInteger(beforeHours) || beforeHours < 0 || beforeHours > 720) throw new BadRequestException("提前小时必须为 0-720 的整数");
    row.name = name;
    row.channel = this.notificationChannel(input.channel || template?.channel || "site");
    row.beforeHours = beforeHours;
    row.enabled = input.enabled ?? true;
    row.title = title;
    row.content = content;
    row.remark = remark;
    row.lastRunAt = id ? null : row.lastRunAt || null;
    row.lastSentCount = id ? 0 : row.lastSentCount || 0;
    row.lastFailedCount = id ? 0 : row.lastFailedCount || 0;
    const saved = await this.notificationSchedules.save(row);
    await this.logNotificationOperation(admin, id ? "notification_schedule.update" : "notification_schedule.create", "notification_schedule", saved.id, `${id ? "更新" : "创建"}提醒规则：${saved.name}`, { activityId: activity.id, beforeHours, enabled: saved.enabled });
    return this.publicNotificationSchedule(saved);
  }

  async runDueNotificationSchedules(now = new Date(), admin?: AdminContext) {
    const schedules = await this.listDueNotificationSchedules(admin);
    const due = schedules.filter((schedule) => {
      if (schedule.lastRunAt) return false;
      const triggerAt = new Date(schedule.activity.startTime).getTime() - schedule.beforeHours * 60 * 60 * 1000;
      return triggerAt <= now.getTime();
    });

    const results = [];
    for (const candidate of due) {
      const schedule = await this.notificationSchedules.manager.transaction(async (manager) => {
        const locked = await manager.getRepository(NotificationSchedule).createQueryBuilder("schedule")
          .setLock("pessimistic_write")
          .leftJoinAndSelect("schedule.activity", "activity")
          .leftJoinAndSelect("activity.tenant", "tenant")
          .leftJoinAndSelect("schedule.template", "template")
          .where("schedule.id = :id", { id: candidate.id }).getOne();
        if (!locked || !locked.enabled || locked.lastRunAt) return null;
        this.assertNotificationActivityAccess(locked.activity, admin);
        locked.lastRunAt = now;
        return manager.getRepository(NotificationSchedule).save(locked);
      });
      if (!schedule) continue;
      try {
        const result = await this.sendActivityReminder(schedule.activity.id, {
          templateId: schedule.template?.id,
          channel: schedule.channel,
          title: schedule.title || undefined,
          content: schedule.content || undefined,
          remark: schedule.remark || schedule.name
        }, admin);
        schedule.lastSentCount = result.sentCount;
        schedule.lastFailedCount = result.failedCount;
        await this.notificationSchedules.save(schedule);
        results.push({ scheduleId: schedule.id, name: schedule.name, ...result });
      } catch (error: any) {
        schedule.lastSentCount = 0;
        schedule.lastFailedCount = 1;
        await this.notificationSchedules.save(schedule);
        results.push({ scheduleId: schedule.id, name: schedule.name, sentCount: 0, failedCount: 1, error: error?.message || "提醒规则执行失败" });
      }
    }
    await this.logNotificationOperation(admin, "notification_schedule.run_due", "notification_schedule", 0, "执行到期通知规则", { checkedCount: schedules.length, dueCount: due.length, claimedCount: results.length });
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
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    return builder.getMany();
  }

  private assertNotificationTenantAccess(notification: Notification | null, admin?: AdminContext) {
    if (!notification || !isTenantScopedActor(admin)) return;
    if (notificationTenantScopeMatches({ actorTenantId: admin?.tenantId, tenantScopeKey: notification.tenantScopeKey, activityTenantId: notification.activity?.tenant?.id })) return;
    throw new NotFoundException("Notification not found or not in current tenant");
  }

  private assertNotificationActivityAccess(activity: Activity | null | undefined, admin?: AdminContext) {
    if (activity && !adminCanAccessActivity(admin?.dataScope, activity.id)) throw new NotFoundException("活动不存在或不在岗位活动范围内");
  }

  private applyNotificationActivityDataScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, admin?: AdminContext) {
    const scope = normalizeAdminDataScope(admin?.dataScope);
    if (scope.type !== "activity_ids") return;
    if (!scope.activityIds.length) {
      builder.andWhere("1 = 0");
      return;
    }
    builder.andWhere(`${alias}.activityId IN (:...notificationActivityScopeIds)`, { notificationActivityScopeIds: scope.activityIds });
  }

  private applyNotificationMemberDataScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, userAlias: string, admin?: AdminContext) {
    const scope = normalizeAdminDataScope(admin?.dataScope);
    if (scope.type !== "activity_ids") return;
    if (!scope.activityIds.length) {
      builder.andWhere("1 = 0");
      return;
    }
    builder.andWhere(`${userAlias}.id IN (SELECT notification_scope_registration.userId FROM registrations notification_scope_registration WHERE notification_scope_registration.activityId IN (:...notificationMemberScopeIds))`, { notificationMemberScopeIds: scope.activityIds });
  }

  private async assertNotificationUserAccess(userId: number, admin?: AdminContext) {
    if (!isTenantScopedActor(admin)) return;
    const tenantScopeKey = `tenant:${admin?.tenantId}`;
    const profile = await this.memberProfiles.findOne({ where: { user: { id: userId }, tenantScopeKey } });
    if (!profile) throw new NotFoundException("用户不存在或不属于当前商家");
    const scope = normalizeAdminDataScope(admin?.dataScope);
    if (scope.type !== "activity_ids") return;
    if (!scope.activityIds.length) throw new NotFoundException("用户不存在或不在岗位活动范围内");
    const count = await this.registrations.createQueryBuilder("registration").where("registration.userId = :userId", { userId }).andWhere("registration.activityId IN (:...notificationUserScopeIds)", { notificationUserScopeIds: scope.activityIds }).getCount();
    if (!count) throw new NotFoundException("用户不存在或不在岗位活动范围内");
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
    scene?: string | null;
    title: string;
    content: string;
    variables?: Record<string, string>;
    user?: User | null;
    activity?: Activity | null;
    tenant?: Tenant | null;
    remark?: string | null;
    template?: NotificationTemplate | null;
  }) {
    const tenantScopeKey = input.tenant ? `tenant:${input.tenant.id}` : "platform";
    const createdAt = new Date();
    const row = await this.notifications.manager.transaction(async (manager) => {
      if (input.user) {
        const lockedUser = await manager.getRepository(User).createQueryBuilder("user")
          .setLock("pessimistic_write")
          .where("user.id = :userId", { userId: input.user.id })
          .getOne();
        if (!lockedUser) throw new NotFoundException("用户不存在");
      }
      const suppression = await this.notificationSuppressionReason(input.channel, input.user, tenantScopeKey, input.activity, manager);
      const repository = manager.getRepository(Notification);
      const notification = repository.create({
        channel: input.channel,
        scene: input.scene || input.template?.scene || null,
        tenant: input.tenant || null,
        tenantScopeKey,
        title: input.title,
        content: input.content,
        user: input.user || null,
        activity: input.activity || null,
        status: suppression ? "suppressed" : "pending",
        provider: suppression?.provider || null,
        providerMessageId: null,
        errorMessage: null,
        suppressedReason: suppression?.reason || null,
        variablesSnapshot: input.variables || null,
        providerTemplateId: input.template?.providerTemplateId || null,
        templateVersion: input.template?.version || null,
        deliveryOptions: input.template ? { page: input.template.page, dataKeys: input.template.dataKeys } : null,
        retryCount: 0,
        sentAt: null,
        failedAt: null,
        remark: input.remark || null,
        createdAt
      });
      return repository.save(notification);
    });
    if (row.status === "suppressed") return row;
    return this.deliverNotification(row);
  }

  private async deliverNotification(row: Notification, enqueueFailure = true) {
    const wechatOptions = row.channel === "wechat" ? this.notificationWechatDeliveryOptions(row) : null;
    const result = await this.notificationProvider.deliver({
      channel: row.channel,
      title: row.title,
      content: row.content,
      to: {
        userId: row.user?.id,
        phone: row.user?.phone,
        openid: row.user?.openid
      }
    }, wechatOptions ? { wechat: wechatOptions } : undefined);

    row.status = result.status;
    row.provider = result.provider;
    row.providerMessageId = result.providerMessageId || null;
    row.errorMessage = result.errorMessage || null;
    row.sentAt = result.status === "sent" ? new Date() : null;
    row.failedAt = result.status === "failed" ? new Date() : null;
    const saved = await this.notifications.save(row);
    if (enqueueFailure && saved.status === "failed") {
      await this.businessJobs.publish({
        tenantId: saved.tenant?.id || saved.activity?.tenant?.id || null,
        type: "notification.deliver",
        idempotencyKey: `notification:${saved.id}`,
        payload: { notificationId: saved.id },
        maxAttempts: 5
      });
    }
    return saved;
  }

  private async notificationSuppressionReason(channel: string, user: User | null | undefined, tenantScopeKey: string, activity?: Activity | null, manager?: EntityManager) {
    if (!user) return null;
    const preferenceRepository = manager?.getRepository(NotificationPreference) || this.notificationPreferences;
    const notificationRepository = manager?.getRepository(Notification) || this.notifications;
    const preference = await preferenceRepository.findOne({ where: { user: { id: user.id }, tenantScopeKey, channel } });
    if (preference && !preference.subscribed) return { provider: "preference", reason: preference.reason || "用户已退订该通知渠道" };
    const since = new Date(Date.now() - NOTIFICATION_RATE_LIMIT_WINDOW_MS);
    const count = await notificationRepository
      .createQueryBuilder("n")
      .where("n.channel = :channel", { channel })
      .andWhere("n.userId = :userId", { userId: user.id })
      .andWhere("n.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .andWhere(activity ? "n.activityId = :activityId" : "n.activityId IS NULL", activity ? { activityId: activity.id } : {})
      .andWhere("n.status IN (:...rateStatuses)", { rateStatuses: ["pending", "sent"] })
      .andWhere("n.createdAt >= :since", { since })
      .getCount();
    if (count >= NOTIFICATION_RATE_LIMIT_COUNT) {
      return { provider: "rate-limit", reason: "发送过于频繁，请稍后再试" };
    }
    return null;
  }

  private async prepareNotification(input: PreviewNotificationInput, admin?: AdminContext) {
    let title = input.title?.trim();
    let content = input.content?.trim();
    let channel = this.notificationChannel(input.channel || "site");
    let template: NotificationTemplate | null = null;

    if (input.templateId) {
      template = await this.notificationTemplateForActor(input.templateId, admin);
      if (!template || !template.enabled) throw new BadRequestException("通知模板不存在或已停用");
      if (template.channel === "wechat" && (template.approvalStatus !== "approved" || !template.providerTemplateId)) throw new BadRequestException("微信模板尚未审核通过或未配置服务商模板 ID");
      title ||= template.title;
      content ||= template.content;
      channel = this.notificationChannel(input.channel || template.channel);
    }

    if (!title || !content) throw new BadRequestException("请填写通知标题和内容");
    if (title.length > 160) throw new BadRequestException("通知标题不能超过 160 个字符");
    if (content.length > 5000) throw new BadRequestException("通知内容不能超过 5000 个字符");
    this.assertNotificationTemplateVariables(title, content);

    const activity = input.activityId ? await this.activities.findOneBy({ id: input.activityId }) : null;
    const user = input.userId ? await this.users.findOneBy({ id: input.userId }) : null;
    const registration = input.registrationId ? await this.registrations.findOne({ where: { id: input.registrationId } }) : null;
    if (isTenantScopedActor(admin)) {
      const scopedActivity = activity || registration?.activity || null;
      if (scopedActivity) {
        assertTenantAccessForActor(scopedActivity, admin, "Activity not found or not in current tenant");
        this.assertNotificationActivityAccess(scopedActivity, admin);
      }
      else {
        if (!user) throw new BadRequestException("租户通知必须关联活动、报名或本租户会员");
        await this.assertNotificationUserAccess(user.id, admin);
      }
    }
    if (input.activityId && !activity) throw new NotFoundException("活动不存在");
    if (input.userId && !user) throw new NotFoundException("用户不存在");
    if (input.registrationId && !registration) throw new NotFoundException("报名记录不存在");
    if (registration && activity && registration.activity.id !== activity.id) throw new BadRequestException("报名记录不属于所选活动");
    if (registration && user && registration.user.id !== user.id) throw new BadRequestException("报名记录不属于所选会员");
    if (user) await this.assertNotificationUserAccess(user.id, admin);

    const variables = this.notificationVariables({ activity: activity || registration?.activity || null, user: user || registration?.user || null, registration });
    return {
      channel,
      title: this.renderTemplate(title, variables),
      content: this.renderTemplate(content, variables),
      variables,
      template
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
    return renderNotificationTemplate(template, variables);
  }

  private notificationIncludesSensitive(admin?: AdminContext) {
    return Boolean(admin?.permissions?.includes("notification.sensitive"));
  }

  private notificationPagination(pageValue?: number, pageSizeValue?: number) {
    const page = pageValue ?? 1;
    const pageSize = pageSizeValue ?? 20;
    if (!Number.isInteger(page) || page < 1) throw new BadRequestException("页码不正确");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException("每页数量必须为 1-100");
    return { page, pageSize };
  }

  private notificationRetryCoolingDown(notification: Notification) {
    return notification.retryCount > 0 && Boolean(notification.failedAt) && Date.now() - new Date(notification.failedAt!).getTime() < NOTIFICATION_RETRY_COOLDOWN_MS;
  }

  private notificationChannel(value: string) {
    const channel = String(value || "").trim();
    if (!["site", "sms", "wechat", "email"].includes(channel)) throw new BadRequestException("通知渠道不正确");
    return channel;
  }

  private publicNotificationUser(user: User | null | undefined, includeSensitive: boolean) {
    return user ? { id: user.id, nickname: user.nickname, phone: includeSensitive ? user.phone : maskPhone(user.phone), sensitiveMasked: !includeSensitive } : null;
  }

  private publicNotificationVariables(variables: Record<string, string> | null | undefined, includeSensitive: boolean) {
    const result = { ...(variables || {}) };
    if (includeSensitive) return result;
    result.userPhone = maskPhone(result.userPhone);
    if (/^1\d{10}$/.test(result.userName || "")) result.userName = maskPhone(result.userName);
    if (result.checkInCode) result.checkInCode = `${result.checkInCode.slice(0, 2)}****${result.checkInCode.slice(-2)}`;
    return result;
  }

  private sanitizeNotificationText(text: string, original: Record<string, string> | null | undefined, safe: Record<string, string>, includeSensitive = false) {
    let result = String(text || "");
    for (const key of ["userPhone", "userName", "checkInCode"]) {
      const source = String(original?.[key] || "");
      const target = String(safe[key] || "");
      if (source && source !== target) result = result.split(source).join(target);
    }
    if (!includeSensitive) result = result.replace(/(^|\D)(1\d{10})(?!\d)/g, (_match, prefix, phone) => `${prefix}${maskPhone(phone)}`);
    return result;
  }

  private publicNotificationTemplate(row: NotificationTemplate) {
    return { id: row.id, name: row.name, channel: row.channel, scene: row.scene, title: row.title, content: row.content, enabled: row.enabled, providerTemplateId: row.providerTemplateId, approvalStatus: row.approvalStatus, version: row.version, dataKeys: row.dataKeys, page: row.page, versionCount: row.versionHistory?.length || 0, tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private publicNotificationSchedule(row: NotificationSchedule) {
    return { id: row.id, name: row.name, channel: row.channel, beforeHours: row.beforeHours, enabled: row.enabled, title: row.title, content: row.content, remark: row.remark, lastRunAt: row.lastRunAt, lastSentCount: row.lastSentCount, lastFailedCount: row.lastFailedCount, createdAt: row.createdAt, updatedAt: row.updatedAt, activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status, tenant: row.activity.tenant ? { id: row.activity.tenant.id, code: row.activity.tenant.code, name: row.activity.tenant.name } : null } : null, template: row.template ? { id: row.template.id, name: row.template.name, channel: row.template.channel, enabled: row.template.enabled } : null };
  }

  private notificationPublicPayload(row: Notification, includeSensitive = false) {
    const variables = this.publicNotificationVariables(row.variablesSnapshot, includeSensitive);
    return {
      id: row.id, channel: row.channel, scene: row.scene, tenantScopeKey: row.tenantScopeKey,
      title: this.sanitizeNotificationText(row.title, row.variablesSnapshot, variables, includeSensitive), content: this.sanitizeNotificationText(row.content, row.variablesSnapshot, variables, includeSensitive), status: row.status, provider: row.provider,
      providerMessageId: includeSensitive ? row.providerMessageId : null, errorMessage: includeSensitive ? row.errorMessage : null,
      providerTemplateId: row.providerTemplateId, templateVersion: row.templateVersion,
      suppressedReason: row.suppressedReason, variablesSnapshot: variables,
      retryCount: row.retryCount, sentAt: row.sentAt, failedAt: row.failedAt,
      user: this.publicNotificationUser(row.user, includeSensitive),
      activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status, tenant: row.activity.tenant ? { id: row.activity.tenant.id, code: row.activity.tenant.code, name: row.activity.tenant.name } : null } : null,
      remark: row.remark, sensitiveMasked: !includeSensitive, createdAt: row.createdAt
    };
  }

  private logNotificationOperation(admin: AdminContext | undefined, action: string, targetType: string, targetId: number, summary: string, detail: Record<string, unknown>) {
    return this.logReviewOperation(admin, action, targetType, targetId, summary, detail);
  }

  private notificationTemplateSnapshot(row: NotificationTemplate) {
    return { name: row.name, channel: row.channel, scene: row.scene, title: row.title, content: row.content, enabled: row.enabled, providerTemplateId: row.providerTemplateId, approvalStatus: row.approvalStatus, dataKeys: row.dataKeys, page: row.page };
  }

  private notificationWechatDeliveryOptions(row: Notification) {
    const options = row.deliveryOptions || {};
    const dataKeys = options.dataKeys && typeof options.dataKeys === "object" ? options.dataKeys as Record<string, string> : { title: "thing1", content: "thing2" };
    const sourceValues: Record<string, string> = { title: row.title, content: row.content, activityTitle: row.activity?.title || "活动", location: row.activity?.location || "" };
    const data = Object.fromEntries(Object.entries(dataKeys).filter(([source, key]) => sourceValues[source] && key).map(([source, key]) => [key, sourceValues[source]]));
    return { templateId: row.providerTemplateId, page: String(options.page || "pages/index/index"), data };
  }

  private notificationJobIdentity(row: Notification) {
    const remark = String(row.remark || "");
    if (remark.startsWith("automatic_sms:")) return { type: "automatic-sms.deliver", idempotencyKey: remark.slice("automatic_sms:".length) };
    if (remark.startsWith("automatic_wechat:")) return { type: "automatic-wechat.deliver", idempotencyKey: remark.slice("automatic_wechat:".length) };
    return { type: "notification.deliver", idempotencyKey: `notification:${row.id}` };
  }

  private assertNotificationTemplateVariables(...templates: string[]) {
    const unknown = unknownNotificationTemplateVariables(...templates);
    if (unknown.length) throw new BadRequestException(`通知模板包含未知变量：${unknown.join("、")}`);
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

  private async refreshMemberProfile(user: User, tenant: Tenant | null = null) {
    const tenantScopeKey = memberLevelScopeKey(tenant);
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) profile = this.memberProfiles.create({ user, tenant, tenantScopeKey, level: null, pointDebt: 0 });
    const tenantFilter = tenant ? " = :tenantId" : " IS NULL";
    const [registrationCount, checkInCount, reviewCount, paidAmount, pointSum] = await Promise.all([
      this.registrations.createQueryBuilder("registration").where("registration.userId = :userId", { userId: user.id }).andWhere(`registration.tenantId${tenantFilter}`, { tenantId: tenant?.id }).getCount(),
      this.checkIns.createQueryBuilder("checkin").leftJoin("checkin.registration", "registration").where("registration.userId = :userId", { userId: user.id }).andWhere(`registration.tenantId${tenantFilter}`, { tenantId: tenant?.id }).andWhere("checkin.revokedAt IS NULL").getCount(),
      this.reviews.createQueryBuilder("review").leftJoin("review.activity", "activity").where("review.userId = :userId", { userId: user.id }).andWhere(`activity.tenantId${tenantFilter}`, { tenantId: tenant?.id }).getCount(),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere(`o.tenantId${tenantFilter}`, { tenantId: tenant?.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").andWhere("(p.expiresAt IS NULL OR p.expiresAt > :now)", { now: new Date() }).getRawOne<{ sum: string }>()
    ]);
    profile.points = Number(pointSum?.sum || 0);
    profile.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    profile.registrationCount = registrationCount;
    profile.checkInCount = checkInCount;
    profile.reviewCount = reviewCount;
    profile.level = await this.resolveMemberLevel(profile.points, tenant);
    profile.lastActiveAt = new Date();
    return this.memberProfiles.save(profile);
  }

  private async resolveMemberLevel(points: number, tenant: Tenant | null = null) {
    const levels = await this.memberLevels.find({ where: { enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) }, order: { minPoints: "DESC" } });
    return levels.find((level) => points >= level.minPoints) || null;
  }

  private async memberAccessSnapshot(activity: Activity, user?: User) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    const priorityActive = this.isPriorityBookingActive(activity);
    if (!requiredLevel) return { requiredLevel: null, currentLevel: null, eligible: true, loginRequired: false, message: "不限会员等级", priorityActive: false, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    if (!user) {
      return { requiredLevel, currentLevel: null, eligible: false, loginRequired: true, message: "登录后可查看会员等级和报名资格", priorityActive, priorityMemberLevel: activity.priorityMemberLevel, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt };
    }
    const tenant = activity.tenant || null;
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey: memberLevelScopeKey(tenant) } });
    if (!profile) profile = await this.refreshMemberProfile(user, tenant);
    const currentLevel = profile.level || null;
    const eligible = Boolean(currentLevel && currentLevel.minPoints >= requiredLevel.minPoints);
    return {
      requiredLevel,
      currentLevel,
      eligible,
      loginRequired: false,
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

  async adminActivitySpaceAnnouncements(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    this.assertAnalyticsActivityAccess(activity, admin);
    const rows = await this.spaceAnnouncements.find({ where: { activity: { id: activityId } }, order: { pinned: "DESC", createdAt: "DESC" } });
    return rows.map((row) => ({ ...this.publicSpaceAnnouncement(row), status: row.status, updatedAt: row.updatedAt }));
  }

  async saveActivitySpaceAnnouncement(activityId: number, input: ActivitySpaceAnnouncementInput, id: number | undefined, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    this.assertAnalyticsActivityAccess(activity, admin);
    const row = id ? await this.spaceAnnouncements.findOne({ where: { id, activity: { id: activityId } } }) : this.spaceAnnouncements.create({ activity: activity!, tenant: activity!.tenant, createdByAdminId: admin?.id || null });
    if (!row) throw new NotFoundException("活动公告不存在");
    const title = String(input.title || "").trim().slice(0, 160);
    const content = String(input.content || "").trim().slice(0, 20000);
    if (!title || !content) throw new BadRequestException("请填写公告标题和内容");
    row.title = title;
    row.content = content;
    row.status = ["draft", "published", "cancelled"].includes(String(input.status)) ? input.status! : "draft";
    row.pinned = Boolean(input.pinned);
    row.publishAt = input.publishAt ? new Date(input.publishAt) : row.status === "published" ? row.publishAt || new Date() : null;
    if (row.publishAt && Number.isNaN(row.publishAt.getTime())) throw new BadRequestException("发布时间不正确");
    return this.spaceAnnouncements.save(row);
  }

  async adminActivitySpacePosts(query: { activityId?: number; status?: string; page?: number; pageSize?: number }, admin?: AdminContext) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));
    const builder = this.spacePosts.createQueryBuilder("post").leftJoinAndSelect("post.activity", "activity").leftJoinAndSelect("post.user", "user").leftJoinAndSelect("post.tenant", "tenant").orderBy("post.createdAt", "DESC");
    applyTenantScopeToQuery(builder, "activity", admin);
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    if (query.activityId) builder.andWhere("post.activityId = :activityId", { activityId: query.activityId });
    if (query.status && ["visible", "hidden", "pending"].includes(query.status)) builder.andWhere("post.status = :status", { status: query.status });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => ({ ...this.publicSpacePost(row), status: row.status, reportCount: row.reportCount, activity: { id: row.activity.id, title: row.activity.title } })), total, page, pageSize };
  }

  async moderateActivitySpacePost(id: number, input: { status?: string; adminReply?: string }, admin?: AdminContext) {
    const row = await this.spacePosts.findOne({ where: { id } });
    if (!row) throw new NotFoundException("活动问答不存在");
    this.assertAnalyticsActivityAccess(row.activity, admin);
    if (!input.status || !["visible", "hidden"].includes(input.status)) throw new BadRequestException("内容状态不正确");
    row.status = input.status as "visible" | "hidden";
    row.adminReply = String(input.adminReply || "").trim().slice(0, 500) || null;
    return this.spacePosts.save(row);
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
