import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const apiOrigin = String(process.env.MONITOR_API_ORIGIN || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const resultFile = path.resolve(root, process.env.MONITOR_RESULT_FILE || "deploy/monitor-health-result.json");
const stateFile = path.resolve(root, process.env.MONITOR_STATE_FILE || ".local-logs/monitor-health-state.json");
const webhookUrl = String(process.env.MONITOR_ALERT_WEBHOOK_URL || "").trim();
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 10000);
const dueJobWarning = Number(process.env.MONITOR_DUE_JOB_WARNING || 20);
const failOnWarning = process.env.MONITOR_FAIL_ON_WARNING === "true";

async function request(route, responseType = "json") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiOrigin}${route}`, { signal: controller.signal, headers: { Accept: responseType === "json" ? "application/json" : "text/plain" } });
    const body = responseType === "json" ? await response.json() : await response.text();
    if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}`);
    if (responseType !== "json") {
      try {
        const envelope = JSON.parse(body);
        if (typeof envelope?.data === "string") return envelope.data;
      } catch {
        // Prometheus endpoints may return either raw text or the platform response envelope.
      }
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function parseMetrics(source) {
  const metrics = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || line.includes("{")) continue;
    const [name, rawValue] = line.trim().split(/\s+/, 2);
    if (name && rawValue !== undefined) metrics[name] = Number(rawValue);
  }
  return metrics;
}

function addAlert(alerts, condition, severity, code, message, value) {
  if (condition) alerts.push({ severity, code, message, value });
}

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return {}; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function notify(payload) {
  if (!webhookUrl) return { sent: false, reason: "webhook_not_configured" };
  const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`alert webhook returned HTTP ${response.status}`);
  return { sent: true };
}

async function main() {
  const checkedAt = new Date().toISOString();
  const alerts = [];
  let health = null;
  let ready = null;
  let metrics = {};
  try {
    [health, ready, metrics] = await Promise.all([request("/health"), request("/health/ready"), request("/health/metrics", "text").then(parseMetrics)]);
    const healthData = health?.data || health;
    const readyData = ready?.data || ready;
    addAlert(alerts, readyData?.ready !== true, "critical", "api_not_ready", "API readiness is not true", readyData?.ready);
    addAlert(alerts, metrics.activity_api_up !== 1, "critical", "api_down", "API liveness metric is down", metrics.activity_api_up);
    addAlert(alerts, metrics.activity_database_up !== 1, "critical", "database_down", "Database connectivity metric is down", metrics.activity_database_up);
    addAlert(alerts, metrics.activity_config_error > 0, "critical", "config_error", "Runtime configuration has blocking errors", metrics.activity_config_error);
    addAlert(alerts, metrics.activity_operational_metrics_up !== 1, "critical", "operational_metrics_down", "Operational risk metrics query failed", metrics.activity_operational_metrics_up);
    addAlert(alerts, metrics.activity_business_jobs_dead_letter > 0, "critical", "dead_letter_jobs", "Business jobs entered dead letter", metrics.activity_business_jobs_dead_letter);
    addAlert(alerts, metrics.activity_business_jobs_stale_processing > 0, "critical", "stale_jobs", "Business jobs have expired processing locks", metrics.activity_business_jobs_stale_processing);
    addAlert(alerts, metrics.activity_refund_provider_failures > 0, "critical", "refund_provider_failures", "Refund provider failures require attention", metrics.activity_refund_provider_failures);
    addAlert(alerts, metrics.activity_business_jobs_due > dueJobWarning, "warning", "jobs_due_backlog", "Due business job backlog exceeds threshold", metrics.activity_business_jobs_due);
    addAlert(alerts, metrics.activity_payment_callback_failures_15m > 0, "warning", "payment_callback_failures", "Recent payment callbacks failed validation or processing", metrics.activity_payment_callback_failures_15m);
    addAlert(alerts, metrics.activity_inventory_anomalies_open > 0, "warning", "inventory_anomalies", "Open inventory anomalies require review", metrics.activity_inventory_anomalies_open);
    addAlert(alerts, metrics.activity_fund_risk_alerts_open > 0, "warning", "fund_risk_alerts", "Open fund risk alerts require review", metrics.activity_fund_risk_alerts_open);
    health = healthData;
    ready = readyData;
  } catch (error) {
    alerts.push({ severity: "critical", code: "monitor_request_failed", message: error instanceof Error ? error.message : String(error), value: null });
  }

  const fingerprint = createHash("sha256").update(JSON.stringify(alerts.map((alert) => [alert.severity, alert.code, alert.value]))).digest("hex");
  const previous = readState();
  const changed = previous.fingerprint !== fingerprint;
  const recovered = alerts.length === 0 && Boolean(previous.active);
  const payload = { checkedAt, apiOrigin, status: alerts.some((alert) => alert.severity === "critical") ? "critical" : alerts.length ? "warning" : "ok", alerts, metrics, release: health?.release || null, ready: ready?.ready === true, fingerprint };
  let notification = { sent: false, reason: changed ? "webhook_not_configured" : "unchanged" };
  if (changed && (alerts.length || recovered)) notification = await notify({ event: recovered ? "recovered" : "alert", ...payload });
  writeJson(resultFile, { ...payload, notification });
  writeJson(stateFile, { checkedAt, fingerprint, active: alerts.length > 0, status: payload.status });
  console.log(JSON.stringify({ status: payload.status, alerts: alerts.length, resultFile, notification }, null, 2));
  if (payload.status === "critical" || (failOnWarning && payload.status === "warning")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Health monitor failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
