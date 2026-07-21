import { describe, expect, it } from "vitest";
import { contentAudienceMatches, normalizeContentAudience } from "./content-audience";

describe("content audience", () => {
  it("matches guest and authenticated audiences", () => {
    expect(contentAudienceMatches({ mode: "guest" }, null)).toBe(true);
    expect(contentAudienceMatches({ mode: "guest" }, 7)).toBe(false);
    expect(contentAudienceMatches({ mode: "authenticated" }, 7)).toBe(true);
  });

  it("requires an allowed member level", () => {
    expect(contentAudienceMatches({ mode: "member_levels", memberLevelIds: [2, 3] }, 7, 3)).toBe(true);
    expect(contentAudienceMatches({ mode: "member_levels", memberLevelIds: [2, 3] }, 7, 5)).toBe(false);
    expect(contentAudienceMatches({ mode: "member_levels", memberLevelIds: [2, 3] }, null, 3)).toBe(false);
  });

  it("normalizes malformed rules to a safe all-users rule", () => {
    expect(normalizeContentAudience({ mode: "unknown", memberLevelIds: [1, "1", -2, "x"] })).toEqual({ mode: "all", memberLevelIds: [1] });
  });
});
