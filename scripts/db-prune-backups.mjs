import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const backupDir = path.resolve(root, process.env.BACKUP_DIR || "backups/mysql");
const retentionDays = Math.max(Number(process.env.BACKUP_RETENTION_DAYS || 30), 1);
const cutoff = Date.now() - retentionDays * 86400000;

if (!fs.existsSync(backupDir)) {
  console.log(`Backup directory does not exist: ${backupDir}`);
  process.exit(0);
}

let removed = 0;
for (const name of fs.readdirSync(backupDir)) {
  if (!/\.(sql|sql\.gz)$/.test(name)) continue;
  const file = path.join(backupDir, name);
  const stat = fs.statSync(file);
  if (stat.mtimeMs >= cutoff) continue;
  fs.unlinkSync(file);
  removed += 1;
}

console.log(`Pruned ${removed} backup file(s) older than ${retentionDays} day(s) from ${backupDir}`);
