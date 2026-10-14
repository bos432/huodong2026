import { describe, expect, it } from "vitest";
import { mockChallenges } from "../../mock/challenge";

describe("check-in demo challenge readiness", () => {
  it("exposes an executable task for every demo challenge", () => {
    expect(mockChallenges.length).toBeGreaterThan(0);

    for (const challenge of mockChallenges) {
      expect(challenge.isDemo).toBe(true);
      expect(challenge.tasks.length).toBeGreaterThan(0);
      expect(challenge.tasks.every((task) => task.id && task.title && task.description)).toBe(true);
    }
  });

  it("keeps city observation separate from activity attendance while saving account notes", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("./index.vue", import.meta.url), "utf8")
    );
    const detailSource = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("./detail.vue", import.meta.url), "utf8")
    );

    expect(source).toContain("/pages/checkin/detail?id=");
    expect(source).toContain("慢体验");
    expect(source).toContain("不等同于活动签到");
    expect(source).toContain("不会生成真实活动记录");
    expect(detailSource).toContain("saveExperience()");
    expect(detailSource).toContain("createCloudExperience(account, draft, businessKey, draft.photoPath)");
    expect(detailSource).not.toContain("saveExperienceRecord(uni");
    expect(detailSource).toContain("experienceDraftError");
    expect(detailSource).toContain("uni.chooseImage");
    expect(detailSource).toContain("保存这次慢体验");
    expect(detailSource).toContain("申请公开");
    expect(detailSource).toContain("查看我的慢体验记录");
    expect(detailSource).toContain("不会生成真实活动记录");
  });

  it("shows saved slow-experience notes in the personal activity record center", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("../prototype/me.vue", import.meta.url), "utf8")
    );
    expect(source).toContain("readExperienceRecords");
    expect(source).toContain("CloudExperienceGallery");
    expect(source).toContain("旧演示数据 · 未绑定账号，不会自动上传");
    expect(source).toContain("isGuest && experienceRecords.length");
    expect(source).toContain("仅显示当前账号真实报名成功的活动");
    expect(source).toContain("删除这页手记？");
    expect(source).toContain("无法撤销");
  });
});
