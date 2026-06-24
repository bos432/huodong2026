import { chmod, lstat, mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const h5Dist = resolve(scriptDir, "../apps/mobile/dist/build/h5");
const execFileAsync = promisify(execFile);
const permissionErrors = new Set(["EPERM", "EACCES"]);

async function clearLinuxAttributes(path) {
  if (process.platform === "win32") return;

  try {
    await execFileAsync("chattr", ["-i", "-a", path]);
  } catch {
    // chattr may be unavailable or unsupported on the current filesystem.
  }
}

async function unlockPath(path, directoryHint = false) {
  await clearLinuxAttributes(path);
  await clearLinuxAttributes(dirname(path));

  try {
    let mode = directoryHint ? 0o755 : 0o644;
    const info = await lstat(path).catch(() => null);
    if (info?.isDirectory()) mode = 0o755;
    await chmod(path, mode);
  } catch {
    // chmod is best-effort; the retry below decides whether cleanup can continue.
  }
}

async function retryAfterUnlock(path, operation, directoryHint = false) {
  try {
    return await operation();
  } catch (error) {
    if (!permissionErrors.has(error?.code)) throw error;

    console.warn(
      `[clean-mobile-h5-dist] ${error.code} while removing ${path}; trying chmod/chattr unlock before retry.`,
    );
    await unlockPath(path, directoryHint);

    try {
      return await operation();
    } catch (retryError) {
      retryError.message = `${retryError.message}\nCleanup still cannot remove ${path}. On Linux, check lsattr/chattr and parent directory permissions.`;
      throw retryError;
    }
  }
}

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

  await retryAfterUnlock(
    path,
    () =>
      rmdir(path).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      }),
    true,
  );
}

async function removeFile(path) {
  await retryAfterUnlock(path, async () => {
    await unlink(path).catch(async (error) => {
      if (error?.code === "ENOENT") return;
      if (error?.code === "EISDIR") {
        await removeDirectory(path);
        return;
      }
      throw error;
    });
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
