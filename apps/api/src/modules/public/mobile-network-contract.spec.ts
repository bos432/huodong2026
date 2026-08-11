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
    const pageDecorationBlocks = read("apps/mobile/src/components/PageDecorationBlocks.vue");

    expect(home).toContain("await Promise.allSettled([loadPageTheme(), loadDecoration(), loadOperationSetting()]);");
    expect(home).toContain("await loadActivities();");
    expect(home).toContain("void resolveTenantByCurrentLocation({ silent: true }).then");
    expect(home).toContain("if (!tenantSwitcherEnabled.value) return");
    expect(api).toContain("if (bootstrap?.tenantSwitcherEnabled === false)");
    expect(tabBar).toContain('import { applyTenantBootstrapDefault } from "../api"');
    expect(tabBar).toContain("await applyTenantBootstrapDefault()");
    expect(tabBar).toContain("if (serial !== refreshSerial) return");
    expect(tabBar).toContain("onMounted(() => void refreshBottomNav())");
    expect(tabBar).toContain("onShow(() => void refreshBottomNav())");
    expect(api).toContain("export function getCurrentRouteForTenant");
    expect(api).toContain("tenantCode: normalizeTenantCode(tenantCode)");
    expect(tenantSwitcher).toContain("v-if=\"tenantSwitcherEnabled\"");
    expect(tenantSwitcher).toContain("position: fixed; top: 0; right: 0; bottom: 0; left: 0");
    expect(tenantSwitcher).toContain("z-index: 10001");
    expect(tenantSwitcher).toContain("const nextRoute = getCurrentRouteForTenant(item.code)");
    expect(tenantSwitcher).toContain("await loadTenantOptions();\n  if (!tenantSwitcherEnabled.value) return;");
    expect(tenantSwitcher).toContain('v-else-if="loadError"');
    expect(tenantSwitcher).toContain('emit("changed", item)');
    expect(tenantSwitcher).toContain("uni.reLaunch({ url: nextRoute })");
    expect(home).toContain('<view class="discovery-topbar">');
    expect(home).not.toContain('<view class="discovery-topbar app-enter-soft">');
    expect(home).toContain(":show-overlays=\"false\"");
    expect(home).toContain("<MarketingPopup />");
    expect(home).toContain("<SplashAd />");
    expect(pageDecorationBlocks).toContain("showOverlays?: boolean");
    expect(pageDecorationBlocks).toContain("<template v-if=\"showOverlays\">");
  });
});
