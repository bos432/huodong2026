import fs from "node:fs";
import { execFileSync } from "node:child_process";

const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["AWS access key", /AKIA[0-9A-Z]{16}/g],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,255}/g],
  ["OpenAI API key", /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/g],
  ["Stripe live key", /sk_live_[A-Za-z0-9]{20,}/g],
  ["Alibaba Cloud access key", /LTAI[A-Za-z0-9]{16,24}/g],
  ["Tencent Cloud secret id", /AKID[A-Za-z0-9]{32}/g]
];

const skippedExtensions = new Set([
  ".7z", ".avi", ".bmp", ".doc", ".docx", ".eot", ".gif", ".gz", ".ico", ".jpeg", ".jpg",
  ".mov", ".mp3", ".mp4", ".pdf", ".png", ".tar", ".tgz", ".ttf", ".webm", ".webp", ".woff", ".woff2", ".xlsx", ".zip"
]);

function trackedAndUnignoredFiles() {
  // Large worktrees can exceed Node's default 1 MiB child-process buffer.
  // Keep the NUL-delimited file list intact while allowing the scan to cover the whole checkout.
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    maxBuffer: 16 * 1024 * 1024
  });
  return output.toString("utf8").split("\0").filter(Boolean);
}

function extension(file) {
  const normalized = file.replace(/\\/g, "/");
  const name = normalized.slice(normalized.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

const findings = [];
let scanned = 0;

for (const file of trackedAndUnignoredFiles()) {
  if (skippedExtensions.has(extension(file)) || !fs.existsSync(file)) continue;
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) continue;
  const source = buffer.toString("utf8");
  scanned += 1;

  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      findings.push({ file, line, label });
    }
  }
}

if (findings.length) {
  for (const finding of findings) console.error(`ERR  ${finding.file}:${finding.line} contains a possible ${finding.label}.`);
  console.error(`Secret scan failed with ${findings.length} finding(s). Rotate exposed credentials before removing them from source.`);
  process.exitCode = 1;
} else {
  console.log(`OK   secret scan checked ${scanned} tracked or unignored source file(s).`);
}
