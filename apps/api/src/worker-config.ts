export const WORKER_DISABLED_SCHEDULE_FLAGS = [
  "AUTOMATIC_SMS_REMINDER_WORKER_ENABLED",
  "AUTOMATIC_WECHAT_REMINDER_WORKER_ENABLED",
  "POST_EVENT_AUTOMATION_WORKER_ENABLED",
  "ORDER_CLOSE_WORKER_ENABLED",
  "ACTIVITY_LIFECYCLE_WORKER_ENABLED",
  "MEMBER_LIFECYCLE_WORKER_ENABLED",
  "ANALYTICS_RECOMPUTE_WORKER_ENABLED",
  "MEMBER_BEHAVIOR_TAG_WORKER_ENABLED",
  "MALL_PENDING_ORDER_WORKER_INTERVAL_MINUTES",
  "MALL_MERCHANT_GOVERNANCE_WORKER_INTERVAL_MINUTES",
  "MALL_INVENTORY_GOVERNANCE_WORKER_INTERVAL_MINUTES"
] as const;

export function externalWorkerOwnsSchedules(env: Partial<Pick<NodeJS.ProcessEnv, "BUSINESS_JOB_WORKER_MODE" | "APP_PROCESS_ROLE">> = process.env) {
  return env.BUSINESS_JOB_WORKER_MODE === "external" && env.APP_PROCESS_ROLE !== "worker";
}

export function configureExternalBusinessWorker(env: NodeJS.ProcessEnv = process.env) {
  env.APP_PROCESS_ROLE = "worker";
  env.BUSINESS_JOB_WORKER_MODE = "external";
  env.BUSINESS_JOB_WORKER_ENABLED = env.BUSINESS_JOB_WORKER_ENABLED || "true";
  // The independent worker owns notification schedules; the API process exits before starting its timer.
  env.NOTIFICATION_SCHEDULE_WORKER_ENABLED = env.NOTIFICATION_SCHEDULE_WORKER_ENABLED === "false" ? "false" : "true";
  for (const key of WORKER_DISABLED_SCHEDULE_FLAGS) env[key] = key.includes("INTERVAL_MINUTES") ? "0" : "false";
  return env;
}
