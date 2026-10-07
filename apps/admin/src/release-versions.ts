type ReleaseMetadata = { commit?: unknown; buildTime?: unknown } | null | undefined;

export function compareReleaseVersions(releases: readonly ReleaseMetadata[]) {
  const commits = releases.map(release => typeof release?.commit === 'string' ? release.commit.trim() : '');
  const complete = releases.map((release, index) => Boolean(
    commits[index] && !/^(local|unknown)$|change-me|replace-with/i.test(commits[index])
    && typeof release?.buildTime === 'string' && Number.isFinite(Date.parse(release.buildTime))
  ));
  const allComplete = releases.length === 3 && complete.every(Boolean);
  const knownCommits = commits.filter((_, index) => complete[index]);
  const canonicalCommit = knownCommits.reduce((longest, commit) => commit.length > longest.length ? commit : longest, '');
  const mismatch = knownCommits.some(commit => !canonicalCommit.startsWith(commit) && !commit.startsWith(canonicalCommit));
  return releases.map((_, index) => {
    if (!complete[index]) return { status: 'invalid' as const, statusText: '缺失或占位' };
    if (mismatch) return { status: 'warning' as const, statusText: '不一致' };
    if (!allComplete) return { status: 'warning' as const, statusText: '待比对' };
    return { status: 'ready' as const, statusText: '一致' };
  });
}
