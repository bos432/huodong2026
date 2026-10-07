import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";
import { randomBytes } from "crypto";
import { Readable } from "stream";
import { Repository } from "typeorm";
import { OperationSetting } from "../entities/operation-setting.entity";
import { configWithLaunchOverrides } from "./launch-config";
import { normalizeObjectStorageConfig, normalizePublicAssetBase, objectStorageAssetUrl, objectStorageMissingFields } from "./object-storage";

@Injectable()
export class ObjectStorageService {
  private runtimeCache: { value: ConfigService; expiresAt: number } | null = null;

  constructor(@InjectRepository(OperationSetting) private readonly settings: Repository<OperationSetting>, private readonly config: ConfigService) {}

  async store(file: Express.Multer.File & { buffer: Buffer }, category: string) {
    const runtime = await this.runtimeConfig();
    const storage = normalizeObjectStorageConfig({
      provider: runtime.get<string>("STORAGE_PROVIDER", "local"),
      endpoint: runtime.get<string>("STORAGE_ENDPOINT", ""),
      region: runtime.get<string>("STORAGE_REGION", ""),
      bucket: runtime.get<string>("STORAGE_BUCKET", ""),
      accessKeyId: runtime.get<string>("STORAGE_ACCESS_KEY_ID", ""),
      accessKeySecret: runtime.get<string>("STORAGE_ACCESS_KEY_SECRET", "")
    });
    const missing = objectStorageMissingFields(storage);
    if (missing.length) throw new ServiceUnavailableException("文件存储尚未配置完整，请联系管理员");
    if (storage.provider !== "local") {
      const assetBase = normalizePublicAssetBase(runtime.get<string>("STORAGE_PUBLIC_BASE_URL", ""))
        || normalizePublicAssetBase(runtime.get<string>("PUBLIC_API_ORIGIN", ""));
      if (!assetBase) throw new ServiceUnavailableException("文件访问域名尚未正确配置，请联系管理员");
    }
    const extension = this.safeExtension(file.originalname, file.mimetype);
    const key = `${this.safeCategory(category)}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomBytes(16).toString("hex")}${extension}`;
    if (storage.provider === "local") return this.storeLocal(runtime, file, key);
    return this.storeRemote(storage, file, key);
  }

