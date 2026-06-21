export const TENANT_PACKAGE_PLANS = ["trial", "standard", "city_partner", "core_partner", "custom"] as const;
export type TenantPackagePlan = (typeof TENANT_PACKAGE_PLANS)[number];
export type TenantPackagePermissionTemplate = {
  activityPublishReviewRequired: boolean;
  registrationReviewEnabled: boolean;
  paymentAccountEditable: boolean;
  mallEnabled: boolean;
};

const PLAN_LABELS: Record<TenantPackagePlan, string> = {
  trial: "试运营",
  standard: "标准版",
  city_partner: "城市合伙人",
  core_partner: "核心合伙人",
  custom: "定制版"
};

const PLAN_PERMISSION_TEMPLATES: Record<TenantPackagePlan, TenantPackagePermissionTemplate> = {
  trial: {
    activityPublishReviewRequired: true,
    registrationReviewEnabled: false,
    paymentAccountEditable: false,
    mallEnabled: false
  },
  standard: {
    activityPublishReviewRequired: true,
    registrationReviewEnabled: false,
    paymentAccountEditable: true,
    mallEnabled: true
  },
  city_partner: {
    activityPublishReviewRequired: true,
    registrationReviewEnabled: true,
    paymentAccountEditable: true,
    mallEnabled: true
  },
  core_partner: {
    activityPublishReviewRequired: false,
    registrationReviewEnabled: true,
    paymentAccountEditable: true,
    mallEnabled: true
  },
  custom: {
    activityPublishReviewRequired: false,
    registrationReviewEnabled: true,
    paymentAccountEditable: true,
    mallEnabled: true
  }
};

export function normalizeTenantPackagePlan(value: unknown): TenantPackagePlan {
  const plan = String(value || "").trim();
  return (TENANT_PACKAGE_PLANS as readonly string[]).includes(plan) ? (plan as TenantPackagePlan) : "standard";
}

export function tenantPackagePermissionTemplate(value: unknown) {
  const plan = normalizeTenantPackagePlan(value);
  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    permissions: { ...PLAN_PERMISSION_TEMPLATES[plan] }
  };
}

export function normalizeTenantPackageExpiresAt(value: unknown) {
  if (value === null) return null;
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(`${text.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function tenantSubscriptionStatus(settings?: { packagePlan?: unknown; packageExpiresAt?: unknown } | null, now = new Date()) {
  const plan = normalizeTenantPackagePlan(settings?.packagePlan);
  const expiresAt = normalizeTenantPackageExpiresAt(settings?.packageExpiresAt);
  if (!expiresAt) {
    return {
      plan,
      planLabel: PLAN_LABELS[plan],
      expiresAt: null,
      status: "no_expiry",
      label: "长期有效",
      daysRemaining: null,
      renewalRequired: false,
      action: "可按合同补充到期日，便于续费提醒"
    };
  }

  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const expires = new Date(`${expiresAt}T00:00:00.000Z`);
  const daysRemaining = Math.ceil((expires.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (daysRemaining < 0) {
    return {
      plan,
      planLabel: PLAN_LABELS[plan],
      expiresAt,
      status: "expired",
      label: "已到期",
      daysRemaining,
      renewalRequired: true,
      action: "续费或延长到期日后再继续正式运营"
    };
  }
  if (daysRemaining <= 30) {
    return {
      plan,
      planLabel: PLAN_LABELS[plan],
      expiresAt,
      status: "expiring_soon",
      label: "即将到期",
      daysRemaining,
      renewalRequired: true,
      action: "联系商家确认续费，避免到期影响运营"
    };
  }
  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    expiresAt,
    status: "active",
    label: "有效",
    daysRemaining,
    renewalRequired: false,
    action: "套餐状态正常"
  };
}

export function tenantSubscriptionWriteRestriction(settings?: { packagePlan?: unknown; packageExpiresAt?: unknown } | null, now = new Date()) {
  const status = tenantSubscriptionStatus(settings, now);
  if (status.status !== "expired") return null;
  return {
    status,
    message: "商家套餐已到期，续费或延长到期日后才能继续运营写入"
  };
}

export function tenantRenewalReminder(settings?: { packagePlan?: unknown; packageExpiresAt?: unknown } | null, now = new Date()) {
  const status = tenantSubscriptionStatus(settings, now);
  if (status.status === "expired") {
    return {
      level: "urgent",
      label: "已到期",
      actionRequired: true,
      daysRemaining: status.daysRemaining,
      dueDate: status.expiresAt,
      message: "套餐已到期，请先续费或延长到期日"
    };
  }
  if (status.status === "expiring_soon") {
    return {
      level: "watch",
      label: "续费提醒",
      actionRequired: true,
      daysRemaining: status.daysRemaining,
      dueDate: status.expiresAt,
      message: `套餐 ${status.daysRemaining} 天后到期，请联系商家确认续费`
    };
  }
  if (status.status === "no_expiry") {
    return {
      level: "none",
      label: "长期有效",
      actionRequired: false,
      daysRemaining: null,
      dueDate: null,
      message: "未设置到期日，可按合同补充以便自动提醒"
    };
  }
  return {
    level: "none",
    label: "正常",
    actionRequired: false,
    daysRemaining: status.daysRemaining,
    dueDate: status.expiresAt,
    message: "套餐状态正常"
  };
}
