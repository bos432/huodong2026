import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Activity } from "../../entities/activity.entity";
import { NotificationPreference } from "../../entities/notification-preference.entity";
import { Notification } from "../../entities/notification.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { User } from "../../entities/user.entity";
import { RegistrationStatus } from "../../shared/domain";
import { decryptStoredSecret } from "../../shared/secret-storage";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { BusinessJobService } from "./business-job.service";

export const automaticSmsScenes = [
  "registrationSubmitted",
  "registrationApproved",
  "registrationRejected",
  "paymentSucceeded",
  "refundSucceeded",
  "refundRejected",
  "activityCancelled",
  "activityChanged",
  "checkInSucceeded",
  "activityReminder"
] as const;

export type AutomaticSmsScene = typeof automaticSmsScenes[number];
export type AutomaticSmsSettings = Record<AutomaticSmsScene, boolean> & {
  enabled: boolean;
  reminderBeforeHours: number;
};

export const defaultAutomaticSmsSettings: AutomaticSmsSettings = {
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
};

export function normalizeAutomaticSmsSettings(value: unknown): AutomaticSmsSettings {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = { ...defaultAutomaticSmsSettings };
  result.enabled = input.enabled === true || input.enabled === 1 || input.enabled === "1" || input.enabled === "true";
  for (const scene of automaticSmsScenes) {
    result[scene] = input[scene] === true || input[scene] === 1 || input[scene] === "1" || input[scene] === "true";
  }
  const reminderBeforeHours = Number(input.reminderBeforeHours);
  result.reminderBeforeHours = Number.isFinite(reminderBeforeHours) ? Math.max(1, Math.min(168, Math.round(reminderBeforeHours))) : 24;
  return result;
}

type PublishAutomaticSmsInput = {
  scene: AutomaticSmsScene;
  businessId: string | number;
  userId: number;
  activityId?: number | null;
  tenantId?: number | null;
  variables?: Record<string, unknown>;
};

type AutomaticSmsPayload = {
  scene: AutomaticSmsScene;
  businessId: string;
  userId: number;
  activityId: number | null;
  tenantId: number | null;
  variables: Record<string, string>;
};

const JOB_TYPE = "automatic-sms.deliver";
const ACTIVITY_FANOUT_JOB_TYPE = "automatic-sms.activity-fanout";

