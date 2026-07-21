import { describe, expect, it } from "vitest";
import { boundedPercentage } from "./dashboard-metrics";

describe("dashboard metrics", () => {
  it("calculates a one-decimal percentage", () => {
    expect(boundedPercentage(1, 3)).toBe(33.3);
  });

  it("caps incomplete event data at one hundred percent", () => {
    expect(boundedPercentage(10320, 102)).toBe(100);
  });

  it("returns zero for missing or invalid denominators", () => {
    expect(boundedPercentage(10, 0)).toBe(0);
    expect(boundedPercentage(10, Number.NaN)).toBe(0);
  });
});
