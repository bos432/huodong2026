import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, Not, Repository } from "typeorm";
import { ActivityReview } from "../../entities/activity-review.entity";
import { Activity } from "../../entities/activity.entity";
import { Certificate } from "../../entities/certificate.entity";
import { Notification } from "../../entities/notification.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { ActivityStatus, RegistrationStatus } from "../../shared/domain";
import { BusinessJobService } from "./business-job.service";

export type PostEventAutomationSettings = {
  enabled: boolean;
  reviewInvitation: boolean;
  certificateAvailable: boolean;
  activityRecommendations: boolean;
  delayHours: number;
};

export const defaultPostEventAutomationSettings: PostEventAutomationSettings = {
  enabled: false,
  reviewInvitation: false,
  certificateAvailable: false,
  activityRecommendations: false,
  delayHours: 2
};

export function normalizePostEventAutomationSettings(value: unknown): PostEventAutomationSettings {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const truthy = (item: unknown) => item === true || item === 1 || item === "1" || item === "true";
  const delayHours = Number(input.delayHours);
  return {
    enabled: truthy(input.enabled),
    reviewInvitation: truthy(input.reviewInvitation),
    certificateAvailable: truthy(input.certificateAvailable),
    activityRecommendations: truthy(input.activityRecommendations),
    delayHours: Number.isFinite(delayHours) ? Math.max(0, Math.min(168, Math.round(delayHours))) : 2
  };
}

type PostEventScene = "reviewInvitation" | "certificateAvailable" | "activityRecommendations";
const JOB_TYPE = "post-event.notification";

