import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("automatic notification operation-setting scope", () => {
  it("looks up tenant settings through the tenant relation", () => {
    for (const path of [
      "src/modules/reliability/automatic-sms.service.ts",
      "src/modules/reliability/automatic-wechat.service.ts",
      "src/modules/reliability/post-event-automation.service.ts"
    ]) {
      const source = read(path);
      expect(source).toContain("where: { tenant: { id: tenantId } }");
      expect(source).not.toContain("where: { id: tenantId || 1 }");
    }
    const publicService = read("src/modules/v1/v1.service.ts");
    expect(publicService).toContain("where: { tenant: { id: tenant.id } }");
    expect(publicService).not.toContain("findOneBy({ id: tenant?.id || 1 })");
    const publicActivityService = read("src/modules/public/public.service.ts");
    expect(publicActivityService).toContain("where: { tenant: { id: tenant.id } }");
    expect(publicActivityService).toContain("findOneBy({ id: 1 })");
  });

  it("uses the platform-scoped setting when no tenant is selected", () => {
    for (const path of [
      "src/modules/reliability/automatic-sms.service.ts",
      "src/modules/reliability/automatic-wechat.service.ts",
      "src/modules/reliability/post-event-automation.service.ts"
    ]) {
      expect(read(path)).toContain("where: { tenant: IsNull() }");
    }
    expect(read("src/modules/v1/v1.service.ts")).toContain("where: { tenant: IsNull() }");
  });
});
