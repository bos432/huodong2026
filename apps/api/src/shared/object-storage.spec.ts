import { describe, expect, it } from "vitest";
import { normalizeObjectStorageConfig, objectStorageMissingFields } from "./object-storage";

describe("object storage configuration", () => {
  it("normalizes endpoints and accepts local storage without remote credentials", () => {
    expect(normalizeObjectStorageConfig({ provider: "s3", endpoint: "https://s3.example.com/" }).endpoint).toBe("https://s3.example.com");
    expect(objectStorageMissingFields({ provider: "local" })).toEqual([]);
  });

  it("reports every missing remote storage credential", () => {
    expect(objectStorageMissingFields({ provider: "aliyun-oss", endpoint: "https://oss.example.com" })).toEqual(["bucket", "accessKeyId", "accessKeySecret"]);
  });
});
