import { afterEach, describe, expect, it } from "vitest";
import { aidPhoneLookupHash, maskAidIdentity, maskAidName, nextAidApplicationNo, openAidPayload, sealAidPayload } from "./aid-privacy";

describe("aid privacy", () => {
  const originalKey = process.env.CONFIG_ENCRYPTION_KEY;
  afterEach(() => { process.env.CONFIG_ENCRYPTION_KEY = originalKey; });

  it("encrypts sensitive application fields and creates deterministic blind indexes", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "aid-privacy-test-key";
    const payload = { applicantName: "张三", phone: "13800138000", wechat: "wx-test", requestedSupport: "活动名额", situation: "家庭情况说明" };
    const sealed = sealAidPayload(payload);
    expect(sealed).not.toContain(payload.phone);
    expect(openAidPayload(sealed)).toEqual(payload);
    expect(aidPhoneLookupHash(payload.phone)).toBe(aidPhoneLookupHash(payload.phone));
  });

  it("creates non-identifying list fields and unique-looking application numbers", () => {
    expect(maskAidName("张三")).toBe("张*");
    expect(maskAidIdentity("510000199001011234")).toBe("5100********1234");
    expect(nextAidApplicationNo(new Date("2026-07-14T00:00:00Z"))).toMatch(/^AID20260714[A-F0-9]{10}$/);
  });
});
