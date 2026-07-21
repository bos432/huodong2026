import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const page = fs.readFileSync(path.join(repoRoot, "apps/admin/src/views/TenantProfile.vue"), "utf8");

describe("tenant profile state contract", () => {
  it("clears and validates profile reads with a generation", () => {
    expect(page).toContain("const loadGeneration = ref(0)");
    expect(page).toContain("const generation = ++loadGeneration.value");
    expect(page).toContain("clearProfile()");
    expect(page).toContain("商家资料响应格式无效");
    expect(page).toContain('v-if="profile" class="profile-head"');
    expect(page).toContain('v-if="profile" label-position="top"');
  });

  it("locks confirmation and protects the saved profile context", () => {
    expect(page).toContain("const confirming = ref(false)");
    expect(page).toContain("const scopeLocked = computed(");
    expect(page).toContain("profile.value.id !== profileId");
    expect(page).toContain("profile.value.code !== profileCode");
    expect(page).toContain("generation !== loadGeneration.value || !sameForm(snapshot)");
    expect(page).toContain("商家资料保存响应格式无效");
    expect(page).toContain(':disabled="scopeLocked"');
  });
});
