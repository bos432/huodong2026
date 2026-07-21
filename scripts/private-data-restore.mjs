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

function run(command, args, inputFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    if (inputFile) fs.createReadStream(inputFile).pipe(child.stdin);
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `${command} exited with ${code}`)));
  });
}

async function validateArchive(backupFile) {
  const listing = await run("tar", ["-tzf", backupFile]);
  const entries = listing.split(/\r?\n/).map((value) => value.trim().replace(/\\/g, "/")).filter(Boolean);
  if (!entries.length) throw new Error("Private data archive is empty");
  for (const entry of entries) {
    const segments = entry.split("/").filter(Boolean);
    if ((entry !== "private-data" && !entry.startsWith("private-data/")) || entry.startsWith("/") || segments.includes("..")) {
      throw new Error(`Unsafe private data archive entry: ${entry}`);
    }
  }
}

async function main() {
  const envFile = process.env.ENV_FILE || (fs.existsSync(path.join(root, "deploy/.env.production")) ? "deploy/.env.production" : "apps/api/.env");
  const useProductionTemplate = envFile.replace(/\\/g, "/").endsWith("deploy/.env.production");
  const env = { ...(useProductionTemplate ? readEnv(path.join(root, "deploy/.env.production.example")) : {}), ...readEnv(path.join(root, envFile)), ...process.env };
  const backupFile = process.env.PRIVATE_DATA_BACKUP_FILE || process.argv[2];
  if (!backupFile) throw new Error("Set PRIVATE_DATA_BACKUP_FILE or pass an archive path as the first argument.");
  const resolvedBackupFile = path.resolve(root, backupFile);
  if (!fs.existsSync(resolvedBackupFile)) throw new Error(`Private data backup not found: ${resolvedBackupFile}`);
  if (process.env.PRIVATE_DATA_RESTORE_CONFIRM !== "private-data") throw new Error("Refusing to restore without confirmation. Set PRIVATE_DATA_RESTORE_CONFIRM=private-data");
  await validateArchive(resolvedBackupFile);

  const isolatedTarget = process.env.PRIVATE_DATA_RESTORE_TARGET_DIR;
  if (isolatedTarget) {
    const targetDir = path.resolve(root, isolatedTarget);
    const workspaceRoot = path.resolve(root);
    if (!targetDir.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error("PRIVATE_DATA_RESTORE_TARGET_DIR must stay inside the workspace");
    fs.mkdirSync(targetDir, { recursive: true });
    await run("tar", ["-xzf", resolvedBackupFile, "-C", targetDir]);
    console.log(`Private data restored to isolated target ${targetDir} from ${resolvedBackupFile}`);
  } else if (env.BACKUP_USE_DOCKER === "true") {
    await run("docker", ["exec", "-i", env.API_CONTAINER || "activity-api", "tar", "-xzf", "-", "-C", "/app"], resolvedBackupFile);
  } else {
    const privateDataDir = path.resolve(root, env.PRIVATE_DATA_DIR || "private-data");
    fs.mkdirSync(path.dirname(privateDataDir), { recursive: true });
    await run("tar", ["-xzf", resolvedBackupFile, "-C", path.dirname(privateDataDir)]);
  }
  console.log(`Private data restored from ${resolvedBackupFile}`);
}

main().catch((error) => {
  console.error(`Private data restore failed: ${error.message}`);
  process.exitCode = 1;
});
