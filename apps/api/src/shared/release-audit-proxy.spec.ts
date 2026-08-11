import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");

describe("release audit acceptance proxy", () => {
  it("supports both local HTTP and production HTTPS API targets", () => {
    const source = fs.readFileSync(path.join(repoRoot, "scripts/codex-audit.mjs"), "utf8");

    expect(source).toContain('import http from "node:http"');
    expect(source).toContain('import https from "node:https"');
    expect(source).toContain('const transport = proxyBase.protocol === "https:" ? https : http');
    expect(source).toContain("transport.request(target");
    expect(source).toContain('H5_LOGIN_MODE: process.env.H5_LOGIN_MODE || acceptanceServer.h5LoginMode');
    expect(source).toContain('h5LoginMode: proxyBase.protocol === "https:" ? "password" : "code"');
  });
});
