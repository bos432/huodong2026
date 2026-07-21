import { describe, expect, it } from "vitest";
import { marketingPopupEventCounter } from "./marketing-popup-event";

describe("marketing popup event counter", () => {
  it("maps supported events and defaults to impressions", () => {
    expect(marketingPopupEventCounter("click")).toBe("clickCount");
    expect(marketingPopupEventCounter("close")).toBe("closeCount");
    expect(marketingPopupEventCounter("unknown")).toBe("impressionCount");
  });
});
