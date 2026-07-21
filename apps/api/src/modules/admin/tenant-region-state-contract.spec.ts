import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const page = fs.readFileSync(path.join(repoRoot, "apps/admin/src/views/TenantRegions.vue"), "utf8");

describe("tenant region state contract", () => {
  it("separates option and region read boundaries", () => {
    expect(page).toContain("const optionsGeneration = ref(0)");
    expect(page).toContain("const regionsGeneration = ref(0)");
    expect(page).toContain("async function loadOptions()")
    expect(page).toContain("async function loadRegions()")
    expect(page).toContain("await Promise.allSettled([loadOptions(), loadRegions()])");
    expect(page).toContain("tenants.value = []");
    expect(page).toContain("rows.value = []");
    expect(page).toContain('v-if="optionsError"');
    expect(page).toContain('v-if="regionsError"');
  });

  it("validates responses and rejects stale filter results", () => {
    expect(page).toContain("function validTenantOptions(value: unknown)");
    expect(page).toContain("function validTenantRegions(value: unknown)");
    expect(page).toContain("generation !== optionsGeneration.value");
    expect(page).toContain("generation !== regionsGeneration.value || !sameFilterSnapshot(snapshot)");
    expect(page).toContain("商家选项响应格式无效");
    expect(page).toContain("区域列表响应格式无效");
  });

  it("freezes write targets, filters and list generations", () => {
    expect(page).toContain("const filterSnapshot = currentFilterSnapshot()");
    expect(page).toContain("const generation = regionsGeneration.value");
    expect(page).toContain("current.authorizationStatus !== \"pending\"");
    expect(page).toContain("target.tenant.id !== form.tenantId");
    expect(page).toContain("既有区域不能变更所属商家");
    expect(page).toContain(':disabled="Boolean(editingId)"');
  });

  it("locks scope controls and modal exits during reads and writes", () => {
    expect(page).toContain("const scopeLocked = computed(");
    expect(page).toContain(':disabled="scopeLocked" @change="loadRegions"');
    expect(page).toContain(':disabled="writing || dialogVisible || importDialogVisible"');
    expect(page).toContain(':close-on-click-modal="!saving"');
    expect(page).toContain(':close-on-click-modal="!importing"');
  });
});
