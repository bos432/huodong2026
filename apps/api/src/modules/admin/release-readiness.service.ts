import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { IsNull, Repository } from "typeorm";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { MiniprogramReleaseLog } from "../../entities/miniprogram-release-log.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { configWithLaunchOverrides } from "../../shared/launch-config";
import { ReleaseAcceptanceFixture } from "../../entities/release-acceptance-fixture.entity";
import { ReleaseReadinessEvent } from "../../entities/release-readiness-event.entity";
import { ReleaseReadinessItem } from "../../entities/release-readiness-item.entity";
import { RELEASE_READINESS_ITEMS, nextReleaseReadinessStatus, readinessDecision, sanitizeReleaseEvidence } from "./release-readiness-state";
import { normalizeFixtureInput } from "./release-readiness-fixture-input";
import { assessReadinessConfiguration, REQUIRED_WECHAT_ACCEPTANCE_SCENES } from "./release-readiness-checks";

type ReadinessAdmin = { id?: number; username?: string; tenantId?: number | null };

@Injectable()
export class ReleaseReadinessService {
  constructor(
    @InjectRepository(ReleaseReadinessItem) private readonly items: Repository<ReleaseReadinessItem>,
    @InjectRepository(ReleaseAcceptanceFixture) private readonly fixtures: Repository<ReleaseAcceptanceFixture>,
    @InjectRepository(ReleaseReadinessEvent) private readonly events: Repository<ReleaseReadinessEvent>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(MiniprogramReleaseSetting) private readonly miniSettings: Repository<MiniprogramReleaseSetting>,
    @InjectRepository(MiniprogramReleaseLog) private readonly miniLogs: Repository<MiniprogramReleaseLog>,
    @InjectRepository(NotificationTemplate) private readonly templates: Repository<NotificationTemplate>,
    private readonly config: ConfigService
  ) {}

  private scope(admin?: ReadinessAdmin) {
    const tenantId = admin?.tenantId == null ? null : Number(admin.tenantId);
    return { tenantId, scopeKey: tenantId == null ? "platform" : `tenant:${tenantId}` };
  }

  async list(admin?: ReadinessAdmin) {
    const scope = this.scope(admin);
    await this.ensureItems(scope);
    const items = await this.items.find({ where: { scopeKey: scope.scopeKey }, order: { id: "ASC" } });
    return { scope: scope.scopeKey, items: items.map((item) => this.publicItem(item)), summary: this.summaryCounts(items), policy: this.policy() };
  }

  async summary(admin?: ReadinessAdmin) {
    const scope = this.scope(admin);
    await this.ensureItems(scope);
    const items = await this.items.find({ where: { scopeKey: scope.scopeKey } });
    return { scope: scope.scopeKey, ...this.summaryCounts(items) };
  }

  async updateItem(admin: ReadinessAdmin | undefined, key: string, body: Record<string, unknown>) {
    const item = await this.findItem(admin, key);
    const from = item.status;
    item.owner = this.text(body.owner, 120) || item.owner;
    item.reviewer = this.text(body.reviewer, 120) || item.reviewer;
    item.blockingReason = this.text(body.blockingReason, 500) || null;
    if (body.evidence && typeof body.evidence === "object" && !Array.isArray(body.evidence)) item.evidence = sanitizeReleaseEvidence(body.evidence as Record<string, unknown>);
    item.status = nextReleaseReadinessStatus(item.status as any, "save");
    await this.items.save(item);
    await this.record(admin, item, "save", from, item.status, item.blockingReason, item.evidence);
    return this.publicItem(item);
  }

  async check(admin: ReadinessAdmin | undefined, key: string) {
    const item = await this.findItem(admin, key);
    const from = item.status;
    const assessment = await this.assessConfiguration(item.itemKey, admin);
    item.status = assessment.configured ? nextReleaseReadinessStatus(item.status as any, "check") : "unconfigured";
    item.lastCheckedAt = new Date();
    item.blockingReason = assessment.configured
      ? "配置已核对；仍需完成并提交外部验收证据，配置检查或体验版上传不会自动通过验收。"
      : assessment.blockers.join("；");
    await this.items.save(item);
    await this.record(admin, item, "check", from, item.status, item.blockingReason, null);
    return { ...this.publicItem(item), check: { configured: assessment.configured, requiresExternalEvidence: assessment.requiresExternalEvidence, blockers: assessment.blockers } };
  }

