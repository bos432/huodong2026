import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Repository } from "typeorm";
import { Activity } from "../../entities/activity.entity";
import { Notification } from "../../entities/notification.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { User } from "../../entities/user.entity";
import { WechatSubscriptionGrant } from "../../entities/wechat-subscription-grant.entity";
import { RegistrationStatus } from "../../shared/domain";
import { NotificationProviderService } from "../v1/notification-provider.service";
import {
  AutomaticSmsScene,
  automaticSmsScenes,
  PublishAutomaticSmsInput,
  renderAutomaticNotification
} from "./automatic-sms.service";
import { BusinessJobService } from "./business-job.service";

export type AutomaticWechatSettings = Record<AutomaticSmsScene, boolean> & {
  enabled: boolean;
  reminderBeforeHours: number;
};

export const defaultAutomaticWechatSettings: AutomaticWechatSettings = Object.freeze({
  enabled: false,
  registrationSubmitted: false,
  registrationApproved: false,
  registrationRejected: false,
  paymentSucceeded: false,
  refundSucceeded: false,
  refundRejected: false,
  activityCancelled: false,
  activityChanged: false,
  checkInSucceeded: false,
  activityReminder: false,
  reminderBeforeHours: 24
}) as AutomaticWechatSettings;

export type WechatSubscriptionAuthorization = {
  scene: string;
  templateId: string;
  status: "accepted" | "rejected" | "banned";
};

export function normalizeAutomaticWechatSettings(value: unknown): AutomaticWechatSettings {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = { ...defaultAutomaticWechatSettings };
  const truthy = (item: unknown) => item === true || item === 1 || item === "1" || item === "true";
  result.enabled = truthy(input.enabled);
  for (const scene of automaticSmsScenes) result[scene] = truthy(input[scene]);
  const reminderBeforeHours = Number(input.reminderBeforeHours);
  result.reminderBeforeHours = Number.isFinite(reminderBeforeHours) ? Math.max(1, Math.min(168, Math.round(reminderBeforeHours))) : 24;
  return result;
}

const JOB_TYPE = "automatic-wechat.deliver";
const FANOUT_JOB_TYPE = "automatic-wechat.activity-fanout";

