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

export function assertDockerPublishScope({ apiContainer, nginxContainer, restartContainers = [] }) {
  if (apiContainer !== 'activity-api') throw new Error('Docker publish must target activity-api.');
  if (nginxContainer !== 'activity-nginx') throw new Error('Docker publish must inspect activity-nginx.');
  if (restartContainers.length) throw new Error('Docker publish must not restart unrelated or static containers.');
}

export function dockerHealthMatches(body, commit) {
  return body?.ready === true && releaseIdentifiersMatch(body?.release?.commit || '', commit);
}
