import { describe, expect, it } from 'vitest';
import { compareReleaseVersions } from '../apps/admin/src/release-versions';

const release = { commit: 'abc1234', buildTime: '2026-09-06T01:00:00Z' };

describe('three-surface release evidence', () => {
  it('requires all three complete metadata records before claiming a match', () => {
    expect(compareReleaseVersions([release, null, null]).map(result => result.statusText)).toEqual(['待比对', '缺失或占位', '缺失或占位']);
    expect(compareReleaseVersions([release, release]).every(result => result.status !== 'ready')).toBe(true);
    expect(compareReleaseVersions([release, release, release]).every(result => result.status === 'ready')).toBe(true);
  });
  it('does not treat placeholders or invalid dates as release evidence', () => {
    for (const invalid of [{ ...release, commit: 'local' }, { ...release, commit: '' }, { ...release, buildTime: 'unknown' }]) {
      expect(compareReleaseVersions([invalid, release, release])[0].status).toBe('invalid');
    }
  });
  it('flags different known commits', () => {
    expect(compareReleaseVersions([release, release, { ...release, commit: 'def5678' }]).every(result => result.statusText === '不一致')).toBe(true);
  });
});
