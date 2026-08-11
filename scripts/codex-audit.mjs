import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const profile = readFlag("profile") || "quick";
const format = readFlag("format") || (args.includes("--json") ? "json" : "text");
const verbose = args.includes("--verbose");
const supportedProfiles = new Set(["quick", "release"]);

if (!supportedProfiles.has(profile)) {
  console.error(`Unsupported profile: ${profile}. Use quick or release.`);
  process.exit(2);
}

const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const outputDir = path.join(root, ".local-logs", "auto-audit", runId);
const resultJsonPath = path.join(outputDir, "result.json");
const latestReportPath = path.join(root, "docs", "auto-audit-report-latest.md");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const compatibleMpWeixinNodeDir = findCompatibleMpWeixinNodeDir();

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(latestReportPath), { recursive: true });

const result = {
  kind: "codex-auto-audit",
  version: 1,
  profile,
  runId,
  root,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  status: "running",
  environment: {},
  git: {},
  checks: [],
  commands: [],
  issues: [],
  artifacts: {
    outputDir,
    resultJson: resultJsonPath,
    latestMarkdown: latestReportPath,
    mpWeixinImportDir: path.join(root, "apps", "mobile", "dist", "build", "mp-weixin")
  },
  deployment: {
    gitPushCommand:
      "git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 push https://github.com/bos432/huodong2026.git HEAD:feature/qiwai-ui-experiment",
    baotaCommands: [
      "cd /www/wwwroot/rd.chaimen666.com",
      "export PATH=/www/server/nodejs/v22.22.3/bin:$PATH",
      "git fetch origin feature/qiwai-ui-experiment",
      "git pull --ff-only origin feature/qiwai-ui-experiment",
      "npm install --prefix packages/shared",
      "npm install --prefix apps/api",
      "npm install --prefix apps/admin",
      "npm install --prefix apps/mobile --legacy-peer-deps",
      "npm run build",
      "npm --prefix apps/mobile run build:mp-weixin",
      "pm2 restart activity-api || pm2 restart all"
    ]
  }
};

function readFlag(name) {
  const prefix = `--${name}=`;
  const inline = args.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return "";
}

function slash(filePath) {
  return filePath.replace(/\\/g, "/");
}

function relative(filePath) {
  return slash(path.relative(root, filePath));
}

function redact(text) {
  let output = String(text || "");
  for (const [key, value] of Object.entries(process.env)) {
    if (!value || value.length < 4) continue;
    if (!/(PASSWORD|PASS|SECRET|TOKEN|KEY|COOKIE|AUTH)/i.test(key)) continue;
    output = output.split(value).join(`[redacted:${key}]`);
  }
  return output;
}

function tail(text, maxLines = 24) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join("\n");
}

function addCheck(name, status, detail = {}) {
  const row = { name, status, ...detail };
  result.checks.push(row);
  return row;
}

function addIssue(priority, title, detail, options = {}) {
  const issue = {
    priority,
    title,
    detail,
    locations: options.locations || [],
    advice: options.advice || ""
  };
  result.issues.push(issue);
  return issue;
}

function runSync(command, commandArgs = []) {
  const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const res = spawnSync(useShell ? shellJoin(command, commandArgs) : command, useShell ? [] : commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: useShell,
    windowsHide: true
  });
  return {
    ok: res.status === 0,
    status: res.status,
    stdout: redact(res.stdout || ""),
    stderr: redact(res.stderr || ""),
    error: res.error ? res.error.message : ""
  };
}

function nodeMajorOf(nodeExe) {
  const res = spawnSync(nodeExe, ["-v"], { encoding: "utf8", windowsHide: true });
  if (res.status !== 0) return 0;
  const match = String(res.stdout || res.stderr || "").match(/v(\d+)\./);
  return match ? Number(match[1]) : 0;
}

function findCompatibleMpWeixinNodeDir() {
  if (process.platform !== "win32") return "";
  const candidates = [
    process.env.CODEX_MP_WEIXIN_NODE_DIR,
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin"),
    path.join(os.homedir(), "AppData", "Local", "easyclaw", "ai", "tool_cache", "resources", "tools", "win", "node-24.13.0")
  ].filter(Boolean);

  for (const dir of candidates) {
    const nodeExe = path.join(dir, "node.exe");
    if (!fs.existsSync(nodeExe)) continue;
    const major = nodeMajorOf(nodeExe);
    if (major === 22 || major === 24) return dir;
  }
  return "";
}

