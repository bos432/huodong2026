import { motionTiming } from "./motion";

export type BottomSheetState = "closed" | "opening" | "open" | "closing";

export function bottomSheetStyle(open: boolean) {
  const timing = motionTiming(0, 220);
  return {
    "--motion-duration": `${timing.durationMs}ms`,
    "--sheet-visibility": open ? "visible" : "hidden",
    "--sheet-pointer-events": open ? "auto" : "none"
  };
}
