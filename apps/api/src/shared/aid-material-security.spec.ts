import { describe, expect, it } from "vitest";
import { aidMaterialFileName, aidUtcDayRange, detectAidMaterialMime } from "./aid-material-security";

describe("aid material security", () => {
  it.each([
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/webp", Buffer.from("RIFF0000WEBP", "ascii")],
    ["application/pdf", Buffer.from("%PDF-1.7\n", "ascii")]
  ])("detects %s from file signatures", (mimetype, buffer) => {
    expect(detectAidMaterialMime(buffer)).toBe(mimetype);
  });

  it("rejects MIME spoofing content that has no supported signature", () => {
    expect(detectAidMaterialMime(Buffer.from("not a pdf"))).toBeNull();
  });

  it("normalizes the encrypted original filename extension to the detected type", () => {
    expect(aidMaterialFileName("身份证.jpg", "application/pdf")).toBe("身份证.pdf");
    expect(aidMaterialFileName("../危险|材料", "image/png")).toBe(".._危险_材料.png");
  });

  it("uses a stable UTC calendar-day window for submission limits", () => {
    expect(aidUtcDayRange(new Date("2026-07-14T23:59:59.000Z"))).toEqual({
      start: new Date("2026-07-14T00:00:00.000Z"),
      end: new Date("2026-07-15T00:00:00.000Z")
    });
  });
});
