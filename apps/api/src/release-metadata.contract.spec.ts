import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// The release helper is an intentionally runtime-loaded ESM script; API builds
// are CommonJS, so the test keeps the import while suppressing its missing .d.ts.
// @ts-expect-error release-metadata.mjs is validated as a deployable script.
import { commitMatchesArtifact, isCommitIdentifier, isReleaseId, releaseIdFor, releaseIdentifiersMatch } from "../../../scripts/release-metadata.mjs";

const repoFile = (relativePath: string) => resolve(process.cwd(), "../..", relativePath);

describe("release metadata delivery contract", () => {
  it("accepts release IDs generated from a build timestamp", () => {
    expect(releaseIdFor("10dba7954ea293dec6c9056b3f7233c44f56b4b1", "2026-10-02T19:10:00.000Z")).toBe("20261002-10dba795");
    expect(isReleaseId("20261002-10dba795")).toBe(true);
    expect(isReleaseId("2026-10-02-10dba795")).toBe(false);
    expect(isCommitIdentifier("10dba795")).toBe(true);
    expect(isCommitIdentifier("replace-with-release-commit-or-image-digest")).toBe(false);
  });

  it("matches short and full Git identifiers but not unrelated identifiers", () => {
    const full = "10dba7954ea293dec6c9056b3f7233c44f56b4b1";
    expect(commitMatchesArtifact("10dba795", full)).toBe(true);
    expect(releaseIdentifiersMatch(full, "10dba795")).toBe(true);
    expect(releaseIdentifiersMatch("sha256:abc", "sha256:def")).toBe(false);
  });

  it("keeps every deploy script on the dynamic release ID guard", () => {
    for (const script of ["scripts/deploy-scoped-release.mjs", "scripts/deploy-admin-static.mjs", "scripts/deploy-h5-static.mjs"]) {
      expect(readFileSync(repoFile(script), "utf8"), script).toContain("isReleaseId(releaseId)");
    }
  });

  it("ships release script dependencies in the scoped bundle", () => {
    const source = readFileSync(repoFile("scripts/assemble-scoped-release.mjs"), "utf8");
    for (const script of ["deploy-scoped-release.mjs", "deploy-admin-static.mjs", "deploy-h5-static.mjs", "release-metadata.mjs"]) {
      expect(source, script).toContain(script);
    }
  });
});
