import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("operation setting permission contract", () => {
  it("keeps configuration reads separate from writes for platform and tenant scopes", () => {
    const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
    const guard = read("apps/api/src/modules/admin/roles.guard.ts");

    expect(permissions).toContain('{ key: "system.view"');
    expect(permissions).toContain('{ key: "operation_settings.view"');
    expect(permissions).toContain('"system.manage": ["system.view"]');
    expect(permissions).toContain('"operation_settings.manage": ["operation_settings.view"]');
    expect(permissions).toContain('if (scope?.tenantId) return write ? "operation_settings.manage" : "operation_settings.view"');
    expect(guard).toContain("resolveAdminRoutePermission(request.method, request.route?.path || request.url, { tenantId })");
  });

  it("keeps GET settings side-effect free and the PC page explicitly read-only", () => {
    const service = read("apps/api/src/modules/admin/admin.service.ts");
    const page = read("apps/admin/src/views/SystemSettings.vue");
    const getStart = service.indexOf("async getOperationSetting");
    const saveStart = service.indexOf("async saveOperationSetting", getStart);
    const getMethod = service.slice(getStart, saveStart);

    expect(getMethod).toContain("this.operationSettings.findOne");
    expect(getMethod).not.toContain("ensureOperationSetting");
    expect(getMethod).not.toContain("operationSettings.save");
    expect(page).toContain('const canEditSettings = computed(() => canManagePlatformSettings.value ? hasPermission("system.manage") : hasPermission("operation_settings.manage"))');
    expect(page).toContain('v-if="!canEditSettings"');
    expect(page).toContain('v-if="canEditSettings" type="primary"');
    expect(page).toContain("operationLoadError");
    expect(page).toContain("configLoadError");
    expect(page).toContain("connectivityError");
  });

  it("lets platform admins target one tenant without crossing tenant or platform boundaries", () => {
    const controller = read("apps/api/src/modules/admin/admin.controller.ts");
    const service = read("apps/api/src/modules/admin/admin.service.ts");
    const page = read("apps/admin/src/views/SystemSettings.vue");

    expect(controller).toContain('@Query("tenantId") tenantId: string | undefined');
    expect(controller).toContain("this.service.getOperationSetting(admin, tenantId)");
    expect(controller).toContain("this.service.saveOperationSetting(dto, admin, tenantId)");
    expect(service).toContain("private async operationSettingTarget");
    expect(service).toContain('throw new ForbiddenException("不能修改其他商家的运营设置")');
    expect(service).toContain("if (!this.isTenantScoped(admin) && dto.launchConfig !== undefined)");
    expect(service).toContain("if (!scope.tenant && dto.defaultTenantCode !== undefined)");
    expect(service).toContain("if (!scope.tenant && dto.tenantSwitcherEnabled !== undefined)");
    expect(page).toContain('v-model="operationTenantId"');
    expect(page).toContain("商家前端实时生效");
    expect(page).toContain("operationLaunchConfigPayload");
    expect(page).toContain('v-if="canManagePlatformSettings"');
    expect(page).toContain('api.post("/admin/settings/operation", payload, operationRequestConfig())');
  });

  it("documents and enforces feature gate dependencies in the settings workbench", () => {
    const gates = read("apps/admin/src/feature-gates.ts");
    const page = read("apps/admin/src/views/SystemSettings.vue");

    expect(gates).toContain('communityPublish: "community"');
    expect(gates).toContain('forumPost: "forum"');
    expect(gates).toContain("if (!result[parent]) result[child] = false");
    expect(page).toContain("handleFeatureGateChanged");
    expect(page).toContain('已同步开启“${featureGateLabel(dependency)}”');
    expect(page).toContain("for (const child of disabledChildren) deployment.featureGates[child] = false");
    expect(page).toContain("开启时会自动开启");
  });
});
