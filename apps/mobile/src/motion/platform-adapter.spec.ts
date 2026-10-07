import { describe, expect, it } from "vitest";
import { isMotionSupported, runMotion } from "./platform-adapter";

describe("mobile motion platform adapter", () => {
  it("returns a cancellable no-op when DOM is unavailable", () => {
    expect(isMotionSupported()).toBe(false);
    expect(() => runMotion({})).not.toThrow();
    expect(() => runMotion({}).cancel()).not.toThrow();
  });

  it("does not mutate a target when reduced motion is requested", () => {
    const target = { style: {} as Record<string, string> };
    const handle = runMotion(target, { reducedMotion: true });

    expect(target.style).toEqual({});
    expect(() => handle.cancel()).not.toThrow();
  });

  it("uses only transform and opacity in a browser-capable runtime", () => {
    const runtime = globalThis as typeof globalThis & { document?: unknown; requestAnimationFrame?: (callback: FrameRequestCallback) => number; cancelAnimationFrame?: (id: number) => void };
    const previousDocument = runtime.document;
    const previousRaf = runtime.requestAnimationFrame;
    const previousCancelRaf = runtime.cancelAnimationFrame;
    runtime.document = {};
    runtime.requestAnimationFrame = (callback) => { callback(0); return 1; };
    runtime.cancelAnimationFrame = () => {};
    try {
      const target = { style: { transition: "old", transform: "old", opacity: "0.5" } };
      const handle = runMotion(target, { duration: 160 });

      expect(target.style.transform).toBe("translateY(0) scale(1)");
      expect(target.style.opacity).toBe("1");
      expect(target.style.transition).toContain("transform 160ms");
      handle.cancel();
      expect(target.style).toEqual({ transition: "old", transform: "old", opacity: "0.5" });
    } finally {
      runtime.document = previousDocument;
      runtime.requestAnimationFrame = previousRaf;
      runtime.cancelAnimationFrame = previousCancelRaf;
    }
  });

  it("clears a delayed animation timer when cancelled", () => {
    const runtime = globalThis as typeof globalThis & {
      document?: unknown;
      requestAnimationFrame?: (callback: FrameRequestCallback) => number;
      cancelAnimationFrame?: (id: number) => void;
      setTimeout?: (callback: (...args: any[]) => void, delay?: number) => any;
      clearTimeout?: (id: any) => void;
    };
    const previous = { document: runtime.document, requestAnimationFrame: runtime.requestAnimationFrame, cancelAnimationFrame: runtime.cancelAnimationFrame, setTimeout: runtime.setTimeout, clearTimeout: runtime.clearTimeout };
    let delayedCallback: (() => void) | undefined;
    let cleared: any;
    runtime.document = {};
    runtime.requestAnimationFrame = () => 1;
    runtime.cancelAnimationFrame = () => {};
    runtime.setTimeout = (callback) => { delayedCallback = callback; return 9; };
    runtime.clearTimeout = (id) => { cleared = id; };
    try {
      const handle = runMotion({ style: {} }, { delay: 400 });
      expect(delayedCallback).toBeTypeOf("function");
      handle.cancel();
      expect(cleared).toBe(9);
    } finally {
      runtime.document = previous.document;
      runtime.requestAnimationFrame = previous.requestAnimationFrame;
      runtime.cancelAnimationFrame = previous.cancelAnimationFrame;
      runtime.setTimeout = previous.setTimeout;
      runtime.clearTimeout = previous.clearTimeout;
    }
  });
});
