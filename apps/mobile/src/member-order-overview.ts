import { request } from "./api";

export type MemberOrderSession = {
  tenantCode: string;
  userId: number;
  userToken: string;
};

export type MemberOrderOverview = {
  context: {
    userId: number;
    tenantId: number | null;
    tenantCode: string | null;
  };
  registrations: any[];
  courses: any[];
  courseOrders: any[];
  failedSources: Array<"registrations" | "courses" | "courseOrders">;
  warning: string;
};

type MemberOrderSnapshot = MemberOrderOverview & {
  contextKey: string;
  loadedAt: number;
};

const MAX_SNAPSHOT_AGE_MS = 60_000;
let snapshot: MemberOrderSnapshot | null = null;

function contextKey(session: MemberOrderSession) {
  return `${session.tenantCode}:${session.userId || "guest"}:${session.userToken || "anonymous"}`;
}

export function readMemberOrderSnapshot(session: MemberOrderSession) {
  if (!snapshot || snapshot.contextKey !== contextKey(session)) return null;
  if (Date.now() - snapshot.loadedAt > MAX_SNAPSHOT_AGE_MS) return null;
  return snapshot;
}

function writeMemberOrderSnapshot(session: MemberOrderSession, overview: MemberOrderOverview) {
  snapshot = {
    ...overview,
    contextKey: contextKey(session),
    registrations: [...overview.registrations],
    courses: [...overview.courses],
    courseOrders: [...overview.courseOrders],
    failedSources: [...overview.failedSources],
    loadedAt: Date.now()
  };
}

export async function loadMemberOrderOverview(session: MemberOrderSession) {
  const options = { tenantCode: session.tenantCode, userToken: session.userToken };
  const overview = await request<MemberOrderOverview>("/public/me/orders-overview", options);
  const responseTenantCode = String(overview?.context?.tenantCode || "");
  if (Number(overview?.context?.userId) !== session.userId || responseTenantCode !== session.tenantCode) {
    throw new Error("订单数据与当前账号或机构不一致，请重新进入后再试");
  }
  if (!Array.isArray(overview?.registrations) || !Array.isArray(overview?.courses) || !Array.isArray(overview?.courseOrders)) {
    throw new Error("订单数据格式异常，请重新加载");
  }
  const keys = ["registrations", "courses", "courseOrders"] as const;
  const failedSources = Array.isArray(overview.failedSources)
    ? overview.failedSources.filter((key): key is MemberOrderOverview["failedSources"][number] => keys.includes(key))
    : [];
  const labels: Record<MemberOrderOverview["failedSources"][number], string> = {
    registrations: "活动报名",
    courses: "学习记录",
    courseOrders: "课程订单"
  };
  const normalized: MemberOrderOverview = {
    ...overview,
    failedSources,
    warning: overview.warning || (failedSources.length ? `部分订单同步失败：${failedSources.map((key) => labels[key]).join("、")}。当前仅展示已成功同步的数据。` : "")
  };
  writeMemberOrderSnapshot(session, normalized);
  return normalized;
}
