import { describe, expect, it } from "vitest";
import { memberSegmentScopeMatches } from "./member-segment-scope";

describe("member segment strict scope", () => {
  it("allows the same tenant scope", () => expect(memberSegmentScopeMatches(23, 23)).toBe(true));
  it("allows platform scope to access platform rows", () => expect(memberSegmentScopeMatches(null, null)).toBe(true));
  it("rejects tenant access to platform rows", () => expect(memberSegmentScopeMatches(23, null)).toBe(false));
  it("rejects platform access to tenant rows through scoped endpoints", () => expect(memberSegmentScopeMatches(null, 23)).toBe(false));
  it("rejects a different tenant", () => expect(memberSegmentScopeMatches(23, 24)).toBe(false));
  it("rejects a mismatched persisted scope key even when the relation looks valid", () => expect(memberSegmentScopeMatches(23, 23, "tenant:24")).toBe(false));
});
