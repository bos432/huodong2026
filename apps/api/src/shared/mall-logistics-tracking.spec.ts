import { describe, expect, it } from "vitest";
import { normalizeMallTrackingStatus, parseMallTrackingPayload } from "./mall-logistics-tracking";

describe("mall logistics tracking", () => {
  it("parses common provider payload shapes in chronological order", () => {
    const rows = parseMallTrackingPayload({ data: { traces: [
      { AcceptTime: "2026-07-13 12:00:00", AcceptStation: "上海市 已签收" },
      { AcceptTime: "2026-07-12 09:00:00", AcceptStation: "快件已揽收" }
    ] } });
    expect(rows.map((row) => row.status)).toEqual(["in_transit", "delivered"]);
  });

  it("normalizes delivery and exception descriptions", () => {
    expect(normalizeMallTrackingStatus("", "快件已妥投")).toBe("delivered");
    expect(normalizeMallTrackingStatus("failed", "派送异常")).toBe("exception");
  });
});
