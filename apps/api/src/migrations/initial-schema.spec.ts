import { describe, expect, it, vi } from "vitest";
import { InitialApplicationSchema1780480000000 } from "./1780480000000-InitialApplicationSchema";

describe("initial application schema", () => {
  it("leaves an existing deployment's schema and data untouched", async () => {
    const query = vi.fn().mockResolvedValue(["users", "activities", "notifications", "migrations"].map(name => ({ name })));
    const runner = { query };
    await new InitialApplicationSchema1780480000000().up(runner as any);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("TABLE_SCHEMA = DATABASE()");
  });
  it("does not try to repair an unknown partially installed database", async () => {
    const query = vi.fn().mockResolvedValue([{ name: "notifications" }]);
    const runner = { query };
    await expect(new InitialApplicationSchema1780480000000().up(runner as any)).rejects.toThrow("not empty");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("never drops application records during rollback", async () => {
    const query = vi.fn();
    await expect(new InitialApplicationSchema1780480000000().down({ query } as any)).rejects.toThrow("backup");
    expect(query).not.toHaveBeenCalled();
  });
  it("creates an empty current database using only frozen create/add statements", async () => {
    const query = vi.fn().mockResolvedValue([{ name: "migrations" }]);
    await new InitialApplicationSchema1780480000000().up({ query } as any);
    const writes = query.mock.calls.slice(1).map(call => call[0]);
    expect(writes.filter(sql => sql.startsWith("CREATE TABLE"))).toHaveLength(225);
    expect(writes.every(sql => /^(CREATE TABLE|ALTER TABLE .+ ADD)/.test(sql))).toBe(true);
  });
});
