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
    expect(activityList).toContain("formatShanghaiDateTime");
    expect(activityList).toContain("groupHomepageActivities");
    expect(communityProgram).toContain("formatShanghaiDateTime");
    expect(activityList).not.toContain('from "../../date-time"');
    expect(communityProgram).not.toContain('from "../../date-time"');
  });

  it("keeps decorated image banners under user control", () => {
    const pageDecorationBlocks = read("apps/mobile/src/components/PageDecorationBlocks.vue");
    const adSlotRenderer = read("apps/mobile/src/components/AdSlotRenderer.vue");

    expect(pageDecorationBlocks).toContain("indicator-dots");
    expect(pageDecorationBlocks).not.toMatch(/\sautoplay(?:\s|>)/);
    expect(adSlotRenderer).toContain("indicator-dots");
    expect(adSlotRenderer).not.toMatch(/\sautoplay(?:\s|>)/);
  });

  it("keeps the shared mobile typography scale legible", () => {
    const styles = read("apps/mobile/src/styles.css");

    expect(styles).toContain("--app-font-page-title: 44rpx");
    expect(styles).toContain("--app-font-card-title: 34rpx");
    expect(styles).toContain("--app-font-body: 30rpx");
    expect(styles).toContain("--app-font-helper: 24rpx");
    expect(styles).toContain("--app-font-caption: 22rpx");
    expect(styles).toContain("font-size: var(--app-font-body)");
    expect(styles).toContain("font-size: var(--app-font-helper)");
  });

  it("does not block initial navigation on location and replaces stale tenant routes", () => {
    const api = read("apps/mobile/src/api.ts");
    const home = read("apps/mobile/src/pages/home/index.vue");
    const tabBar = read("apps/mobile/src/components/TabBar.vue");
    const tenantSwitcher = read("apps/mobile/src/components/TenantSwitcher.vue");
    const pageDecorationBlocks = read("apps/mobile/src/components/PageDecorationBlocks.vue");

    expect(home).toContain("async function loadActivities()");
    expect(home).toContain("request<PublicActivityListResponse | PublicActivitySummary[]>");
    expect(home).toContain("const mapped = mapPublicActivityList(result)");
    expect(home).toContain("loadError.value = `接口暂不可用");
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
    expect(home).toContain('<view class="topbar">');
    expect(home).toContain('class="hero-carousel"');
    expect(home).toContain("<swiper class=\"hero-swiper\"");
    expect(home).toContain("<CategoryScroller");
    expect(home).toContain("<BaseBottomSheet");
  });
});
