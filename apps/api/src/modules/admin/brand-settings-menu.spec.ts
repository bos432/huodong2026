import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), "../../", relativePath), "utf8");
}

describe("brand settings menu", () => {
  it("exposes the dedicated route to platform and tenant admins", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");

    expect(router).toContain('{ path: "brand-settings", component: SystemSettings, meta: { roles: ["system.view", "operation_settings.view"]');
    expect(router).toContain('{ path: "/brand-settings", roles: ["system.view", "operation_settings.view"]');
    expect(menu).toContain('{ index: "/brand-settings", icon: "Setting", label: "品牌设置", roles: ["system.view"], scope: "platform" }');
    expect(menu).toContain('{ index: "/brand-settings", icon: "Setting", label: "品牌设置", roles: ["operation_settings.view"], scope: "tenant" }');
  });

  it("opens directly on the isolated brand theme controls", () => {
    const page = read("apps/admin/src/views/SystemSettings.vue");

    expect(page).toContain('const brandSettingsMode = computed(() => route.path === "/brand-settings")');
    expect(page).toContain('operationSection.value = "theme"');
    expect(page).toContain('v-if="!brandSettingsMode" v-model="operationSection"');
    expect(page).toContain('brandSettingsMode ? "品牌设置"');
    expect(page).toContain('品牌名称与 Logo');
  });
});
