const DEFAULT_MP_API_BASE = "https://rd.chaimen666.com/api";
const DEFAULT_H5_API_BASE = "/api";

function normalizeApiBase(value?: unknown) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildApiBase() {
  const configured = normalizeApiBase(import.meta.env.VITE_API_BASE);
  // #ifdef MP-WEIXIN
  // A server-side H5 build environment may contain /api; it is not a mini-program URL.
  const mpConfigured = normalizeApiBase(import.meta.env.VITE_MP_API_BASE) || configured;
  if (!mpConfigured || mpConfigured === "/api") return DEFAULT_MP_API_BASE;
  if (!/^https:\/\/[^/\s]+(?:\/[^\s]*)?$/.test(mpConfigured)) {
    throw new Error("Mini-program API base must be an absolute HTTPS URL");
  }
  return mpConfigured;
  // #endif
  // #ifndef MP-WEIXIN
  return configured || DEFAULT_H5_API_BASE;
  // #endif
}

export const API_BASE = buildApiBase();

let assetApiBase = "";
// #ifdef MP-WEIXIN
assetApiBase = API_BASE;
// #endif
export const ASSET_API_BASE = assetApiBase;
