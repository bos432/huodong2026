import { motionVars } from "./motion";

export function entranceStyle(index = 0, stepMs = 36) {
  return motionVars(Math.max(0, index) * Math.max(0, stepMs));
}

export function entranceClass(base = "app-enter") {
  return base;
}
