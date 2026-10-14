import { BadRequestException, GoneException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { MiniprogramReleaseLog } from "../../entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { MiniprogramReleaseSettingDto, MiniprogramReleaseVersionDto } from "./dto";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type ReleaseStatus = "success" | "failed" | "processing";

const DIRECT_ACCOUNT_RELEASE_MESSAGE = "当前是普通小程序直连模式。微信 submit_audit、审核查询和 release 接口仅支持第三方平台代小程序调用；请登录微信公众平台，在“管理 -> 版本管理”中提交审核、查看状态并发布。";
const MANUAL_UPLOAD_MESSAGE = "服务器端体验版上传已停用。请在项目目录运行 npm run build:mobile:mp-weixin，再用微信开发者工具导入 apps/mobile/dist/build/mp-weixin 并上传体验版；提审和正式发布仍在微信公众平台完成。";

@Injectable()
export class MiniprogramReleaseService {
  constructor(
    @InjectRepository(MiniprogramReleaseSetting) private readonly settings: Repository<MiniprogramReleaseSetting>,
    @InjectRepository(MiniprogramReleaseLog) private readonly logs: Repository<MiniprogramReleaseLog>
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
    row.privateKey = null;
    row.version = dto.version !== undefined ? this.nullableText(dto.version) : row.version;
    row.description = dto.description !== undefined ? this.nullableText(dto.description) : row.description;
    row.projectPath = dto.projectPath !== undefined ? this.nullableText(dto.projectPath) : row.projectPath;
    row.auditItem = dto.auditItem && typeof dto.auditItem === "object" ? dto.auditItem : row.auditItem;
    const saved = await this.settings.save(row);
    await this.record("setting", "success", saved, admin, { message: "保存发布元数据、保留运行时登录配置并清除服务器上传私钥" });
    return this.publicSetting(saved);
  }

  async logsList(limit = 30) {
    const parsedLimit = Number(limit);
    const take = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;
    const rows = await this.logs.find({ order: { createdAt: "DESC" }, take });
    return rows.map((row) => this.publicLog(row));
  }

  async uploadTrial(_dto?: MiniprogramReleaseVersionDto, _admin?: AdminContext): Promise<never> {
    throw new GoneException(MANUAL_UPLOAD_MESSAGE);
  }

  async submitAudit(admin?: AdminContext) {
    void admin;
    throw new BadRequestException(DIRECT_ACCOUNT_RELEASE_MESSAGE);
  }

  async latestAuditStatus(admin?: AdminContext) {
    void admin;
    throw new BadRequestException(DIRECT_ACCOUNT_RELEASE_MESSAGE);
  }

  async release(admin?: AdminContext) {
    void admin;
    throw new BadRequestException(DIRECT_ACCOUNT_RELEASE_MESSAGE);
  }

  private async record(action: "setting", status: ReleaseStatus, setting: MiniprogramReleaseSetting, admin?: AdminContext, payload: Record<string, any> = {}) {
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

  private publicSetting(setting: MiniprogramReleaseSetting | null) {
    if (!setting) return null;
    return {
      id: setting.id,
      appId: setting.appId,
      version: setting.version,
      description: setting.description,
      projectPath: setting.projectPath,
      auditItem: setting.auditItem,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    };
  }

  private publicLog(row: MiniprogramReleaseLog) {
    return {
      id: row.id,
      action: row.action,
      status: row.status,
      appId: row.appId,
      version: row.version,
      description: row.description,
      qrCodeUrl: row.qrCodeUrl,
      auditId: row.auditId,
      errorMessage: row.errorMessage,
      adminId: row.adminId,
      adminUsername: row.adminUsername,
      createdAt: row.createdAt,
      detail: this.sanitizeLogValue(row.detail)
    };
  }

  private sanitizeLogValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.sanitizeLogValue(item));
    if (!value || typeof value !== "object") return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key.toLowerCase() === "stack") continue;
      if (/(secret|token|private.?key|password|authorization|cookie)/i.test(key)) {
        result[key] = "********";
        continue;
      }
      result[key] = this.sanitizeLogValue(item);
    }
    return result;
  }

  private nullableText(value?: string | null) {
    const text = String(value || "").trim();
    return text || null;
  }

}