  private async assessConfiguration(key: string, admin?: ReadinessAdmin) {
    const scope = this.scope(admin);
    if (key === "test_fixtures") {
      const fixtures = await this.fixtures.find({ where: { scopeKey: scope.scopeKey } });
      return assessReadinessConfiguration(key, fixtures);
    }
    if (key === "miniprogram_acceptance") {
      const setting = await this.miniSettings.findOne({ where: {}, order: { id: "ASC" } });
      const upload = setting?.appId && setting.version
        ? await this.miniLogs.findOne({ where: { action: "upload", status: "success", appId: setting.appId, version: setting.version }, order: { createdAt: "DESC" } })
        : null;
      return assessReadinessConfiguration(key, { appId: setting?.appId, version: setting?.version, uploadedVersion: upload?.version, successfulUpload: Boolean(upload) });
    }

    const platformSetting = await this.operationSettings.findOne({ where: { tenant: IsNull() } })
      || await this.operationSettings.findOne({ where: { id: 1 } });
    const scopedSetting = scope.tenantId == null
      ? platformSetting
      : await this.operationSettings.findOne({ where: { tenant: { id: scope.tenantId } as any } });
    const runtime = configWithLaunchOverrides(this.config, platformSetting?.launchConfig || null);

    if (key === "payment_config" || key === "payment_callbacks") {
      const read = (field: string, env: string) => runtime.get(env, (platformSetting?.launchConfig as any)?.[field] || "");
      const snapshot = {
        paymentAppId: read("wechatPayAppId", "WECHAT_PAY_APP_ID"),
        merchantId: read("wechatPayMchId", "WECHAT_PAY_MCH_ID"),
        apiV3Key: read("wechatPayApiV3Key", "WECHAT_PAY_API_V3_KEY"),
        privateKeyConfigured: this.credentialExists(read("wechatPayPrivateKeyPath", "WECHAT_PAY_PRIVATE_KEY_PATH")),
        certificateSerial: read("wechatPayCertSerialNo", "WECHAT_PAY_CERT_SERIAL_NO"),
        platformCertificateConfigured: this.credentialExists(read("wechatPayPlatformCertPath", "WECHAT_PAY_PLATFORM_CERT_PATH")),
        paymentNotifyUrl: read("wechatPayNotifyUrl", "WECHAT_PAY_NOTIFY_URL"),
        refundNotifyUrl: read("mallWechatPayRefundNotifyUrl", "MALL_WECHAT_PAY_REFUND_NOTIFY_URL") || read("mallWechatPayNotifyUrl", "MALL_WECHAT_PAY_NOTIFY_URL")
      };
      return assessReadinessConfiguration(key, snapshot);
    }

    if (key === "sms") {
      const setting = scopedSetting || platformSetting;
      const enabled = Boolean(setting?.smsProviderEnabled) || runtime.get("SMS_PROVIDER_ENABLED", "false") === "true";
      return assessReadinessConfiguration(key, {
        smsEnabled: enabled,
        smsProvider: setting?.smsProvider || runtime.get("SMS_PROVIDER", ""),
        smsSecret: setting?.smsAccessKeySecret || runtime.get("SMS_ACCESS_KEY_SECRET", ""),
        smsAccessKeyId: setting?.smsAccessKeyId || runtime.get("SMS_ACCESS_KEY_ID", ""),
        smsSign: setting?.smsSignName || runtime.get("SMS_SIGN_NAME", ""),
        smsTemplateId: setting?.smsTemplateId || runtime.get("SMS_TEMPLATE_ID", ""),
        smsSdkAppId: setting?.smsSdkAppId || runtime.get("SMS_SDK_APP_ID", "")
      });
    }

    if (key === "wechat_subscription") {
      const templateWhere = { channel: "wechat", enabled: true, approvalStatus: "approved" } as const;
      const templateRows = await this.templates.find({
        where: scope.tenantId == null
          ? { ...templateWhere, tenant: IsNull() }
          : [{ ...templateWhere, tenant: { id: scope.tenantId } as any }, { ...templateWhere, tenant: IsNull() }]
      });
      const automaticWechat = ((scopedSetting || platformSetting)?.automaticWechat || {}) as Record<string, unknown>;
      const enabledScenes = REQUIRED_WECHAT_ACCEPTANCE_SCENES.filter((scene) => [true, 1, "1", "true"].includes(automaticWechat[scene] as any));
      return assessReadinessConfiguration(key, {
        providerEnabled: runtime.get("WECHAT_MESSAGE_PROVIDER_ENABLED", "false") === "true",
        automaticEnabled: [true, 1, "1", "true"].includes(automaticWechat.enabled as any),
        provider: runtime.get("WECHAT_MESSAGE_PROVIDER", ""),
        wechatAppId: runtime.get("WECHAT_APP_ID", ""),
        wechatAppSecret: runtime.get("WECHAT_APP_SECRET", ""),
        activeTemplateScenes: templateRows.filter((template) => Boolean(template.providerTemplateId?.trim()) && Boolean(template.scene)).map((template) => template.scene),
        enabledScenes
      });
    }

    return assessReadinessConfiguration(key, {});
  }

