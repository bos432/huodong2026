import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createGunzip } from "node:zlib";

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

function restore(env, backupFile) {
  const useDocker = env.BACKUP_USE_DOCKER === "true" || env.DB_HOST === "mysql";
  const database = env.DB_DATABASE || "activity_registration";
  const username = env.DB_USERNAME || "activity";
  const password = env.DB_PASSWORD || "activitypass";
  const command = useDocker ? "docker" : (process.platform === "win32" ? "mysql.exe" : "mysql");
  const args = useDocker
    ? ["exec", "-i", "-e", `MYSQL_PWD=${password}`, env.MYSQL_CONTAINER || "activity-mysql", "mysql", "--default-character-set=utf8mb4", "-u", username, database]
    : ["-h", env.DB_HOST || "127.0.0.1", "-P", String(env.DB_PORT || 3306), "--default-character-set=utf8mb4", "-u", username, database];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, MYSQL_PWD: password }, windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const input = fs.createReadStream(backupFile);
    const source = backupFile.endsWith(".gz") ? input.pipe(createGunzip()) : input;
    source.pipe(child.stdin);
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
  const backupFile = process.env.BACKUP_FILE || process.argv[2];
  const database = env.DB_DATABASE || "activity_registration";
  if (!backupFile) throw new Error("Set BACKUP_FILE or pass a backup path as the first argument.");
  if (!fs.existsSync(backupFile)) throw new Error(`Backup file not found: ${backupFile}`);
  if (process.env.RESTORE_CONFIRM !== database) {
    throw new Error(`Refusing to restore without confirmation. Set RESTORE_CONFIRM=${database}`);
  }
  await restore(env, backupFile);
  console.log(`Database restored into ${database} from ${backupFile}`);
}

main().catch((error) => {
  console.error(`Database restore failed: ${error.message}`);
  process.exitCode = 1;
});
