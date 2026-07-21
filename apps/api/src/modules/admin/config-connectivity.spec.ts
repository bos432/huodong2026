import { describe, expect, it } from "vitest";
import { configuredChannelCheck, safeConnectivityUrl } from "./config-connectivity";

describe("configuration connectivity checks", () => {
  it("reports disabled, missing and ready channels without exposing values", () => {
    expect(configuredChannelCheck("sms", "短信", false, [])).toMatchObject({ status: "disabled" });
    expect(configuredChannelCheck("sms", "短信", true, [["签名", ""]])).toMatchObject({ status: "error", missing: ["签名"] });
    expect(configuredChannelCheck("sms", "短信", true, [["签名", "慢π"]])).toMatchObject({ status: "ok", missing: [] });
  });

  it("blocks unsafe production probe targets", () => {
    expect(safeConnectivityUrl("https://api.example.com/health", true)?.hostname).toBe("api.example.com");
    expect(safeConnectivityUrl("http://127.0.0.1:3000/health", true)).toBeNull();
    expect(safeConnectivityUrl("file:///etc/passwd", false)).toBeNull();
  });
});
