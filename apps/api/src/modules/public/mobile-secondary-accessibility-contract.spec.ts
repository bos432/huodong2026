import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile secondary accessibility contract", () => {
  it("keeps brand and service entries keyboard reachable", () => {
    const brand = readFileSync(resolve(process.cwd(), "../mobile/src/pages/brand/story.vue"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "../mobile/src/pages/service/index.vue"), "utf8");
    expect(brand).toContain('@keyup.space.prevent="goDean"');
    expect(brand).toContain('@keyup.space.prevent="goAmbassador"');
    expect(brand).toContain('@keyup.space.prevent="goAid"');
    expect(service).toContain('@keyup.space.prevent="copy(setting.customerServicePhone)"');
    expect(service).toContain('@keyup.space.prevent="copy(setting.customerServiceWechat)"');
    expect(service).toContain('@keyup.space.prevent="goPartner"');
  });

  it("keeps content filters and contribution certificate actions keyboard reachable", () => {
    const courses = readFileSync(resolve(process.cwd(), "../mobile/src/pages/courses/index.vue"), "utf8");
    const charity = readFileSync(resolve(process.cwd(), "../mobile/src/pages/charity/index.vue"), "utf8");
    expect(courses).toContain('@keyup.space.prevent="activeCategory = cat.key"');
    expect(courses).toContain('@keyup.space.prevent="activeSort = opt.key"');
    expect(courses).toContain('@keyup.space.prevent="goDetail(course)"');
    expect(charity).toContain('@keyup.space.prevent="previewContributionCertificate(item)"');
    expect(charity).toContain('@keyup.space.prevent="downloadContributionCertificate(item)"');
    expect(charity).toContain('@keyup.space.prevent="verifyContributionCertificate(item)"');
  });

  it("keeps check-in pickers keyboard reachable without DOM APIs", () => {
    const checkin = readFileSync(resolve(process.cwd(), "../mobile/src/pages/admin/check-in.vue"), "utf8");
    expect(checkin).toContain('@keyup.space.prevent="openActivityPicker"');
    expect(checkin).toContain('@keyup.space.prevent="openPointPicker"');
    expect(checkin).toContain("uni.showActionSheet");
  });
});
