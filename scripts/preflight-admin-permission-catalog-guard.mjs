import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function permissionKeys(source) {
  return new Set(Array.from(source.matchAll(/\bkey:\s*["']([^"']+)["']/g), (match) => match[1]));
}

const apiKeys = permissionKeys(read("apps/api/src/modules/admin/admin-permissions.ts"));
const adminKeys = permissionKeys(read("apps/admin/src/permissions.ts"));
const missingInAdmin = [...apiKeys].filter((key) => !adminKeys.has(key)).sort();
const unknownInAdmin = [...adminKeys].filter((key) => !apiKeys.has(key)).sort();

if (missingInAdmin.length || unknownInAdmin.length) {
  if (missingInAdmin.length) console.error(`Admin permission catalog is missing API permissions: ${missingInAdmin.join(", ")}`);
  if (unknownInAdmin.length) console.error(`Admin permission catalog contains unknown permissions: ${unknownInAdmin.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`Admin permission catalog guard passed (${apiKeys.size} permissions).`);
}
