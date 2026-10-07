import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "social.vue"), "utf8");

describe("social actions tenant state contract", () => {
  it("does not apply stale follow results after a tenant change", () => {
    expect(source).toContain("const tenantCode = getCurrentTenantCode();");
    expect(source).toContain("if (tenantCode !== getCurrentTenantCode()) return;");
  });
});
