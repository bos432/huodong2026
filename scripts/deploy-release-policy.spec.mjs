import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from './deploy-runtime.mjs';
const migrationPolicy = await import('./deploy-migrations.mjs').catch(() => ({}));

test('Docker backup and verification require the same explicit target runtime as publish', () => {
  assert.throws(() => runtime.resolveDeployRuntime({}), /DEPLOY_RUNTIME/);
  assert.throws(() => runtime.assertDockerPublishScope({ apiContainer: 'activity-api', nginxContainer: 'activity-nginx', composeProject: 'other-project' }), /project/);
});

test('Docker scope verification preserves stopped and running unrelated containers', () => {
  const baseline = [
    { id: 'old-api', name: '/activity-api', startedAt: 'a', restarts: 0, status: 'running' },
    { id: 'mysql-id', name: '/activity-mysql', startedAt: 'b', restarts: 1, status: 'running' },
    { id: 'other-id', name: '/other-service', startedAt: 'c', restarts: 2, status: 'exited' }
  ];
  const current = [{ ...baseline[0], id: 'new-api' }, baseline[1], baseline[2]];
  assert.equal(typeof runtime.assertUnrelatedDockerUnchanged, 'function');
  runtime.assertUnrelatedDockerUnchanged(baseline, current);
  for (const patch of [{ id: 'recreated' }, { startedAt: 'restarted' }, { restarts: 3 }, { status: 'running' }]) {
    assert.throws(() => runtime.assertUnrelatedDockerUnchanged(baseline, [current[0], current[1], { ...current[2], ...patch }]), /other-service/);
  }
  assert.throws(() => runtime.assertUnrelatedDockerUnchanged(baseline, current.slice(0, 2)), /other-service/);
});

test('Docker process ownership checks the compose project and API service', () => {
  assert.equal(typeof runtime.assertDockerApiIdentity, 'function');
  const target = { apiContainer: 'activity-api', nginxContainer: 'activity-nginx', composeProject: 'rdchaimen666com' };
  const row = { Name: '/activity-api', State: { Running: true }, Config: { Labels: { 'com.docker.compose.project': 'rdchaimen666com', 'com.docker.compose.service': 'api' } } };
  runtime.assertDockerApiIdentity(row, target);
  assert.throws(() => runtime.assertDockerApiIdentity({ ...row, Config: { Labels: { ...row.Config.Labels, 'com.docker.compose.project': 'foreign' } } }, target), /ownership/);
  assert.throws(() => runtime.assertDockerApiIdentity({ ...row, Config: { Labels: { ...row.Config.Labels, 'com.docker.compose.service': 'mysql' } } }, target), /ownership/);
  assert.throws(() => runtime.assertDockerApiIdentity({ ...row, State: { Running: false } }, target), /running/);
});

test('reviewed migration subsets do not need to be an old-list suffix', () => {
  assert.equal(typeof migrationPolicy.assertReviewedMigrations, 'function');
  const reviewed = ['Initial1780480000000', 'Previous1788653500000', 'Inbox1788653700000', 'Host1788653800000', 'Journal1788653900000'];
  for (const pending of [[], [reviewed[0], reviewed[2], reviewed[3], reviewed[4]], [reviewed[2]], reviewed]) {
    migrationPolicy.assertReviewedMigrations(pending, reviewed);
  }
  for (const pending of [['Unknown1788653900000'], [reviewed[2], reviewed[2]], [reviewed[3], reviewed[2]]]) {
    assert.throws(() => migrationPolicy.assertReviewedMigrations(pending, reviewed), /migration/i);
  }
});
