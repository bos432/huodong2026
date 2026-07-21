import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("conversion event governance", () => {
  it("enforces database idempotency and backfills every funnel stage", () => {
    const entity = read("src/entities/conversion-event.entity.ts");
    const migration = read("src/migrations/1783900000000-ConversionEventGovernance.ts");
    expect(entity).toContain('UQ_conversion_events_idempotency_key');
    expect(migration).toContain("ALTER TABLE conversion_events ADD UNIQUE INDEX");
    expect(migration).toContain("WHERE check_in.revokedAt IS NOT NULL");
    for (const type of ["register", "pay", "check_in", "review", "share_visit", "cancel", "refund", "view"]) {
      expect(migration).toContain(`'${type}'`);
    }
  });

  it("uses insert-ignore writes and Beijing activity-view day keys", () => {
    const publicService = read("src/modules/public/public.service.ts");
    const adminService = read("src/modules/admin/admin.service.ts");
    const v1Service = read("src/modules/v1/v1.service.ts");
    const refundService = read("src/modules/refund-completion.service.ts");
    expect(publicService).toContain("const day = analyticsDateText(new Date())");
    expect(publicService).toContain("if (!event) return");
    expect(publicService).toContain(".orIgnore().updateEntity(false).execute()");
    expect(adminService).toContain(".orIgnore().updateEntity(false)\n      .execute()");
    expect(adminService).toContain('delete({ idempotencyKey: `check_in:${id}` })');
    expect(v1Service).toContain('recordConversionEvent("review"');
    expect(v1Service).toContain('recordConversionEvent("share_visit"');
    expect(refundService).toContain('idempotencyKey: `refund:${savedRefund.id}`');
  });
});