function collectEnvironment() {
  const npmVersion = runSync(npmCommand, ["--version"]);
  result.environment = {
    platform: `${os.platform()} ${os.release()}`,
    node: process.version,
    npm: npmVersion.ok ? npmVersion.stdout.trim() : npmVersion.error || npmVersion.stderr.trim(),
    cwd: root
  };

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor >= 25) {
    if (compatibleMpWeixinNodeDir) {
      addCheck("Node version", "passed", { value: process.version, mpWeixinBuildNodeDir: compatibleMpWeixinNodeDir });
    } else {
      addIssue("P2", "Node version may break uni-app mp-weixin build", `Current Node is ${process.version}.`, {
        advice: "Use Node 22 or 24 for npm --prefix apps/mobile run build:mp-weixin, or set CODEX_MP_WEIXIN_NODE_DIR to a compatible node bin directory."
      });
      addCheck("Node version", "warning", { value: process.version });
    }
  } else {
    addCheck("Node version", "passed", { value: process.version });
  }
}

function collectGit() {
  const branch = runSync("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = runSync("git", ["rev-parse", "--short", "HEAD"]);
  const status = runSync("git", ["status", "--short"]);
  const upstream = runSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const aheadBehind = upstream.ok ? runSync("git", ["rev-list", "--left-right", "--count", "@{u}...HEAD"]) : null;
  const remotes = runSync("git", ["remote", "-v"]);

  result.git = {
    branch: branch.ok ? branch.stdout.trim() : "",
    commit: commit.ok ? commit.stdout.trim() : "",
    upstream: upstream.ok ? upstream.stdout.trim() : "",
    aheadBehind: aheadBehind?.ok ? aheadBehind.stdout.trim() : "",
    dirtyFiles: status.ok ? status.stdout.split(/\r?\n/).filter((line) => line.trim()) : [],
    remotes: remotes.ok ? remotes.stdout.trim().split(/\r?\n/).filter(Boolean) : []
  };

  addCheck("Git branch", result.git.branch === "feature/qiwai-ui-experiment" ? "passed" : "warning", {
    value: result.git.branch || "unknown",
    expected: "feature/qiwai-ui-experiment"
  });

  if (result.git.dirtyFiles.length) {
    addCheck("Git working tree", "warning", { count: result.git.dirtyFiles.length });
    addIssue("P2", "Working tree has uncommitted changes", `${result.git.dirtyFiles.length} changed file(s) detected.`, {
      locations: result.git.dirtyFiles.slice(0, 20).map((item) => ({ file: gitStatusPath(item), line: 1 })),
      advice: "Review generated audit files and source changes before committing."
    });
  } else {
    addCheck("Git working tree", "passed", { value: "clean" });
  }
}

function gitStatusPath(statusLine) {
  const pathText = statusLine.length > 3 ? statusLine.slice(3) : statusLine.trim();
  if (pathText.includes(" -> ")) return pathText.split(" -> ").pop().trim();
  return pathText.trim();
}

function collectScriptAvailability() {
  const packageFile = path.join(root, "package.json");
  const mobilePackageFile = path.join(root, "apps", "mobile", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  const mobilePackageJson = JSON.parse(fs.readFileSync(mobilePackageFile, "utf8"));
  const requiredScripts = [
    ["doctor", packageJson.scripts?.doctor],
    ["test:preflight-guards", packageJson.scripts?.["test:preflight-guards"]],
    ["preflight", packageJson.scripts?.preflight],
    ["test", packageJson.scripts?.test],
    ["build", packageJson.scripts?.build],
    ["browser:online-showcase", packageJson.scripts?.["browser:online-showcase"]],
    ["browser:mobile-admin", packageJson.scripts?.["browser:mobile-admin"]],
    ["apps/mobile build:mp-weixin", mobilePackageJson.scripts?.["build:mp-weixin"]]
  ];
  const missing = requiredScripts.filter(([, value]) => !value).map(([name]) => name);
  addCheck("Audit command dependencies", missing.length ? "failed" : "passed", {
    missing
  });
  if (missing.length) {
    addIssue("P1", "Required audit commands are missing", `Missing script(s): ${missing.join(", ")}.`, {
      advice: "Restore package.json scripts before trusting release checks."
    });
  }
}

async function runCommandStep(step) {
  const startedAt = new Date();
  const logPath = path.join(outputDir, `${String(result.commands.length + 1).padStart(2, "0")}-${slug(step.name)}.log`);
  const required = step.required !== false;
  const timeoutMs = step.timeoutMs || 120000;
  const commandLine = [step.command, ...(step.args || [])].join(" ");
  console.log(`[run] ${step.name}`);

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let spawnError = null;

  const exitCode = await new Promise((resolve) => {
    let child;
    const spawnCommand = process.platform === "win32" ? shellJoin(step.command, step.args || []) : step.command;
    const spawnArgs = process.platform === "win32" ? [] : step.args || [];
    try {
      child = spawn(spawnCommand, spawnArgs, {
        cwd: root,
        env: { ...process.env, ...(step.env || {}) },
        shell: process.platform === "win32",
        windowsHide: true
      });
    } catch (error) {
      spawnError = error;
      resolve(127);
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (verbose) process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (verbose) process.stderr.write(text);
    });
    child.on("error", (error) => {
      spawnError = error;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code ?? (spawnError ? 127 : 1));
    });
  });

  const finishedAt = new Date();
  const ok = exitCode === 0 && !timedOut && !spawnError;
  const status = ok ? "passed" : required ? "failed" : "warning";
  const combinedOutput = redact([stdout, stderr, spawnError?.stack || spawnError?.message || ""].filter(Boolean).join("\n"));
  fs.writeFileSync(logPath, `$ ${commandLine}\n\n${combinedOutput}`, "utf8");

  const row = {
    name: step.name,
    command: commandLine,
    status,
    required,
    exitCode,
    timedOut,
    durationMs: finishedAt - startedAt,
    logPath,
    tail: tail(combinedOutput)
  };
  result.commands.push(row);

  if (!ok) {
    console.log(`[${status}] ${step.name} -> ${relative(logPath)}`);
    if (row.tail) console.log(row.tail);
    addIssue(required ? "P1" : "P2", `${step.name} did not pass`, timedOut ? "Command timed out." : `Exit code ${exitCode}.`, {
      locations: [{ file: relative(logPath), line: 1 }],
      advice: required ? "Open the log, fix the failing check, then rerun npm run codex:release-check." : "Review the warning before release."
    });
  } else {
    console.log(`[ok] ${step.name}`);
  }
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "step";
}

