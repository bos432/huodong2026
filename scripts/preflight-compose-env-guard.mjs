import fs from "node:fs";

const failures = [];

const mysqlOnlyKeys = new Set([
  "MYSQL_ROOT_PASSWORD",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD"
]);

const backupOnlyKeys = new Set([
  "BACKUP_DIR",
  "BACKUP_RETENTION_DAYS",
  "BACKUP_USE_DOCKER",
  "MYSQL_CONTAINER"
]);

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function envKeys(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")));
}

const exampleKeys = envKeys(read("deploy/.env.production.example"));
const compose = read("docker-compose.yml");
const preflight = read("scripts/preflight.mjs");
const checklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

const apiKeys = exampleKeys.filter((key) => !mysqlOnlyKeys.has(key) && !backupOnlyKeys.has(key));

for (const key of apiKeys) {
  check(compose.includes(`${key}:`), `docker-compose.yml api service must pass ${key}.`);
  check(compose.includes(`\${${key}:-`), `docker-compose.yml api service must source ${key} from deploy/.env.production.`);
}

for (const key of mysqlOnlyKeys) {
  check(compose.includes(`${key}:`), `docker-compose.yml mysql service must pass ${key}.`);
}

check(compose.includes("uploads-data:/app/uploads"), "docker-compose.yml must persist API uploads.");
check(compose.includes("uploads-data:/usr/share/nginx/uploads"), "docker-compose.yml must expose uploads through Nginx.");
check(preflight.includes("checkDockerCompose"), "preflight must keep Docker Compose checks.");
check(preflight.includes("envKeys(\"deploy/.env.production.example\")"), "preflight must dynamically read production env example keys.");
check(preflight.includes("dockerComposeMysqlOnlyKeys"), "preflight must document MySQL-only Docker Compose env exclusions.");
check(preflight.includes("dockerComposeBackupOnlyKeys"), "preflight must document backup-only Docker Compose env exclusions.");
check(checklist.includes("Docker Compose"), "launch checklist must mention Docker Compose checks.");
check(progress.includes("Docker Compose"), "project progress must mention Docker Compose coverage.");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight compose env guard covers Docker Compose API env passthrough.");
}
