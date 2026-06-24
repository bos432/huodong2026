const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, "true");
  }
}

const apiBase = (args.get("api-base") || process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const readyUrl = args.get("url") || process.env.API_READY_URL || `${apiBase}/health/ready`;
const timeoutMs = positiveNumber(args.get("timeout-ms") || process.env.API_READY_TIMEOUT_MS, 60000);
const intervalMs = positiveNumber(args.get("interval-ms") || process.env.API_READY_INTERVAL_MS, 2000);
const startedAt = Date.now();
let attempt = 0;
let lastError = "";
let ready = false;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBody(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function readinessOk(body) {
  // Keep the readiness contract explicit: success means ready=true.
  if (body?.code === 0 && body?.data?.ready === true) return true;
  return body?.ready === true;
}

function readinessSummary(body) {
  if (!body || typeof body !== "object") return String(body || "");
  const data = body.data || body;
  return [
    `ready=${data.ready}`,
    `api=${data.api || ""}`,
    `database=${data.database || ""}`,
    `config=${data.config || ""}`,
    `commit=${data.release?.commit || ""}`
  ].filter(Boolean).join(" ");
}

while (Date.now() - startedAt <= timeoutMs) {
  attempt += 1;
  try {
    const res = await fetch(readyUrl, { headers: { Accept: "application/json" } });
    const text = await res.text();
    const body = parseBody(text);
    if (res.ok && readinessOk(body)) {
      console.log(`OK API ready after ${attempt} attempt(s): ${readyUrl}`);
      const summary = readinessSummary(body);
      if (summary) console.log(summary);
      ready = true;
      break;
    }
    lastError = `HTTP ${res.status} ${readinessSummary(body) || text.slice(0, 160)}`;
  } catch (error) {
    lastError = error.message || String(error);
  }
  console.log(`WAIT API not ready (${attempt}): ${lastError}`);
  await sleep(intervalMs);
}

if (!ready) {
  console.error(`ERR API readiness timeout after ${timeoutMs}ms: ${readyUrl}`);
  if (lastError) console.error(`Last error: ${lastError}`);
  process.exitCode = 1;
}
