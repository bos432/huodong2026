import { describe, expect, it } from "vitest";
import { fenToYuan, sameMoneyAmount, yuanToFen } from "./money";

describe("money", () => {
  it("converts yuan to integer fen without floating point arithmetic", () => {
    expect(yuanToFen("19.90")).toBe(1990);
    expect(yuanToFen("0.01")).toBe(1);
    expect(yuanToFen(12)).toBe(1200);
  });
  it("converts fen to a fixed two-decimal yuan string", () => {
    expect(fenToYuan(1990)).toBe("19.90");
    expect(fenToYuan(-1)).toBe("-0.01");
    expect(fenToYuan("3375")).toBe("33.75");
    expect(fenToYuan("-1")).toBe("-0.01");
  });
  it("rejects non-integer and unsafe database cent values", () => {
    expect(() => fenToYuan("33.75")).toThrow("Money cents must be a safe integer");
    expect(() => fenToYuan("9007199254740992")).toThrow("Money cents must be a safe integer");
  });
  it("rejects values with sub-cent precision", () => expect(() => yuanToFen("1.001")).toThrow());
  it("compares callback amounts in integer fen", () => {
    expect(sameMoneyAmount("19.90", 19.9)).toBe(true);
    expect(sameMoneyAmount("19.90", "19.91")).toBe(false);
    expect(sameMoneyAmount("19.90", "19.9001")).toBe(false);
  });
});
