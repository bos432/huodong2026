import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { execFile } from "child_process";
import { createHash, randomBytes } from "crypto";
import fs from "fs";
import mysql from "mysql2/promise";
import path from "path";
import { promisify } from "util";
import { InstallerAdminDto, InstallerDbDto, InstallerWriteConfigDto } from "./install.dto";

const execFileAsync = promisify(execFile);

const INSTALL_KEYS = [
  "NODE_ENV",
  "APP_VERSION",
  "BUILD_COMMIT",
  "BUILD_TIME",
  "API_PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_DATABASE",
  "DB_SYNCHRONIZE",
  "JWT_SECRET",
  "CORS_ORIGIN",
  "PUBLIC_H5_ORIGIN",
  "PUBLIC_ADMIN_ORIGIN",
  "PUBLIC_API_ORIGIN",
  "UPLOAD_DIR",
  "H5_AUTH_MODE",
  "H5_AUTH_SECRET",
  "PAYMENT_SANDBOX_ENABLED",
  "PAYMENT_SANDBOX_SECRET",
  "WECHAT_PAY_SANDBOX_SECRET",
  "ALIPAY_PAY_SANDBOX_SECRET",
  "REAL_PAYMENT_ENABLED",
  "WECHAT_PAY_ENABLED",
  "WECHAT_LOGIN_REAL_ENABLED",
  "WECHAT_APP_ID",
  "WECHAT_APP_SECRET",
  "WECHAT_PAY_APP_ID",
  "WECHAT_PAY_MCH_ID",
  "WECHAT_PAY_API_V3_KEY",
  "WECHAT_PAY_PRIVATE_KEY_PATH",
  "WECHAT_PAY_CERT_SERIAL_NO",
  "WECHAT_PAY_PLATFORM_CERT_PATH",
  "WECHAT_PAY_NOTIFY_URL",
  "ALIPAY_ENABLED",
  "MULTI_TENANT_ENABLED",
  "SMS_PROVIDER_ENABLED",
  "SMS_PROVIDER",
  "SMS_ACCESS_KEY_ID",
  "SMS_ACCESS_KEY_SECRET",
  "SMS_SIGN_NAME",
  "SMS_TEMPLATE_ID",
  "INSTALLER_ENABLED",
  "WECHAT_PAY_CONFIGURED_DURING_INSTALL"
];

@Injectable()
export class InstallService {
  private sessionToken: string | null = null;
  private lastConfig: InstallerWriteConfigDto | null = null;
  private readonly root = process.cwd();
  private readonly runtimeDir = path.join(this.root, "runtime");
  private readonly lockPath = path.join(this.runtimeDir, "install.lock");

  status() {
    const enabled = this.installerEnabled();
    const installed = this.installed();
    const available = enabled && !installed;
    if (available && !this.sessionToken) this.sessionToken = randomBytes(32).toString("base64url");
    const base = {
      enabled,
      installed,
      lockPath: this.relative(this.lockPath),
      nodeVersion: process.version,
      platform: process.platform
    };
    if (!available) return base;
    return {
      ...base,
      installerSessionToken: this.sessionToken,
      cwd: this.root,
      checks: {
        runtimeWritable: this.canWriteDir(this.runtimeDir),
        rootEnvWritable: this.canWriteFile(path.join(this.root, ".env")),
        apiEnvWritable: this.canWriteFile(path.join(this.root, "apps", "api", ".env"))
      }
    };
  }

  async checkDb(dto: InstallerDbDto) {
    await this.withConnection(dto, async (connection) => {
      await connection.query("SELECT 1");
    });
    return { ok: true, message: "数据库连接成功" };
  }

  async writeConfig(dto: InstallerWriteConfigDto) {
    this.lastConfig = this.normalizedConfig(dto);
    await this.checkDb(this.lastConfig);
    const values = this.envValues(this.lastConfig, true);
    this.writeEnvFile(path.join(this.root, ".env"), values);
    this.writeEnvFile(path.join(this.root, "apps", "api", ".env"), values);
    for (const [key, value] of Object.entries(values)) process.env[key] = value;
    return { ok: true, files: [".env", "apps/api/.env"] };
  }

  async runMigrations() {
    this.assertConfigWritten();
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    try {
      const result = await execFileAsync(npm, ["--prefix", "apps/api", "run", "migration:run"], {
        cwd: this.root,
        env: { ...process.env },
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 5
      });
      return { ok: true, stdout: result.stdout, stderr: result.stderr };
    } catch (error: any) {
      throw new BadRequestException(`数据库迁移失败：${error.stderr || error.stdout || error.message}`);
    }
  }

