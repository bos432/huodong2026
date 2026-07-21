import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const retentionDays = Math.max(Number(process.env.BACKUP_RETENTION_DAYS || 30), 1);
const cutoff = Date.now() - retentionDays * 86400000;
let removed = 0;
const targets = [
  { directory: path.resolve(root, process.env.BACKUP_DIR || "backups/mysql"), pattern: /\.(sql|sql\.gz)$/ },
  { directory: path.resolve(root, process.env.PRIVATE_DATA_BACKUP_DIR || "backups/private-data"), pattern: /\.tar\.gz$/ }
];

for (const target of targets) {
  if (!fs.existsSync(target.directory)) continue;
  for (const name of fs.readdirSync(target.directory)) {
    if (!target.pattern.test(name)) continue;
    const file = path.join(target.directory, name);
    const stat = fs.statSync(file);
    if (stat.mtimeMs >= cutoff) continue;
    fs.unlinkSync(file);
    removed += 1;
  }
}

console.log(`Pruned ${removed} database/private-data backup file(s) older than ${retentionDays} day(s)`);
