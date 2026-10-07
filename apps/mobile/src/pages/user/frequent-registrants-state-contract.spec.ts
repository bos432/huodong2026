import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "frequent-registrants.vue"), "utf8");

describe("frequent registrants tenant state contract", () => {
  it("guards personal registrant data against stale loads", () => {
    expect(source).toContain("createTenantLoadGuard");
    expect(source).toContain("const loadToken = loadGuard.begin();");
    expect(source).toContain("if (!loadGuard.isCurrent(loadToken)) return;");
  });

  it("does not apply stale save or delete results after a tenant change", () => {
    expect(source).toContain("const tenantCode = getCurrentTenantCode();");
    expect(source).toContain("if (getCurrentTenantCode() !== tenantCode) return;");
  });
});
