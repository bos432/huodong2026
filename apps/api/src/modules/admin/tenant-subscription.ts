export const TENANT_PACKAGE_PLANS = ["trial", "standard", "city_partner", "core_partner", "custom"] as const;
export type TenantPackagePlan = (typeof TENANT_PACKAGE_PLANS)[number];
export type TenantPackagePermissionTemplate = {
  activityPublishReviewRequired: boolean;
  registrationReviewEnabled: boolean;
  paymentAccountEditable: boolean;
  mallEnabled: boolean;
};
export const TENANT_ENTITLEMENT_FEATURES = ["activities", "mall", "courses", "community", "forum", "charity", "volunteers", "certificates", "ambassadors", "partners", "ads", "agentSettlement"] as const;
export type TenantEntitlementFeature = (typeof TENANT_ENTITLEMENT_FEATURES)[number];
export type TenantQuotaKey = "adminUsers" | "activities" | "registrationsPerMonth" | "products" | "merchants" | "storageMb" | "smsPerMonth";
export type TenantEntitlements = {
  features: Record<TenantEntitlementFeature, boolean>;
  quotas: Record<TenantQuotaKey, number | null>;
  gracePeriodDays: number;
  readOnlyPeriodDays: number;
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

const PLAN_ENTITLEMENTS: Record<TenantPackagePlan, TenantEntitlements> = {
  trial: { features: { activities: true, mall: false, courses: false, community: false, forum: false, charity: false, volunteers: false, certificates: false, ambassadors: false, partners: false, ads: false, agentSettlement: false }, quotas: { adminUsers: 3, activities: 10, registrationsPerMonth: 300, products: 0, merchants: 0, storageMb: 1024, smsPerMonth: 100 }, gracePeriodDays: 7, readOnlyPeriodDays: 30 },
  standard: { features: { activities: true, mall: true, courses: true, community: true, forum: false, charity: false, volunteers: false, certificates: true, ambassadors: false, partners: false, ads: false, agentSettlement: false }, quotas: { adminUsers: 10, activities: 100, registrationsPerMonth: 10000, products: 500, merchants: 1, storageMb: 10240, smsPerMonth: 3000 }, gracePeriodDays: 15, readOnlyPeriodDays: 90 },
  city_partner: { features: { activities: true, mall: true, courses: true, community: true, forum: true, charity: true, volunteers: true, certificates: true, ambassadors: true, partners: true, ads: true, agentSettlement: true }, quotas: { adminUsers: 30, activities: 500, registrationsPerMonth: 50000, products: 5000, merchants: 100, storageMb: 51200, smsPerMonth: 20000 }, gracePeriodDays: 30, readOnlyPeriodDays: 180 },
  core_partner: { features: Object.fromEntries(TENANT_ENTITLEMENT_FEATURES.map((key) => [key, true])) as Record<TenantEntitlementFeature, boolean>, quotas: { adminUsers: 100, activities: null, registrationsPerMonth: null, products: null, merchants: null, storageMb: 204800, smsPerMonth: 100000 }, gracePeriodDays: 30, readOnlyPeriodDays: 365 },
  custom: { features: Object.fromEntries(TENANT_ENTITLEMENT_FEATURES.map((key) => [key, true])) as Record<TenantEntitlementFeature, boolean>, quotas: { adminUsers: null, activities: null, registrationsPerMonth: null, products: null, merchants: null, storageMb: null, smsPerMonth: null }, gracePeriodDays: 30, readOnlyPeriodDays: 365 }
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
    permissions: { ...PLAN_PERMISSION_TEMPLATES[plan] },
    entitlements: structuredClone(PLAN_ENTITLEMENTS[plan])
  };
}

