import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeAssetResponse } from "../apps/mobile/src/asset-response";

const base = "https://rd.chaimen666.com/api";

describe("mini-program uploaded asset URLs", () => {
  it("resolves activity covers and nested decoration images against the API origin", () => {
    const data = {
      items: [{ coverUrl: "/uploads/demo-activities/tea-table.jpg" }],
      config: { imageUrls: ["/uploads/ad.jpg"], slides: [{ image: "/uploads/slide.jpg" }] },
      avatarUrl: "/uploads/avatar.jpg"
    };
    const result = normalizeAssetResponse(data, base);
    expect(result.items[0].coverUrl).toBe("https://rd.chaimen666.com/uploads/demo-activities/tea-table.jpg");
    expect(result.config.imageUrls).toEqual(["https://rd.chaimen666.com/uploads/ad.jpg"]);
    expect(result.config.slides[0].image).toBe("https://rd.chaimen666.com/uploads/slide.jpg");
    expect(result.avatarUrl).toBe("https://rd.chaimen666.com/uploads/avatar.jpg");
    expect(data.items[0].coverUrl).toBe("/uploads/demo-activities/tea-table.jpg");
  });

  it.each([
    "https://cdn.example.com/photo.jpg?token=abc#photo",
    "http://localhost:3010/uploads/photo.jpg",
    "//cdn.example.com/photo.jpg",
    "/static/logo.png",
    "static/logo.png",
    "wxfile://tmp_photo.jpg",
    "http://tmp/photo.jpg",
    "data:image/png;base64,AAAA",
    "blob:https://example.com/photo",
    ""
  ])("preserves existing remote or local assets: %s", coverUrl => {
    expect(normalizeAssetResponse({ coverUrl }, base).coverUrl).toBe(coverUrl);
  });

  it("keeps upload paths, route paths, prose and non-string values unchanged", () => {
    const data = { url: "/uploads/a.jpg", path: "/uploads/a.jpg", title: "/uploads/title", route: "/pages/index/index", description: '<img src="/uploads/a.jpg">', nullable: null, enabled: true, count: 6 };
    expect(normalizeAssetResponse(data, base)).toEqual({ ...data, url: "https://rd.chaimen666.com/uploads/a.jpg" });
  });

  it("retains query signatures and supports configured origins with ports", () => {
    expect(normalizeAssetResponse({ imageUrl: "/uploads/a.jpg?token=abc%2Fdef&size=800#preview" }, "https://assets.example.com:8443/gateway/api/"))
      .toEqual({ imageUrl: "https://assets.example.com:8443/uploads/a.jpg?token=abc%2Fdef&size=800#preview" });
  });

  it.each(["", "/api"])("leaves H5 responses untouched for base %s", apiBase => {
    const data = { coverUrl: "/uploads/a.jpg" };
    expect(normalizeAssetResponse(data, apiBase)).toBe(data);
  });

  it("is idempotent and handles empty API responses", () => {
    const data = normalizeAssetResponse({ coverUrl: "/uploads/a.jpg" }, base);
    expect(normalizeAssetResponse(data, base)).toEqual(data);
    expect(normalizeAssetResponse(null, base)).toBeNull();
    expect(normalizeAssetResponse(undefined, base)).toBeUndefined();
  });

  it("wires public/admin requests and uploads with a mini-program-only base", () => {
    const apiBase = readFileSync("apps/mobile/src/api-base.ts", "utf8");
    expect(apiBase).toContain('let assetApiBase = "";\n// #ifdef MP-WEIXIN\nassetApiBase = API_BASE;\n// #endif');
    const api = readFileSync("apps/mobile/src/api.ts", "utf8");
    const admin = readFileSync("apps/mobile/src/mobile-admin.ts", "utf8");
    expect(api.match(/resolve\(normalizeAssetResponse\(/g)).toHaveLength(3);
    expect(admin.match(/resolve\(normalizeAssetResponse\(/g)).toHaveLength(2);
  });
});
