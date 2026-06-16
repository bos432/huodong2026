import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole, normalizeAdminRole, ROLE_METADATA_KEY } from "./admin-roles";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ROLE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest();
    const role = normalizeAdminRole(request.user?.role);
    if (roles.includes(role as AdminRole)) return true;
    throw new ForbiddenException("当前账号无权限，请联系超级管理员");
  }
}

