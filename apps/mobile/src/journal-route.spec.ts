import { describe, expect, it } from "vitest";
import { parseJournalId } from "./journal-route";

describe("journal routes", () => {
  it("distinguishes the feed from a specific record", () => {
    expect(parseJournalId(undefined)).toBe(0);
    expect(parseJournalId("3")).toBe(3);
  });
  it("rejects malformed and unsafe record links rather than opening the feed", () => {
    for (const value of ["", "abc", "-1", "0", "1.5", " 3", "3e2", "9007199254740992", ["3"]]) {
      expect(parseJournalId(value)).toBeNull();
    }
  });
});