function shellJoin(command, commandArgs) {
  return [command, ...commandArgs].map(shellQuote).join(" ");
}

function shellQuote(value) {
  const text = String(value);
  if (/^[a-zA-Z0-9_./:=@+-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

async function runProfileCommands() {
  await runCommandStep({
    name: "doctor",
    command: npmCommand,
    args: ["run", "doctor"],
    required: false,
    timeoutMs: 90000
  });

  await runCommandStep({
    name: "preflight guards",
    command: npmCommand,
    args: ["run", "test:preflight-guards"],
    required: profile === "release",
    timeoutMs: 240000
  });

  if (profile !== "release") return;

  await runCommandStep({
    name: "release preflight",
    command: npmCommand,
    args: ["run", "preflight"],
    required: true,
    timeoutMs: 300000
  });

  await runCommandStep({
    name: "api unit tests",
    command: npmCommand,
    args: ["test"],
    required: true,
    timeoutMs: 300000
  });

  await runCommandStep({
    name: "full web build",
    command: npmCommand,
    args: ["run", "build"],
    required: true,
    timeoutMs: 720000
  });

  await runCommandStep(mpWeixinBuildStep());

  const acceptanceOutputDir = path.join(outputDir, "acceptance");
  const acceptanceServer = await startAcceptanceStaticServer();
  const acceptanceEnv = {
    ACCEPTANCE_OUTPUT_DIR: acceptanceOutputDir,
    WEB_BASE: acceptanceServer.baseUrl,
    ADMIN_WEB_BASE: acceptanceServer.baseUrl,
    API_BASE: `${acceptanceServer.baseUrl}/api`,
    H5_LOGIN_MODE: process.env.H5_LOGIN_MODE || acceptanceServer.h5LoginMode
  };
  try {
    await runCommandStep({
      name: "browser online showcase acceptance",
      command: npmCommand,
      args: ["run", "browser:online-showcase"],
      required: true,
      timeoutMs: 480000,
      env: acceptanceEnv
    });

    await runCommandStep({
      name: "browser mobile admin acceptance",
      command: npmCommand,
      args: ["run", "browser:mobile-admin"],
      required: true,
      timeoutMs: 420000,
      env: acceptanceEnv
    });
  } finally {
    await acceptanceServer.close();
  }

  collectAcceptanceArtifacts(acceptanceOutputDir);
}

function startAcceptanceStaticServer() {
  const h5Root = path.join(root, "apps", "mobile", "dist", "build", "h5");
  const adminRoot = path.join(root, "apps", "admin", "dist");
  const proxyBase = new URL((process.env.ACCEPTANCE_API_PROXY || "http://127.0.0.1:18080").replace(/\/$/, ""));
  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname.startsWith("/api/") || requestUrl.pathname.startsWith("/uploads/")) {
      proxyAcceptanceRequest(req, res, proxyBase);
      return;
    }
    const isAdmin = requestUrl.pathname === "/admin" || requestUrl.pathname.startsWith("/admin/");
    const staticRoot = isAdmin ? adminRoot : h5Root;
    const prefix = isAdmin ? "/admin" : "";
    const relativePath = isAdmin ? requestUrl.pathname.slice(prefix.length) || "/" : requestUrl.pathname;
    const filePath = safeStaticPath(staticRoot, relativePath);
    const fallback = path.join(staticRoot, "index.html");
    serveStaticFile(filePath, fallback, res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[acceptance] serving current build at ${baseUrl}, proxy ${proxyBase.href}`);
      resolve({
        baseUrl,
        h5LoginMode: proxyBase.protocol === "https:" ? "password" : "code",
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

function safeStaticPath(staticRoot, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0] || "/");
  const clean = decoded.replace(/^\/+/, "");
  const target = path.resolve(staticRoot, clean || "index.html");
  const rootPath = path.resolve(staticRoot);
  if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) return path.join(staticRoot, "index.html");
  return target;
}

function serveStaticFile(filePath, fallback, res) {
  const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : fallback;
  const ext = path.extname(target).toLowerCase();
  const type = ({
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2"
  })[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-cache, no-store, must-revalidate"
  });
  fs.createReadStream(target).pipe(res);
}

function proxyAcceptanceRequest(req, res, proxyBase) {
  const target = new URL(req.url || "/", proxyBase);
  const transport = proxyBase.protocol === "https:" ? https : http;
  const proxyReq = transport.request(target, {
    method: req.method,
    headers: { ...req.headers, host: proxyBase.host }
  }, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    delete headers["content-security-policy"];
    res.writeHead(proxyRes.statusCode || 502, headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ code: 1, message: `Acceptance proxy failed: ${error.message}` }));
  });
  req.pipe(proxyReq);
}

function mpWeixinBuildStep() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (process.platform === "win32" && nodeMajor >= 25 && compatibleMpWeixinNodeDir) {
    const script = [
      `$nodeDir = '${compatibleMpWeixinNodeDir.replace(/'/g, "''")}'`,
      "$env:PATH = $nodeDir + ';' + $env:PATH",
      "node -v",
      "Push-Location apps/mobile",
      ".\\node_modules\\.bin\\uni.cmd build -p mp-weixin",
      "$code = $LASTEXITCODE",
      "Pop-Location",
      "if ($code -ne 0) { exit $code }",
      "node scripts/patch-mobile-mp-weixin-auth.mjs",
      "node scripts/write-static-version.mjs apps/mobile/dist/build/mp-weixin mp-weixin",
      "node scripts/check-mobile-mp-weixin-artifacts.mjs"
    ].join("; ");
    return {
      name: "wechat mini program build",
      command: "powershell",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      required: true,
      timeoutMs: 420000
    };
  }
  return {
    name: "wechat mini program build",
    command: npmCommand,
    args: ["--prefix", "apps/mobile", "run", "build:mp-weixin"],
    required: true,
    timeoutMs: 420000
  };
}

