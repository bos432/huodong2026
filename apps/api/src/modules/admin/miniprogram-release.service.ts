import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { Repository } from "typeorm";
import { MiniprogramReleaseLog } from "../../entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { MiniprogramReleaseSettingDto, MiniprogramReleaseVersionDto } from "./dto";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type ReleaseAction = "upload" | "submit_audit" | "audit_status" | "release";
type ReleaseStatus = "success" | "failed" | "processing";

@Injectable()
export class MiniprogramReleaseService {
  constructor(
    @InjectRepository(MiniprogramReleaseSetting) private readonly settings: Repository<MiniprogramReleaseSetting>,
    @InjectRepository(MiniprogramReleaseLog) private readonly logs: Repository<MiniprogramReleaseLog>,
    private readonly config: ConfigService
  ) {}

  async getSetting() {
    return this.publicSetting(await this.currentSetting());
  }

  async saveSetting(dto: MiniprogramReleaseSettingDto, admin?: AdminContext) {
    const appId = String(dto.appId || "").trim();
    if (!appId) throw new BadRequestException("请填写小程序 AppID");
    let row = await this.currentSetting();
    if (!row) row = this.settings.create({ appId });
    row.appId = appId;
    row.appSecret = dto.appSecret !== undefined ? this.nullableText(dto.appSecret) : row.appSecret;
    row.privateKey = dto.privateKey !== undefined ? this.normalizePrivateKey(dto.privateKey) : row.privateKey;
    row.version = dto.version !== undefined ? this.nullableText(dto.version) : row.version;
    row.description = dto.description !== undefined ? this.nullableText(dto.description) : row.description;
    row.projectPath = dto.projectPath !== undefined ? this.nullableText(dto.projectPath) : row.projectPath;
    row.auditItem = dto.auditItem && typeof dto.auditItem === "object" ? dto.auditItem : row.auditItem;
    const saved = await this.settings.save(row);
    await this.record("setting", "success", saved, admin, { message: "保存小程序发布配置" });
    return this.publicSetting(saved);
  }

  async logsList(limit = 30) {
    return this.logs.find({ order: { createdAt: "DESC" }, take: Math.min(Math.max(Number(limit || 30), 1), 100) });
  }

  async uploadTrial(dto: MiniprogramReleaseVersionDto, admin?: AdminContext) {
    return this.runAction("upload", admin, async (setting) => {
      const ci = await this.loadMiniprogramCi();
      const version = this.releaseVersion(setting, dto);
      const desc = this.releaseDescription(setting, dto);
      const privateKeyPath = this.privateKeyFile(setting);
      const projectPath = this.projectPath(setting);
      const project = new ci.Project({ appid: setting.appId, type: "miniProgram", projectPath, privateKeyPath, ignores: ["node_modules/**/*"] });
      const result = await ci.upload({ project, version, desc, setting: { es6: true, minify: true } });
      const preview = await ci.preview({ project, version, desc, qrcodeFormat: "image", qrcodeOutputDest: this.qrCodePath() });
      return {
        version,
        description: desc,
        qrCodeUrl: this.qrCodeUrl(),
        detail: { upload: this.safePayload(result), preview: this.safePayload(preview), projectPath }
      };
    });
  }

  async submitAudit(admin?: AdminContext) {
    return this.runAction("submit_audit", admin, async (setting) => {
      const accessToken = await this.accessToken(setting);
      const itemList = this.auditItemList(setting);
      const payload = itemList.length ? { item_list: itemList } : {};
      const result = await this.wechatPost(`https://api.weixin.qq.com/wxa/submit_audit?access_token=${encodeURIComponent(accessToken)}`, payload);
      const auditId = result.auditid === undefined ? null : String(result.auditid);
      return { auditId, detail: result };
    });
  }

  async latestAuditStatus(admin?: AdminContext) {
    return this.runAction("audit_status", admin, async (setting) => {
      const accessToken = await this.accessToken(setting);
      const result = await this.wechatGet(`https://api.weixin.qq.com/wxa/get_latest_auditstatus?access_token=${encodeURIComponent(accessToken)}`);
      return { auditId: result.auditid === undefined ? null : String(result.auditid), detail: result };
    });
  }

  async release(admin?: AdminContext) {
    return this.runAction("release", admin, async (setting) => {
      const accessToken = await this.accessToken(setting);
      const result = await this.wechatPost(`https://api.weixin.qq.com/wxa/release?access_token=${encodeURIComponent(accessToken)}`, {});
      return { detail: result };
    });
  }

  private async runAction(action: ReleaseAction, admin: AdminContext | undefined, runner: (setting: MiniprogramReleaseSetting) => Promise<Record<string, any>>) {
    const setting = await this.requireSetting();
    try {
      const result = await runner(setting);
      return this.record(action, "success", setting, admin, result);
    } catch (error: any) {
      const message = error?.message || "操作失败";
      const log = await this.record(action, "failed", setting, admin, { errorMessage: message, detail: { stack: this.config.get("NODE_ENV") === "production" ? undefined : error?.stack } });
      throw new BadRequestException(`${this.actionText(action)}失败：${message}（记录 #${log.id}）`);
    }
  }

