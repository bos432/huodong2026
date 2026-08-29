import { gsap } from "gsap";

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function playAdminPageMotion(root: HTMLElement | null) {
  if (!root || prefersReducedMotion()) return () => undefined;
  const context = gsap.context(() => {
    gsap.fromTo(root, { autoAlpha: 0, y: 8 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.24,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility"
    });
  }, root);
  return () => context.revert();
}
