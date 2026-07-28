type MemberOrderUser = { id: number };
type MemberOrderTenant = { id: number; code: string };

type MemberOrderLoaders<TUser extends MemberOrderUser, TTenant extends MemberOrderTenant> = {
  registrations: (userId: number, tenant: TTenant | null) => Promise<unknown[]>;
  courses: (user: TUser, tenant: TTenant | null) => Promise<unknown[]>;
  courseOrders: (user: TUser, tenant: TTenant | null) => Promise<unknown[]>;
};

export async function buildMemberOrderOverview<TUser extends MemberOrderUser, TTenant extends MemberOrderTenant>(
  user: TUser,
  tenant: TTenant | null,
  loaders: MemberOrderLoaders<TUser, TTenant>
) {
  const sources = ["registrations", "courses", "courseOrders"] as const;
  const results = await Promise.allSettled([
    loaders.registrations(user.id, tenant),
    loaders.courses(user, tenant),
    loaders.courseOrders(user, tenant)
  ]);
  const failedSources: Array<(typeof sources)[number]> = [];
  const values = results.map((result, index) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) return result.value;
    failedSources.push(sources[index]);
    return [];
  });
  if (failedSources.length === sources.length) {
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
    throw rejected?.reason || new Error("订单数据加载失败");
  }
  return {
    context: {
      userId: user.id,
      tenantId: tenant?.id ?? null,
      tenantCode: tenant?.code ?? null
    },
    registrations: values[0],
    courses: values[1],
    courseOrders: values[2],
    failedSources
  };
}