export function tenantEffectiveEntitlements(settings?: { packagePlan?: unknown; entitlements?: Partial<TenantEntitlements> | null } | null): TenantEntitlements {
  const base = tenantPackagePermissionTemplate(settings?.packagePlan).entitlements;
  const override = settings?.entitlements;
  return {
    features: { ...base.features, ...(override?.features || {}) },
    quotas: { ...base.quotas, ...(override?.quotas || {}) },
    gracePeriodDays: Math.max(0, Number.isFinite(Number(override?.gracePeriodDays)) ? Number(override?.gracePeriodDays) : base.gracePeriodDays),
    readOnlyPeriodDays: Math.max(0, Number.isFinite(Number(override?.readOnlyPeriodDays)) ? Number(override?.readOnlyPeriodDays) : base.readOnlyPeriodDays)
  };
}

export function tenantFeatureAccess(settings: { packagePlan?: unknown; entitlements?: Partial<TenantEntitlements> | null } | null | undefined, feature: TenantEntitlementFeature) {
  const entitlements = tenantEffectiveEntitlements(settings);
  return { allowed: entitlements.features[feature], feature, reason: entitlements.features[feature] ? null : "当前套餐未开通此功能" };
}

export function tenantEntitlementFeatureForGate(key: string): TenantEntitlementFeature | null {
  const mapping: Record<string, TenantEntitlementFeature> = {
    courses: "courses", community: "community", communityPublish: "community", forum: "forum", forumPost: "forum",
    mall: "mall", charity: "charity", volunteer: "volunteers", certificates: "certificates",
    ambassador: "ambassadors", partner: "partners", adCenter: "ads", agentSettlement: "agentSettlement"
  };
  return mapping[key] || null;
}

export function tenantEntitlementFeatureForAdminPath(path: string): TenantEntitlementFeature | null {
  const normalized = String(path || "").replace(/^\/+/, "").toLowerCase();
  const mappings: Array<[RegExp, TenantEntitlementFeature]> = [
    [/^(mall\/|admin\/mall\/)/, "mall"],
    [/^(courses\/|admin\/courses\/|course-)/, "courses"],
    [/^(community\/|admin\/community\/|checkin-tasks\/)/, "community"],
    [/^(forum\/|admin\/forum\/)/, "forum"],
    [/^(charity\/|admin\/charity\/)/, "charity"],
    [/^(volunteer\/|admin\/volunteer\/)/, "volunteers"],
    [/^(certificates\/|admin\/certificates\/)/, "certificates"],
    [/^(ambassador\/|admin\/ambassador\/)/, "ambassadors"],
    [/^(partners?\/|admin\/partners?\/)/, "partners"],
    [/^(ads?\/|admin\/ads?\/|ad-)/, "ads"],
    [/^(agent-settlements?\/|admin\/agent-settlements?\/)/, "agentSettlement"]
  ];
  return mappings.find(([pattern]) => pattern.test(normalized))?.[1] || null;
}

export function tenantQuotaAccess(settings: { packagePlan?: unknown; entitlements?: Partial<TenantEntitlements> | null } | null | undefined, quota: TenantQuotaKey, used: number, requested = 1) {
  const limit = tenantEffectiveEntitlements(settings).quotas[quota];
  const nextUsage = Math.max(0, used) + Math.max(0, requested);
  return { allowed: limit === null || nextUsage <= limit, quota, limit, used, requested, nextUsage, reason: limit !== null && nextUsage > limit ? `当前套餐的 ${quota} 配额为 ${limit}` : null };
}

