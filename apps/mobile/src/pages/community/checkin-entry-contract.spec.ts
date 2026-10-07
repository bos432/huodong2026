import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.vue", import.meta.url), "utf8");

describe("community check-in entry", () => {
  it("opens the canonical local challenge flow", () => {
    expect(source).toContain('withTenantCode("/pages/checkin/index")');
    expect(source).not.toContain('"/pages/community/checkin"');
  });
});
