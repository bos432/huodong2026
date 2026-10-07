import { describe, expect, it } from "vitest";
import { normalizeObjectStorageConfig, normalizePublicAssetBase, objectStorageAssetUrl, objectStorageMissingFields } from "./object-storage";

describe("object storage configuration", () => {
  it("normalizes endpoints and accepts local storage without remote credentials", () => {
    expect(normalizeObjectStorageConfig({ provider: "s3", endpoint: "https://s3.example.com/" }).endpoint).toBe("https://s3.example.com");
    expect(objectStorageMissingFields({ provider: "local" })).toEqual([]);
  });

  it("reports every missing remote storage credential", () => {
    expect(objectStorageMissingFields({ provider: "aliyun-oss", endpoint: "https://oss.example.com" })).toEqual(["bucket", "accessKeyId", "accessKeySecret"]);
  });

  it("rejects placeholder public origins used by upload responses", () => {
    expect(normalizePublicAssetBase("https://api.example.com/")).toBe("");
    expect(normalizePublicAssetBase("http://127.0.0.1:3000")).toBe("");
    expect(normalizePublicAssetBase("https://rd.chaimen666.com/")).toBe("https://rd.chaimen666.com");
  });

  it("uses the API uploads proxy when a private object store has no public asset domain", () => {
    expect(objectStorageAssetUrl("images/a.jpg", "", "https://rd.chaimen666.com")).toBe("https://rd.chaimen666.com/uploads/images/a.jpg");
  });

  it("keeps a relative uploads URL when no public API origin is available", () => {
    expect(objectStorageAssetUrl("avatars/a.jpg", "", "")).toBe("/uploads/avatars/a.jpg");
  });
});
