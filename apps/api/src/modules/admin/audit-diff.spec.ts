import { describe, expect, it } from "vitest";
import { auditDiff } from "./audit-diff";

describe("audit before and after snapshots", () => {
  it("lists changed fields and sanitizes both snapshots", () => {
    expect(auditDiff({ enabled: true, apiSecret: "old" }, { enabled: false, apiSecret: "new" })).toEqual({ changed: ["enabled", "apiSecret"], before: { enabled: true, apiSecret: "********" }, after: { enabled: false, apiSecret: "********" } });
  });
});
