const DEFAULT_MP_API_BASE = "https://rd.chaimen666.com/api";
const DEFAULT_H5_API_BASE = "/api";

function normalizeApiBase(value?: unknown) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildApiBase() {
  const configured = normalizeApiBase(import.meta.env.VITE_API_BASE);
  if (configured) return configured;
  const fallback = DEFAULT_H5_API_BASE;
  // #ifdef MP-WEIXIN
  return normalizeApiBase(DEFAULT_MP_API_BASE);
  // #endif
  return fallback;
}

export const API_BASE = buildApiBase();
