import { describe, expect, it } from "vitest";
import { getChallengeRecordSummary } from "./challenge-records";

describe("local challenge records", () => {
  it("turns saved progress into an explicit demo record", () => {
    expect(getChallengeRecordSummary({ id: 1, title: "慢π城市观察记录", total: 3, completed: 2 })).toEqual({
      id: 1,
      title: "慢π城市观察记录",
      status: "进行中",
      progress: "2 / 3",
      note: "本地演示记录 · 不代表真实活动参与"
    });
  });

  it("keeps an untouched challenge out of the records list", () => {
    expect(getChallengeRecordSummary({ id: 2, title: "周末慢走练习", total: 2, completed: 0 })).toBeNull();
  });
});
