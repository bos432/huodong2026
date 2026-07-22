import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("mini program release permission contract", () => {
  it("opens the page and GET APIs to delegated viewers while keeping writes managed", () => {
    const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");

    expect(permissions).toContain('{ key: "miniprogram_release.view"');
    expect(permissions).toContain('"miniprogram_release.manage": ["miniprogram_release.view"]');
    expect(permissions).toContain('if (path.startsWith("miniprogram-release")) return write ? "miniprogram_release.manage" : "miniprogram_release.view"');
    expect(router).toContain('{ path: "miniprogram-release", component: MiniprogramRelease, meta: { roles: ["miniprogram_release.view"], scope: "platform" } }');
    expect(menu).toContain('{ index: "/miniprogram-release", icon: "Promotion", label: "小程序发布", roles: ["miniprogram_release.view"], scope: "platform" }');
  });

  it("keeps the PC page read-only, recoverable and mutually exclusive", () => {
    const page = read("apps/admin/src/views/MiniprogramRelease.vue");

    expect(page).toContain('const canManage = computed(() => canAccess(["miniprogram_release.manage"]))');
    expect(page).toContain('v-if="!canManage"');
    expect(page).toContain('v-if="canManage" type="primary"');
    expect(page).toContain('const settingLoadError = ref("")');
    expect(page).toContain('const logsLoadError = ref("")');
    expect(page).toContain('const pageBusy = computed(() => loading.value || mutationBusy.value)');
    expect(page).toContain('.then(() => true).catch(() => false)');
  });

  it("bounds persisted text fields and sanitizes release log details", () => {
    const dto = read("apps/api/src/modules/admin/dto.ts");
    const service = read("apps/api/src/modules/admin/miniprogram-release.service.ts");

    expect(dto).toMatch(/@MaxLength\(80\)\s+appId!/);
    expect(dto).toMatch(/@MaxLength\(40\)\s+version\?/);
    expect(dto).toMatch(/@MaxLength\(500\)\s+description\?/);
    expect(service).toContain("return rows.map((row) => this.publicLog(row))");
    expect(service).toContain('if (key.toLowerCase() === "stack") continue');
    expect(service).toContain('result[key] = "********"');
  });

  it("keeps ordinary mini program review and release on the official console", () => {
    const service = read("apps/api/src/modules/admin/miniprogram-release.service.ts");
    const page = read("apps/admin/src/views/MiniprogramRelease.vue");

    expect(service).toContain("当前是普通小程序直连模式");
    expect(service).not.toContain("https://api.weixin.qq.com/wxa/submit_audit");
    expect(service).not.toContain("https://api.weixin.qq.com/wxa/release");
    expect(page).toContain('href="https://mp.weixin.qq.com/"');
    expect(page).not.toContain("runAction('submit-audit')");
    expect(page).not.toContain("runAction('release')");
  });
});
