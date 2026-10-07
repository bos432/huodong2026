import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "profile.vue"), "utf8");

describe("profile mutation tenant state contract", () => {
  it("does not apply avatar or profile writes after a tenant change", () => {
    expect(source).toContain("const tenantCode = getCurrentTenantCode();");
    expect(source).toContain("if (getCurrentTenantCode() !== tenantCode) return;");
    expect(source).toContain("if (getCurrentTenantCode() === tenantCode)");
  });
});