  async createAdmin(dto: InstallerAdminDto) {
    this.assertConfigWritten();
    const username = dto.username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) throw new BadRequestException("管理员账号需为 3-32 位字母、数字、点、下划线或横线");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.withConnection(this.currentDbConfig(), async (connection) => {
      const [rows] = await connection.query<any[]>("SELECT id FROM admin_users WHERE username = ? LIMIT 1", [username]);
      if (rows.length) {
        await connection.query("UPDATE admin_users SET passwordHash = ?, role = ?, enabled = 1 WHERE id = ?", [passwordHash, "super_admin", rows[0].id]);
      } else {
        await connection.query("INSERT INTO admin_users (username, passwordHash, role, enabled, createdAt, updatedAt) VALUES (?, ?, ?, 1, NOW(), NOW())", [username, passwordHash, "super_admin"]);
      }
    });
    return { ok: true, username };
  }

  finalize() {
    this.assertConfigWritten();
    fs.mkdirSync(this.runtimeDir, { recursive: true });
    const config = this.lastConfig!;
    const payload = {
      installedAt: new Date().toISOString(),
      appVersion: process.env.APP_VERSION || "0.1.0",
      h5OriginHash: this.hash(config.h5Origin),
      adminOriginHash: this.hash(config.adminOrigin),
      apiOriginHash: this.hash(config.apiOrigin)
    };
    fs.writeFileSync(this.lockPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const values = this.envValues(config, false);
    this.writeEnvFile(path.join(this.root, ".env"), values);
    this.writeEnvFile(path.join(this.root, "apps", "api", ".env"), values);
    process.env.INSTALLER_ENABLED = "false";
    this.sessionToken = null;
    return { ok: true, lockPath: this.relative(this.lockPath), restartRequired: true };
  }

  assertAvailable() {
    if (!this.installerEnabled()) throw new ForbiddenException("安装器未启用，请设置 INSTALLER_ENABLED=true 后重启 API");
    if (this.installed()) throw new ForbiddenException("系统已安装，安装向导已锁定");
  }

  assertToken(token?: string | null) {
    this.assertAvailable();
    if (!this.sessionToken) this.sessionToken = randomBytes(32).toString("base64url");
    if (!token || token !== this.sessionToken) throw new ForbiddenException("安装会话已失效，请刷新安装页面");
  }

  installed() {
    return fs.existsSync(this.lockPath);
  }

  installerEnabled() {
    return process.env.INSTALLER_ENABLED === "true";
  }

  private async withConnection<T>(dto: InstallerDbDto, fn: (connection: mysql.Connection) => Promise<T>) {
    let connection: mysql.Connection | null = null;
    try {
      connection = await mysql.createConnection({
        host: dto.host,
        port: Number(dto.port),
        user: dto.username,
        password: dto.password,
        database: dto.database,
        multipleStatements: false
      });
      return await fn(connection);
    } catch (error: any) {
      throw new BadRequestException(`数据库连接失败：${error.message || "请检查账号、密码和权限"}`);
    } finally {
      if (connection) await connection.end();
    }
  }

  private normalizedConfig(dto: InstallerWriteConfigDto): InstallerWriteConfigDto {
    return {
      ...dto,
      host: dto.host.trim(),
      port: Number(dto.port),
      database: dto.database.trim(),
      username: dto.username.trim(),
      password: dto.password,
      h5Origin: this.trimSlash(dto.h5Origin),
      adminOrigin: this.trimSlash(dto.adminOrigin),
      apiOrigin: this.trimSlash(dto.apiOrigin),
      buildCommit: dto.buildCommit?.trim() || "installer-release",
      smsAccessKeyId: dto.smsAccessKeyId?.trim() || "",
      smsAccessKeySecret: dto.smsAccessKeySecret?.trim() || "",
      smsSignName: dto.smsSignName?.trim() || "",
      smsTemplateId: dto.smsTemplateId?.trim() || "",
      wechatAppId: dto.wechatAppId?.trim() || "",
      wechatAppSecret: dto.wechatAppSecret?.trim() || "",
      wechatPayAppId: dto.wechatPayAppId?.trim() || "",
      wechatPayMchId: dto.wechatPayMchId?.trim() || "",
      wechatPayApiV3Key: dto.wechatPayApiV3Key?.trim() || "",
      wechatPayPrivateKeyPath: dto.wechatPayPrivateKeyPath?.trim() || "",
      wechatPayCertSerialNo: dto.wechatPayCertSerialNo?.trim() || "",
      wechatPayPlatformCertPath: dto.wechatPayPlatformCertPath?.trim() || "",
      wechatPayNotifyUrl: dto.wechatPayNotifyUrl?.trim() || ""
    };
  }

  private envValues(dto: InstallerWriteConfigDto, installerEnabled: boolean) {
    const smsEnabled = Boolean(dto.smsAccessKeyId && dto.smsAccessKeySecret && dto.smsSignName && dto.smsTemplateId);
    const wechatPayConfigured = Boolean(dto.wechatPayAppId && dto.wechatPayMchId && dto.wechatPayApiV3Key);
    return {
      NODE_ENV: "production",
      APP_VERSION: process.env.APP_VERSION || "0.1.0",
      BUILD_COMMIT: dto.buildCommit || "installer-release",
      BUILD_TIME: new Date().toISOString(),
      API_PORT: process.env.API_PORT || "3000",
      DB_HOST: dto.host,
      DB_PORT: String(dto.port),
      DB_USERNAME: dto.username,
      DB_PASSWORD: dto.password,
      DB_DATABASE: dto.database,
      DB_SYNCHRONIZE: "false",
      JWT_SECRET: this.existingOrSecret("JWT_SECRET", 48),
      CORS_ORIGIN: `${dto.h5Origin},${dto.adminOrigin}`,
      PUBLIC_H5_ORIGIN: dto.h5Origin,
      PUBLIC_ADMIN_ORIGIN: dto.adminOrigin,
      PUBLIC_API_ORIGIN: dto.apiOrigin,
      UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
      H5_AUTH_MODE: "sms",
      H5_AUTH_SECRET: this.existingOrSecret("H5_AUTH_SECRET", 48),
      PAYMENT_SANDBOX_ENABLED: "false",
      PAYMENT_SANDBOX_SECRET: this.existingOrSecret("PAYMENT_SANDBOX_SECRET", 32),
      WECHAT_PAY_SANDBOX_SECRET: this.existingOrSecret("WECHAT_PAY_SANDBOX_SECRET", 32),
      ALIPAY_PAY_SANDBOX_SECRET: this.existingOrSecret("ALIPAY_PAY_SANDBOX_SECRET", 32),
      REAL_PAYMENT_ENABLED: "false",
      WECHAT_PAY_ENABLED: "false",
      WECHAT_LOGIN_REAL_ENABLED: "true",
      WECHAT_APP_ID: dto.wechatAppId || "",
      WECHAT_APP_SECRET: dto.wechatAppSecret || "",
      WECHAT_PAY_APP_ID: dto.wechatPayAppId || "",
      WECHAT_PAY_MCH_ID: dto.wechatPayMchId || "",
      WECHAT_PAY_API_V3_KEY: dto.wechatPayApiV3Key || "",
      WECHAT_PAY_PRIVATE_KEY_PATH: dto.wechatPayPrivateKeyPath || "",
      WECHAT_PAY_CERT_SERIAL_NO: dto.wechatPayCertSerialNo || "",
      WECHAT_PAY_PLATFORM_CERT_PATH: dto.wechatPayPlatformCertPath || "",
      WECHAT_PAY_NOTIFY_URL: dto.wechatPayNotifyUrl || `${dto.apiOrigin}/api/payment/wechat/callback`,
      ALIPAY_ENABLED: "false",
      MULTI_TENANT_ENABLED: "false",
      SMS_PROVIDER_ENABLED: smsEnabled ? "true" : "false",
      SMS_PROVIDER: "tencent-cloud-sms",
      SMS_ACCESS_KEY_ID: dto.smsAccessKeyId || "",
      SMS_ACCESS_KEY_SECRET: dto.smsAccessKeySecret || "",
      SMS_SIGN_NAME: dto.smsSignName || "",
      SMS_TEMPLATE_ID: dto.smsTemplateId || "",
      INSTALLER_ENABLED: installerEnabled ? "true" : "false",
      WECHAT_PAY_CONFIGURED_DURING_INSTALL: wechatPayConfigured ? "true" : "false"
    };
  }

  private writeEnvFile(file: string, values: Record<string, string>) {
    const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split(/\r?\n/) : [];
    const seen = new Set<string>();
    const next = existing.map((line) => {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) return line;
      const key = line.slice(0, line.indexOf("="));
      if (!INSTALL_KEYS.includes(key) || !(key in values)) return line;
      seen.add(key);
      return `${key}=${this.escapeEnv(values[key])}`;
    });
    for (const key of INSTALL_KEYS) {
      if (key in values && !seen.has(key)) next.push(`${key}=${this.escapeEnv(values[key])}`);
    }
    fs.writeFileSync(file, `${next.join("\n").replace(/\n*$/, "\n")}`, "utf8");
  }

  private currentDbConfig(): InstallerDbDto {
    return {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_DATABASE || "",
      username: process.env.DB_USERNAME || "",
      password: process.env.DB_PASSWORD || ""
    };
  }

  private assertConfigWritten() {
    this.assertAvailable();
    if (!this.lastConfig) throw new BadRequestException("请先写入配置");
  }

  private existingOrSecret(key: string, bytes: number) {
    const current = process.env[key] || "";
    if (current && !current.startsWith("change-me") && !current.startsWith("local") && current.length >= 24) return current;
    return randomBytes(bytes).toString("base64url");
  }

  private canWriteDir(dir: string) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private canWriteFile(file: string) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (!fs.existsSync(file)) fs.writeFileSync(file, "", { flag: "a" });
      fs.accessSync(file, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private trimSlash(value: string) {
    const normalized = value.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(normalized)) throw new BadRequestException("域名必须以 http:// 或 https:// 开头");
    return normalized;
  }

  private escapeEnv(value: string) {
    if (/[\s#"'`]/.test(value)) return JSON.stringify(value);
    return value;
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 16);
  }

  private relative(file: string) {
    return path.relative(this.root, file).replace(/\\/g, "/");
  }
}
