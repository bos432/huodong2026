import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("course learning cross-client consistency guard", () => {
  const controller = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const entity = readFileSync("src/entities/user-learning.entity.ts", "utf8");
  const mobileApi = readFileSync("../mobile/src/api.ts", "utf8");
  const player = readFileSync("../mobile/src/pages/course/player.vue", "utf8");
  const myCourses = readFileSync("../mobile/src/pages/user/courses.vue", "utf8");
  const myOrders = readFileSync("../mobile/src/pages/user/orders.vue", "utf8");

  it("keeps one monotonic progress row per user, course and lesson", () => {
    expect(entity).toContain('@Index("IDX_user_learning_user_course_lesson", ["userId", "courseId", "lessonId"], { unique: true })');
    expect(controller).toContain("progress = GREATEST(progress, ?)");
    expect(controller).toContain("WHEN completedAt IS NOT NULL THEN completedAt");
    expect(controller).toContain("if (!Number.isFinite(requestedProgress))");
  });

  it("restores the recent lesson and rate-limits automatic media progress writes", () => {
    expect(controller).toContain("recentLessonId");
    expect(controller).toContain("learningUpdatedAt");
    expect(player).toContain("rawCourse.value?.recentLessonId");
    expect(player).toContain("lastAutoSavedBucket");
    expect(player).toContain("Math.floor(current / 30)");
    expect(player).toContain("onShow(loadCourse)");
    expect(player).toContain("goAdjacentLesson(-1)");
    expect(player).toContain("goAdjacentLesson(1)");
    expect(myCourses).toContain("/pages/course/player?id=");
    expect(myOrders).toContain("onShow(() =>");
  });

  it("does not destroy a valid session for a business-level forbidden response", () => {
    expect(mobileApi.match(/res\.statusCode === 401\) clearUser\(\)/g)).toHaveLength(2);
    expect(mobileApi).not.toContain("res.statusCode === 401 || res.statusCode === 403");
    expect(myOrders).toContain('order.owned === undefined ? order.status === "paid" : Boolean(order.owned)');
  });
});
