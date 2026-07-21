import { describe, expect, it } from "vitest";
import { isDuplicateEntryError } from "./database-errors";

describe("database errors", () => {
  it("recognizes direct and wrapped MySQL duplicate entry errors", () => {
    expect(isDuplicateEntryError({ code: "ER_DUP_ENTRY" })).toBe(true);
    expect(isDuplicateEntryError({ driverError: { errno: 1062 } })).toBe(true);
    expect(isDuplicateEntryError({ code: "ER_LOCK_DEADLOCK" })).toBe(false);
    expect(isDuplicateEntryError(null)).toBe(false);
  });
});