function collectAcceptanceArtifacts(baseDir) {
  const files = listFiles(baseDir, new Set([".json"])).filter((file) => path.basename(file) === "result.json");
  if (!files.length) {
    addCheck("Browser acceptance artifacts", "warning", { value: "No result.json files found." });
    return;
  }
  result.artifacts.acceptanceResults = files.map(relative);
  addCheck("Browser acceptance artifacts", "passed", { files: result.artifacts.acceptanceResults });
}

function runStaticChecks() {
  checkBuildArtifacts();
  scanMiniProgramReviewText();
  scanAdminDtoPayloadRisk();
}

function checkBuildArtifacts() {
  const expected = [
    ["API", "apps/api/dist/main.js"],
    ["API data source", "apps/api/dist/data-source.js"],
    ["Admin", "apps/admin/dist/index.html"],
    ["Mobile H5", "apps/mobile/dist/build/h5/index.html"],
    ["Mobile mp-weixin", "apps/mobile/dist/build/mp-weixin/app.json"],
    ["Mobile mp-weixin version", "apps/mobile/dist/build/mp-weixin/version.json"]
  ];
  const missing = expected.filter(([, file]) => !fs.existsSync(path.join(root, file)));
  const status = missing.length ? (profile === "release" ? "failed" : "warning") : "passed";
  addCheck("Build artifacts", status, {
    missing: missing.map(([, file]) => file)
  });
  if (missing.length) {
    addIssue(profile === "release" ? "P1" : "P2", "Build artifacts are missing", `Missing: ${missing.map(([, file]) => file).join(", ")}.`, {
      advice: profile === "release" ? "Run npm run build and npm --prefix apps/mobile run build:mp-weixin." : "This is expected before a fresh build; release profile will rebuild and enforce it."
    });
  }
}

