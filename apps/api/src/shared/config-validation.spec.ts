import { describe, expect, it } from "vitest";
import { inspectRuntimeConfig } from "./config-validation";

function config(values: Record<string, string>) {
  return {
    get(key: string, fallback?: string) {
      return values[key] ?? fallback;
    }
  } as any;
}

describe("runtime config validation", () => {
  it("keeps sandbox payment disabled by default in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production" }));
    const item = report.checks.find((check) => check.key === "PAYMENT_SANDBOX_ENABLED");
    expect(item?.status).toBe("ok");
    expect(item?.value).toBe("已关闭");
  });

  it("keeps sandbox payment disabled by default outside production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "development" }));
    const item = report.checks.find((check) => check.key === "PAYMENT_SANDBOX_ENABLED");
    expect(item?.status).toBe("ok");
    expect(item?.value).toBe("已关闭");
  });

  it("keeps database synchronize disabled by default in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production" }));
    const item = report.checks.find((check) => check.key === "DB_SYNCHRONIZE");
    expect(item?.status).toBe("ok");
    expect(item?.value).toBe("已关闭");
  });

  it("marks database synchronize as an error when enabled in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", DB_SYNCHRONIZE: "true" }));
    const item = report.checks.find((check) => check.key === "DB_SYNCHRONIZE");
    expect(item?.status).toBe("error");
  });

  it("marks sandbox payment as an error when enabled in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", PAYMENT_SANDBOX_ENABLED: "true" }));
    const item = report.checks.find((check) => check.key === "PAYMENT_SANDBOX_ENABLED");
    expect(item?.status).toBe("error");
  });

  it("marks placeholder release metadata as an error in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", APP_VERSION: "0.1.0", BUILD_COMMIT: "local", BUILD_TIME: "unknown" }));
    expect(report.checks.find((check) => check.key === "APP_VERSION")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "BUILD_COMMIT")?.status).toBe("error");
    expect(report.checks.find((check) => check.key === "BUILD_TIME")?.status).toBe("error");
  });

  it("marks release metadata ok when deployment values are configured", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", APP_VERSION: "1.2.3", BUILD_COMMIT: "sha256:release-image", BUILD_TIME: "2026-06-10T01:00:00.000Z" }));
    expect(report.checks.find((check) => check.key === "APP_VERSION")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "BUILD_COMMIT")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "BUILD_TIME")?.status).toBe("ok");
  });

  it("marks example domains as errors in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", CORS_ORIGIN: "https://h5.example.com", PUBLIC_H5_ORIGIN: "https://h5.example.com" }));
    expect(report.checks.find((check) => check.key === "CORS_ORIGIN")?.status).toBe("error");
    expect(report.checks.find((check) => check.key === "PUBLIC_H5_ORIGIN")?.status).toBe("error");
  });

  it("marks real https domains ok in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", CORS_ORIGIN: "https://h5.acme.test,https://admin.acme.test", PUBLIC_H5_ORIGIN: "https://h5.acme.test" }));
    expect(report.checks.find((check) => check.key === "CORS_ORIGIN")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "PUBLIC_H5_ORIGIN")?.status).toBe("ok");
  });

  it("marks SMS provider as an error when template id is missing", () => {
    const report = inspectRuntimeConfig(
      config({
        NODE_ENV: "production",
        SMS_PROVIDER_ENABLED: "true",
        SMS_ACCESS_KEY_ID: "sms-key",
        SMS_ACCESS_KEY_SECRET: "sms-secret",
        SMS_SIGN_NAME: "activity"
      })
    );
    expect(report.checks.find((check) => check.key === "SMS_PROVIDER_ENABLED")?.status).toBe("warning");
  });

  it("marks SMS provider ok when all required fields are configured", () => {
    const report = inspectRuntimeConfig(
      config({
        NODE_ENV: "production",
        SMS_PROVIDER_ENABLED: "true",
        SMS_ACCESS_KEY_ID: "sms-key",
        SMS_ACCESS_KEY_SECRET: "sms-secret",
        SMS_SIGN_NAME: "activity",
        SMS_TEMPLATE_ID: "template-001"
      })
    );
    expect(report.checks.find((check) => check.key === "SMS_PROVIDER_ENABLED")?.status).toBe("ok");
  });

  it("marks notification force fail as an error in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", NOTIFICATION_FORCE_FAIL: "true" }));
    const item = report.checks.find((check) => check.key === "NOTIFICATION_FORCE_FAIL");
    expect(item?.status).toBe("error");
  });

  it("marks notification force fail ok when disabled in production", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", NOTIFICATION_FORCE_FAIL: "false" }));
    const item = report.checks.find((check) => check.key === "NOTIFICATION_FORCE_FAIL");
    expect(item?.status).toBe("ok");
  });

  it("warns when real payment is enabled before provider implementations are marked complete", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", REAL_PAYMENT_ENABLED: "true", WECHAT_PAY_ENABLED: "true" }));
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_SDK_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "REAL_REFUND_QUERY_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "AGENT_REAL_TRANSFER_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_PREFLIGHT_PASSED")?.status).toBe("warning");
  });

  it("marks real payment implementation checks ok when rollout flags are complete", () => {
    const report = inspectRuntimeConfig(
      config({
        NODE_ENV: "production",
        REAL_PAYMENT_ENABLED: "true",
        WECHAT_PAY_ENABLED: "true",
        REAL_PAYMENT_SDK_IMPLEMENTED: "true",
        REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED: "true",
        REAL_REFUND_QUERY_IMPLEMENTED: "true",
        REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true",
        AGENT_REAL_TRANSFER_IMPLEMENTED: "true",
        REAL_PAYMENT_PREFLIGHT_PASSED: "true"
      })
    );
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_SDK_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "REAL_REFUND_QUERY_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "AGENT_REAL_TRANSFER_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "REAL_PAYMENT_PREFLIGHT_PASSED")?.status).toBe("ok");
  });

  it("warns when multi-tenant mode is enabled before isolation work is marked complete", () => {
    const report = inspectRuntimeConfig(config({ NODE_ENV: "production", MULTI_TENANT_ENABLED: "true" }));
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_ENABLED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_SCHEMA_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED")?.status).toBe("warning");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_PREFLIGHT_PASSED")?.status).toBe("warning");
  });

  it("marks multi-tenant implementation checks ok when rollout flags are complete", () => {
    const report = inspectRuntimeConfig(
      config({
        NODE_ENV: "production",
        MULTI_TENANT_ENABLED: "true",
        MULTI_TENANT_SCHEMA_IMPLEMENTED: "true",
        MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED: "true",
        MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED: "true",
        MULTI_TENANT_PREFLIGHT_PASSED: "true"
      })
    );
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_SCHEMA_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED")?.status).toBe("ok");
    expect(report.checks.find((check) => check.key === "MULTI_TENANT_PREFLIGHT_PASSED")?.status).toBe("ok");
  });
});
