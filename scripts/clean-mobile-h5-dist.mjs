import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const h5Dist = resolve(scriptDir, "../apps/mobile/dist/build/h5");

await rm(h5Dist, { recursive: true, force: true });
console.log(`Cleaned H5 build output: ${h5Dist}`);
