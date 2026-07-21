import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import { OperationSetting } from "../entities/operation-setting.entity";
import { configWithLaunchOverrides } from "./launch-config";
import { normalizeObjectStorageConfig, objectStorageMissingFields } from "./object-storage";

@Injectable()
export class ObjectStorageService {
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
    const extension = this.safeExtension(file.originalname, file.mimetype);
    const key = `${this.safeCategory(category)}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    if (storage.provider === "local") return this.storeLocal(runtime, file, key);
    return this.storeRemote(storage, file, key);
  }

  private async runtimeConfig() {
    const setting = await this.settings.findOne({ where: { id: 1 } });
    return configWithLaunchOverrides(this.config, setting?.launchConfig);
  }

  private async storeLocal(runtime: ConfigService, file: Express.Multer.File & { buffer: Buffer }, key: string) {
    const root = runtime.get<string>("UPLOAD_DIR", "uploads");
    const target = join(process.cwd(), root, ...key.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    const path = `/uploads/${key}`;
    const base = runtime.get<string>("PUBLIC_API_ORIGIN", "").replace(/\/$/, "");
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
    const base = runtime.get<string>("STORAGE_PUBLIC_BASE_URL", "").replace(/\/$/, "");
    if (!base) throw new ServiceUnavailableException("文件访问域名尚未配置，请联系管理员");
    return { url: `${base}/${key}`, path: key, key, provider: storage.provider };
  }

  private safeCategory(value: string) { return String(value || "misc").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60) || "misc"; }
  private safeExtension(name: string, mime: string) {
    const byMime: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf" };
    return byMime[mime] || extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10) || ".bin";
  }
}
