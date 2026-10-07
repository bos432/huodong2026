import { motionVars } from "./motion";

export function mediaRevealStyle(loaded: boolean) {
  return {
    ...motionVars(0, 220),
    "--media-opacity": loaded ? "1" : "0"
  };
}
