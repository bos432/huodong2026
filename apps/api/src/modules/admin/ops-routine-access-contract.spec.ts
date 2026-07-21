import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("operations routine access contract", () => {
  it("opens the workbench to platform viewers and tenant dashboard users", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");

    expect(router).toContain('{ path: "ops-routine", component: OpsRoutine, meta: { roles: ["system.view", "dashboard.view"], scope: "tenantOrPlatformAdmin" } }');
    expect(menu).toContain('{ index: "/ops-routine", icon: "List", label: "运营巡检", roles: ["system.view", "dashboard.view"], scope: "platform" }');
    expect(menu).toContain('{ index: "/ops-routine", icon: "List", label: "运营巡检", roles: ["dashboard.view"], scope: "tenant" }');
  });

  it("isolates local completion state by account, tenant and local date", () => {
    const page = read("apps/admin/src/views/OpsRoutine.vue");

    expect(page).toContain("function localDateKey");
    expect(page).toContain('const accountScopeKey = `${currentTenantId() || "platform"}:${localStorage.getItem("admin_username") || "anonymous"}`');
    expect(page).toContain('const storageKey = `ops-routine:${accountScopeKey}:${localDateKey()}`');
    expect(page).not.toContain("new Date().toISOString().slice(0, 10)");
  });

  it("shows only reachable checks and keeps reset cancellation side-effect free", () => {
    const page = read("apps/admin/src/views/OpsRoutine.vue");

    expect(page).toContain("function canUseItem(item: RoutineItem)");
    expect(page).toContain("const availableItems = computed(() => routineItems.filter(canUseItem))");
    expect(page).toContain("item.platformRoles");
    expect(page).toContain("item.tenantRoles");
    expect(page).toContain('.then(() => true)');
    expect(page).toContain('.catch(() => false)');
    expect(page).toContain("if (!confirmed) return");
  });
});
