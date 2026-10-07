import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.vue", import.meta.url), "utf8");

describe("check-in challenge view contract", () => {
  it("imports computed before deriving local records", () => {
    expect(source).toContain('import { computed, ref } from "vue";');
  });
});
