import { Controller, Get, Header, HttpCode, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { inspectRuntimeConfig } from "../../shared/config-validation";
import { isWorkerHeartbeatReady, readWorkerHeartbeat, workerHeartbeatAgeMs } from "../../worker-heartbeat";

@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  @Get()
  async check() {
    const database = await this.databaseStatus();
    return {
      api: "up",
      database,
      config: inspectRuntimeConfig(this.config).status,
      worker: this.workerStatus(),
      release: this.releaseInfo(),
      uptimeSeconds: this.uptimeSeconds(),
      time: new Date().toISOString()
    };
  }

  @Get("live")
  live() {
    return {
      api: "up",
      release: this.releaseInfo(),
      uptimeSeconds: this.uptimeSeconds(),
      time: new Date().toISOString()
    };
  }

  @Get("ready")
  @HttpCode(200)
  async ready() {
    const database = await this.databaseStatus();
    const configInspection = inspectRuntimeConfig(this.config);
    const worker = this.workerStatus();
    const ready = database === "up" && configInspection.status !== "error" && (!worker.required || worker.ready);
    const payload = {
      ready,
      api: "up",
      database,
      config: configInspection.status,
      worker,
      configSummary: configInspection.summary,
      configWarnings: configInspection.checks
        .filter((check) => check.status !== "ok")
        .map((check) => ({ key: check.key, status: check.status, resolution: check.resolution, label: check.label })),
      release: this.releaseInfo(),
      uptimeSeconds: this.uptimeSeconds(),
      time: new Date().toISOString()
    };
    if (!ready) throw new ServiceUnavailableException(payload);
    return payload;
  }

  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async metrics() {
    const database = await this.databaseStatus();
    const configStatus = inspectRuntimeConfig(this.config).status;
    const worker = this.workerStatus();
    const operations = database === "up" ? await this.operationalMetrics() : null;
    const lines = [
      "# HELP activity_api_up API process liveness.",
      "# TYPE activity_api_up gauge",
      "activity_api_up 1",
      "# HELP activity_database_up Database connectivity status.",
      "# TYPE activity_database_up gauge",
      `activity_database_up ${database === "up" ? 1 : 0}`,
      "# HELP activity_config_error Production configuration error status.",
      "# TYPE activity_config_error gauge",
      `activity_config_error ${configStatus === "error" ? 1 : 0}`,
      "# HELP activity_process_uptime_seconds API process uptime in seconds.",
      "# TYPE activity_process_uptime_seconds gauge",
      `activity_process_uptime_seconds ${this.uptimeSeconds()}`,
      "# HELP activity_build_info Build and release metadata.",
      "# TYPE activity_build_info gauge",
      `activity_build_info{version="${this.metricLabel(this.releaseInfo().version)}",commit="${this.metricLabel(this.releaseInfo().commit)}"} 1`,
      "# HELP activity_worker_required Whether the deployment requires an external business worker.",
      "# TYPE activity_worker_required gauge",
      `activity_worker_required ${worker.required ? 1 : 0}`,
      "# HELP activity_worker_ready External business worker heartbeat readiness.",
      "# TYPE activity_worker_ready gauge",
      `activity_worker_ready ${worker.ready ? 1 : 0}`,
      "# HELP activity_worker_heartbeat_age_seconds Age of the external business worker heartbeat.",
      "# TYPE activity_worker_heartbeat_age_seconds gauge",
      `activity_worker_heartbeat_age_seconds ${Number.isFinite(worker.ageMs) ? Math.floor(worker.ageMs / 1000) : -1}`,
      "# HELP activity_operational_metrics_up Operational risk metrics query status.",
      "# TYPE activity_operational_metrics_up gauge",
      `activity_operational_metrics_up ${operations ? 1 : 0}`,
      "# HELP activity_business_jobs_due Pending business jobs whose retry time is due.",
      "# TYPE activity_business_jobs_due gauge",
      `activity_business_jobs_due ${operations?.businessJobsDue ?? 0}`,
      "# HELP activity_business_jobs_dead_letter Business jobs in the dead-letter state.",
      "# TYPE activity_business_jobs_dead_letter gauge",
      `activity_business_jobs_dead_letter ${operations?.businessJobsDeadLetter ?? 0}`,
      "# HELP activity_business_jobs_stale_processing Processing jobs whose lock has expired.",
      "# TYPE activity_business_jobs_stale_processing gauge",
      `activity_business_jobs_stale_processing ${operations?.businessJobsStaleProcessing ?? 0}`,
      "# HELP activity_payment_callback_failures_15m Failed or invalid payment callbacks in the last 15 minutes.",
      "# TYPE activity_payment_callback_failures_15m gauge",
      `activity_payment_callback_failures_15m ${operations?.paymentCallbackFailures15m ?? 0}`,
      "# HELP activity_refund_provider_failures Refunds waiting after a provider failure.",
      "# TYPE activity_refund_provider_failures gauge",
      `activity_refund_provider_failures ${operations?.refundProviderFailures ?? 0}`,
      "# HELP activity_inventory_anomalies_open Open mall inventory anomalies.",
      "# TYPE activity_inventory_anomalies_open gauge",
      `activity_inventory_anomalies_open ${operations?.inventoryAnomaliesOpen ?? 0}`,
      "# HELP activity_fund_risk_alerts_open Open or acknowledged fund risk alerts.",
      "# TYPE activity_fund_risk_alerts_open gauge",
      `activity_fund_risk_alerts_open ${operations?.fundRiskAlertsOpen ?? 0}`
    ];
    return `${lines.join("\n")}\n`;
  }

  private async databaseStatus() {
    try {
      await this.dataSource.query("SELECT 1");
      return "up";
    } catch {
      return "down";
    }
  }

  @Get("worker")
  worker() {
    return this.workerStatus();
  }

  private async operationalMetrics() {
    try {
      const rows = await this.dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM business_jobs WHERE status = 'pending' AND nextAttemptAt <= CURRENT_TIMESTAMP) AS businessJobsDue,
          (SELECT COUNT(*) FROM business_jobs WHERE status = 'dead_letter') AS businessJobsDeadLetter,
          (SELECT COUNT(*) FROM business_jobs WHERE status = 'processing' AND lockedUntil < CURRENT_TIMESTAMP) AS businessJobsStaleProcessing,
          (SELECT COUNT(*) FROM payment_callback_logs WHERE createdAt >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE) AND (resultStatus = 'failed' OR signatureValid = 0)) AS paymentCallbackFailures15m,
          (SELECT COUNT(*) FROM refunds WHERE status NOT IN ('completed', 'rejected') AND providerRefundFailureReason IS NOT NULL) AS refundProviderFailures,
          (SELECT COUNT(*) FROM mall_inventory_anomalies WHERE status = 'open') AS inventoryAnomaliesOpen,
          (SELECT COUNT(*) FROM fund_risk_alerts WHERE status IN ('open', 'acknowledged')) AS fundRiskAlertsOpen
      `);
      const row = rows[0] || {};
      return {
        businessJobsDue: Number(row.businessJobsDue || 0),
        businessJobsDeadLetter: Number(row.businessJobsDeadLetter || 0),
        businessJobsStaleProcessing: Number(row.businessJobsStaleProcessing || 0),
        paymentCallbackFailures15m: Number(row.paymentCallbackFailures15m || 0),
        refundProviderFailures: Number(row.refundProviderFailures || 0),
        inventoryAnomaliesOpen: Number(row.inventoryAnomaliesOpen || 0),
        fundRiskAlertsOpen: Number(row.fundRiskAlertsOpen || 0)
      };
    } catch {
      return null;
    }
  }

  private uptimeSeconds() {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  private releaseInfo() {
    return {
      version: this.config.get<string>("APP_VERSION", "0.1.0"),
      commit: this.config.get<string>("BUILD_COMMIT", "local"),
      buildTime: this.config.get<string>("BUILD_TIME", "unknown")
    };
  }

  private metricLabel(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }

  private workerStatus() {
    const mode = this.config.get<string>("BUSINESS_JOB_WORKER_MODE", "embedded");
    const external = mode === "external";
    const heartbeat = external ? readWorkerHeartbeat() : null;
    return {
      mode,
      required: external,
      ready: !external || isWorkerHeartbeatReady(heartbeat),
      workerId: heartbeat?.workerId || null,
      heartbeatAt: heartbeat?.heartbeatAt || null,
      ageMs: external ? workerHeartbeatAgeMs(heartbeat) : 0
    };
  }
}
