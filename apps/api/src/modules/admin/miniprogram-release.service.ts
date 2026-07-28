import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { Repository } from "typeorm";
import { MiniprogramReleaseLog } from "../../entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { MiniprogramReleaseSettingDto, MiniprogramReleaseVersionDto } from "./dto";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type ReleaseAction = "upload" | "submit_audit" | "audit_status" | "release";
type ReleaseStatus = "success" | "failed" | "processing";

const SAFE_USER_LOCATION_DESC = "用于定位城市展示本地活动";
const SAFE_MP_BOX_SIZING_SELECTOR = "view,text,image,button,input,textarea,scroll-view,swiper,swiper-item,navigator,form,label";
const DIRECT_ACCOUNT_RELEASE_MESSAGE = "当前是普通小程序直连模式。微信 submit_audit、审核查询和 release 接口仅支持第三方平台代小程序调用；请登录微信公众平台，在“管理 -> 版本管理”中提交审核、查看状态并发布。";

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
    const parsedLimit = Number(limit);
    const take = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;
    const rows = await this.logs.find({ order: { createdAt: "DESC" }, take });
    return rows.map((row) => this.publicLog(row));
  }

  async uploadTrial(dto: MiniprogramReleaseVersionDto, admin?: AdminContext) {
    return this.runAction("upload", admin, async (setting) => {
      const ci = await this.loadMiniprogramCi();
      const version = this.releaseVersion(setting, dto);
      const desc = this.releaseDescription(setting, dto);
      const privateKeyPath = this.privateKeyFile(setting);
      const build = await this.buildProject();
      const projectPath = this.projectPath(setting);
      const projectCheck = this.prepareProjectFiles(projectPath, setting);
      const artifactVersion = this.artifactVersion(projectPath);
      const project = new ci.Project({ appid: setting.appId, type: "miniProgram", projectPath, privateKeyPath, ignores: ["node_modules/**/*"] });
      const result = await ci.upload({ project, version, desc, setting: { es6: true, minify: true } });
      const preview = await ci.preview({ project, version, desc, qrcodeFormat: "image", qrcodeOutputDest: this.qrCodePath() });
      return {
        version,
        description: desc,
        qrCodeUrl: this.qrCodeUrl(),
        detail: { build, artifactVersion, upload: this.safePayload(result), preview: this.safePayload(preview), projectPath, projectCheck }
      };
    });
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

  private async loadMiniprogramCi() {
    try {
      return await import("miniprogram-ci");
    } catch {
      throw new BadRequestException("服务器未安装 miniprogram-ci，请先执行 npm --prefix apps/api install miniprogram-ci");
    }
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
    const configured = String(setting.projectPath || this.config.get<string>("MINIPROGRAM_PROJECT_PATH", "apps/mobile/dist/build/mp-weixin")).trim();
    const candidates = isAbsolute(configured)
      ? [resolve(configured)]
      : [resolve(this.projectRoot(), configured), resolve(configured)];
    const uniqueCandidates = Array.from(new Set(candidates));
    const path = uniqueCandidates.find((candidate) => existsSync(candidate));
    if (!path) throw new BadRequestException(`小程序构建目录不存在：${uniqueCandidates.join(" 或 ")}，请先执行 npm --prefix apps/mobile run build:mp-weixin`);
    return path;
  }

  private projectRoot() {
    const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
    return candidates.find((candidate) => existsSync(join(candidate, "apps", "mobile", "package.json"))) || process.cwd();
  }

  private prepareProjectFiles(projectPath: string, setting: MiniprogramReleaseSetting) {
    const identityServiceEnabled = this.identityServiceEnabled();
    return {
      appJson: this.ensureSafeAppJson(projectPath, identityServiceEnabled),
      appWxss: this.ensureSafeAppWxss(projectPath),
      appMiniappJson: this.ensureMiniappAuthConfig(projectPath, identityServiceEnabled),
      projectConfig: this.ensureProjectConfigAppId(projectPath, setting.appId)
    };
  }

  private async buildProject() {
    const root = this.projectRoot();
    const script = join(root, "scripts", "build-mp-weixin.mjs");
    if (!existsSync(script)) throw new BadRequestException(`小程序构建脚本不存在：${script}`);
    return new Promise<Record<string, unknown>>((resolveBuild, rejectBuild) => {
      const child = spawn(process.execPath, [script], { cwd: root, env: process.env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const append = (current: string, chunk: Buffer) => `${current}${chunk.toString("utf8")}`.slice(-10 * 1024 * 1024);
      child.stdout.on("data", (chunk: Buffer) => { stdout = append(stdout, chunk); });
      child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); });
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        rejectBuild(new BadRequestException("小程序构建超时，请检查服务器资源后重试"));
      }, 5 * 60 * 1000);
      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        rejectBuild(new BadRequestException(`小程序构建失败：${error.message}`));
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (code !== 0) {
          const detail = String(stderr || stdout || "构建命令执行失败").trim().slice(-2000);
          rejectBuild(new BadRequestException(`小程序构建失败：${detail}`));
          return;
        }
        resolveBuild({
          node: process.version,
          commit: String(process.env.BUILD_COMMIT || "").trim() || null,
          output: stdout.trim().slice(-2000) || null
        });
      });
    });
  }

  private artifactVersion(projectPath: string) {
    const file = join(projectPath, "version.json");
    if (!existsSync(file)) throw new BadRequestException(`小程序构建版本文件不存在：${file}`);
    return this.readJsonFile(file, "小程序构建版本文件");
  }

  private identityServiceEnabled() {
    const value = this.config.get<string | boolean>("WECHAT_MINIAPP_IDENTITY_SERVICE_ENABLED", false);
    return value === true || String(value).toLowerCase() === "true";
  }

  private ensureSafeAppJson(projectPath: string, identityServiceEnabled: boolean) {
    const file = join(projectPath, "app.json");
    if (!existsSync(file)) throw new BadRequestException(`小程序 app.json 不存在：${file}`);
    const json = this.readJsonFile(file, "小程序 app.json");
    const permission = this.objectValue(json, "permission");
    const userLocation = this.objectValue(permission, "scope.userLocation");
    const before = typeof userLocation.desc === "string" ? userLocation.desc : "";
    let fixed = false;
    if (before && before.length > 30) {
      userLocation.desc = SAFE_USER_LOCATION_DESC;
      fixed = true;
    }
    const miniApp = json.miniApp && typeof json.miniApp === "object" && !Array.isArray(json.miniApp) ? json.miniApp : undefined;
    if (identityServiceEnabled) {
      const target = miniApp || this.objectValue(json, "miniApp");
      if (target.useAuthorizePage !== true) {
        target.useAuthorizePage = true;
        fixed = true;
      }
    } else if (miniApp && "useAuthorizePage" in miniApp) {
      delete miniApp.useAuthorizePage;
      if (Object.keys(miniApp).length === 0) delete json.miniApp;
      fixed = true;
    }
    if (fixed) writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
    return { path: file, userLocationDesc: userLocation.desc || before, fixed, previousLength: before.length, useAuthorizePage: identityServiceEnabled };
  }

  private ensureMiniappAuthConfig(projectPath: string, identityServiceEnabled: boolean) {
    const file = join(projectPath, "app.miniapp.json");
    const exists = existsSync(file);
    if (!identityServiceEnabled) {
      if (exists) unlinkSync(file);
      return { path: file, exists, fixed: exists, enabled: false };
    }
    const json = exists ? this.readJsonFile(file, "小程序 app.miniapp.json") : {};
    const identity = this.objectValue(json, "identityServiceConfig");
    const previous = { ...identity };
    const type = Number(identity.authorizeMiniprogramType);
    identity.authorizeMiniprogramType = [0, 1, 2].includes(type) ? type : 1;
    identity.miniprogramLoginPath = typeof identity.miniprogramLoginPath === "string" && identity.miniprogramLoginPath ? identity.miniprogramLoginPath : "__default__";
    identity.adaptWxLogin = typeof identity.adaptWxLogin === "boolean" ? identity.adaptWxLogin : false;
    const changed = JSON.stringify(previous) !== JSON.stringify(identity) || !exists;
    if (changed) writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
    return { path: file, exists, fixed: changed, enabled: true, identityServiceConfig: identity };
  }

  private ensureSafeAppWxss(projectPath: string) {
    const file = join(projectPath, "app.wxss");
    if (!existsSync(file)) return { path: file, fixed: false, exists: false };
    const before = readFileSync(file, "utf8");
    const next = before.replace(/(^|})\s*\*\s*\{([^{}]*box-sizing\s*:\s*border-box\s*;?[^{}]*)\}/g, `$1${SAFE_MP_BOX_SIZING_SELECTOR}{$2}`);
    if (/(^|})\s*\*\s*\{/.test(next)) throw new BadRequestException(`小程序 app.wxss 仍包含微信不支持的通配选择器：${file}`);
    if (next !== before) {
      writeFileSync(file, next, "utf8");
      return { path: file, fixed: true, exists: true };
    }
    return { path: file, fixed: false, exists: true };
  }

  private ensureProjectConfigAppId(projectPath: string, appId: string) {
    const file = join(projectPath, "project.config.json");
    if (!existsSync(file)) return { path: file, fixed: false, exists: false };
    const json = this.readJsonFile(file, "小程序 project.config.json");
    const before = typeof json.appid === "string" ? json.appid : "";
    if (before !== appId) {
      json.appid = appId;
      writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
      return { path: file, appid: appId, fixed: true, previousAppId: before, exists: true };
    }
    return { path: file, appid: before, fixed: false, exists: true };
  }

  private readJsonFile(file: string, label: string) {
    try {
      return JSON.parse(readFileSync(file, "utf8")) as Record<string, any>;
    } catch (error: any) {
      throw new BadRequestException(`${label} 读取失败：${error?.message || "JSON 格式不正确"}`);
    }
  }

  private objectValue(record: Record<string, any>, key: string) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
    const next: Record<string, any> = {};
    record[key] = next;
    return next;
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
