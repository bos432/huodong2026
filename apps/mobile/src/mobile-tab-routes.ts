export type MobileUserTab = "home" | "checkin" | "messages" | "me";

/** Canonical user-facing routes. Prototype pages remain available only for design review. */
export function mobileTabRoute(tab: MobileUserTab): string {
  switch (tab) {
    case "home":
      return "/pages/home/index";
    case "checkin":
      return "/pages/checkin/index";
    case "messages":
      return "/pages/user/notifications";
    case "me":
      return "/pages/user/my";
  }
}
