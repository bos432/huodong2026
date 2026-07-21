import { describe, expect, it } from "vitest";
import { memberCanAccessCourse, normalizedCourseCompletionThreshold } from "./course-access-mode";
describe("course access modes", () => {
  it("allows level rank or explicit course benefit", () => {
    expect(memberCanAccessCourse({ accessMode: "member", requiredLevelSort: 3, memberLevelSort: 3 })).toBe(true);
    expect(memberCanAccessCourse({ accessMode: "member", requiredLevelSort: 3, memberLevelSort: 2 })).toBe(false);
    expect(memberCanAccessCourse({ accessMode: "member", requiredLevelSort: 9, memberLevelSort: 1, benefits: [{ key: "course_access" }] })).toBe(true);
  });
  it("normalizes completion threshold", () => { expect(normalizedCourseCompletionThreshold(0)).toBe(100); expect(normalizedCourseCompletionThreshold(120)).toBe(100); expect(normalizedCourseCompletionThreshold(60)).toBe(60); });
});
