import { motionVars } from "./motion";

// H5 gets the shared GSAP implementation; uni-app strips this block from the
// WeChat build so the mini-program never bundles a DOM animation dependency.
// #ifdef H5
import { gsap } from "gsap";
// #endif

export type MotionStyle = Record<string, string>;
export type MotionOptions = { reducedMotion?: boolean; duration?: number; delay?: number };
export type MotionHandle = { cancel(): void };

export { getMotionPlatform, isMotionEnabled, motionTiming, motionVars } from "./motion";

function h5ReducedMotion() {
  // #ifdef H5
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // #endif
  return false;
}

export function prefersReducedMotion() {
  return h5ReducedMotion();
}

export function motionStyle(delayMs = 0, durationMs = 280): MotionStyle {
  if (prefersReducedMotion()) return { "--motion-delay": "0ms", "--motion-duration": "1ms" };
  return motionVars(delayMs, durationMs);
}

export function motionClass(base = "app-enter") {
  return prefersReducedMotion() ? `${base} motion-reduced` : base;
}

function noopMotion(): MotionHandle {
  return { cancel() {} };
}

function combineMotionHandles(handles: MotionHandle[]): MotionHandle {
  return { cancel: () => handles.forEach((handle) => handle.cancel()) };
}

function runtimeObject() {
  return typeof globalThis === "undefined" ? null : globalThis as unknown as Record<string, any>;
}

/** Returns true only for a browser runtime that can safely animate a target. */
export function isMotionSupported() {
  // #ifdef H5
  const runtime = runtimeObject();
  return Boolean(runtime && runtime.document && typeof runtime.requestAnimationFrame === "function");
  // #endif
  return false;
}

/**
 * Runs the platform-safe entrance effect. Mini-program/SSR targets receive a
 * cancellable no-op; H5 uses only transform, opacity and a single RAF.
 */
export function runMotion(target: unknown, options: MotionOptions = {}): MotionHandle {
  if (options.reducedMotion || prefersReducedMotion() || !isMotionSupported()) return noopMotion();
  if (!target || typeof target !== "object" || !("style" in target)) return noopMotion();

  const style = (target as { style?: Record<string, string> }).style;
  const runtime = runtimeObject();
  if (!style || !runtime) return noopMotion();

  const duration = Math.max(1, Number(options.duration ?? 280));
  const delay = Math.max(0, Number(options.delay ?? 0));

  // Use GSAP only for actual H5 elements. Plain style objects still use the
  // deterministic fallback, which keeps unit tests, SSR and non-DOM previews
  // safe and gives the WeChat adapter a zero-dependency path.
  // #ifdef H5
  if (typeof runtime.HTMLElement === "function" && target instanceof runtime.HTMLElement) {
    const context = gsap.context(() => {
      gsap.fromTo(target, { y: 8, scale: 0.99, autoAlpha: 0 }, {
        y: 0,
        scale: 1,
        autoAlpha: 1,
        duration: duration / 1000,
        delay: delay / 1000,
        ease: "power2.out",
        clearProps: "transform,opacity,visibility"
      });
    }, target as HTMLElement);
    return { cancel: () => context.revert() };
  }
  // #endif

  const previous = {
    transition: style.transition,
    transform: style.transform,
    opacity: style.opacity
  };
  let frame = 0;
  let timer: any = null;
  let cancelled = false;
  style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
  style.transform = "translateY(8px) scale(.99)";
  style.opacity = "0";
  const start = () => {
    if (cancelled) return;
    style.transform = "translateY(0) scale(1)";
    style.opacity = "1";
  };
  const schedule = () => { frame = runtime.requestAnimationFrame(start); };
  if (delay) timer = runtime.setTimeout(schedule, delay);
  else schedule();
  return {
    cancel() {
      cancelled = true;
      if (timer !== null && typeof runtime.clearTimeout === "function") runtime.clearTimeout(timer);
      if (frame && typeof runtime.cancelAnimationFrame === "function") runtime.cancelAnimationFrame(frame);
      style.transition = previous.transition;
      style.transform = previous.transform;
      style.opacity = previous.opacity;
    }
  };
}

/** Animates a page's marked blocks on H5 and remains a no-op on WeChat. */
export function runMotionGroup(selector = ".app-enter", delayStep = 36): MotionHandle {
  if (!isMotionSupported() || prefersReducedMotion()) return noopMotion();
  const runtime = runtimeObject();
  const document = runtime?.document as { querySelectorAll?: (value: string) => Iterable<unknown> } | undefined;
  if (!document?.querySelectorAll) return noopMotion();
  const handles = Array.from(document.querySelectorAll(selector)).map((target, index) => runMotion(target, { delay: index * Math.max(0, delayStep) }));
  return combineMotionHandles(handles);
}
