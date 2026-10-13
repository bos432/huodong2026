import { releaseIdentifiersMatch } from './release-metadata.mjs';

export function resolveDeployRuntime(env = process.env) {
  if (env.DEPLOY_RUNTIME === 'docker') {
    return {
      kind: 'docker',
      composeProject: env.DOCKER_COMPOSE_PROJECT || 'rdchaimen666com',
      apiContainer: env.API_CONTAINER || 'activity-api',
      nginxContainer: env.NGINX_CONTAINER || 'activity-nginx',
    };
  }
  if (env.DEPLOY_RUNTIME === 'pm2') return { kind: 'pm2' };
  throw new Error('DEPLOY_RUNTIME must be explicitly set to docker or pm2 before publishing.');
}

export function assertDockerPublishScope({ apiContainer, nginxContainer, composeProject = 'rdchaimen666com', restartContainers = [] }) {
  if (composeProject !== 'rdchaimen666com') throw new Error('Docker publish must target the rdchaimen666com project.');
  if (apiContainer !== 'activity-api') throw new Error('Docker publish must target activity-api.');
  if (nginxContainer !== 'activity-nginx') throw new Error('Docker publish must inspect activity-nginx.');
  if (restartContainers.length) throw new Error('Docker publish must not restart unrelated or static containers.');
}

export function assertDockerApiIdentity(container, runtime) {
  assertDockerPublishScope(runtime);
  const labels = container?.Config?.Labels || {};
  if (container?.Name !== '/activity-api' || labels['com.docker.compose.project'] !== runtime.composeProject || labels['com.docker.compose.service'] !== 'api') {
    throw new Error('Docker API ownership mismatch.');
  }
  if (!container?.State?.Running) throw new Error('Docker API must be running before deployment.');
}

export function assertUnrelatedDockerUnchanged(baseline, current) {
  for (const previous of baseline.filter(row => row.name !== '/activity-api')) {
    const present = current.find(row => row.name === previous.name);
    if (!present || ['id', 'startedAt', 'status', 'restarts'].some(key => present[key] !== previous[key])) {
      throw new Error(`Unrelated Docker container changed: ${previous.name}`);
    }
  }
}

export function dockerHealthMatches(body, commit) {
  return body?.ready === true && releaseIdentifiersMatch(body?.release?.commit || '', commit);
}
