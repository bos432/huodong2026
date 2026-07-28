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
  const [registrations, courses, courseOrders] = await Promise.all([
    loaders.registrations(user.id, tenant),
    loaders.courses(user, tenant),
    loaders.courseOrders(user, tenant)
  ]);
  return {
    context: {
      userId: user.id,
      tenantId: tenant?.id ?? null,
      tenantCode: tenant?.code ?? null
    },
    registrations,
    courses,
    courseOrders
  };
}
