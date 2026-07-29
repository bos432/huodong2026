import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const nodeMajor = Number(process.versions.node.split(".")[0]);

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

function compatibleNode() {
  if (process.platform !== "win32" || nodeMajor < 25) return process.execPath;
  const dirs = [
    process.env.CODEX_MP_WEIXIN_NODE_DIR,
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin"),
    path.join(os.homedir(), "AppData", "Local", "easyclaw", "ai", "tool_cache", "resources", "tools", "win", "node-24.13.0")
  ].filter(Boolean);

  for (const dir of dirs) {
    const executable = path.join(dir, "node.exe");
    if (!fs.existsSync(executable)) continue;
    const version = spawnSync(executable, ["-v"], { encoding: "utf8", windowsHide: true });
    const major = Number(String(version.stdout || "").match(/v(\d+)\./)?.[1] || 0);
    if (major === 22 || major === 24) return executable;
  }

  throw new Error(`Node ${process.version} is not supported by the uni-app mp-weixin build. Use Node 22/24 or set CODEX_MP_WEIXIN_NODE_DIR.`);
}

run(process.execPath, [path.join(root, "scripts", "check-mobile-runtime-compatibility.mjs")]);

let buildNode = process.execPath;
if (process.platform === "win32" && nodeMajor >= 25) {
  buildNode = compatibleNode();
  const uni = path.join(root, "apps", "mobile", "node_modules", "@dcloudio", "vite-plugin-uni", "bin", "uni.js");
  run(buildNode, [uni, "build", "-p", "mp-weixin"], { cwd: path.join(root, "apps", "mobile") });
  run(buildNode, [path.join(root, "scripts", "patch-mobile-mp-weixin-auth.mjs")]);
} else {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  run(npm, ["--prefix", "apps/mobile", "run", "build:mp-weixin"], { shell: process.platform === "win32" });
}

run(buildNode, [path.join(root, "scripts", "write-static-version.mjs"), "apps/mobile/dist/build/mp-weixin", "mp-weixin"]);