@Injectable()
export class AutomaticWechatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomaticWechatService.name);
  private reminderTimer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(NotificationTemplate) private readonly templates: Repository<NotificationTemplate>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(WechatSubscriptionGrant) private readonly grants: Repository<WechatSubscriptionGrant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    private readonly jobs: BusinessJobService,
    private readonly provider: NotificationProviderService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    this.jobs.register(JOB_TYPE, (payload) => this.deliver(payload));
    this.jobs.register(FANOUT_JOB_TYPE, (payload) => this.deliverFanout(payload));
    if (this.config.get("AUTOMATIC_WECHAT_REMINDER_WORKER_ENABLED", "true") !== "true") return;
    const seconds = Math.max(60, Number(this.config.get("AUTOMATIC_WECHAT_REMINDER_WORKER_INTERVAL_SECONDS", 300)));
    this.reminderTimer = setInterval(() => this.scanReminders().catch((error) => this.logger.error("Automatic WeChat reminder scan failed", error)), seconds * 1000);
    this.reminderTimer.unref();
    this.startupTimer = setTimeout(() => this.scanReminders().catch((error) => this.logger.error("Automatic WeChat startup reminder scan failed", error)), 15_000);
    this.startupTimer.unref();
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
  }

  async publish(input: PublishAutomaticSmsInput) {
    try {
      return await this.enqueue(input);
    } catch (error) {
      this.logger.error(`Failed to enqueue automatic WeChat ${input.scene}:${input.businessId}`, error);
      return null;
    }
  }

  async publishForActivity(input: { scene: "activityCancelled" | "activityChanged"; activityId: number; businessId: string | number; tenantId?: number | null; variables?: Record<string, unknown> }) {
    try {
      const setting = await this.setting(input.tenantId);
      const config = normalizeAutomaticWechatSettings(setting?.automaticWechat);
      if (!config.enabled || !config[input.scene]) return null;
      return this.jobs.publish({
        tenantId: input.tenantId,
        type: FANOUT_JOB_TYPE,
        idempotencyKey: `${input.scene}:${input.businessId}`.slice(0, 120),
        payload: { ...input, businessId: String(input.businessId), variables: this.variables(input.variables) },
        maxAttempts: 5
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue automatic WeChat activity fanout ${input.scene}:${input.businessId}`, error);
      return null;
    }
  }

  async publicTemplates(tenantId?: number | null, scenes?: string[]) {
    const setting = await this.setting(tenantId);
    const automatic = normalizeAutomaticWechatSettings(setting?.automaticWechat);
    if (!automatic.enabled) return [];
    const selected = scenes?.length ? automaticSmsScenes.filter((scene) => scenes.includes(scene)) : automaticSmsScenes;
    const rows = [];
    for (const scene of selected) {
      if (!automatic[scene]) continue;
      const template = await this.template(scene, tenantId);
      if (template?.providerTemplateId) rows.push({ scene, templateId: template.providerTemplateId, page: template.page, version: template.version });
    }
    return rows;
  }

  async recordAuthorizations(user: User, tenant: { id: number } | null, input: WechatSubscriptionAuthorization[]) {
    if (!Array.isArray(input) || !input.length || input.length > 10) throw new BadRequestException("微信订阅授权结果不正确");
    const tenantId = tenant?.id || null;
    const available = await this.publicTemplates(tenantId, input.map((item) => item.scene));
    const allowed = new Map(available.map((item) => [`${item.scene}:${item.templateId}`, item]));
    const saved: WechatSubscriptionGrant[] = [];
    for (const item of input) {
      const scene = String(item?.scene || "") as AutomaticSmsScene;
      const templateId = String(item?.templateId || "").trim();
      const status = String(item?.status || "") as WechatSubscriptionAuthorization["status"];
      if (!automaticSmsScenes.includes(scene) || !templateId || !["accepted", "rejected", "banned"].includes(status)) throw new BadRequestException("微信订阅授权结果不正确");
      if (!allowed.has(`${scene}:${templateId}`)) throw new BadRequestException("微信订阅模板未启用或已变更，请刷新后重试");
      saved.push(await this.grants.save(this.grants.create({
        user,
        tenant: tenant ? ({ id: tenant.id } as any) : null,
        tenantScopeKey: tenantId ? `tenant:${tenantId}` : "platform",
        scene,
        templateId,
        status,
        source: "mp_weixin",
        acceptedAt: status === "accepted" ? new Date() : null,
        consumedAt: null,
        reservedAt: null,
        reservedBusinessKey: null,
        consumedByNotificationId: null
      })));
    }
    return {
      recorded: saved.length,
      accepted: saved.filter((row) => row.status === "accepted").length,
      rejected: saved.filter((row) => row.status === "rejected").length,
      banned: saved.filter((row) => row.status === "banned").length
    };
  }

  async authorizationSummary(userId: number, tenantId?: number | null) {
    const tenantScopeKey = tenantId ? `tenant:${tenantId}` : "platform";
    const rows = await this.grants.createQueryBuilder("grant")
      .select("grant.scene", "scene")
      .addSelect("grant.templateId", "templateId")
      .addSelect("grant.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("grant.userId = :userId", { userId })
      .andWhere("grant.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .andWhere("grant.consumedAt IS NULL")
      .groupBy("grant.scene").addGroupBy("grant.templateId").addGroupBy("grant.status")
      .getRawMany<{ scene: string; templateId: string; status: string; count: string }>();
    return rows.map((row) => ({ ...row, count: Number(row.count || 0) }));
  }

  async scanReminders(now = new Date()) {
    const settings = await this.operationSettings.find();
    let queued = 0;
    for (const setting of settings) {
      const automatic = normalizeAutomaticWechatSettings(setting.automaticWechat);
      if (!automatic.enabled || !automatic.activityReminder) continue;
      const end = new Date(now.getTime() + automatic.reminderBeforeHours * 3_600_000);
      const builder = this.registrations.createQueryBuilder("registration")
        .leftJoinAndSelect("registration.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "tenant")
        .leftJoinAndSelect("registration.user", "user")
        .where("registration.status = :status", { status: RegistrationStatus.Approved })
        .andWhere("activity.startTime > :now AND activity.startTime <= :end", { now, end });
      if (setting.tenant?.id) builder.andWhere("tenant.id = :tenantId", { tenantId: setting.tenant.id });
      else builder.andWhere("activity.tenantId IS NULL");
      for (const registration of await builder.getMany()) {
        const job = await this.publish({
          scene: "activityReminder",
          businessId: `${registration.id}:${registration.activity.startTime.toISOString()}`,
          userId: registration.user.id,
          activityId: registration.activity.id,
          tenantId: registration.tenant?.id || registration.activity.tenant?.id || null,
          variables: { startTime: this.formatDateTime(registration.activity.startTime), location: registration.activity.location }
        });
        if (job) queued += 1;
      }
    }
    return { queued };
  }

  private async enqueue(input: PublishAutomaticSmsInput) {
    const setting = await this.setting(input.tenantId);
    const automatic = normalizeAutomaticWechatSettings(setting?.automaticWechat);
    if (!automatic.enabled || !automatic[input.scene]) return null;
    const template = await this.template(input.scene, input.tenantId);
    const variables = this.variables(input.variables);
    const businessId = String(input.businessId).slice(0, 120);
    if (!template?.providerTemplateId) {
      await this.suppress(input, businessId, variables, "微信场景模板未审核通过或未配置模板 ID");
      return null;
    }
    const tenantScopeKey = input.tenantId ? `tenant:${input.tenantId}` : "platform";
    const grant = await this.grants.findOne({
      where: { user: { id: input.userId }, tenantScopeKey, scene: input.scene, templateId: template.providerTemplateId, status: "accepted", consumedAt: IsNull(), reservedBusinessKey: IsNull() },
      order: { acceptedAt: "ASC", id: "ASC" }
    });
    if (!grant) {
      await this.suppress(input, businessId, variables, "用户尚未授权该场景微信订阅消息");
      return null;
    }
    return this.jobs.publish({
      tenantId: input.tenantId,
      type: JOB_TYPE,
      idempotencyKey: `${input.scene}:${businessId}`.slice(0, 120),
      payload: { ...input, businessId, templateRecordId: template.id, variables },
      maxAttempts: 5
    });
  }

  private async deliver(raw: Record<string, unknown>) {
    const scene = String(raw.scene || "") as AutomaticSmsScene;
    if (!automaticSmsScenes.includes(scene)) throw new Error("微信自动通知场景无效");
    const userId = Number(raw.userId);
    const activityId = raw.activityId ? Number(raw.activityId) : null;
    const tenantId = raw.tenantId ? Number(raw.tenantId) : null;
    const businessId = String(raw.businessId || "").slice(0, 120);
    const templateId = Number(raw.templateRecordId);
    const variables = this.variables(raw.variables);
    const remark = `automatic_wechat:${scene}:${businessId}`.slice(0, 255);
    const tenantScopeKey = tenantId ? `tenant:${tenantId}` : "platform";
    let notification = await this.notifications.findOne({ where: { remark, tenantScopeKey } });
    if (notification?.status === "sent" || notification?.status === "suppressed") return { notificationId: notification.id, status: notification.status };
    const [setting, template, user, activity] = await Promise.all([
      this.setting(tenantId),
      this.templates.findOneBy({ id: templateId }),
      this.users.findOneBy({ id: userId }),
      activityId ? this.activities.findOneBy({ id: activityId }) : Promise.resolve(null)
    ]);
    const automatic = normalizeAutomaticWechatSettings(setting?.automaticWechat);
    if (!automatic.enabled || !automatic[scene]) return this.suppress({ scene, businessId, userId, activityId, tenantId, variables }, businessId, variables, "微信自动通知场景已关闭");
    if (!template || !template.enabled || template.approvalStatus !== "approved" || !template.providerTemplateId) throw new Error("微信场景模板不可用");
    if (!user?.openid) return this.suppress({ scene, businessId, userId, activityId, tenantId, variables }, businessId, variables, "用户未绑定微信 openid");

    const renderedDefault = renderAutomaticNotification(scene, activity, variables);
    const rendered = {
      title: this.render(template.title || renderedDefault.title, activity, variables),
      content: this.render(template.content || renderedDefault.content, activity, variables)
    };
    const data = this.wechatData(template.dataKeys, rendered, activity, variables);
    if (!notification) notification = await this.notifications.save(this.notifications.create({
      channel: "wechat", scene, tenant: setting?.tenant || activity?.tenant || null, tenantScopeKey,
      title: rendered.title, content: rendered.content, status: "pending", provider: null, providerMessageId: null,
      errorMessage: null, suppressedReason: null, variablesSnapshot: variables,
      providerTemplateId: template.providerTemplateId, templateVersion: template.version,
      deliveryOptions: { page: template.page, data }, retryCount: 0, sentAt: null, failedAt: null,
      user, activity, remark
    }));

    const reservationKey = `${scene}:${businessId}`.slice(0, 160);
    const grant = await this.reserveAvailableGrant(userId, tenantScopeKey, scene, template.providerTemplateId, reservationKey);
    const result = await this.provider.deliver({ channel: "wechat", title: rendered.title, content: rendered.content, to: { userId, openid: user.openid } }, {
      wechat: { templateId: template.providerTemplateId, page: template.page, data }
    });
    notification.status = result.status;
    notification.provider = result.provider;
    notification.providerMessageId = result.providerMessageId || null;
    notification.errorMessage = result.errorMessage || null;
    notification.retryCount += 1;
    notification.sentAt = result.status === "sent" ? new Date() : null;
    notification.failedAt = result.status === "failed" ? new Date() : null;
    notification = await this.notifications.save(notification);
    if (result.status === "sent") await this.consumeGrant(grant.id, reservationKey, notification.id);
    else {
      await this.releaseGrant(grant.id, reservationKey);
      throw new Error(result.errorMessage || "微信订阅消息发送失败");
    }
    return { notificationId: notification.id, status: "sent", providerMessageId: notification.providerMessageId };
  }

  private async deliverFanout(raw: Record<string, unknown>) {
    const scene = String(raw.scene || "") as "activityCancelled" | "activityChanged";
    if (!(["activityCancelled", "activityChanged"] as const).includes(scene)) throw new Error("微信活动通知场景无效");
    const activityId = Number(raw.activityId);
    if (!Number.isInteger(activityId) || activityId <= 0) throw new Error("微信活动通知活动无效");
    const rows = await this.registrations.find({ where: { activity: { id: activityId } } });
    const users = [...new Set(rows.filter((row) => ![RegistrationStatus.Rejected, RegistrationStatus.Cancelled].includes(row.status)).map((row) => row.user?.id).filter((id): id is number => Boolean(id)))];
    for (const userId of users) await this.enqueue({ scene, activityId, userId, tenantId: raw.tenantId ? Number(raw.tenantId) : null, businessId: `${String(raw.businessId)}:user:${userId}`, variables: this.variables(raw.variables) });
    return { queuedUsers: users.length };
  }

  private async suppress(input: PublishAutomaticSmsInput, businessId: string, variables: Record<string, string>, reason: string) {
    const tenantScopeKey = input.tenantId ? `tenant:${input.tenantId}` : "platform";
    const remark = `automatic_wechat:${input.scene}:${businessId}`.slice(0, 255);
    const existing = await this.notifications.findOne({ where: { remark, tenantScopeKey } });
    if (existing) return { notificationId: existing.id, status: existing.status };
    const [user, activity, setting] = await Promise.all([
      this.users.findOneBy({ id: input.userId }),
      input.activityId ? this.activities.findOneBy({ id: input.activityId }) : Promise.resolve(null),
      this.setting(input.tenantId)
    ]);
    const rendered = renderAutomaticNotification(input.scene, activity, variables);
    const row = await this.notifications.save(this.notifications.create({
      channel: "wechat", scene: input.scene, tenant: setting?.tenant || activity?.tenant || null, tenantScopeKey,
      title: rendered.title, content: rendered.content, status: "suppressed", provider: "automatic-wechat",
      providerMessageId: null, errorMessage: null, suppressedReason: reason, variablesSnapshot: variables,
      providerTemplateId: null, templateVersion: null, deliveryOptions: null, retryCount: 0,
      sentAt: null, failedAt: null, user, activity, remark
    }));
    return { notificationId: row.id, status: row.status, reason };
  }

  private async template(scene: AutomaticSmsScene, tenantId?: number | null) {
    if (tenantId) {
      const local = await this.templates.findOne({ where: { tenant: { id: tenantId }, channel: "wechat", scene, enabled: true, approvalStatus: "approved" }, order: { version: "DESC", id: "DESC" } });
      if (local) return local;
    }
    return this.templates.findOne({ where: { tenant: IsNull(), channel: "wechat", scene, enabled: true, approvalStatus: "approved" }, order: { version: "DESC", id: "DESC" } });
  }

  private setting(tenantId?: number | null) {
    return this.operationSettings.findOne({ where: { id: tenantId || 1 } });
  }

  private reserveAvailableGrant(userId: number, tenantScopeKey: string, scene: string, templateId: string, key: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(WechatSubscriptionGrant);
      const staleAt = new Date(Date.now() - 10 * 60_000);
      const row = await repo.createQueryBuilder("grant").setLock("pessimistic_write")
        .where("grant.userId = :userId AND grant.tenantScopeKey = :tenantScopeKey", { userId, tenantScopeKey })
        .andWhere("grant.scene = :scene AND grant.templateId = :templateId", { scene, templateId })
        .andWhere("grant.status = 'accepted' AND grant.consumedAt IS NULL")
        .andWhere("(grant.reservedBusinessKey IS NULL OR grant.reservedAt < :staleAt)", { staleAt })
        .orderBy("grant.acceptedAt", "ASC").addOrderBy("grant.id", "ASC")
        .getOne();
      if (!row) throw new Error("没有可用的微信订阅授权");
      row.reservedAt = new Date();
      row.reservedBusinessKey = key;
      return repo.save(row);
    });
  }

  private consumeGrant(id: number, key: string, notificationId: number) {
    return this.grants.createQueryBuilder().update().set({ consumedAt: new Date(), consumedByNotificationId: notificationId, reservedAt: null, reservedBusinessKey: null }).where("id = :id AND reservedBusinessKey = :key", { id, key }).execute();
  }

  private releaseGrant(id: number, key: string) {
    return this.grants.createQueryBuilder().update().set({ reservedAt: null, reservedBusinessKey: null }).where("id = :id AND reservedBusinessKey = :key AND consumedAt IS NULL", { id, key }).execute();
  }

  private variables(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key.slice(0, 80), String(item ?? "").slice(0, 500)]));
  }

  private render(text: string, activity: Activity | null, variables: Record<string, string>) {
    const values = { ...variables, activityTitle: activity?.title || variables.activityTitle || "活动", location: variables.location || activity?.location || "" };
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key as keyof typeof values] ?? ""));
  }

  private wechatData(keys: Record<string, string> | null, rendered: { title: string; content: string }, activity: Activity | null, variables: Record<string, string>) {
    const values: Record<string, string> = {
      title: rendered.title,
      content: rendered.content,
      activityTitle: activity?.title || variables.activityTitle || "活动",
      startTime: variables.startTime || (activity ? this.formatDateTime(activity.startTime) : ""),
      location: variables.location || activity?.location || "",
      orderNo: variables.orderNo || "",
      amount: variables.amount || ""
    };
    const mapping = keys && Object.keys(keys).length ? keys : { title: "thing1", content: "thing2" };
    return Object.fromEntries(Object.entries(mapping).filter(([source, key]) => values[source] && key).map(([source, key]) => [key, values[source]]));
  }

  private formatDateTime(value: Date) {
    const date = new Date(value);
    const pad = (item: number) => String(item).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
