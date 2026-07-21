import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const service = read("apps/api/src/modules/admin/admin.service.ts");
const operationPage = read("apps/admin/src/views/OperationLogs.vue");
const loginPage = read("apps/admin/src/views/AdminLoginLogs.vue");
const codePage = read("apps/admin/src/views/H5CodeLogs.vue");
const router = read("apps/admin/src/router.ts");
const menu = read("apps/admin/src/navigation/admin-menu.ts");

describe("log permission contract", () => {
  it("routes operation and security logs through separate permissions", () => {
    expect(router).toContain('path: "operation-logs", component: OperationLogs, meta: { roles: ["logs.view"]');
    expect(router).toContain('path: "admin-login-logs", component: AdminLoginLogs, meta: { roles: ["security_log.view"]');
    expect(router).toContain('path: "h5-code-logs", component: H5CodeLogs, meta: { roles: ["security_log.view"]');
    expect(menu).toContain('label: "登录日志", roles: ["security_log.view"]');
    expect(menu).toContain('label: "验证码日志", roles: ["security_log.view"]');
  });

  it("uses dedicated options instead of tenant management access", () => {
    expect(operationPage).toContain('"/admin/operation-logs/options"');
    expect(loginPage).toContain('"/admin/auth/log-options"');
    expect(operationPage).not.toContain('api.get<any, any[]>("/admin/tenants")');
    expect(loginPage).not.toContain('api.get<any, any[]>("/admin/tenants")');
  });

  it("keeps sensitive columns and exports permission guarded", () => {
    expect(operationPage).toContain('hasPermission("logs.sensitive")');
    expect(operationPage).toContain('hasPermission("logs.export")');
    expect(loginPage).toContain('hasPermission("security_log.sensitive")');
    expect(loginPage).toContain('hasPermission("security_log.export")');
    expect(codePage).toContain('hasPermission("security_log.sensitive")');
    expect(codePage).toContain('hasPermission("security_log.export")');
    expect(codePage).toContain('displayPhone(row.phone)');
    expect(codePage).not.toContain('prop="phone"');
    expect(operationPage).toContain('v-if="canViewSensitive" prop="userAgent"');
    expect(codePage).toContain('v-if="canViewSensitive" prop="providerMessageId"');
  });

  it("projects masked fields and records export audit in the service", () => {
    expect(service).toContain('clientIp: includeSensitive ? row.clientIp : this.maskClientIp(row.clientIp)');
    expect(service).toContain('phone: includeSensitive ? row.phone : this.maskPhone(row.phone)');
    expect(service).toContain('detail: includeSensitive ? detail : this.maskOperationLogDetail(detail)');
    expect(service).toContain('if (/phone|mobile|tel/.test(normalizedKey)) return this.maskPhone');
    expect(service).toContain('providerMessageId: includeSensitive ? row.providerMessageId : null');
    expect(service).toContain('this.logExport(admin, "operation_logs"');
    expect(service).toContain('this.logExport(admin, "admin_login_logs"');
    expect(service).toContain('this.logExport(admin, "h5_code_logs"');
  });
});
