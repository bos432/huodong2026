import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "../mobile/src/error-reporting.ts"), "utf8");

function sourceClassifies(message: string) {
  const patterns = [
    "chunkloaderror",
    "loading chunk",
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed"
  ];
  for (const pattern of patterns) {
    expect(source).toContain(`"${pattern}"`);
  }
  return patterns.some((pattern) => message.toLowerCase().includes(pattern));
}

describe("H5 stale chunk recovery", () => {
  it.each([
    "ChunkLoadError: Loading chunk 42 failed",
    "Loading chunk pages-activity-detail failed",
    "Failed to fetch dynamically imported module",
    "Error loading dynamically imported module",
    "Importing a module script failed"
  ])("recognizes versioned asset failures: %s", (message) => {
    expect(sourceClassifies(message)).toBe(true);
  });

  it("does not classify ordinary API or validation failures as stale chunks", () => {
    expect(sourceClassifies("Request failed with status 500")).toBe(false);
    expect(sourceClassifies("请填写手机号")).toBe(false);
    expect(source).toContain("if (!isStaleChunkError(error)");
    expect(source).toContain("if (recoverStaleChunk(error)) return");
  });
});
