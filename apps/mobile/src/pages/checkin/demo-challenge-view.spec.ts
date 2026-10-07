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

  it("keeps the challenge page connected to a detail route and completion action", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("./index.vue", import.meta.url), "utf8")
    );
    const detailSource = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("./detail.vue", import.meta.url), "utf8")
    );

    expect(source).toContain("/pages/checkin/detail?id=");
    expect(source).toContain("开始演示挑战");
    expect(source).toContain("暂无任务");
    expect(detailSource).toContain("completeTask(task.id)");
    expect(detailSource).toContain("uni.setStorageSync");
  });
});