@Injectable()
export class AutomaticSmsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomaticSmsService.name);
  private reminderTimer: NodeJS.Timeout | null = null;
  private reminderStartupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(NotificationPreference) private readonly notificationPreferences: Repository<NotificationPreference>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    private readonly businessJobs: BusinessJobService,
    private readonly notificationProvider: NotificationProviderService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    this.businessJobs.register(JOB_TYPE, (payload) => this.deliver(payload));
    this.businessJobs.register(ACTIVITY_FANOUT_JOB_TYPE, (payload) => this.deliverActivityFanout(payload));
    if (this.config.get("AUTOMATIC_SMS_REMINDER_WORKER_ENABLED", "true") !== "true") return;
    const intervalSeconds = Math.max(60, Number(this.config.get("AUTOMATIC_SMS_REMINDER_WORKER_INTERVAL_SECONDS", 300)));
    this.reminderTimer = setInterval(() => this.scanActivityReminders().catch((error) => this.logger.error("Automatic SMS reminder scan failed", error)), intervalSeconds * 1000);
    this.reminderTimer.unref();
    this.reminderStartupTimer = setTimeout(() => this.scanActivityReminders().catch((error) => this.logger.error("Automatic SMS startup reminder scan failed", error)), 10_000);
    this.reminderStartupTimer.unref();
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
    if (this.reminderStartupTimer) clearTimeout(this.reminderStartupTimer);
  }

  async publish(input: PublishAutomaticSmsInput) {
    try {
      return await this.enqueue(input);
    } catch (error) {
      this.logger.error(`Failed to enqueue automatic SMS ${input.scene}:${input.businessId}`, error);
      return null;
    }
  }

  private async enqueue(input: PublishAutomaticSmsInput) {
    const setting = await this.setting(input.tenantId);
    const automaticSms = normalizeAutomaticSmsSettings(setting?.automaticSms);
    if (!setting?.smsProviderEnabled || !automaticSms.enabled || !automaticSms[input.scene]) return null;
    const payload: AutomaticSmsPayload = {
      scene: input.scene,
      businessId: String(input.businessId).slice(0, 120),
      userId: Number(input.userId),
      activityId: input.activityId ? Number(input.activityId) : null,
      tenantId: input.tenantId ? Number(input.tenantId) : null,
      variables: this.normalizeVariables(input.variables)
    };
    return this.businessJobs.publish({
      tenantId: payload.tenantId,
      type: JOB_TYPE,
      idempotencyKey: `${payload.scene}:${payload.businessId}`.slice(0, 120),
      payload,
      maxAttempts: 5
    });
  }

  async publishForActivity(input: { scene: "activityCancelled" | "activityChanged"; activityId: number; businessId: string | number; tenantId?: number | null; variables?: Record<string, unknown> }) {
    try {
      const setting = await this.setting(input.tenantId);
      const automaticSms = normalizeAutomaticSmsSettings(setting?.automaticSms);
      if (!setting?.smsProviderEnabled || !automaticSms.enabled || !automaticSms[input.scene]) return { queuedUsers: 0 };
      const job = await this.businessJobs.publish({
        tenantId: input.tenantId,
        type: ACTIVITY_FANOUT_JOB_TYPE,
        idempotencyKey: `${input.scene}:${input.businessId}`.slice(0, 120),
        payload: { ...input, businessId: String(input.businessId), variables: this.normalizeVariables(input.variables) },
        maxAttempts: 5
      });
      return { queuedUsers: 0, fanoutJobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to enqueue activity SMS ${input.scene}:${input.businessId}`, error);
      return { queuedUsers: 0 };
    }
  }

  async scanActivityReminders(now = new Date()) {
    const settings = await this.operationSettings.find();
    let queued = 0;
    for (const setting of settings) {
      const automaticSms = normalizeAutomaticSmsSettings(setting.automaticSms);
      if (!setting.smsProviderEnabled || !automaticSms.enabled || !automaticSms.activityReminder) continue;
      const end = new Date(now.getTime() + automaticSms.reminderBeforeHours * 60 * 60 * 1000);
      const builder = this.registrations.createQueryBuilder("registration")
        .leftJoinAndSelect("registration.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "tenant")
        .leftJoinAndSelect("registration.user", "user")
        .where("registration.status = :status", { status: RegistrationStatus.Approved })
        .andWhere("activity.startTime > :now AND activity.startTime <= :end", { now, end })
        .orderBy("activity.startTime", "ASC")
        .addOrderBy("registration.id", "ASC");
      if (setting.tenant?.id) builder.andWhere("tenant.id = :tenantId", { tenantId: setting.tenant.id });
      else builder.andWhere("activity.tenantId IS NULL");
      const registrations = await builder.getMany();
      for (const registration of registrations) {
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

  private async deliverActivityFanout(rawPayload: Record<string, unknown>) {
    const scene = String(rawPayload.scene || "") as "activityCancelled" | "activityChanged";
    if (!(["activityCancelled", "activityChanged"] as const).includes(scene)) throw new Error("活动自动短信场景无效");
    const activityId = Number(rawPayload.activityId);
    if (!Number.isInteger(activityId) || activityId <= 0) throw new Error("活动自动短信活动无效");
    const tenantId = rawPayload.tenantId ? Number(rawPayload.tenantId) : null;
    const businessId = String(rawPayload.businessId || "");
    const variables = this.normalizeVariables(rawPayload.variables);
    const rows = await this.registrations.find({ where: { activity: { id: activityId } } });
    const userIds = [...new Set(rows.filter((row) => row.status !== RegistrationStatus.Rejected).map((row) => row.user?.id).filter((id): id is number => Boolean(id)))];
    for (const userId of userIds) {
      await this.enqueue({ scene, businessId: `${businessId}:user:${userId}`, userId, activityId, tenantId, variables });
    }
    return { queuedUsers: userIds.length };
  }

  private async deliver(rawPayload: Record<string, unknown>) {
    const payload = this.payload(rawPayload);
    const remark = `automatic_sms:${payload.scene}:${payload.businessId}`.slice(0, 255);
    const tenantScopeKey = payload.tenantId ? `tenant:${payload.tenantId}` : "platform";
    let notification = await this.notifications.findOne({ where: { remark, tenantScopeKey } });
    if (notification?.status === "sent" || notification?.status === "suppressed") return { notificationId: notification.id, status: notification.status };

    const [setting, user, activity] = await Promise.all([
      this.setting(payload.tenantId),
      this.users.findOneBy({ id: payload.userId }),
      payload.activityId ? this.activities.findOneBy({ id: payload.activityId }) : Promise.resolve(null)
    ]);
    if (!user) return { status: "suppressed", reason: "用户不存在" };
    const automaticSms = normalizeAutomaticSmsSettings(setting?.automaticSms);
    const suppressionReason = !setting?.smsProviderEnabled || !automaticSms.enabled || !automaticSms[payload.scene]
      ? "自动短信场景已关闭"
      : setting.smsProvider !== "luosimao-sms"
        ? "自动业务短信当前仅支持螺丝帽通道"
      : !user.phone
        ? "用户未绑定手机号"
        : await this.unsubscribedReason(user.id, tenantScopeKey);
    const rendered = this.render(payload.scene, activity, payload.variables);

    if (!notification) {
      notification = await this.notifications.save(this.notifications.create({
        channel: "sms",
        tenant: setting?.tenant || activity?.tenant || null,
        tenantScopeKey,
        title: rendered.title,
        content: rendered.content,
        status: suppressionReason ? "suppressed" : "pending",
        provider: suppressionReason ? "automatic-sms" : null,
        providerMessageId: null,
        errorMessage: null,
        suppressedReason: suppressionReason,
        variablesSnapshot: payload.variables,
        retryCount: 0,
        sentAt: null,
        failedAt: null,
        user,
        activity,
        remark
      }));
    }
    if (suppressionReason) {
      notification.status = "suppressed";
      notification.suppressedReason = suppressionReason;
      await this.notifications.save(notification);
      return { notificationId: notification.id, status: "suppressed", reason: suppressionReason };
    }

    const result = await this.notificationProvider.deliver({
      channel: "sms",
      title: rendered.title,
      content: rendered.content,
      to: { userId: user.id, phone: user.phone }
    }, { sms: {
      enabled: setting!.smsProviderEnabled,
      provider: setting!.smsProvider,
      accessKeyId: setting!.smsAccessKeyId,
      accessKeySecret: decryptStoredSecret(setting!.smsAccessKeySecret),
      signName: setting!.smsSignName,
      templateId: setting!.smsTemplateId,
      appId: setting!.smsSdkAppId
    } });
    notification.status = result.status;
    notification.provider = result.provider;
    notification.providerMessageId = result.providerMessageId || null;
    notification.errorMessage = result.errorMessage || null;
    notification.retryCount += 1;
    notification.sentAt = result.status === "sent" ? new Date() : null;
    notification.failedAt = result.status === "failed" ? new Date() : null;
    await this.notifications.save(notification);
    if (result.status === "failed") throw new Error(result.errorMessage || "自动短信发送失败");
    return { notificationId: notification.id, status: "sent", provider: result.provider, providerMessageId: result.providerMessageId || null };
  }

  private setting(tenantId?: number | null) {
    return this.operationSettings.findOne({ where: { id: tenantId || 1 } });
  }

  private async unsubscribedReason(userId: number, tenantScopeKey: string) {
    const preference = await this.notificationPreferences.findOne({ where: { user: { id: userId }, tenantScopeKey, channel: "sms" } });
    return preference && !preference.subscribed ? preference.reason || "用户已退订短信通知" : null;
  }

  private payload(value: Record<string, unknown>): AutomaticSmsPayload {
    const scene = String(value.scene || "") as AutomaticSmsScene;
    if (!automaticSmsScenes.includes(scene)) throw new Error("自动短信场景无效");
    const userId = Number(value.userId);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error("自动短信用户无效");
    return {
      scene,
      businessId: String(value.businessId || "").slice(0, 120),
      userId,
      activityId: value.activityId ? Number(value.activityId) : null,
      tenantId: value.tenantId ? Number(value.tenantId) : null,
      variables: this.normalizeVariables(value.variables)
    };
  }

  private normalizeVariables(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key.slice(0, 80), String(item ?? "").slice(0, 500)]));
  }

  private render(scene: AutomaticSmsScene, activity: Activity | null, variables: Record<string, string>) {
    const activityTitle = activity?.title || variables.activityTitle || "活动";
    const orderNo = variables.orderNo || "-";
    const amount = variables.amount || "0.00";
    const templates: Record<AutomaticSmsScene, { title: string; content: string }> = {
      registrationSubmitted: { title: "报名已提交", content: `您报名的活动${activityTitle}已提交，请留意审核和支付状态。` },
      registrationApproved: { title: "报名审核通过", content: `您报名的活动${activityTitle}已审核通过，请按时参加。` },
      registrationRejected: { title: "报名审核结果", content: `您报名的活动${activityTitle}未通过审核，请登录查看详情。` },
      paymentSucceeded: { title: "支付成功", content: `活动${activityTitle}订单${orderNo}已支付成功，金额${amount}元。` },
      refundSucceeded: { title: "退款完成", content: `活动${activityTitle}订单${orderNo}退款${amount}元已处理完成。` },
      refundRejected: { title: "退款审核结果", content: `活动${activityTitle}订单${orderNo}退款申请未通过，请登录查看详情。` },
      activityCancelled: { title: "活动取消", content: `活动${activityTitle}已取消，原因${variables.reason || "以平台通知为准"}。` },
      activityChanged: { title: "活动安排变更", content: `活动${activityTitle}的时间或地点已调整，请登录查看最新安排。` },
      checkInSucceeded: { title: "签到成功", content: `您已完成活动${activityTitle}签到，感谢参与。` },
      activityReminder: { title: "活动开始提醒", content: `您报名的活动${activityTitle}将于${variables.startTime || "近期"}开始，地点${variables.location || activity?.location || "以活动详情为准"}。` }
    };
    return templates[scene];
  }

  private formatDateTime(value: Date) {
    const date = new Date(value);
    const pad = (item: number) => String(item).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
