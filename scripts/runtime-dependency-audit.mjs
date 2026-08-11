import { execFileSync } from "node:child_process";

function npmJson(args) {
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npm.cmd ${args.join(" ")}`]
    : args;
  try {
    return JSON.parse(execFileSync(command, commandArgs, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
  } catch (error) {
    const output = String(error?.stdout || "").trim();
    if (!output) throw error;
    return JSON.parse(output);
  }
}

function versionAtLeast(version, minimum) {
  const parse = (value) => String(value || "0").split(".").slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
  const current = parse(version);
  const expected = parse(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] !== expected[index]) return current[index] > expected[index];
  }
  return true;
}

function collectVersions(node, dependencyName, path = [], rows = []) {
  for (const [name, dependency] of Object.entries(node?.dependencies || {})) {
    const nextPath = [...path, name];
    if (name === dependencyName) rows.push({ version: dependency.version, path: nextPath.join(" > ") });
    collectVersions(dependency, dependencyName, nextPath, rows);
  }
  return rows;
}

const audit = npmJson(["--prefix", "apps/api", "audit", "--omit=dev", "--audit-level=high", "--json"]);
const adminAudit = npmJson(["--prefix", "apps/admin", "audit", "--omit=dev", "--audit-level=high", "--json"]);
const mobileAudit = npmJson(["--prefix", "apps/mobile", "audit", "--omit=dev", "--audit-level=high", "--json"]);
const tree = npmJson(["--prefix", "apps/api", "ls", "uuid", "--omit=dev", "--all", "--json"]);
const braceExpansionTree = npmJson(["--prefix", "apps/api", "ls", "brace-expansion", "--omit=dev", "--all", "--json"]);
const nanoidTree = npmJson(["--prefix", "apps/admin", "ls", "nanoid", "--omit=dev", "--all", "--json"]);
const mobileTree = npmJson(["--prefix", "apps/mobile", "ls", "nanoid", "postcss", "vue", "--omit=dev", "--all", "--json"]);
const uuidRows = collectVersions(tree, "uuid");
const braceExpansionRows = collectVersions(braceExpansionTree, "brace-expansion");
const nanoidRows = collectVersions(nanoidTree, "nanoid");
const mobileNanoidRows = collectVersions(mobileTree, "nanoid");
const mobilePostcssRows = collectVersions(mobileTree, "postcss");
const mobileVueRows = collectVersions(mobileTree, "vue");
const unsafeUuidRows = uuidRows.filter((row) => !versionAtLeast(row.version, "11.1.1"));
const unsafeBraceExpansionRows = braceExpansionRows.filter((row) => !versionAtLeast(row.version, "5.0.9"));
const unsafeNanoidRows = nanoidRows.filter((row) => !versionAtLeast(row.version, "3.3.17"));
const unsafeMobileNanoidRows = mobileNanoidRows.filter((row) => !versionAtLeast(row.version, "3.3.17"));
const unsafeMobilePostcssRows = mobilePostcssRows.filter((row) => !versionAtLeast(row.version, "8.5.23"));
const unsafeMobileVueRows = mobileVueRows.filter((row) => !versionAtLeast(row.version, "3.5.37"));
const counts = audit.metadata?.vulnerabilities || {};
const highOrCritical = Number(counts.high || 0) + Number(counts.critical || 0);
const allowedMetadataWarnings = new Set(["uuid", "exceljs", "tencentcloud-sdk-nodejs"]);
const unexpectedModerate = Object.entries(audit.vulnerabilities || {})
  .filter(([, item]) => item.severity === "moderate")
  .map(([name]) => name)
  .filter((name) => !allowedMetadataWarnings.has(name));

if (!uuidRows.length) throw new Error("Runtime dependency tree did not expose uuid; audit evidence is incomplete");
if (!braceExpansionRows.length) throw new Error("API runtime dependency tree did not expose brace-expansion; audit evidence is incomplete");
if (!nanoidRows.length) throw new Error("Admin runtime dependency tree did not expose nanoid; audit evidence is incomplete");
if (!mobileNanoidRows.length || !mobilePostcssRows.length || !mobileVueRows.length) throw new Error("Mobile runtime dependency tree is missing nanoid, postcss, or vue; audit evidence is incomplete");
if (highOrCritical > 0) throw new Error(`Runtime audit contains ${highOrCritical} high or critical vulnerabilities`);
if (unsafeUuidRows.length) throw new Error(`Unsafe runtime uuid versions found: ${unsafeUuidRows.map((row) => `${row.path}@${row.version}`).join(", ")}`);
if (unsafeBraceExpansionRows.length) throw new Error(`Unsafe runtime brace-expansion versions found: ${unsafeBraceExpansionRows.map((row) => `${row.path}@${row.version}`).join(", ")}`);
if (unsafeNanoidRows.length) throw new Error(`Unsafe runtime nanoid versions found: ${unsafeNanoidRows.map((row) => `${row.path}@${row.version}`).join(", ")}`);
if (unsafeMobileNanoidRows.length) throw new Error(`Unsafe mobile nanoid versions found: ${unsafeMobileNanoidRows.map((row) => `${row.path}@${row.version}`).join(", ")}`);
if (unsafeMobilePostcssRows.length) throw new Error(`Unsafe mobile postcss versions found: ${unsafeMobilePostcssRows.map((row) => `${row.path}@${row.version}`).join(", ")}`);
if (unsafeMobileVueRows.length) throw new Error(`Unsafe mobile vue versions found: ${unsafeMobileVueRows.map((row) => `${row.path}@${row.version}`).join(", ")}`);
if (unexpectedModerate.length) throw new Error(`Unexpected moderate runtime advisories found: ${unexpectedModerate.join(", ")}`);

for (const [label, packageAudit] of [["admin", adminAudit], ["mobile", mobileAudit]]) {
  const packageCounts = packageAudit.metadata?.vulnerabilities || {};
  const total = ["info", "low", "moderate", "high", "critical"].reduce((sum, key) => sum + Number(packageCounts[key] || 0), 0);
  if (total > 0) throw new Error(`${label} runtime audit contains ${total} production vulnerabilities`);
}

console.log(`OK   runtime audit: high=${counts.high || 0}, critical=${counts.critical || 0}, effective uuid versions=${[...new Set(uuidRows.map((row) => row.version))].join(", ")}, brace-expansion versions=${[...new Set(braceExpansionRows.map((row) => row.version))].join(", ")}.`);
console.log(`OK   admin and mobile production dependency audits contain no advisories; effective admin nanoid versions=${[...new Set(nanoidRows.map((row) => row.version))].join(", ")}.`);
console.log(`OK   mobile minimum versions: vue=${[...new Set(mobileVueRows.map((row) => row.version))].join(", ")}, postcss=${[...new Set(mobilePostcssRows.map((row) => row.version))].join(", ")}, nanoid=${[...new Set(mobileNanoidRows.map((row) => row.version))].join(", ")}.`);
if (Number(counts.moderate || 0) > 0) console.log("INFO npm advisory metadata still lists ExcelJS/TencentCloud uuid ranges, but the installed production tree is overridden and verified at uuid >= 11.1.1.");
