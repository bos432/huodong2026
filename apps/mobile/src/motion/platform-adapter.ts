export type MotionStyle = Record<string, string>;

function h5ReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function prefersReducedMotion() {
  return h5ReducedMotion();
}

export function motionStyle(delayMs = 0, durationMs = 280): MotionStyle {
  if (prefersReducedMotion()) return { "--motion-delay": "0ms", "--motion-duration": "1ms" };
  return {
    "--motion-delay": `${Math.max(0, delayMs)}ms`,
    "--motion-duration": `${Math.max(1, durationMs)}ms`
  };
}

export function motionClass(base = "app-enter") {
  return prefersReducedMotion() ? `${base} motion-reduced` : base;
}
