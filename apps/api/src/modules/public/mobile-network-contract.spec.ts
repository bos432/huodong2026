import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("mobile production network contract", () => {
  it("uses the production API and fails stalled requests visibly", () => {
    const apiBase = read("apps/mobile/src/api-base.ts");
    const api = read("apps/mobile/src/api.ts");
    const manifest = JSON.parse(read("apps/mobile/src/manifest.json"));

    expect(apiBase).toContain('DEFAULT_MP_API_BASE = "https://rd.chaimen666.com/api"');
    expect(api).toContain("DEFAULT_REQUEST_TIMEOUT_MS = 15_000");
    expect(api).toContain("request 合法域名");
    expect(api).toContain("url not in domain list");
    expect(manifest["mp-weixin"].networkTimeout.request).toBe(15_000);
  });
});
