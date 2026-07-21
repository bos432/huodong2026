import {describe,expect,it} from "vitest";
import {assertCommunityCheckinDate,communityCheckinStreak} from "./community-learning-policy";
describe("community learning policy",()=>{
  it("deduplicates dates and calculates current and longest streak",()=>{expect(communityCheckinStreak(["2026-07-01","2026-07-02","2026-07-02","2026-07-04","2026-07-05","2026-07-06"])).toEqual({current:3,longest:3,total:5});});
  it("handles month boundaries in Shanghai timezone",()=>{expect(communityCheckinStreak(["2026-06-30","2026-07-01","2026-07-02"])).toEqual({current:3,longest:3,total:3});});
  it("allows controlled makeup and rejects future or expired submissions",()=>{expect(assertCommunityCheckinDate({taskDate:"2026-07-10",submitDate:"2026-07-10",today:"2026-07-13",allowMakeup:true,makeupWithinDays:3}).makeup).toBe(true);expect(()=>assertCommunityCheckinDate({taskDate:"2026-07-09",submitDate:"2026-07-09",today:"2026-07-13",allowMakeup:true,makeupWithinDays:3})).toThrow("超过补卡期限");expect(()=>assertCommunityCheckinDate({taskDate:"2026-07-14",submitDate:"2026-07-14",today:"2026-07-13",allowMakeup:true,makeupWithinDays:3})).toThrow("不能提前打卡");});
});
