import { describe, expect, it } from "vitest";
import { courseAvailableToUser, protectedCourseLesson } from "./course-resource-access";

describe("course resource access", () => {
  it("keeps unpublished courses available to owners only", () => {
    expect(courseAvailableToUser("draft", true)).toBe(true);
    expect(courseAvailableToUser("draft", false)).toBe(false);
    expect(courseAvailableToUser("published", false)).toBe(true);
  });

  it("redacts every protected resource field", () => {
    const row = protectedCourseLesson({ videoUrl: "v", audioUrl: "a", attachmentUrl: "f", attachmentName: "n", content: "c" }, false);
    expect(row).toMatchObject({ videoUrl: null, audioUrl: null, attachmentUrl: null, attachmentName: null, content: null, locked: true });
  });
});