function scanMiniProgramReviewText() {
  const bannedTerms = [
    "微信登录",
    "微信授权",
    "微信昵称",
    "微信头像",
    "手机号授权",
    "微信手机号",
    "微信资料",
    "微信用户",
    "微信已登录",
    "微信未自动",
    "从微信读取",
    "稍后进入"
  ];
  const scanRoots = [
    "apps/mobile/src/pages/user",
    "apps/mobile/src/components",
    "apps/mobile/dist/build/h5",
    "apps/mobile/dist/build/mp-weixin"
  ];
  const extensions = new Set([".vue", ".ts", ".js", ".json", ".wxml", ".wxss", ".html", ".css"]);
  const matches = [];
  const skipped = [];

  for (const scanRoot of scanRoots) {
    const absoluteRoot = path.join(root, scanRoot);
    if (!fs.existsSync(absoluteRoot)) {
      skipped.push(scanRoot);
      continue;
    }
    for (const file of listFiles(absoluteRoot, extensions)) {
      if (isLargeFile(file)) continue;
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const term of bannedTerms) {
          if (line.includes(term)) {
            matches.push({
              file: relative(file),
              line: index + 1,
              term,
              snippet: line.trim().slice(0, 180)
            });
          }
        }
      });
    }
  }

  addCheck("Mini-program review wording", matches.length ? "failed" : skipped.length ? "warning" : "passed", {
    matches: matches.length,
    skipped
  });

  if (matches.length) {
    addIssue("P1", "Mini-program review-sensitive wording found", `${matches.length} occurrence(s) matched the audit wording denylist.`, {
      locations: matches.slice(0, 30).map(({ file, line, term }) => ({ file, line, term })),
      advice: "Replace visible login/binding wording with neutral mobile account wording, then rebuild H5 and mp-weixin."
    });
  }
}

