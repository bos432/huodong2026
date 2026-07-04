const DEFAULT_MP_API_BASE = "https://rd.chaimen666.com/api";

function normalizeApiBase(value?: unknown) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildApiBase() {
  const configured = normalizeApiBase(import.meta.env.VITE_API_BASE);
  if (configured) return configured;
  // #ifdef MP-WEIXIN
  return DEFAULT_MP_API_BASE;
  // #endif
  return "/api";
}

export const API_BASE = buildApiBase();
