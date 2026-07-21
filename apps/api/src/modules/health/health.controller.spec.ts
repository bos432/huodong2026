import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController metrics", () => {
  it("publishes operational job, payment, refund, inventory and fund gauges", async () => {
    const dataSource = {
      query: async (sql: string) => sql.includes("SELECT 1") ? [{ ok: 1 }] : [{
        businessJobsDue: "2",
        businessJobsDeadLetter: "1",
        businessJobsStaleProcessing: "3",
        paymentCallbackFailures15m: "4",
        refundProviderFailures: "5",
        inventoryAnomaliesOpen: "6",
        fundRiskAlertsOpen: "7"
      }]
    };
    const config = { get: (_key: string, fallback: unknown) => fallback };
    const controller = new HealthController(dataSource as any, config as any);

    const metrics = await controller.metrics();

    expect(metrics).toContain("activity_operational_metrics_up 1");
    expect(metrics).toContain("activity_business_jobs_due 2");
    expect(metrics).toContain("activity_business_jobs_dead_letter 1");
    expect(metrics).toContain("activity_business_jobs_stale_processing 3");
    expect(metrics).toContain("activity_payment_callback_failures_15m 4");
    expect(metrics).toContain("activity_refund_provider_failures 5");
    expect(metrics).toContain("activity_inventory_anomalies_open 6");
    expect(metrics).toContain("activity_fund_risk_alerts_open 7");
  });

  it("marks operational metrics unavailable without failing liveness metrics", async () => {
    let calls = 0;
    const dataSource = { query: async () => { calls += 1; if (calls === 1) return [{ ok: 1 }]; throw new Error("table unavailable"); } };
    const config = { get: (_key: string, fallback: unknown) => fallback };
    const controller = new HealthController(dataSource as any, config as any);

    const metrics = await controller.metrics();

    expect(metrics).toContain("activity_database_up 1");
    expect(metrics).toContain("activity_operational_metrics_up 0");
  });
});