function scanAdminDtoPayloadRisk() {
  const viewsRoot = path.join(root, "apps", "admin", "src", "views");
  if (!fs.existsSync(viewsRoot)) {
    addCheck("Admin DTO payload risk", "skipped", { reason: "apps/admin/src/views missing" });
    return;
  }

  const extensions = new Set([".vue", ".ts", ".js"]);
  const spreadPattern = /\{\s*\.\.\.(form|form\.value|row|record|current|draft|model|productForm|couponForm|flashSaleForm|groupBuyForm|logisticsForm)\b/;
  const mutationPattern = /\b(api\.(post|put|patch)|create\w*\(|update\w*\(|save\w*\(|payload\s*=)/;
  const safePattern = /\b(rowPayload|sanitize|sanitized|build\w*Payload|to\w*Payload|pick\w*Payload)\b/;
  const findings = [];

  for (const file of listFiles(viewsRoot, extensions)) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!spreadPattern.test(line)) return;
      // Copying an API record into local form state is not a mutation payload.
      // Only flag spreads that participate in a submitted payload or mutation call.
      if (/\b\w*Form\.value\s*=/.test(line) && !mutationPattern.test(line)) return;
      const context = lines.slice(Math.max(0, index - 4), Math.min(lines.length, index + 5)).join("\n");
      if (!mutationPattern.test(context)) return;
      if (safePattern.test(context)) return;
      findings.push({
        file: relative(file),
        line: index + 1,
        snippet: line.trim().slice(0, 180)
      });
    });
  }

  addCheck("Admin DTO payload risk", findings.length ? "warning" : "passed", {
    matches: findings.length
  });

  if (findings.length) {
    addIssue("P2", "Admin mutation payloads may include non-whitelisted DTO fields", `${findings.length} spread payload candidate(s) need review.`, {
      locations: findings.slice(0, 30).map(({ file, line }) => ({ file, line })),
      advice: "For API create/update/patch calls, build explicit payloads or use a sanitizer so backend whitelist validation does not reject UI-only fields."
    });
  }
}

function listFiles(baseDir, extensions) {
  if (!fs.existsSync(baseDir)) return [];
  const output = [];
  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(file);
        continue;
      }
      if (!entry.isFile()) continue;
      if (extensions.has(path.extname(entry.name))) output.push(file);
    }
  }
  return output;
}

function isLargeFile(file) {
  try {
    return fs.statSync(file).size > 2 * 1024 * 1024;
  } catch {
    return true;
  }
}

function summarize() {
  const commandPassed = result.commands.filter((item) => item.status === "passed").length;
  const commandFailed = result.commands.filter((item) => item.status === "failed").length;
  const commandWarnings = result.commands.filter((item) => item.status === "warning").length;
  const checkPassed = result.checks.filter((item) => item.status === "passed").length;
  const checkFailed = result.checks.filter((item) => item.status === "failed").length;
  const checkWarnings = result.checks.filter((item) => item.status === "warning").length;
  const blockingIssues = result.issues.filter((item) => item.priority === "P0" || item.priority === "P1").length;
  const warnings = result.issues.filter((item) => item.priority === "P2").length + commandWarnings + checkWarnings;

  result.summary = {
    commandPassed,
    commandFailed,
    commandWarnings,
    checkPassed,
    checkFailed,
    checkWarnings,
    issues: result.issues.length,
    blockingIssues,
    warnings
  };

  if (commandFailed || checkFailed || blockingIssues) result.status = "failed";
  else if (warnings) result.status = "warning";
  else result.status = "passed";
}

