import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";

export type ObjectStorageConfig = {
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
};

export function normalizeObjectStorageConfig(input: Partial<ObjectStorageConfig>) {
  return {
    provider: String(input.provider || "local").trim(), endpoint: String(input.endpoint || "").trim().replace(/\/$/, ""), region: String(input.region || "auto").trim() || "auto",
    bucket: String(input.bucket || "").trim(), accessKeyId: String(input.accessKeyId || "").trim(), accessKeySecret: String(input.accessKeySecret || "").trim()
  };
}

export function objectStorageMissingFields(input: Partial<ObjectStorageConfig>) {
  const config = normalizeObjectStorageConfig(input);
  if (config.provider === "local") return [];
  return (["endpoint", "bucket", "accessKeyId", "accessKeySecret"] as const).filter((key) => !config[key]);
}

export function normalizePublicAssetBase(value: unknown) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    const hostname = url.hostname.toLowerCase();
    const placeholder = hostname === "example.com" || hostname.endsWith(".example.com") || hostname === "localhost" || hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "::1";
    return ["http:", "https:"].includes(url.protocol) && !placeholder ? text : "";
  } catch {
    return "";
  }
}

export async function testObjectStorageConnection(input: Partial<ObjectStorageConfig>) {
  const config = normalizeObjectStorageConfig(input);
  const missing = objectStorageMissingFields(config);
  if (missing.length) throw new Error(`对象存储缺少配置：${missing.join("、")}`);
  if (config.provider === "local") return { provider: "local", operation: "local", latencyMs: 0 };
  const client = new S3Client({ endpoint: config.endpoint, region: config.region, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.accessKeySecret }, forcePathStyle: config.provider === "s3" });
  const key = `connectivity/.probe-${Date.now()}-${randomBytes(5).toString("hex")}.txt`;
  const started = Date.now();
  try {
    await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: "activity-storage-connectivity", ContentType: "text/plain" }));
    await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    return { provider: config.provider, operation: "put-head-delete", latencyMs: Date.now() - started };
  } finally {
    client.destroy();
  }
}
