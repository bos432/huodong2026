import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyMiniprogramPrebuilt } from "./miniprogram-prebuilt";

function fixture(run: (root: string, digest: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "mp-prebuilt-"));
  try {
    const files: Record<string, string> = { "app.json": "{}", "project.config.json": "{}", "version.json": JSON.stringify({ name: "mp-weixin", commit: "test-commit", buildTime: "2026-10-12T00:00:00Z" }) };
    const hashes: Record<string, string> = {};
    for (const [name, body] of Object.entries(files)) { writeFileSync(join(root, name), body); hashes[name] = createHash("sha256").update(body).digest("hex"); }
    const manifest = JSON.stringify({ files: hashes });
    writeFileSync(join(root, "release-manifest.json"), manifest);
    run(root, createHash("sha256").update(manifest).digest("hex"));
  } finally { rmSync(root, { recursive: true, force: true }); }
}

describe("verified miniprogram prebuilt artifact", () => {
  it("returns release metadata only for a complete verified tree", () => fixture((root, hash) => expect(verifyMiniprogramPrebuilt(root, hash).commit).toBe("test-commit")));
  it("rejects a changed manifest", () => fixture((root) => expect(() => verifyMiniprogramPrebuilt(root, "0".repeat(64))).toThrow()));
  it("rejects changed files", () => fixture((root, hash) => { writeFileSync(join(root, "app.json"), "changed"); expect(() => verifyMiniprogramPrebuilt(root, hash)).toThrow(); }));
  it("rejects unlisted files", () => fixture((root, hash) => { writeFileSync(join(root, "extra.js"), ""); expect(() => verifyMiniprogramPrebuilt(root, hash)).toThrow(); }));
  it("rejects missing files", () => fixture((root, hash) => { rmSync(join(root, "app.json")); expect(() => verifyMiniprogramPrebuilt(root, hash)).toThrow(); }));
});