function writeReports() {
  result.finishedAt = new Date().toISOString();
  summarize();
  fs.writeFileSync(resultJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(latestReportPath, renderMarkdownReport(), "utf8");

  if (format === "json") {
    console.log(JSON.stringify({
      status: result.status,
      profile: result.profile,
      runId: result.runId,
      summary: result.summary,
      resultJson: resultJsonPath,
      latestMarkdown: latestReportPath
    }, null, 2));
  } else {
    console.log("");
    console.log(`Codex audit ${result.status.toUpperCase()} (${profile})`);
    console.log(`- JSON: ${resultJsonPath}`);
    console.log(`- Report: ${latestReportPath}`);
  }
}

function renderMarkdownReport() {
  const statusText = {
    passed: "通过",
    warning: "有警告",
    failed: "未通过",
    skipped: "跳过"
  };
  const rows = [
    ["巡检模式", profile],
    ["状态", statusText[result.status] || result.status],
    ["开始时间", result.startedAt],
    ["结束时间", result.finishedAt],
    ["Git 分支", result.git.branch || "-"],
    ["Git Commit", result.git.commit || "-"],
    ["Node", result.environment.node || "-"],
    ["npm", result.environment.npm || "-"]
  ];

  return [
    "# Codex 自动巡检报告",
    "",
    "## 总览",
    "",
    table(["项目", "结果"], rows),
    "",
    "## 统计",
    "",
    table(["类别", "数量"], [
      ["命令通过", String(result.summary.commandPassed)],
      ["命令失败", String(result.summary.commandFailed)],
      ["命令警告", String(result.summary.commandWarnings)],
      ["检查通过", String(result.summary.checkPassed)],
      ["检查失败", String(result.summary.checkFailed)],
      ["检查警告", String(result.summary.checkWarnings)],
      ["阻塞问题", String(result.summary.blockingIssues)],
      ["全部问题", String(result.summary.issues)]
    ]),
    "",
    "## 问题清单",
    "",
    renderIssues(),
    "",
    "## 命令结果",
    "",
    renderCommands(),
    "",
    "## 静态检查",
    "",
    renderChecks(),
    "",
    "## 交付命令",
    "",
    "### GitHub 推送",
    "",
    codeBlock(result.deployment.gitPushCommand),
    "",
    "### 宝塔部署",
    "",
    codeBlock(result.deployment.baotaCommands.join("\n")),
    "",
    "### 微信开发者工具导入目录",
    "",
    codeBlock(result.artifacts.mpWeixinImportDir),
    "",
    "## 产物",
    "",
    table(["名称", "路径"], [
      ["JSON 结果", resultJsonPath],
      ["Markdown 报告", latestReportPath],
      ["巡检日志目录", outputDir],
      ["浏览器验收结果", (result.artifacts.acceptanceResults || []).join("<br>") || "-"]
    ]),
    ""
  ].join("\n");
}

function renderIssues() {
  if (!result.issues.length) return "未发现阻塞问题。";
  return result.issues.map((issue, index) => {
    const locations = issue.locations?.length
      ? issue.locations.slice(0, 10).map((item) => `  - ${item.file}${item.line ? `:${item.line}` : ""}${item.term ? ` (${item.term})` : ""}`).join("\n")
      : "  - -";
    return [
      `${index + 1}. **${issue.priority} ${issue.title}**`,
      `   - 详情：${issue.detail}`,
      `   - 建议：${issue.advice || "按日志定位后复测。"}`,
      "   - 位置：",
      locations
    ].join("\n");
  }).join("\n\n");
}

function renderCommands() {
  if (!result.commands.length) return "未运行命令。";
  return table(["命令", "状态", "耗时", "日志"], result.commands.map((item) => [
    item.name,
    item.status,
    `${Math.round(item.durationMs / 1000)}s`,
    relative(item.logPath)
  ]));
}

function renderChecks() {
  if (!result.checks.length) return "无静态检查结果。";
  return table(["检查", "状态", "详情"], result.checks.map((item) => [
    item.name,
    item.status,
    compactDetail(item)
  ]));
}

function compactDetail(item) {
  const copy = { ...item };
  delete copy.name;
  delete copy.status;
  const text = JSON.stringify(copy);
  return text === "{}" ? "-" : text.replace(/\|/g, "\\|");
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "-").replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function codeBlock(value) {
  return ["```bash", value, "```"].join("\n");
}

async function main() {
  collectEnvironment();
  collectGit();
  collectScriptAvailability();
  await runProfileCommands();
  runStaticChecks();
  writeReports();
  if (result.status === "failed") process.exitCode = 1;
}

main().catch((error) => {
  result.status = "failed";
  addIssue("P1", "Audit script crashed", error.stack || error.message, {
    advice: "Fix scripts/codex-audit.mjs and rerun the audit."
  });
  writeReports();
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
