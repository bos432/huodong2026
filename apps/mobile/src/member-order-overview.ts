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
};

export async function loadMemberOrderOverview(session: MemberOrderSession) {
  const overview = await request<MemberOrderOverview>("/public/me/orders-overview", {
    tenantCode: session.tenantCode,
    userToken: session.userToken
  });
  const responseTenantCode = String(overview?.context?.tenantCode || "");
  if (Number(overview?.context?.userId) !== session.userId || responseTenantCode !== session.tenantCode) {
    throw new Error("订单数据与当前账号或机构不一致，请重新进入后再试");
  }
  if (!Array.isArray(overview.registrations) || !Array.isArray(overview.courses) || !Array.isArray(overview.courseOrders)) {
    throw new Error("订单数据格式异常，请重新加载");
  }
  return overview;
}
