import { lstat, mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const h5Dist = resolve(scriptDir, "../apps/mobile/dist/build/h5");

async function removeDirectory(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    if (error?.code === "ENOTDIR") return removeFile(path);
    throw error;
  }

  for (const entry of entries) {
    await removeEntry(resolve(path, entry.name), entry.isDirectory());
  }

  await rmdir(path).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function removeFile(path) {
  await unlink(path).catch(async (error) => {
    if (error?.code === "ENOENT") return;
    if (error?.code === "EISDIR") {
      await removeDirectory(path);
      return;
    }
    throw error;
  });
}

async function removeEntry(path, knownDirectory = undefined) {
  if (knownDirectory === true) return removeDirectory(path);
  if (knownDirectory === false) return removeFile(path);

  try {
    const info = await lstat(path);
    if (info.isDirectory()) {
      await removeDirectory(path);
      return;
    }
    await removeFile(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

if (existsSync(h5Dist)) {
  for (const entry of await readdir(h5Dist, { withFileTypes: true })) {
    await removeEntry(resolve(h5Dist, entry.name), entry.isDirectory());
  }
} else {
  await mkdir(h5Dist, { recursive: true });
}

console.log(`Cleaned H5 build output: ${h5Dist}`);
