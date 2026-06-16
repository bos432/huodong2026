import { Controller, Get, Header, HttpCode, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { inspectRuntimeConfig } from "../../shared/config-validation";

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
    const ready = database === "up" && configInspection.status !== "error";
    const payload = {
      ready,
      api: "up",
      database,
      config: configInspection.status,
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
      `activity_build_info{version="${this.metricLabel(this.releaseInfo().version)}",commit="${this.metricLabel(this.releaseInfo().commit)}"} 1`
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
}
