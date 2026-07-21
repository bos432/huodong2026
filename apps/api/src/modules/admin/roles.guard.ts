import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminUser } from "../../entities/admin-user.entity";
import { effectivePermissionsForAdmin, resolveAdminRoutePermission } from "./admin-permissions";
import { AdminRole, normalizeAdminRole, ROLE_METADATA_KEY } from "./admin-roles";
import { tenantEntitlementFeatureForAdminPath, tenantFeatureAccess, tenantSubscriptionWriteRestriction } from "./tenant-subscription";
import { adminSessionVersionMatches } from "./admin-session";
import { normalizeAdminDataScope } from "./admin-data-scope";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ROLE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest();
    const row = request.user?.id ? await this.admins.findOne({ where: { id: request.user.id } }) : null;
    if (!row || !row.enabled) throw new UnauthorizedException("当前账号不存在或已停用");
    if (!adminSessionVersionMatches(request.user?.sessionVersion, row.sessionVersion)) throw new UnauthorizedException("登录会话已失效，请重新登录");
    if (row.tenant && !row.tenant.enabled) throw new UnauthorizedException("当前商家已停用，请联系平台管理员");
    const tokenRole = normalizeAdminRole(request.user?.role);
    const role = normalizeAdminRole(row.role || tokenRole);
    const tenantId = row.tenant?.id ?? null;
    request.user = { id: row.id, username: row.username, role, tenantId, permissions: effectivePermissionsForAdmin({ role, tenantId, permissions: row.permissions }), dataScope: normalizeAdminDataScope(row.dataScope) };
    if (row.tenant && ["POST", "PUT", "PATCH", "DELETE"].includes(String(request.method || "").toUpperCase())) {
      const restriction = tenantSubscriptionWriteRestriction(row.tenant.settings as any);
      if (restriction) throw new ForbiddenException(restriction.message);
      const feature = tenantEntitlementFeatureForAdminPath(request.route?.path || request.url);
      if (feature) {
        const access = tenantFeatureAccess(row.tenant.settings as any, feature);
        if (!access.allowed) throw new ForbiddenException(access.reason || "当前套餐未开通此功能");
      }
    }
    const permission = resolveAdminRoutePermission(request.method, request.route?.path || request.url, { tenantId });
    if (permission) {
      request.user.requiredPermission = permission;
      if (request.user.permissions.includes(permission)) return true;
      throw new ForbiddenException("当前账号无权限，请联系超级管理员");
    }
    if (roles.includes(role as AdminRole)) return true;
    throw new ForbiddenException("当前账号无权限，请联系超级管理员");
  }
}
