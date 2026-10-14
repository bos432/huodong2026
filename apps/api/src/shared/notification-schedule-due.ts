type ReminderSchedule = {
  enabled: boolean;
  lastRunAt?: Date | string | null;
  beforeHours: number;
  activity?: { status: string; startTime: Date | string } | null;
};

export function isNotificationScheduleDue(schedule: ReminderSchedule, now: Date) {
  if (!schedule.enabled || schedule.lastRunAt || !schedule.activity) return false;
  if (!["open", "closed"].includes(schedule.activity.status)) return false;
  if (!Number.isFinite(schedule.beforeHours) || schedule.beforeHours < 0) return false;
  const startAt = new Date(schedule.activity.startTime).getTime();
  const current = now.getTime();
  const triggerAt = startAt - schedule.beforeHours * 3600000;
  return Number.isFinite(startAt) && Number.isFinite(current) && triggerAt <= current && current < startAt;
}
