import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { commitMatchesArtifact, isCommitIdentifier, isReleaseId, releaseIdFor, releaseIdentifiersMatch } from "./release-metadata.mjs";

describe("release artifact commit matching", () => {
  it("accepts the short commit written by static artifacts", () => {
    expect(commitMatchesArtifact("10dba795", "10dba7954ea293dec6c9056b3f7233c44f56b4b1")).toBe(true);
  });

  it("rejects a commit from a different release", () => {
    expect(commitMatchesArtifact("deadbeef", "10dba7954ea293dec6c9056b3f7233c44f56b4b1")).toBe(false);
  });

  it("derives the release date from the build timestamp", () => {
    expect(releaseIdFor("10dba7954ea293dec6c9056b3f7233c44f56b4b1", "2026-10-02T19:10:00.000Z")).toBe("20261002-10dba795");
  });

  it("accepts release IDs generated from any valid build date", () => {
    expect(isReleaseId("20261002-10dba795")).toBe(true);
    expect(isReleaseId("20260907-10dba795")).toBe(true);
    expect(isReleaseId("2026-10-02-10dba795")).toBe(false);
    expect(isReleaseId("20261002-deadbeef00")).toBe(false);
  });

  it("requires a valid Git identifier for the previous release baseline", () => {
    expect(isCommitIdentifier("10dba795")).toBe(true);
    expect(isCommitIdentifier("10dba7954ea293dec6c9056b3f7233c44f56b4b1")).toBe(true);
    expect(isCommitIdentifier("replace-with-release-commit-or-image-digest")).toBe(false);
  });

  it("accepts short and full identifiers in either readiness direction", () => {
    const full = "10dba7954ea293dec6c9056b3f7233c44f56b4b1";
    expect(releaseIdentifiersMatch(full, "10dba795")).toBe(true);
    expect(releaseIdentifiersMatch("10dba795", full)).toBe(true);
    expect(releaseIdentifiersMatch("sha256:abc", "sha256:abc")).toBe(true);
    expect(releaseIdentifiersMatch("sha256:abc", "sha256:def")).toBe(false);
  });

  it("uses the shared identifier matcher for API and worker readiness", () => {
    for (const script of ["scripts/wait-api-ready.mjs", "scripts/wait-worker-ready.mjs"]) {
      const source = readFileSync(resolve(process.cwd(), script), "utf8");
      expect(source, script).toContain("releaseIdentifiersMatch");
    }
  });

  it("uses the same short-or-full comparison when publishing static artifacts", () => {
    for (const script of ["scripts/deploy-admin-static.mjs", "scripts/deploy-h5-static.mjs"]) {
      const source = readFileSync(resolve(process.cwd(), script), "utf8");
      expect(source, script).toContain("commitMatchesArtifact(version.commit, manifest.commit)");
      expect(source, script).toContain("isReleaseId(releaseId)");
    }
  });

  it("ships every release script dependency inside the scoped bundle", () => {
    const source = readFileSync(resolve(process.cwd(), "scripts/assemble-scoped-release.mjs"), "utf8");
    for (const script of ["deploy-scoped-release.mjs", "deploy-runtime.mjs", "deploy-admin-static.mjs", "deploy-h5-static.mjs", "release-metadata.mjs"]) {
      expect(source, script).toContain(script);
    }
  });
});
