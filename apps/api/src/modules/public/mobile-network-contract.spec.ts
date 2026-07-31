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

  it("avoids Intl.formatToParts in pages rendered on real devices", () => {
    const activityList = read("apps/mobile/src/pages/activity/list.vue");
    const communityProgram = read("apps/mobile/src/pages/community/program.vue");

    expect(activityList).not.toContain("formatToParts");
    expect(communityProgram).not.toContain("formatToParts");
    expect(activityList).toContain("getUTCMonth");
    expect(communityProgram).toContain("getUTCFullYear");
    expect(activityList).not.toContain('from "../../date-time"');
    expect(communityProgram).not.toContain('from "../../date-time"');
  });

  it("does not block initial navigation on location and replaces stale tenant routes", () => {
    const api = read("apps/mobile/src/api.ts");
    const home = read("apps/mobile/src/pages/index/index.vue");
    const tabBar = read("apps/mobile/src/components/TabBar.vue");
    const tenantSwitcher = read("apps/mobile/src/components/TenantSwitcher.vue");

    expect(home).toContain("await Promise.allSettled([loadPageTheme(), loadDecoration(), loadOperationSetting()]);");
    expect(home).toContain("await loadActivities();");
    expect(home).toContain("void resolveTenantByCurrentLocation({ silent: true }).then");
    expect(tabBar).toContain('import { applyTenantBootstrapDefault } from "../api"');
    expect(tabBar).toContain("await applyTenantBootstrapDefault()");
    expect(tabBar).toContain("if (serial !== refreshSerial) return");
    expect(tabBar).toContain("onMounted(() => void refreshBottomNav())");
    expect(tabBar).toContain("onShow(() => void refreshBottomNav())");
    expect(api).toContain("export function getCurrentRouteForTenant");
    expect(api).toContain("tenantCode: normalizeTenantCode(tenantCode)");
    expect(tenantSwitcher).toContain("const nextRoute = getCurrentRouteForTenant(item.code)");
    expect(tenantSwitcher).toContain("uni.reLaunch({ url: nextRoute })");
  });
});
