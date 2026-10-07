import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("operation setting tenant scope", () => {
  it("reads tenant settings through the tenant relation and preserves legacy platform fallback", () => {
    const admin = read("src/modules/admin/admin.service.ts");
    const publicService = read("src/modules/public/public.service.ts");

    expect(admin).toContain("findOperationSettingForScope(scope)");
    expect(admin).toContain("where: { tenant: { id: scope.tenant.id } }");
    expect(admin).toContain("where: { tenant: IsNull() }");
    expect(admin).toContain("legacy.id !== 1");
    expect(publicService).toContain("where: { tenant: { id: tenant.id } }");
    expect(publicService).toContain("findOneBy({ id: 1 })");
    expect(publicService).toContain("legacy.tenant.id === tenant.id");
  });

  it("does not use a tenant id as the primary lookup for new public settings", () => {
    const publicService = read("src/modules/public/public.service.ts");
    const method = publicService.slice(publicService.indexOf("private async ensureOperationSetting"), publicService.indexOf("private async assertRegistrationEnabled"));
    expect(method).toContain("where: { tenant: { id: tenant.id } }");
    expect(method).not.toContain("let setting = await this.operationSettings.findOneBy({ id });");
  });
});
