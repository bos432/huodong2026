import { describe, expect, it } from "vitest";
import { normalizeMemberSegmentRules, validateMemberSegmentRulesInput } from "./member-segment-rules";

describe("member segment rules", () => {
  it("normalizes and deduplicates supported conditions", () => expect(normalizeMemberSegmentRules({ levelIds: [2, "2", 3], minGrowth: "300", anyTags: ["活跃", "活跃", "VIP"] })).toEqual({ levelIds: [2, 3], minGrowth: 300, anyTags: ["活跃", "VIP"] }));
  it("drops unsafe or unsupported values", () => expect(normalizeMemberSegmentRules({ minPoints: -1, activeWithinDays: "x", sourceChannels: ["h5", ""] })).toEqual({ sourceChannels: ["h5"] }));
  it("strictly rejects unknown, invalid, and contradictory rules on writes", () => {
    expect(validateMemberSegmentRulesInput({ unknown: true }).errors).toContain("不支持的分群规则字段：unknown");
    expect(validateMemberSegmentRulesInput({ minPoints: -1 }).errors).toContain("minPoints 必须为非负整数");
    expect(validateMemberSegmentRulesInput({ minPoints: 20, maxPoints: 10 }).errors).toContain("minPoints 不能大于 maxPoints");
    expect(validateMemberSegmentRulesInput({ activeWithinDays: 7, inactiveForDays: 30 }).errors).toContain("近几日活跃与沉睡天数范围互相冲突");
    expect(validateMemberSegmentRulesInput({ sourceChannels: ["unknown"] }).errors).toContain("sourceChannels 包含不支持的来源渠道");
    expect(validateMemberSegmentRulesInput({ anyTags: ["x".repeat(41)] }).errors).toContain("anyTags 单项不能超过 40 个字符");
  });

  it("accepts supported strict rules and keeps normalized values", () => {
    expect(validateMemberSegmentRulesInput({ levelIds: [2, "2"], minSpent: "12.5", sourceChannels: ["h5"] })).toEqual({ rules: { levelIds: [2], minSpent: 12.5, sourceChannels: ["h5"] }, errors: [] });
  });
});