@Injectable()
export class PostEventAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostEventAutomationService.name);
  private timer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(OperationSetting) private readonly settings: Repository<OperationSetting>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityReview) private readonly reviews: Repository<ActivityReview>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    private readonly jobs: BusinessJobService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    this.jobs.register(JOB_TYPE, (payload) => this.deliver(payload));
    if (this.config.get("POST_EVENT_AUTOMATION_WORKER_ENABLED", "true") !== "true") return;
    const seconds = Math.max(300, Number(this.config.get("POST_EVENT_AUTOMATION_WORKER_INTERVAL_SECONDS", 900)));
    this.timer = setInterval(() => this.scan().catch((error) => this.logger.error("Post-event automation scan failed", error)), seconds * 1000);
    this.timer.unref();
    this.startupTimer = setTimeout(() => this.scan().catch((error) => this.logger.error("Post-event startup scan failed", error)), 20_000);
    this.startupTimer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
  }

  async scan(now = new Date()) {
    const settings = await this.settings.find();
    let queued = 0;
    for (const setting of settings) {
      const automation = normalizePostEventAutomationSettings(setting.postEventAutomation);
      if (!automation.enabled) continue;
      const tenantId = setting.tenant?.id || null;
      const cutoff = new Date(now.getTime() - automation.delayHours * 3_600_000);
      if (automation.reviewInvitation || automation.activityRecommendations) {
        const builder = this.registrations.createQueryBuilder("registration")
          .leftJoinAndSelect("registration.activity", "activity")
          .leftJoinAndSelect("activity.tenant", "tenant")
          .leftJoinAndSelect("registration.user", "user")
          .where("registration.status = :status", { status: RegistrationStatus.CheckedIn })
          .andWhere("activity.endTime <= :cutoff", { cutoff })
          .andWhere("activity.status <> :cancelled", { cancelled: ActivityStatus.Cancelled })
          .orderBy("activity.endTime", "DESC").take(500);
        tenantId ? builder.andWhere("activity.tenantId = :tenantId", { tenantId }) : builder.andWhere("activity.tenantId IS NULL");
        for (const registration of await builder.getMany()) {
          if (automation.reviewInvitation && !(await this.reviews.exist({ where: { registration: { id: registration.id } } }))) {
            if (await this.enqueue("reviewInvitation", registration.user.id, tenantId, registration.activity.id, `registration:${registration.id}`, { registrationId: registration.id })) queued += 1;
          }
          if (automation.activityRecommendations) {
            if (await this.enqueue("activityRecommendations", registration.user.id, tenantId, registration.activity.id, `activity:${registration.activity.id}:user:${registration.user.id}`)) queued += 1;
          }
        }
      }
      if (automation.certificateAvailable) {
        const certificates = await this.certificates.find({ where: { tenantId: tenantId ?? IsNull(), status: "active", certificateNo: Not(IsNull()) }, loadEagerRelations: false, order: { issuedAt: "DESC" }, take: 500 });
        for (const certificate of certificates) {
          if (await this.enqueue("certificateAvailable", certificate.userId, tenantId, null, `certificate:${certificate.id}`, { certificateId: certificate.id, certificateName: certificate.name })) queued += 1;
        }
      }
    }
    return { queued };
  }

  private async enqueue(scene: PostEventScene, userId: number, tenantId: number | null, activityId: number | null, businessId: string, variables: Record<string, unknown> = {}) {
    const existing = await this.notifications.findOne({ where: { tenantScopeKey: tenantId ? `tenant:${tenantId}` : "platform", remark: `post_event:${scene}:${businessId}` } });
    if (existing) return null;
    return this.jobs.publish({ tenantId, type: JOB_TYPE, idempotencyKey: `${scene}:${businessId}`.slice(0, 120), payload: { scene, userId, tenantId, activityId, businessId, variables }, maxAttempts: 5 });
  }

  private async deliver(payload: Record<string, unknown>) {
    const scene = String(payload.scene || "") as PostEventScene;
    if (!(["reviewInvitation", "certificateAvailable", "activityRecommendations"] as const).includes(scene)) throw new Error("活动结束运营场景无效");
    const userId = Number(payload.userId);
    const tenantId = payload.tenantId ? Number(payload.tenantId) : null;
    const activityId = payload.activityId ? Number(payload.activityId) : null;
    const businessId = String(payload.businessId || "");
    const tenantScopeKey = tenantId ? `tenant:${tenantId}` : "platform";
    const remark = `post_event:${scene}:${businessId}`.slice(0, 255);
    const existing = await this.notifications.findOne({ where: { tenantScopeKey, remark } });
    if (existing) return { notificationId: existing.id, status: existing.status };
    const [setting, registrationActivity] = await Promise.all([
      this.settings.findOne({ where: { id: tenantId || 1 } }),
      activityId ? this.activities.findOneBy({ id: activityId }) : Promise.resolve(null)
    ]);
    const automation = normalizePostEventAutomationSettings(setting?.postEventAutomation);
    if (!automation.enabled || !automation[scene]) return { status: "suppressed", reason: "活动结束自动运营场景已关闭" };
    const message = await this.message(scene, userId, tenantId, registrationActivity, payload.variables as Record<string, unknown> || {});
    if (!message) return { status: "suppressed", reason: "当前没有可发送的运营内容" };
    const row = await this.notifications.save(this.notifications.create({
      channel: "site", scene, tenant: setting?.tenant || registrationActivity?.tenant || null, tenantScopeKey,
      title: message.title, content: message.content, status: "sent", provider: "site", providerMessageId: null,
      errorMessage: null, suppressedReason: null, variablesSnapshot: message.variables,
      providerTemplateId: null, templateVersion: null, deliveryOptions: { page: message.page }, retryCount: 0,
      sentAt: new Date(), failedAt: null, user: { id: userId } as any, activity: registrationActivity, remark
    }));
    return { notificationId: row.id, status: row.status };
  }

  private async message(scene: PostEventScene, userId: number, tenantId: number | null, activity: Activity | null, variables: Record<string, unknown>) {
    if (scene === "reviewInvitation" && activity) return {
      title: "邀请评价活动",
      content: `活动「${activity.title}」已结束，欢迎分享真实体验，帮助主办方持续改进。`,
      page: `pages/user/review?id=${String(variables.registrationId || "")}`,
      variables: { activityTitle: activity.title }
    };
    if (scene === "certificateAvailable") return {
      title: "证书已可领取",
      content: `您的${String(variables.certificateName || "活动证书")}已生成，可前往“我的证书”查看和验真。`,
      page: "pages/user/certificates",
      variables: { certificateId: String(variables.certificateId || "") }
    };
    if (scene === "activityRecommendations" && activity) {
      const builder = this.activities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant")
        .where("activity.startTime > :now", { now: new Date() })
        .andWhere("activity.status = :status", { status: ActivityStatus.Open })
        .andWhere("activity.id <> :activityId", { activityId: activity.id })
        .orderBy("activity.featured", "DESC").addOrderBy("activity.startTime", "ASC").take(3);
      tenantId ? builder.andWhere("activity.tenantId = :tenantId", { tenantId }) : builder.andWhere("activity.tenantId IS NULL");
      if (activity.category?.id) builder.andWhere("activity.categoryId = :categoryId", { categoryId: activity.category.id });
      const recommended = await builder.getMany();
      if (!recommended.length) return null;
      return {
        title: "为你推荐后续活动",
        content: `根据你参加的「${activity.title}」，推荐：${recommended.map((row) => row.title).join("、")}。`,
        page: "pages/activity/list",
        variables: { activityIds: recommended.map((row) => row.id).join(","), userId: String(userId) }
      };
    }
    return null;
  }
}
