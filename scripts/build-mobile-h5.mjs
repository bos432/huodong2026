import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const nodeMajor = Number(process.versions.node.split(".")[0]);

function gitText(args, fallback = "") {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? String(result.stdout || "").trim() || fallback : fallback;
}

process.env.VITE_APP_VERSION ||= process.env.APP_VERSION || "0.1.0";
process.env.VITE_BUILD_COMMIT ||= process.env.BUILD_COMMIT || gitText(["rev-parse", "--short=8", "HEAD"], "local");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function node22() {
  const dirs = [
    process.env.CODEX_MOBILE_NODE_DIR,
    path.join(root, ".local-tools", "node22"),
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin")
  ].filter(Boolean);

  for (const dir of dirs) {
    const executable = path.join(dir, "node.exe");
    if (!fs.existsSync(executable)) continue;
    const version = spawnSync(executable, ["-v"], { encoding: "utf8", windowsHide: true });
    if (Number(String(version.stdout || "").match(/v(\d+)\./)?.[1] || 0) === 22) return executable;
  }

  throw new Error(`Mobile H5 builds require Node 22; current runtime is ${process.version}. Set CODEX_MOBILE_NODE_DIR to a Node 22 directory.`);
}

run(process.execPath, [path.join(root, "scripts", "check-mobile-runtime-compatibility.mjs")]);

if (process.platform === "win32" && nodeMajor !== 22) {
  const node = node22();
  const scripts = path.join(root, "scripts");
  const mobile = path.join(root, "apps", "mobile");
  const uni = path.join(mobile, "node_modules", "@dcloudio", "vite-plugin-uni", "bin", "uni.js");
  run(node, [path.join(scripts, "clean-mobile-h5-dist.mjs")]);
  run(node, [uni, "build", "-p", "h5"], { cwd: mobile });
  run(node, [path.join(scripts, "write-static-version.mjs"), "apps/mobile/dist/build/h5", "h5"]);
} else {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  run(npm, ["--prefix", "apps/mobile", "run", "build:h5"], { shell: process.platform === "win32" });
}
