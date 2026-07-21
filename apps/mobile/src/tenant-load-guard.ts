import { getCurrentTenantCode } from "./api";

export type TenantLoadToken = { id: number; tenantCode: string };

export function createTenantLoadGuard(readTenantCode: () => string = getCurrentTenantCode) {
  let latestId = 0;
  return {
    begin(): TenantLoadToken {
      return { id: ++latestId, tenantCode: readTenantCode() };
    },
    isCurrent(token: TenantLoadToken) {
      return token.id === latestId && token.tenantCode === readTenantCode();
    },
    invalidate() {
      latestId += 1;
    }
  };
}
