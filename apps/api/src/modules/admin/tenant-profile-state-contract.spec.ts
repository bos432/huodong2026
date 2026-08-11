import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const page = fs.readFileSync(path.join(repoRoot, "apps/admin/src/views/TenantProfile.vue"), "utf8");
const service = fs.readFileSync(path.join(repoRoot, "apps/api/src/modules/admin/admin.service.ts"), "utf8");
const publicService = fs.readFileSync(path.join(repoRoot, "apps/api/src/modules/public/public.service.ts"), "utf8");
const activityDetail = fs.readFileSync(path.join(repoRoot, "apps/mobile/src/pages/activity/detail.vue"), "utf8");

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

  it("keeps explicitly public organizer profile data tenant-scoped from editing to activity detail", () => {
    expect(page).toContain('organizerLogoUrl: ""');
    expect(page).toContain('organizerIntro: ""');
    expect(page).toContain('organizerServicePromise: ""');
    expect(page).toContain('api.post<any, { url?: string }>("/admin/uploads/images"');
    expect(service).toContain('settings: { ...(this.isPlainObject(tenant.settings) ? tenant.settings : {}), organizerProfile }');
    expect(service).toContain('主办方头像必须使用 HTTPS 或站内上传路径');
    expect(publicService).toContain('organizerProfile: this.publicTenantOrganizerProfile(tenant)');
    expect(activityDetail).toContain('class="card organizer-card"');
    expect(activityDetail).toContain('activity.tenant?.organizerProfile?.servicePromise');
  });
});