  async isPublicAssetUrlAllowed(value: string, keyPrefix: string) {
    const text = String(value || "").trim();
    if (!/^https:\/\//i.test(text)) return false;
    let candidate: URL;
    try { candidate = new URL(text); } catch { return false; }
    if (candidate.search || candidate.hash) return false;
    const runtime = await this.runtimeConfig();
    const bases = [
      normalizePublicAssetBase(runtime.get<string>("PUBLIC_API_ORIGIN", "")),
      normalizePublicAssetBase(runtime.get<string>("STORAGE_PUBLIC_BASE_URL", ""))
    ].filter(Boolean);
    const prefix = String(keyPrefix || "").replace(/[^a-z0-9-]/gi, "");
    if (!prefix || !bases.length) return false;
    const hasOwnedKey = (pathname: string, root: string) => {
      if (!pathname.startsWith(root)) return false;
      const remainder = pathname.slice(root.length).replace(/^\/+/, "");
      const [first, ...rest] = remainder.split("/");
      return Boolean(first && first.toLowerCase().startsWith(prefix.toLowerCase()) && first.length > prefix.length && rest.length && rest.every((part) => Boolean(part)));
    };
    return bases.some((base) => {
      const configured = new URL(base);
      if (configured.origin !== candidate.origin) return false;
      const configuredPath = configured.pathname.replace(/\/+$/, "");
      return hasOwnedKey(candidate.pathname, configuredPath) || hasOwnedKey(candidate.pathname, "/uploads");
    });
  }

  async proxyRead(key: string, method: string, range: string | undefined, response: any) {
    const runtime = await this.runtimeConfig();
    const storage = normalizeObjectStorageConfig({
      provider: runtime.get<string>("STORAGE_PROVIDER", "local"),
      endpoint: runtime.get<string>("STORAGE_ENDPOINT", ""),
      region: runtime.get<string>("STORAGE_REGION", ""),
      bucket: runtime.get<string>("STORAGE_BUCKET", ""),
      accessKeyId: runtime.get<string>("STORAGE_ACCESS_KEY_ID", ""),
      accessKeySecret: runtime.get<string>("STORAGE_ACCESS_KEY_SECRET", "")
    });
    if (storage.provider === "local") return false;
    if (!key || key.includes("\\") || key.split("/").some((part) => !part || part === "." || part === "..")) {
      response.status(404).end();
      return true;
    }

    const client = new S3Client({ endpoint: storage.endpoint, region: storage.region, credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.accessKeySecret }, forcePathStyle: storage.provider === "s3" });
    try {
      const output = method === "HEAD"
        ? await client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }))
        : await client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key, ...(range ? { Range: range } : {}) }));
      response.status(output.ContentRange ? 206 : 200);
      if (output.ContentType) response.setHeader("Content-Type", output.ContentType);
      if (output.ContentLength !== undefined) response.setHeader("Content-Length", output.ContentLength);
      if (output.ContentRange) response.setHeader("Content-Range", output.ContentRange);
      if (output.ETag) response.setHeader("ETag", output.ETag);
      if (output.LastModified) response.setHeader("Last-Modified", output.LastModified.toUTCString());
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader("Cache-Control", "private, max-age=300");
      response.setHeader("X-Content-Type-Options", "nosniff");
      const contentType = String(output.ContentType || "").toLowerCase();
      response.setHeader("Content-Disposition", contentType.startsWith("image/") && contentType !== "image/svg+xml" ? "inline" : "attachment");
      if (method === "HEAD") {
        response.end();
        return true;
      }
      const body = (output as { Body?: Readable }).Body;
      if (!body || typeof body.pipe !== "function") {
        response.status(404).end();
        return true;
      }
      await new Promise<void>((resolve, reject) => {
        body.once("end", resolve);
        body.once("error", reject);
        response.once("close", resolve);
        body.pipe(response);
      });
      return true;
    } catch (error) {
      const errorName = String((error as Error)?.name || "");
      if (!response.headersSent) response.status(["NoSuchKey", "NotFound", "NoSuchBucket"].includes(errorName) ? 404 : 502).end();
      else response.destroy?.();
      return true;
    } finally {
      client.destroy();
    }
  }

  private async runtimeConfig() {
    if (this.runtimeCache && this.runtimeCache.expiresAt > Date.now()) return this.runtimeCache.value;
    const setting = await this.settings.findOne({ where: { id: 1 } });
    const value = configWithLaunchOverrides(this.config, setting?.launchConfig);
    this.runtimeCache = { value, expiresAt: Date.now() + 5000 };
    return value;
  }

  private async storeLocal(runtime: ConfigService, file: Express.Multer.File & { buffer: Buffer }, key: string) {
    const configuredBase = runtime.get<string>("PUBLIC_API_ORIGIN", "").trim();
    const base = normalizePublicAssetBase(configuredBase);
    if (configuredBase && !base) throw new ServiceUnavailableException("API 公开域名配置无效，请在系统设置中填写真实可访问域名");
    const root = runtime.get<string>("UPLOAD_DIR", "uploads");
    const target = join(process.cwd(), root, ...key.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    const path = `/uploads/${key}`;
    return { url: base ? `${base}${path}` : path, path, key, provider: "local" };
  }

  private async storeRemote(storage: ReturnType<typeof normalizeObjectStorageConfig>, file: Express.Multer.File & { buffer: Buffer }, key: string) {
    const client = new S3Client({ endpoint: storage.endpoint, region: storage.region, credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.accessKeySecret }, forcePathStyle: storage.provider === "s3" });
    try {
      await client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
    } catch {
      throw new ServiceUnavailableException("文件存储服务暂时不可用，请稍后重试");
    } finally {
      client.destroy();
    }
    const runtime = await this.runtimeConfig();
    const url = objectStorageAssetUrl(key, runtime.get<string>("STORAGE_PUBLIC_BASE_URL", ""), runtime.get<string>("PUBLIC_API_ORIGIN", ""));
    return { url, path: key, key, provider: storage.provider };
  }

  private safeCategory(value: string) { return String(value || "misc").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60) || "misc"; }
  private safeExtension(name: string, mime: string) {
    const byMime: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf" };
    return byMime[mime] || extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10) || ".bin";
  }
}
