const commitPattern = /^[0-9a-f]{7,40}$/i;
const releaseIdPattern = /^\d{8}-[0-9a-f]{8}$/i;

export function isCommitIdentifier(value) {
  return commitPattern.test(String(value || "").trim());
}

export function isReleaseId(value) {
  return releaseIdPattern.test(String(value || "").trim());
}

export function releaseIdentifiersMatch(actualValue, expectedValue) {
  const actual = String(actualValue || "").trim().toLowerCase();
  const expected = String(expectedValue || "").trim().toLowerCase();
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  return commitPattern.test(actual) && commitPattern.test(expected)
    && (actual.startsWith(expected) || expected.startsWith(actual));
}

export function releaseIdFor(sourceCommit, buildTime) {
  const date = new Date(String(buildTime || ""));
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid build timestamp for release ID");
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const commit = String(sourceCommit || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8,40}$/.test(commit)) throw new Error("Invalid source commit for release ID");
  return `${yyyy}${mm}${dd}-${commit.slice(0, 8)}`;
}

/** Compare artifact metadata (short or full SHA) with the source release SHA. */
export function commitMatchesArtifact(artifactCommit, sourceCommit) {
  const artifact = String(artifactCommit || "").trim().toLowerCase();
  const source = String(sourceCommit || "").trim().toLowerCase();
  return commitPattern.test(artifact) && commitPattern.test(source)
    && releaseIdentifiersMatch(artifact, source);
}
