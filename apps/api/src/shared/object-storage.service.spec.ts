import { beforeEach, describe, expect, it, vi } from "vitest";
import { PassThrough, Readable } from "stream";

const state = vi.hoisted(() => ({ sent: [] as unknown[], respond: undefined as undefined | ((command: any) => unknown) }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(command: unknown) { state.sent.push(command); return Promise.resolve(state.respond ? state.respond(command) : {}); }
    destroy() {}
  },
  PutObjectCommand: class { constructor(readonly input: unknown) {} },
  GetObjectCommand: class { constructor(readonly input: unknown) {} },
  HeadObjectCommand: class { constructor(readonly input: unknown) {} }
}));

import { ObjectStorageService } from "./object-storage.service";

describe("ObjectStorageService", () => {
  beforeEach(() => { state.sent.splice(0); state.respond = undefined; });

  it("returns an API uploads URL after storing in a private bucket without a public asset domain", async () => {
    const values: Record<string, string> = {
      STORAGE_PROVIDER: "aliyun-oss",
      STORAGE_ENDPOINT: "https://oss-cn-hangzhou.aliyuncs.com",
      STORAGE_REGION: "cn-hangzhou",
      STORAGE_BUCKET: "manpi-assets-qiwai-20261006",
      STORAGE_ACCESS_KEY_ID: "runtime-key-id",
      STORAGE_ACCESS_KEY_SECRET: "runtime-key-secret",
      STORAGE_PUBLIC_BASE_URL: "",
      PUBLIC_API_ORIGIN: "https://rd.chaimen666.com"
    };
    const settings = { findOne: vi.fn().mockResolvedValue({ id: 1, launchConfig: {} }) };
    const config = { get: (key: string, fallback?: string) => values[key] ?? fallback };
    const service = new ObjectStorageService(settings as any, config as any);

    const result = await service.store({
      originalname: "cover.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("image")
    } as any, "images");

    expect(result.url).toMatch(/^https:\/\/rd\.chaimen666\.com\/uploads\/images\//);
    expect(result.provider).toBe("aliyun-oss");
    expect(state.sent).toHaveLength(1);
  });

  it("rejects remote storage when no valid file access domain is configured", async () => {
    const values: Record<string, string> = {
      STORAGE_PROVIDER: "aliyun-oss",
      STORAGE_ENDPOINT: "https://oss-cn-hangzhou.aliyuncs.com",
      STORAGE_REGION: "cn-hangzhou",
      STORAGE_BUCKET: "manpi-assets-qiwai-20261006",
      STORAGE_ACCESS_KEY_ID: "runtime-key-id",
      STORAGE_ACCESS_KEY_SECRET: "runtime-key-secret",
      STORAGE_PUBLIC_BASE_URL: "",
      PUBLIC_API_ORIGIN: ""
    };
    const settings = { findOne: vi.fn().mockResolvedValue({ id: 1, launchConfig: {} }) };
    const config = { get: (key: string, fallback?: string) => values[key] ?? fallback };
    const service = new ObjectStorageService(settings as any, config as any);

    await expect(service.store({
      originalname: "cover.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("image")
    } as any, "images")).rejects.toThrow("文件访问域名尚未正确配置");
    expect(state.sent).toHaveLength(0);
  });

  it("streams private remote objects through the API uploads proxy", async () => {
    const values: Record<string, string> = {
      STORAGE_PROVIDER: "aliyun-oss",
      STORAGE_ENDPOINT: "https://oss-cn-hangzhou.aliyuncs.com",
      STORAGE_REGION: "cn-hangzhou",
      STORAGE_BUCKET: "manpi-assets-qiwai-20261006",
      STORAGE_ACCESS_KEY_ID: "runtime-key-id",
      STORAGE_ACCESS_KEY_SECRET: "runtime-key-secret"
    };
    const settings = { findOne: vi.fn().mockResolvedValue({ id: 1, launchConfig: {} }) };
    const config = { get: (key: string, fallback?: string) => values[key] ?? fallback };
    const service = new ObjectStorageService(settings as any, config as any);
    state.respond = () => ({ Body: Readable.from([Buffer.from("private-image")]), ContentType: "image/png", ContentLength: 13 });
    const response = new PassThrough() as any;
    const headers: Record<string, string> = {};
    let statusCode = 200;
    const chunks: Buffer[] = [];
    response.status = (value: number) => { statusCode = value; return response; };
    response.setHeader = (key: string, value: string | number) => { headers[key.toLowerCase()] = String(value); };
    response.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));

    const handled = await service.proxyRead("images/2026-10-07/a.png", "GET", undefined, response);

    expect(handled).toBe(true);
    expect(statusCode).toBe(200);
    expect(headers["content-type"]).toBe("image/png");
    expect(Buffer.concat(chunks).toString()).toBe("private-image");
  });

  it("falls through to local static uploads while caching the runtime storage mode", async () => {
    const settings = { findOne: vi.fn().mockResolvedValue({ id: 1, launchConfig: {} }) };
    const config = { get: (_key: string, fallback?: string) => fallback };
    const service = new ObjectStorageService(settings as any, config as any);

    expect(await service.proxyRead("images/local.jpg", "GET", undefined, {})).toBe(false);
    expect(await service.proxyRead("images/local.jpg", "GET", undefined, {})).toBe(false);
    expect(settings.findOne).toHaveBeenCalledTimes(1);
  });
});
