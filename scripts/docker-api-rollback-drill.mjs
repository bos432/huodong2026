import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const envFile = process.env.ROLLBACK_DRILL_ENV_FILE || "deploy/.env.local-docker.example";
const project = process.env.ROLLBACK_DRILL_PROJECT || "activity-registration";
const image = process.env.ROLLBACK_DRILL_IMAGE || "activity-registration-api";
const container = process.env.ROLLBACK_DRILL_CONTAINER || "activity-api";
const readyUrl = process.env.ROLLBACK_DRILL_READY_URL || "http://127.0.0.1:3000/api/health/ready";
const resultFile = path.resolve(root, process.env.ROLLBACK_DRILL_RESULT_FILE || "deploy/rollback-drill-result.json");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
const baselineTag = `${image}:rollback-baseline-${stamp}`;
const candidateTag = `${image}:rollback-candidate-${stamp}`;
const startedAt = Date.now();
let baselineImageId = "";
let candidateImageId = "";
let candidateDeployed = false;
let failureDetected = false;
let readyPayload = null;

function run(args, capture = true) {
  const output = execFileSync("docker", args, { cwd: root, encoding: "utf8", stdio: capture ? "pipe" : "inherit", maxBuffer: 20 * 1024 * 1024 });
  return typeof output === "string" ? output.trim() : "";
}

function compose(args) {
  run(["compose", "-p", project, "--env-file", envFile, ...args], false);
}

async function fetchReady() {
  try {
    const response = await fetch(readyUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const body = await response.json();
    const payload = body?.data || body;
    return payload?.ready === true ? payload : null;
  } catch {
    return null;
  }
}

async function waitForReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = await fetchReady();
    if (payload) return payload;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

function restoreBaseline() {
  if (!baselineImageId) return;
  run(["tag", baselineTag, `${image}:latest`]);
  compose(["up", "-d", "--no-deps", "--no-build", "--force-recreate", "api"]);
  candidateDeployed = false;
}

async function main() {
  baselineImageId = run(["image", "inspect", `${image}:latest`, "--format", "{{.Id}}"]).trim();
  run(["tag", `${image}:latest`, baselineTag]);
  run(["commit", "--change", 'CMD ["sh","-c","sleep 600"]', "--change", 'LABEL rollback.drill="intentional-no-http"', container, candidateTag]);
  candidateImageId = run(["image", "inspect", candidateTag, "--format", "{{.Id}}"]).trim();
  if (candidateImageId === baselineImageId) throw new Error("Rollback candidate image must differ from the baseline image");

  run(["tag", candidateTag, `${image}:latest`]);
  candidateDeployed = true;
  compose(["up", "-d", "--no-deps", "--no-build", "--force-recreate", "api"]);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  failureDetected = !(await fetchReady());
  if (!failureDetected) throw new Error("Intentional candidate failure was not detected by readiness probing");

  const rollbackStartedAt = Date.now();
  restoreBaseline();
  readyPayload = await waitForReady(Number(process.env.ROLLBACK_DRILL_READY_TIMEOUT_MS || 90000));
  const currentImageId = run(["inspect", container, "--format", "{{.Image}}"]).trim();
  if (!readyPayload) throw new Error("API did not recover before the rollback readiness timeout");
  if (currentImageId !== baselineImageId) throw new Error(`Rollback container image mismatch: expected ${baselineImageId}, received ${currentImageId}`);

  const result = {
    passed: true,
    executedAt: new Date().toISOString(),
    baselineTag,
    baselineImageId,
    candidateTag,
    candidateImageId,
    failureDetected,
    recovered: true,
    rollbackSeconds: Number(((Date.now() - rollbackStartedAt) / 1000).toFixed(2)),
    totalSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
    readyUrl,
    release: readyPayload.release || null
  };
  fs.mkdirSync(path.dirname(resultFile), { recursive: true });
  fs.writeFileSync(resultFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, resultFile }, null, 2));
}

main().catch(async (error) => {
  try {
    if (candidateDeployed) {
      restoreBaseline();
      readyPayload = await waitForReady(90000);
    }
  } catch (rollbackError) {
    console.error(`Emergency rollback also failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
  }
  console.error(`API rollback drill failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
