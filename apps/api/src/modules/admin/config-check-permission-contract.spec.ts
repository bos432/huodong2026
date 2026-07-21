import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("config check permission contract", () => {
  it("opens the read-only inspection page to delegated system viewers", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");
    const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");

    expect(router).toContain('{ path: "config-check", component: ConfigCheck, meta: { roles: ["system.view"], scope: "platform" } }');
    expect(menu).toContain('{ index: "/config-check", icon: "Monitor", label: "上线体检", roles: ["system.view"], scope: "platform" }');
    expect(permissions).toContain('if (path.startsWith("system/")) return write ? "system.manage" : "system.view"');
  });

  it("keeps inspection failures visible and independently retryable", () => {
    const page = read("apps/admin/src/views/ConfigCheck.vue");

    expect(page).toContain('const loadError = ref("")');
    expect(page).toContain('loadError.value = error.message || "加载上线体检失败"');
    expect(page).toContain('v-if="loadError" class="error-recovery"');
    expect(page).toContain("重试体检");
    expect(page).toContain('v-if="!loading && !loadError && !(report?.checks || []).length"');
  });
});
