import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ sent: [] as any[] }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(command: any) {
      state.sent.push(command);
      if (command.constructor.name === "GetObjectCommand") return Promise.resolve({ Body: { transformToString: async () => "activity-storage-connectivity" } });
      return Promise.resolve({});
    }
    destroy() {}
  },
  GetObjectCommand: class { constructor(readonly input: unknown) {} },
  HeadObjectCommand: class { constructor(readonly input: unknown) {} },
  PutObjectCommand: class { constructor(readonly input: unknown) {} },
  DeleteObjectCommand: class { constructor(readonly input: unknown) {} }
}));

import { testObjectStorageConnection } from "./object-storage";

describe("testObjectStorageConnection", () => {
  beforeEach(() => state.sent.splice(0));

  it("validates private storage with put, head and get without requiring delete permission", async () => {
    const result = await testObjectStorageConnection({
      provider: "aliyun-oss",
      endpoint: "https://oss-cn-hangzhou.aliyuncs.com",
      region: "oss-cn-hangzhou",
      bucket: "manpi-assets-qiwai-20261006",
      accessKeyId: "runtime-key-id",
      accessKeySecret: "runtime-key-secret"
    });

    expect(result.operation).toBe("put-head-get");
    expect(state.sent.map((command) => command.constructor.name)).toEqual([
      "PutObjectCommand",
      "HeadObjectCommand",
      "GetObjectCommand"
    ]);
  });
});
