import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";

const root = process.cwd();

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function runDump(env, outputFile) {
  const useDocker = env.BACKUP_USE_DOCKER === "true" || env.DB_HOST === "mysql";
  const database = env.DB_DATABASE || "activity_registration";
  const username = env.DB_USERNAME || "activity";
  const password = env.DB_PASSWORD || "activitypass";
  const args = ["--single-transaction", "--routines", "--triggers", "--events", "--default-character-set=utf8mb4", "-u", username, database];
  const command = useDocker ? "docker" : (process.platform === "win32" ? "mysqldump.exe" : "mysqldump");
  const fullArgs = useDocker
    ? ["exec", "-i", "-e", `MYSQL_PWD=${password}`, env.MYSQL_CONTAINER || "activity-mysql", "mysqldump", ...args]
    : ["-h", env.DB_HOST || "127.0.0.1", "-P", String(env.DB_PORT || 3306), ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(command, fullArgs, { env: { ...process.env, MYSQL_PWD: password }, windowsHide: true });
    const gzip = createGzip({ level: 9 });
    const out = fs.createWriteStream(outputFile);
    child.stdout.pipe(gzip).pipe(out);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
  });
}

async function main() {
  const envFile = process.env.ENV_FILE || (fs.existsSync(path.join(root, "deploy/.env.production")) ? "deploy/.env.production" : "apps/api/.env");
  const useProductionTemplate = envFile.replace(/\\/g, "/").endsWith("deploy/.env.production");
  const env = { ...(useProductionTemplate ? readEnv(path.join(root, "deploy/.env.production.example")) : {}), ...readEnv(path.join(root, envFile)), ...process.env };
  const backupDir = path.resolve(root, env.BACKUP_DIR || "backups/mysql");
  fs.mkdirSync(backupDir, { recursive: true });
  const database = env.DB_DATABASE || "activity_registration";
  const outputFile = path.join(backupDir, `${database}-${stamp()}.sql.gz`);
  await runDump(env, outputFile);
  const sizeMb = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`Database backup written: ${outputFile} (${sizeMb} MB)`);
}

main().catch((error) => {
  console.error(`Database backup failed: ${error.message}`);
  process.exitCode = 1;
});
