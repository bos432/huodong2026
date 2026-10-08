import { describe, expect, it } from 'vitest';
import { assertDockerPublishScope, dockerHealthMatches, resolveDeployRuntime } from './deploy-runtime.mjs';

describe('scoped release runtime selection', () => {
  it('requires an explicit runtime before publishing', () => {
    expect(() => resolveDeployRuntime({})).toThrow('DEPLOY_RUNTIME');
  });

  it('resolves the production Docker API without inventing a worker container', () => {
    expect(resolveDeployRuntime({ DEPLOY_RUNTIME: 'docker' })).toEqual({
      kind: 'docker',
      composeProject: 'rdchaimen666com',
      apiContainer: 'activity-api',
      nginxContainer: 'activity-nginx',
    });
  });

  it('rejects a Docker publish scope that includes database or unrelated containers', () => {
    expect(() => assertDockerPublishScope({ apiContainer: 'activity-mysql', nginxContainer: 'activity-nginx' })).toThrow('activity-api');
    expect(() => assertDockerPublishScope({ apiContainer: 'activity-api', nginxContainer: 'activity-nginx', restartContainers: ['activity-nginx'] })).toThrow('restart');
  });

  it('requires the API readiness response to report the candidate commit', () => {
    expect(dockerHealthMatches({ ready: true, release: { commit: '35eef772' } }, '35eef772')).toBe(true);
    expect(dockerHealthMatches({ ready: true, release: { commit: '7878b735' } }, '35eef772')).toBe(false);
    expect(dockerHealthMatches({ ready: false, release: { commit: '35eef772' } }, '35eef772')).toBe(false);
  });
});
