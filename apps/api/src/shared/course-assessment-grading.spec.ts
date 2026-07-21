import { describe, expect, it } from "vitest";
import { assessmentPassed, gradeObjectiveQuestion } from "./course-assessment-grading";
describe("course assessment grading", () => {
  it("grades objective questions independent of answer order", () => { expect(gradeObjectiveQuestion({ type:"multiple", correctAnswer:["A","C"], score:20 }, ["C","A"])).toEqual({ correct:true, score:20, manual:false }); });
  it("defers essay grading and calculates pass percentage", () => { expect(gradeObjectiveQuestion({ type:"essay", score:30 }, "text").manual).toBe(true); expect(assessmentPassed(60, 100, 60)).toBe(true); });
});
