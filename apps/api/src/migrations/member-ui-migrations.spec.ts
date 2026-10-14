import { describe, expect, it, vi } from "vitest";
import { MemberHostApplicationOwnership1788653800000 } from "./1788653800000-MemberHostApplicationOwnership";
import { MemberNotificationReadState1788653700000 } from "./1788653700000-MemberNotificationReadState";

describe("notification migration foreign-key rollback", () => {
  it("restores a supporting user index before dropping the composite index used by the foreign key", async () => {
    const runner: any = {
      getTable: vi.fn().mockResolvedValue({ indices: [{ name: "IDX_notification_member_inbox", columnNames: ["userId", "tenantScopeKey", "channel", "status", "id"] }], foreignKeys: [{ columnNames: ["userId"] }] }),
      createIndex: vi.fn(), dropIndex: vi.fn(), hasColumn: vi.fn().mockResolvedValue(true), dropColumn: vi.fn()
    };
    await new MemberNotificationReadState1788653700000().down(runner);
    expect(runner.createIndex).toHaveBeenCalledWith("notifications", expect.objectContaining({ columnNames: ["userId"] }));
    expect(runner.createIndex.mock.invocationCallOrder[0]).toBeLessThan(runner.dropIndex.mock.invocationCallOrder[0]);
  });
});

describe.each([
  { migration: new MemberHostApplicationOwnership1788653800000(), table: "ambassador_applications", expected: ["applicantUserId", "applicantTenantScopeKey"] },
  { migration: new MemberNotificationReadState1788653700000(), table: "notifications", expected: ["readAt"] }
])("incremental member schema migration", ({ migration, table, expected }) => {
  it("can run twice and roll back without touching existing columns", async () => {
    const columns = new Set(["id", "status"]);
    const indexes: any[] = [];
    const runner: any = {
      hasColumn: vi.fn(async (_table, name) => columns.has(name)),
      getTable: vi.fn(async () => ({ indices: indexes })),
      addColumn: vi.fn(async (_table, column) => columns.add(column.name)),
      createIndex: vi.fn(async (_table, index) => indexes.push(index)),
      dropIndex: vi.fn(async () => indexes.splice(0)),
      dropColumn: vi.fn(async (_table, name) => columns.delete(name))
    };
    await migration.up(runner);
    await migration.up(runner);
    expect(runner.addColumn).toHaveBeenCalledTimes(expected.length);
    expect(runner.createIndex).toHaveBeenCalledTimes(1);
    for (const column of expected) expect(columns.has(column)).toBe(true);
    expect(runner.addColumn.mock.calls.every(([name]: any[]) => name === table)).toBe(true);
    await migration.down(runner);
    await migration.down(runner);
    expect([...columns]).toEqual(["id", "status"]);
    expect(indexes).toHaveLength(0);
    expect(runner.dropColumn).toHaveBeenCalledTimes(expected.length);
  });
});
