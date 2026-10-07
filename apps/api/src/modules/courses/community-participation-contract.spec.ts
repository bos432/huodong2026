import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("community participation contract", () => {
  const controller = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const mobilePublish = readFileSync("../../apps/mobile/src/pages/community/publish.vue", "utf8");
  const mobileCommunity = readFileSync("../../apps/mobile/src/pages/community/index.vue", "utf8");
  const mobileActivityDetail = readFileSync("../../apps/mobile/src/pages/activity/detail.vue", "utf8");
  const mobileRegistration = readFileSync("../../apps/mobile/src/pages/user/registration.vue", "utf8");
  const mobileSpace = readFileSync("../../apps/mobile/src/pages/activity/space.vue", "utf8");
  const shared = readFileSync("../../packages/shared/src/index.ts", "utf8");
  const v1Service = readFileSync("src/modules/v1/v1.service.ts", "utf8");

  it("allows participant posts only after a recorded check-in on an ended activity", () => {
    const block = controller.slice(controller.indexOf("private async postableActivities"), controller.indexOf("private normalizeImageUrls"));
    expect(block).toContain("registration.status = :checkedIn");
    expect(block).toContain("activity.endTime <= :now");
    expect(block).not.toContain("linkedOrder.status = :paid");
    expect(block).not.toContain("RegistrationStatus.Approved");
  });

  it("keeps the user-facing publish rule aligned with the server rule", () => {
    expect(mobilePublish).toContain("活动结束且完成签到后可发布");
    expect(mobileCommunity).toContain("活动结束且完成签到后，可以发布这场活动的心得");
  });

  it("hides publish shortcuts until the booking is checked in", () => {
    for (const page of [mobileActivityDetail, mobileRegistration]) {
      const block = page.slice(page.indexOf("const canShareActivityPost"), page.indexOf("function", page.indexOf("const canShareActivityPost")));
      expect(block).toMatch(/status === "checked_in"|registrationStatus\.value === RegistrationStatus\.CheckedIn/);
      expect(block).toContain("endTime <= Date.now()");
    }
    expect(mobileSpace).toContain("space.checkIn?.checkedIn");
    expect(mobileSpace).not.toContain('space.checkIn?.registrationId"');
    expect(shared).toContain("checkedIn?: boolean");
    const space = v1Service.slice(v1Service.indexOf("async publicActivitySpace"), v1Service.indexOf("async createActivitySpacePost"));
    expect(space).toContain("checkedIn: access.registration?.status === RegistrationStatus.CheckedIn");
  });

  it("accepts only platform-owned community image objects", () => {
    const imageBlock = controller.slice(controller.indexOf("private async normalizeUserImageUrls"), controller.indexOf("private async publicLessonView"));
    expect(imageBlock).toContain("await this.objectStorage.isPublicAssetUrlAllowed");
    expect(imageBlock).toContain("community-posts-t");
    expect(controller).toContain("const images = await this.normalizeImageUrls(dto.images)");
  });
});
