import { describe, expect, it } from "vitest";
import { completeChallengeTask, createChallengeProgress, getChallengeProgress } from "./challenge-flow";

describe("demo challenge flow", () => {
  it("starts with no completed tasks and derives progress from the task list", () => {
    const progress = createChallengeProgress(3);

    expect(progress.completedTaskIds).toEqual([]);
    expect(getChallengeProgress(progress, 3)).toEqual({ completed: 0, total: 3, percent: 0, status: "not_started" });
  });

  it("completes one task exactly once and reports an in-progress challenge", () => {
    const initial = createChallengeProgress(3);
    const next = completeChallengeTask(initial, "observe-1");
    const repeated = completeChallengeTask(next, "observe-1");

    expect(next.completedTaskIds).toEqual(["observe-1"]);
    expect(repeated).toEqual(next);
    expect(getChallengeProgress(next, 3)).toEqual({ completed: 1, total: 3, percent: 33, status: "in_progress" });
  });

  it("reports completed only after every task is completed", () => {
    let progress = createChallengeProgress(2);
    progress = completeChallengeTask(progress, "one");
    progress = completeChallengeTask(progress, "two");

    expect(getChallengeProgress(progress, 2)).toEqual({ completed: 2, total: 2, percent: 100, status: "completed" });
  });
});