  private credentialExists(value: unknown) {
    const path = typeof value === "string" ? value.trim() : "";
    if (!path) return false;
    if (path.startsWith("secure-credential://")) {
      const id = path.slice("secure-credential://".length);
      if (!/^[a-zA-Z0-9._-]+$/.test(id)) return false;
      const root = resolve(this.config.get<string>("PRIVATE_CREDENTIAL_DIR", join("private-data", "payment-credentials")));
      return existsSync(join(root, id));
    }
    return existsSync(isAbsolute(path) ? path : resolve(path));
  }

  async verify(admin: ReadinessAdmin | undefined, key: string, body: Record<string, unknown>) {
    const item = await this.findItem(admin, key);
    if (body.confirmation !== "EXTERNAL_ACCEPTANCE_CONFIRMED") throw new BadRequestException("请输入 EXTERNAL_ACCEPTANCE_CONFIRMED 才能确认外部验收");
    if (!body.evidence || typeof body.evidence !== "object" || Array.isArray(body.evidence)) throw new BadRequestException("必须提供外部验收证据摘要");
    const assessment = await this.assessConfiguration(item.itemKey, admin);
    if (!assessment.configured) throw new BadRequestException(`当前配置未通过检查：${assessment.blockers.join("；")}`);
    const evidence = sanitizeReleaseEvidence(body.evidence as Record<string, unknown>);
    if (typeof evidence.summary !== "string" || !evidence.summary.trim()) throw new BadRequestException("脱敏证据摘要不能为空");
    const from = item.status;
    item.status = nextReleaseReadinessStatus(item.status as any, "verify");
    item.reviewer = this.text(body.reviewer, 120) || item.reviewer || admin?.username || null;
    item.blockingReason = null;
    item.evidence = evidence;
    item.lastCheckedAt = new Date();
    await this.items.save(item);
    await this.record(admin, item, "verify", from, item.status, null, item.evidence);
    return this.publicItem(item);
  }

  async block(admin: ReadinessAdmin | undefined, key: string, body: Record<string, unknown>) {
    const item = await this.findItem(admin, key);
    const reason = this.text(body.reason, 500);
    if (!reason) throw new BadRequestException("阻塞时必须填写原因");
    const from = item.status;
    item.status = nextReleaseReadinessStatus(item.status as any, "block");
    item.blockingReason = reason;
    await this.items.save(item);
    await this.record(admin, item, "block", from, item.status, reason, null);
    return this.publicItem(item);
  }

  async eventList(admin?: ReadinessAdmin) {
    const scope = this.scope(admin);
    return (await this.events.find({ where: { scopeKey: scope.scopeKey }, order: { createdAt: "DESC" }, take: 100 })).map((event) => ({ ...event, evidence: event.evidence || null }));
  }

