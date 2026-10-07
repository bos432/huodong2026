import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./main.ts", import.meta.url), "utf8");

describe("global slowpi design tokens", () => {
  it("loads tokens from the app entry so :root variables are not scoped away", () => {
    expect(source).toContain('import "./styles/tokens.css";');
  });
});
