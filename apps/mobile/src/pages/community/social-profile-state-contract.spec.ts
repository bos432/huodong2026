import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "social-profile.vue"), "utf8");

describe("social profile tenant state contract", () => {
  it("uses the shared loading and error state components", () => {
    expect(source).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(source).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="loadError"');
    expect(source).toContain('action-text="重新加载"');
    expect(source).toContain('@action="load"');
    expect(source).not.toContain('class="state"');
  });

  it("guards profile reads against stale tenant or repeated page loads", () => {
    expect(source).toContain("createTenantLoadGuard");
    expect(source).toContain("const loadToken = loadGuard.begin();");
    expect(source).toContain("if (!loadGuard.isCurrent(loadToken)) return;");
  });

  it("does not navigate or show success for a stale profile submission", () => {
    expect(source).toContain("const tenantCode = getCurrentTenantCode();");
    expect(source).toContain("if (getCurrentTenantCode() !== tenantCode) return;");
  });
});
