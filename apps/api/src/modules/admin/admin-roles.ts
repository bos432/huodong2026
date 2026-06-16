import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

export enum AdminRole {
  SuperAdmin = "super_admin",
  Operator = "operator",
  Finance = "finance",
  CheckInStaff = "checkin_staff"
}

export const ROLE_METADATA_KEY = "admin_roles";

export function normalizeAdminRole(role?: string | null) {
  return role === "admin" ? AdminRole.SuperAdmin : role || "";
}

export function AdminRoles(...roles: AdminRole[]) {
  return applyDecorators(SetMetadata(ROLE_METADATA_KEY, roles), UseGuards(JwtAuthGuard, RolesGuard));
}

