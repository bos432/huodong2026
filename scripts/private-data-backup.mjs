import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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
  const pad = (value) => String(value).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function run(command, args, outputFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, windowsHide: true });
    const output = outputFile ? fs.createWriteStream(outputFile) : null;
    if (output) child.stdout.pipe(output);
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `${command} exited with ${code}`)));
  });
}

async function main() {
  const envFile = process.env.ENV_FILE || (fs.existsSync(path.join(root, "deploy/.env.production")) ? "deploy/.env.production" : "apps/api/.env");
  const useProductionTemplate = envFile.replace(/\\/g, "/").endsWith("deploy/.env.production");
  const env = { ...(useProductionTemplate ? readEnv(path.join(root, "deploy/.env.production.example")) : {}), ...readEnv(path.join(root, envFile)), ...process.env };
  const backupDir = path.resolve(root, env.PRIVATE_DATA_BACKUP_DIR || "backups/private-data");
  fs.mkdirSync(backupDir, { recursive: true });
  const outputFile = path.join(backupDir, `private-data-${stamp()}.tar.gz`);
  const useDocker = env.BACKUP_USE_DOCKER === "true";

  try {
    if (useDocker) {
      await run("docker", ["exec", env.API_CONTAINER || "activity-api", "tar", "-czf", "-", "-C", "/app", "private-data"], outputFile);
    } else {
      const privateDataDir = path.resolve(root, env.PRIVATE_DATA_DIR || "private-data");
      if (!fs.existsSync(privateDataDir)) throw new Error(`Private data directory not found: ${privateDataDir}`);
      await run("tar", ["-czf", outputFile, "-C", path.dirname(privateDataDir), path.basename(privateDataDir)]);
    }
    if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0) throw new Error("Private data archive is empty");
    console.log(`Private data backup written: ${outputFile} (${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    throw error;
  }
}

main().catch((error) => {
  console.error(`Private data backup failed: ${error.message}`);
  process.exitCode = 1;
});
