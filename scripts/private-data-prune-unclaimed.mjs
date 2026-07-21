import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const privateRoot = path.resolve(root, process.env.PRIVATE_DATA_DIR || "private-data");
const retentionHours = Math.max(Number(process.env.PRIVATE_DATA_UNCLAIMED_RETENTION_HOURS || 24), 1);
const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
const deleteEnabled = process.env.PRIVATE_DATA_PRUNE_CONFIRM === "delete-unclaimed-private-data";
const namespaces = new Set(["registration-attachments", "settlement-proofs", "course-resources", "aid-documents"]);
const result = { mode: deleteEnabled ? "delete" : "dry-run", privateRoot, retentionHours, scanned: 0, claimed: 0, candidates: [], deleted: [], invalid: [] };

for (const namespace of namespaces) {
  const directory = path.resolve(privateRoot, namespace);
  if (!directory.startsWith(`${privateRoot}${path.sep}`) || !fs.existsSync(directory)) continue;
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith(".meta.json")) continue;
    result.scanned += 1;
    const metadataPath = path.resolve(directory, name);
    const fileName = name.slice(0, -".meta.json".length);
    const filePath = path.resolve(directory, fileName);
    if (!metadataPath.startsWith(`${directory}${path.sep}`) || !filePath.startsWith(`${directory}${path.sep}`)) continue;
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      if (metadata.namespace !== namespace || metadata.id !== fileName || !metadata.createdAt) throw new Error("metadata identity mismatch");
      if (metadata.claimedAt) { result.claimed += 1; continue; }
      if (new Date(metadata.createdAt).getTime() > cutoff) continue;
      const candidate = { namespace, fileName, createdAt: metadata.createdAt, size: Number(metadata.size || 0), fileExists: fs.existsSync(filePath) };
      result.candidates.push(candidate);
      if (deleteEnabled) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fs.unlinkSync(metadataPath);
        result.deleted.push(candidate);
      }
    } catch (error) {
      result.invalid.push({ namespace, metadata: name, reason: error instanceof Error ? error.message : String(error) });
    }
  }
}

const logDir = path.resolve(root, ".local-logs");
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `private-data-prune-${Date.now()}.json`);
fs.writeFileSync(logFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ ...result, logFile }, null, 2));
if (result.invalid.length) process.exitCode = 2;
