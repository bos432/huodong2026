import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("host application authentication boundary", () => {
  const controller = readFileSync(resolve(__dirname, "public.controller.ts"), "utf8");
  const service = readFileSync(resolve(__dirname, "public.service.ts"), "utf8");
  it("requires an authenticated user before the host submission and skips partner marketing gate", () => {
    const method = controller.slice(controller.indexOf('async submitAmbassadorApplication'), controller.indexOf('@Post("aid/applications")'));
    expect(method).toContain('if (dto.source === "host_apply")');
    expect(method).toContain('requireUserFromAuthorization(req.headers?.authorization)');
    expect(method).toContain('submitAmbassadorApplication(dto, user, context)');
    expect(method.indexOf('submitAmbassadorApplication(dto, user, context)')).toBeLessThan(method.indexOf('assertFeatureGateEnabled'));
  });
  it("does not treat review approval as workspace permission or borrow another tenant's access", () => {
    const method = service.slice(service.indexOf('async myHostApplication'), service.indexOf('async submitAmbassadorApplication'));
    expect(method).toContain('this.myAdminAccess(user)');
    expect(method).toContain('access.tenantId === (tenant?.id ?? null)');
    expect(method).not.toContain('status === "approved"');
  });
});
