export enum AdminRole {
  SuperAdmin = "super_admin",
  Operator = "operator",
  Finance = "finance",
  CheckInStaff = "checkin_staff"
}

export const roleOptions = [
  { value: AdminRole.SuperAdmin, label: "超级管理员", description: "拥有全部后台权限，负责系统设置、账号和上线体检。" },
  { value: AdminRole.Operator, label: "运营人员", description: "管理活动、报名、公告、通知、候补、评价、标签和会员。" },
  { value: AdminRole.Finance, label: "财务人员", description: "管理订单、确认收款、退款和财务对账。" },
  { value: AdminRole.CheckInStaff, label: "签到人员", description: "仅用于现场签到核销和必要活动查看。" }
];

export function normalizeRole(role?: string | null) {
  return role === "admin" ? AdminRole.SuperAdmin : role || "";
}

export function currentRole() {
  return normalizeRole(localStorage.getItem("admin_role"));
}

export function currentTenantId() {
  const value = localStorage.getItem("admin_tenant_id");
  const id = value ? Number(value) : 0;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function currentTenantName() {
  return localStorage.getItem("admin_tenant_name") || "";
}

export function currentTenantCode() {
  return localStorage.getItem("admin_tenant_code") || "";
}

export type TenantPermissionSettings = {
  activityPublishReviewRequired: boolean;
  registrationReviewEnabled: boolean;
  paymentAccountEditable: boolean;
};

export function currentTenantSettings(): TenantPermissionSettings {
  const defaults = {
    activityPublishReviewRequired: true,
    registrationReviewEnabled: false,
    paymentAccountEditable: true
  };
  const raw = localStorage.getItem("admin_tenant_settings");
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<TenantPermissionSettings>;
    return {
      activityPublishReviewRequired: parsed.activityPublishReviewRequired === undefined ? defaults.activityPublishReviewRequired : Boolean(parsed.activityPublishReviewRequired),
      registrationReviewEnabled: parsed.registrationReviewEnabled === undefined ? defaults.registrationReviewEnabled : Boolean(parsed.registrationReviewEnabled),
      paymentAccountEditable: parsed.paymentAccountEditable === undefined ? defaults.paymentAccountEditable : Boolean(parsed.paymentAccountEditable)
    };
  } catch {
    return defaults;
  }
}

export function isPlatformAdmin() {
  return currentRole() === AdminRole.SuperAdmin && !currentTenantId();
}

export function isTenantAdmin() {
  return currentRole() === AdminRole.SuperAdmin && Boolean(currentTenantId());
}

export function canAccess(roles?: AdminRole[]) {
  if (!roles?.length) return true;
  return roles.includes(currentRole() as AdminRole);
}

export function canAccessScope(scope?: "platform" | "tenant" | "tenantOrPlatformAdmin" | "any") {
  if (!scope || scope === "any") return true;
  if (scope === "platform") return isPlatformAdmin();
  if (scope === "tenantOrPlatformAdmin") return Boolean(currentTenantId()) || isPlatformAdmin();
  return Boolean(currentTenantId());
}

export const permissions = {
  superAdmin: [AdminRole.SuperAdmin],
  overview: [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance],
  operation: [AdminRole.SuperAdmin, AdminRole.Operator],
  finance: [AdminRole.SuperAdmin, AdminRole.Finance],
  checkIn: [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.CheckInStaff],
  activityView: [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff],
  registrationView: [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff],
  paymentAccountView: [AdminRole.SuperAdmin, AdminRole.Finance]
};
