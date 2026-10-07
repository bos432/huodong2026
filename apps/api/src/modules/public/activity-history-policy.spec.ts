import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("activity browsing history visibility", () => {
  const service = readFileSync(resolve(process.cwd(), "src/modules/public/public.service.ts"), "utf8");

  it("does not discard ended activities before participation filtering", () => {
    const methodStart = service.indexOf("async myActivityHistory(");
    const methodEnd = service.indexOf("\n  async ", methodStart + 10);
    const method = service.slice(methodStart, methodEnd > methodStart ? methodEnd : undefined);

    expect(method).not.toContain('andWhere("activity.status = :status"');
    expect(method).toContain("participatedActivityIds");
    expect(method).toContain("participatedActivityIds.has(row.activity.id)");
  });

  it("keeps ended history scoped to the active tenant or explicitly null tenant", () => {
    const methodStart = service.indexOf("async myActivityHistory(");
    const methodEnd = service.indexOf("\n  async ", methodStart + 10);
    const method = service.slice(methodStart, methodEnd > methodStart ? methodEnd : undefined);

    expect(method).toContain("activity.tenantId = :tenantId OR activity.tenantId IS NULL");
    expect(method).toContain("activityTenant.enabled = :tenantEnabled");
  });
});