  private async record(action: ReleaseAction | "setting", status: ReleaseStatus, setting: MiniprogramReleaseSetting, admin?: AdminContext, payload: Record<string, any> = {}) {
    return this.logs.save(this.logs.create({
      action,
      status,
      appId: setting.appId,
      version: payload.version || setting.version || null,
      description: payload.description || setting.description || null,
      qrCodeUrl: payload.qrCodeUrl || null,
      auditId: payload.auditId || null,
      errorMessage: payload.errorMessage || null,
      detail: payload.detail || payload,
      adminId: admin?.id || null,
      adminUsername: admin?.username || null
    }));
  }

  private async currentSetting() {
    return this.settings.findOne({ where: {}, order: { id: "ASC" } });
  }

  private async requireSetting() {
    const setting = await this.currentSetting();
    if (!setting) throw new BadRequestException("请先保存小程序发布配置");
    if (!setting.appId) throw new BadRequestException("请先填写小程序 AppID");
    return setting;
  }

  private publicSetting(setting: MiniprogramReleaseSetting | null) {
    if (!setting) return null;
    return {
      id: setting.id,
      appId: setting.appId,
      hasAppSecret: Boolean(setting.appSecret),
      hasPrivateKey: Boolean(setting.privateKey),
      version: setting.version,
      description: setting.description,
      projectPath: setting.projectPath,
      auditItem: setting.auditItem,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    };
  }

  private async loadMiniprogramCi() {
    try {
      return await import("miniprogram-ci");
    } catch {
      throw new BadRequestException("服务器未安装 miniprogram-ci，请先执行 npm --prefix apps/api install miniprogram-ci");
    }
  }

  private async accessToken(setting: MiniprogramReleaseSetting) {
    if (!setting.appSecret) throw new BadRequestException("请先填写小程序 AppSecret，提审/发布需要调用微信接口");
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(setting.appId)}&secret=${encodeURIComponent(setting.appSecret)}`;
    const payload = await this.wechatGet(url);
    const token = typeof payload.access_token === "string" ? payload.access_token : "";
    if (!token) throw new BadRequestException(String(payload.errmsg || "获取微信 access_token 失败"));
    return token;
  }

  private async wechatGet(url: string) {
    const response = await fetch(url);
    const payload = await response.json() as Record<string, any>;
    this.assertWechatOk(payload);
    return payload;
  }

  private async wechatPost(url: string, body: Record<string, any>) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as Record<string, any>;
    this.assertWechatOk(payload);
    return payload;
  }

  private assertWechatOk(payload: Record<string, any>) {
    const errcode = Number(payload.errcode || 0);
    if (errcode !== 0) throw new BadRequestException(`微信接口错误 ${errcode}：${payload.errmsg || "未知错误"}`);
  }

  private privateKeyFile(setting: MiniprogramReleaseSetting) {
    if (!setting.privateKey) throw new BadRequestException("请先上传/粘贴小程序代码上传私钥");
    const dir = resolve(this.config.get<string>("MINIPROGRAM_RELEASE_KEY_DIR", "runtime/miniprogram"));
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${setting.appId}.key`);
    writeFileSync(file, setting.privateKey, { encoding: "utf8", mode: 0o600 });
    return file;
  }

  private projectPath(setting: MiniprogramReleaseSetting) {
    const path = resolve(setting.projectPath || this.config.get<string>("MINIPROGRAM_PROJECT_PATH", "apps/mobile/dist/build/mp-weixin"));
    if (!existsSync(path)) throw new BadRequestException(`小程序构建目录不存在：${path}，请先执行 npm --prefix apps/mobile run build:mp-weixin`);
    return path;
  }

  private qrCodePath() {
    const dir = resolve(this.config.get<string>("UPLOAD_DIR", "uploads"), "miniprogram-release");
    mkdirSync(dir, { recursive: true });
    return join(dir, "trial-qrcode.jpg");
  }

  private qrCodeUrl() {
    const publicBase = this.config.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
    const path = "/uploads/miniprogram-release/trial-qrcode.jpg";
    return publicBase ? `${publicBase}${path}` : path;
  }

  private releaseVersion(setting: MiniprogramReleaseSetting, dto?: MiniprogramReleaseVersionDto) {
    const version = String(dto?.version || setting.version || "").trim();
    if (!version) throw new BadRequestException("请填写版本号");
    return version;
  }

  private releaseDescription(setting: MiniprogramReleaseSetting, dto?: MiniprogramReleaseVersionDto) {
    return String(dto?.description || setting.description || `小程序版本 ${this.releaseVersion(setting, dto)}`).trim().slice(0, 500);
  }

  private auditItemList(setting: MiniprogramReleaseSetting) {
    const item = setting.auditItem;
    const list = item && Array.isArray((item as any).item_list) ? (item as any).item_list : item && Object.keys(item).length ? [item] : [];
    return list.filter(Boolean);
  }

  private nullableText(value?: string | null) {
    const text = String(value || "").trim();
    return text || null;
  }

  private normalizePrivateKey(value?: string | null) {
    const text = String(value || "").trim();
    return text ? text.replace(/\\n/g, "\n") : null;
  }

  private safePayload(value: unknown) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }

  private actionText(action: ReleaseAction) {
    const map: Record<ReleaseAction, string> = { upload: "上传体验版", submit_audit: "提交审核", audit_status: "查询审核状态", release: "发布线上版" };
    return map[action] || action;
  }
}
