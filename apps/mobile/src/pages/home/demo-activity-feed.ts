import { mockActivities } from "../../mock/activity";
import type { Activity } from "../../types/activity";

export const DEMO_SHOWCASE_TENANT = "qiwai-showcase";

export function demoActivitiesForTenant(tenantCode: string, realActivities: Activity[]) {
  if (tenantCode !== DEMO_SHOWCASE_TENANT || realActivities.length) return [];
  return mockActivities.map((activity) => ({ ...activity, dataSource: "mock" as const, isDemo: true }));
}
