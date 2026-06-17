import { getCurrentTenantCode, getCurrentTenantCodeSource, hasExplicitTenantCodeInRoute, request, setCurrentTenantCode, setCurrentTenantCodeSource } from "./api";
import type { PublicTenantView } from "@activity/shared";

const LOCATION_ATTEMPTED_STORAGE_KEY = "h5_tenant_location_attempted";

type ResolveResult = {
  matched: boolean;
  fallback: boolean;
  tenant: PublicTenantView | null;
  message?: string;
};

let resolving = false;

function getLocation(): Promise<UniApp.GetLocationSuccess> {
  return new Promise((resolve, reject) => {
    uni.getLocation({ type: "gcj02", success: resolve, fail: reject });
  });
}

export async function resolveTenantByCurrentLocation(options: { force?: boolean; silent?: boolean } = {}) {
  if (resolving) return null;
  if (!options.force) {
    if (hasExplicitTenantCodeInRoute()) return null;
    if (getCurrentTenantCode() && ["manual", "route"].includes(getCurrentTenantCodeSource())) return null;
    if (uni.getStorageSync(LOCATION_ATTEMPTED_STORAGE_KEY)) return null;
  }
  resolving = true;
  try {
    uni.setStorageSync(LOCATION_ATTEMPTED_STORAGE_KEY, "1");
    const location = await getLocation();
    const result = await request<ResolveResult>(`/public/tenants/resolve?lat=${encodeURIComponent(String(location.latitude))}&lng=${encodeURIComponent(String(location.longitude))}`);
    if (result?.tenant?.code) {
      setCurrentTenantCode(result.tenant.code);
      setCurrentTenantCodeSource("location");
      if (!options.silent) uni.showToast({ title: result.message || "已切换到当前区域", icon: "none" });
      return result;
    }
    if (!options.silent && result?.message) uni.showToast({ title: result.message, icon: "none" });
    return result || null;
  } catch {
    if (!options.silent) uni.showToast({ title: "定位失败，可手动切换城市", icon: "none" });
    return null;
  } finally {
    resolving = false;
  }
}
