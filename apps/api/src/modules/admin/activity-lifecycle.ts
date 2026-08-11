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

export type ActivityPublishIssue = { field: string; message: string; blocking: boolean };

export type ActivityPublishReadinessInput = {
  title?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  location?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  registrationDeadline: Date | string;
  fields?: unknown[] | null;
  sections?: unknown[] | null;
  hosts?: unknown[] | null;
  price?: number | string | null;
  paymentMethods?: Record<string, boolean> | null;
  hasOrganizerProfile?: boolean;
  hasCustomerServiceContact?: boolean;
  now?: Date;
};

export function activityPublishReadinessIssues(input: ActivityPublishReadinessInput): ActivityPublishIssue[] {
  const issues: ActivityPublishIssue[] = [];
  const startAt = new Date(input.startTime);
  const endAt = new Date(input.endTime);
  const deadlineAt = new Date(input.registrationDeadline);
  const now = input.now || new Date();
  if (!input.title?.trim()) issues.push({ field: "title", message: "请填写活动标题", blocking: true });
  if (!input.coverUrl) issues.push({ field: "coverUrl", message: "建议上传活动封面", blocking: false });
  if (!input.description?.trim()) issues.push({ field: "description", message: "请填写活动介绍", blocking: true });
  if (!input.location?.trim()) issues.push({ field: "location", message: "请填写活动地点", blocking: true });
  if (endAt <= startAt) issues.push({ field: "endTime", message: "结束时间必须晚于开始时间", blocking: true });
  if (deadlineAt >= startAt) issues.push({ field: "registrationDeadline", message: "报名截止时间必须早于活动开始时间", blocking: true });
  if (deadlineAt <= now) issues.push({ field: "registrationDeadline", message: "报名截止时间已过，请调整后再发布", blocking: true });
  if (!input.fields?.length) issues.push({ field: "fields", message: "至少配置一个报名字段", blocking: true });
  if (!input.sections?.length) issues.push({ field: "sections", message: "建议至少配置一个详情模块", blocking: false });
  if (!input.hosts?.length) issues.push({ field: "hosts", message: "建议补充主办方或嘉宾信息，帮助用户判断活动可信度", blocking: false });
  if (input.hasOrganizerProfile === false) issues.push({ field: "organizerProfile", message: "建议完善主办方简介或服务承诺，活动详情将展示可信信息", blocking: false });
  if (input.hasCustomerServiceContact === false) issues.push({ field: "customerService", message: "建议配置客服联系方式，方便用户在报名和活动当天获得支持", blocking: false });
  if (Number(input.price || 0) > 0 && !hasPaidPaymentMethod(input.paymentMethods)) issues.push({ field: "paymentMethods", message: "付费活动尚未配置可用支付方式", blocking: true });
  return issues;
}
