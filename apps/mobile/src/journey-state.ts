import type { PublicMemberRegistrationRecord } from "@activity/shared";

export type JourneyGroup = "pending" | "upcoming" | "completed" | "missed" | "inactive";

function refundStatusOf(registration: PublicMemberRegistrationRecord) {
  return String(registration.latestRefund?.status || "").toLowerCase();
}

function eventEndTime(registration: PublicMemberRegistrationRecord) {
  const timestamp = new Date(registration.activity?.endTime || "").getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function getJourneyGroup(registration: PublicMemberRegistrationRecord, now = Date.now()): JourneyGroup {
  const refundStatus = refundStatusOf(registration);
  if (refundStatus === "completed") return "inactive";
  if (["pending", "processing", "failed"].includes(refundStatus)) return "pending";

  const status = String(registration.status || "").toLowerCase();
  if (["pending_payment", "pending_review"].includes(status)) return "pending";
  if (status === "completed") return "completed";
  if (status === "checked_in") {
    const endTime = eventEndTime(registration);
    return endTime === null || endTime > now ? "upcoming" : "completed";
  }
  if (status !== "approved") return "inactive";

  const endTime = eventEndTime(registration);
  if (endTime === null) return "inactive";
  return endTime > now ? "upcoming" : "missed";
}

export function getJourneyStatus(registration: PublicMemberRegistrationRecord, now = Date.now()) {
  const refundStatus = refundStatusOf(registration);
  if (refundStatus === "completed") return { label: "已退款", tone: "muted" as const };
  if (refundStatus === "failed") return { label: "退款需处理", tone: "warning" as const };
  if (["pending", "processing"].includes(refundStatus)) return { label: "退款处理中", tone: "warning" as const };

  const status = String(registration.status || "").toLowerCase();
  if (status === "pending_payment") return { label: "待付款", tone: "warning" as const };
  if (status === "pending_review") return { label: "报名审核中", tone: "warning" as const };
  if (["checked_in", "completed"].includes(status)) return { label: "已签到", tone: "success" as const };
  if (status === "approved") {
    const endTime = eventEndTime(registration);
    if (endTime !== null && endTime <= now) return { label: "未签到", tone: "muted" as const };
    return { label: "待参加", tone: "brand" as const };
  }
  if (status === "cancelled") return { label: "已取消", tone: "muted" as const };
  if (status === "rejected") return { label: "未通过", tone: "muted" as const };
  return { label: "报名状态更新中", tone: "muted" as const };
}

export function sortJourneyRegistrations(registrations: PublicMemberRegistrationRecord[]) {
  return [...registrations].sort((left, right) => {
    const leftTime = new Date(left.activity?.startTime || left.createdAt || 0).getTime() || 0;
    const rightTime = new Date(right.activity?.startTime || right.createdAt || 0).getTime() || 0;
    return leftTime - rightTime;
  });
}