  async fixtureList(admin?: ReadinessAdmin) {
    const scope = this.scope(admin);
    return this.fixtures.find({ where: { scopeKey: scope.scopeKey }, order: { updatedAt: "DESC" } });
  }

  async createFixture(admin: ReadinessAdmin | undefined, body: Record<string, unknown>) {
    const scope = this.scope(admin);
    let input: ReturnType<typeof normalizeFixtureInput>;
    try { input = normalizeFixtureInput(body); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "测试夹具参数无效"); }
    const { kind, label, maskedIdentifier, status, notes } = input;
    const existing = await this.fixtures.findOne({ where: { scopeKey: scope.scopeKey, kind, maskedIdentifier } });
    const row = existing || this.fixtures.create({ scopeKey: scope.scopeKey, kind, maskedIdentifier } as Partial<ReleaseAcceptanceFixture>);
    row.label = label;
    row.status = status || row.status || "planned";
    row.notes = notes || null;
    row.evidence = body.evidence && typeof body.evidence === "object" && !Array.isArray(body.evidence) ? sanitizeReleaseEvidence(body.evidence as Record<string, unknown>) : row.evidence;
    row.updatedBy = admin?.username || null;
    return this.fixtures.save(row);
  }

  private async findItem(admin: ReadinessAdmin | undefined, key: string) {
    const scope = this.scope(admin);
    await this.ensureItems(scope);
    const item = await this.items.findOne({ where: { scopeKey: scope.scopeKey, itemKey: key } });
    if (!item) throw new NotFoundException("未找到上线验收项");
    return item;
  }

  private async ensureItems(scope: { scopeKey: string; tenantId: number | null }) {
    const existing = await this.items.find({ where: { scopeKey: scope.scopeKey } });
    const known = new Set(existing.map((item) => item.itemKey));
    const missing = RELEASE_READINESS_ITEMS.filter((item) => !known.has(item.key)).map((item) => this.items.create({ scopeKey: scope.scopeKey, tenantId: scope.tenantId, itemKey: item.key, category: item.category, label: item.label, status: "unconfigured", evidence: null } as Partial<ReleaseReadinessItem>));
    if (missing.length) await this.items.save(missing);
  }

  private async record(admin: ReadinessAdmin | undefined, item: ReleaseReadinessItem, action: string, fromStatus: string, toStatus: string, reason: string | null, evidence: Record<string, unknown> | null) {
    await this.events.save(this.events.create({ scopeKey: item.scopeKey, itemKey: item.itemKey, action, fromStatus, toStatus, actorId: admin?.id || null, actorUsername: admin?.username || null, reason, evidence } as Partial<ReleaseReadinessEvent>));
  }

  private publicItem(item: ReleaseReadinessItem) {
    return { id: item.id, key: item.itemKey, category: item.category, label: item.label, status: item.status, owner: item.owner, reviewer: item.reviewer, blockingReason: item.blockingReason, evidence: item.evidence, lastCheckedAt: item.lastCheckedAt, expiresAt: item.expiresAt, updatedAt: item.updatedAt };
  }

  private summaryCounts(items: ReleaseReadinessItem[]) {
    const counts = { total: items.length, unconfigured: items.filter((item) => item.status === "unconfigured").length, configured: items.filter((item) => item.status === "configured").length, externalPending: items.filter((item) => item.status === "external_pending").length, accepted: items.filter((item) => item.status === "accepted").length, blocked: items.filter((item) => item.status === "blocked").length, expired: items.filter((item) => item.status === "expired").length };
    return { ...counts, ...readinessDecision(items.map((item) => ({ itemKey: item.itemKey, label: item.label, status: item.status }))) };
  }

  private policy() {
    return { configurationDoesNotEqualAcceptance: true, realActionsAreExternal: true, secretStorage: "沿用现有加密配置，不在验收中心保存支付/短信密钥" };
  }

  private text(value: unknown, max: number) { const text = typeof value === "string" ? value.trim() : ""; return text.slice(0, max); }
}
