import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const adminDist = resolve(scriptDir, "../apps/admin/dist");

await rm(adminDist, { recursive: true, force: true });
console.log(`Cleaned admin build output: ${adminDist}`);
