import { ActivityStatus } from "../../shared/domain";

export type ActivityLifecycleAction = "submit" | "approve" | "reject" | "withdraw" | "close" | "reopen" | "cancel" | "end" | "schedule" | "auto_publish" | "auto_end";

const TRANSITIONS: Record<ActivityLifecycleAction, Array<[ActivityStatus, ActivityStatus]>> = {
  submit: [[ActivityStatus.Draft, ActivityStatus.PendingApproval], [ActivityStatus.Rejected, ActivityStatus.PendingApproval], [ActivityStatus.Draft, ActivityStatus.Open], [ActivityStatus.Rejected, ActivityStatus.Open]],
  approve: [[ActivityStatus.PendingApproval, ActivityStatus.Open]],
  reject: [[ActivityStatus.PendingApproval, ActivityStatus.Rejected]],
  withdraw: [[ActivityStatus.PendingApproval, ActivityStatus.Draft]],
  close: [[ActivityStatus.Open, ActivityStatus.Closed]],
  reopen: [[ActivityStatus.Closed, ActivityStatus.Open]],
  cancel: [[ActivityStatus.Open, ActivityStatus.Cancelled], [ActivityStatus.Closed, ActivityStatus.Cancelled]],
  end: [[ActivityStatus.Open, ActivityStatus.Ended]],
  schedule: [[ActivityStatus.Open, ActivityStatus.Closed], [ActivityStatus.Closed, ActivityStatus.Closed]],
  auto_publish: [[ActivityStatus.Closed, ActivityStatus.Open]],
  auto_end: [[ActivityStatus.Open, ActivityStatus.Ended]]
};

export function canTransitionActivity(action: ActivityLifecycleAction, from: ActivityStatus, to: ActivityStatus) {
  return TRANSITIONS[action].some(([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to);
}

export function scheduledPublishWindowIssue(publishAt: Date, now: Date, activityEndAt: Date) {
  if (publishAt <= now) return "not_future" as const;
  if (publishAt >= activityEndAt) return "not_before_end" as const;
  return null;
}

export function hasPaidPaymentMethod(methods?: Record<string, boolean> | null) {
  return ["wechat", "alipay", "balance", "offline"].some((method) => methods?.[method] === true);
}
