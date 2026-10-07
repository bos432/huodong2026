export type MotionPlatform = "h5" | "mp-weixin" | "unknown";

export function getMotionPlatform(): MotionPlatform {
  // uni-app exposes the platform at compile time; keeping the fallback makes
  // the helper safe in SSR, unit tests, and other preview environments.
  if (typeof process !== "undefined" && process.env?.UNI_PLATFORM === "h5") return "h5";
  if (typeof process !== "undefined" && process.env?.UNI_PLATFORM === "mp-weixin") return "mp-weixin";
  return "unknown";
}

export function isMotionEnabled(): boolean {
  // #ifdef H5
  if (getMotionPlatform() !== "h5" || typeof window === "undefined") return true;
  return typeof window.matchMedia !== "function" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // #endif
  return true;
}

export function motionTiming(delayMs = 0, durationMs = 280) {
  if (!isMotionEnabled()) return { delayMs: 0, durationMs: 1 };
  return { delayMs: Math.max(0, delayMs), durationMs: Math.max(1, durationMs) };
}

export function motionVars(delayMs = 0, durationMs = 280): Record<string, string> {
  const timing = motionTiming(delayMs, durationMs);
  return {
    "--motion-delay": `${timing.delayMs}ms`,
    "--motion-duration": `${timing.durationMs}ms`
  };
}