export function normalizeTenantPackageExpiresAt(value: unknown) {
  if (value === null) return null;
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(`${text.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function tenantSubscriptionStatus(settings?: { packagePlan?: unknown; packageExpiresAt?: unknown; packageSuspended?: unknown; packageReadOnly?: unknown; entitlements?: Partial<TenantEntitlements> | null } | null, now = new Date()) {
  const plan = normalizeTenantPackagePlan(settings?.packagePlan);
  const expiresAt = normalizeTenantPackageExpiresAt(settings?.packageExpiresAt);
  const entitlements = tenantEffectiveEntitlements(settings);
  const lifecycle = { gracePeriodDays: entitlements.gracePeriodDays, readOnlyPeriodDays: entitlements.readOnlyPeriodDays };
  if (settings?.packageSuspended === true) return { plan, planLabel: PLAN_LABELS[plan], expiresAt, status: "suspended", label: "已暂停", daysRemaining: expiresAt ? Math.ceil((new Date(`${expiresAt}T00:00:00.000Z`).getTime() - new Date(now).setUTCHours(0, 0, 0, 0)) / 86400000) : null, daysPastDue: null, renewalRequired: true, writable: false, ...lifecycle, action: "套餐已被平台暂停，恢复或续费后才能继续运营" };
  if (settings?.packageReadOnly === true) return { plan, planLabel: PLAN_LABELS[plan], expiresAt, status: "read_only", label: "只读", daysRemaining: null, daysPastDue: null, renewalRequired: true, writable: false, ...lifecycle, action: "当前商家处于只读状态，请联系平台恢复运营" };
  if (!expiresAt) {
    return {
      plan,
      planLabel: PLAN_LABELS[plan],
      expiresAt: null,
      status: "no_expiry",
      label: "长期有效",
      daysRemaining: null,
      daysPastDue: null,
      renewalRequired: false,
      writable: true,
      ...lifecycle,
      action: "可按合同补充到期日，便于续费提醒"
    };
  }

  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const expires = new Date(`${expiresAt}T00:00:00.000Z`);
  const daysRemaining = Math.ceil((expires.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (daysRemaining < 0) {
    const daysPastDue = Math.abs(daysRemaining);
    if (daysPastDue <= entitlements.gracePeriodDays) return { plan, planLabel: PLAN_LABELS[plan], expiresAt, status: "grace_period", label: "宽限期", daysRemaining, daysPastDue, renewalRequired: true, writable: true, ...lifecycle, action: `套餐已到期，宽限期剩余 ${entitlements.gracePeriodDays - daysPastDue + 1} 天，请尽快续费` };
    if (daysPastDue <= entitlements.gracePeriodDays + entitlements.readOnlyPeriodDays) return { plan, planLabel: PLAN_LABELS[plan], expiresAt, status: "read_only", label: "只读", daysRemaining, daysPastDue, renewalRequired: true, writable: false, ...lifecycle, action: "宽限期已结束，当前仅可查看历史数据，请续费恢复运营" };
    return {
      plan,
      planLabel: PLAN_LABELS[plan],
      expiresAt,
      status: "suspended",
      label: "已暂停",
      daysRemaining,
      daysPastDue,
      renewalRequired: true,
      writable: false,
      ...lifecycle,
      action: "只读保留期已结束，请续费后恢复运营"
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
      daysPastDue: 0,
      renewalRequired: true,
      writable: true,
      ...lifecycle,
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
    daysPastDue: 0,
    renewalRequired: false,
    writable: true,
    ...lifecycle,
    action: "套餐状态正常"
  };
}

export function tenantSubscriptionWriteRestriction(settings?: { packagePlan?: unknown; packageExpiresAt?: unknown; packageSuspended?: unknown; packageReadOnly?: unknown; entitlements?: Partial<TenantEntitlements> | null } | null, now = new Date()) {
  const status = tenantSubscriptionStatus(settings, now);
  if (status.writable) return null;
  return {
    status,
    message: status.status === "read_only" ? "商家套餐处于只读期，续费或恢复后才能继续运营写入" : "商家套餐已暂停，续费或恢复后才能继续运营写入"
  };
}

export function tenantRenewalReminder(settings?: { packagePlan?: unknown; packageExpiresAt?: unknown } | null, now = new Date()) {
  const status = tenantSubscriptionStatus(settings, now);
  if (["grace_period", "read_only", "suspended"].includes(status.status)) {
    return {
      level: "urgent",
      label: status.label,
      actionRequired: true,
      daysRemaining: status.daysRemaining,
      dueDate: status.expiresAt,
      message: status.action
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
