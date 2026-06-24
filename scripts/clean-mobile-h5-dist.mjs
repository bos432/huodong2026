import { mkdir, readdir, rm, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const h5Dist = resolve(scriptDir, "../apps/mobile/dist/build/h5");

async function removeEntry(path) {
  try {
    const info = await stat(path);
    if (info.isDirectory()) {
      await rm(path, { recursive: true, force: true, maxRetries: 3 });
      return;
    }
    await unlink(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    if (error?.code === "ENOTDIR") {
      await unlink(path).catch((unlinkError) => {
        if (unlinkError?.code !== "ENOENT") throw unlinkError;
      });
      return;
    }
    throw error;
  }
}

if (existsSync(h5Dist)) {
  for (const entry of await readdir(h5Dist)) {
    await removeEntry(resolve(h5Dist, entry));
  }
} else {
  await mkdir(h5Dist, { recursive: true });
}

console.log(`Cleaned H5 build output: ${h5Dist}`);
