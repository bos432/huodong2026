import type { MobileUserTab } from "./mobile-tab-routes";

const memberTransactionRoutes = new Set([
  "/pages/user/my",
  "/pages/user/settings",
  "/pages/user/security",
  "/pages/user/profile",
  "/pages/user/login",
  "/pages/user/wallet",
  "/pages/user/favorites",
  "/pages/user/frequent-registrants",
  "/pages/user/activity-reviews",
  "/pages/user/certificates",
  "/pages/user/community-posts",
  "/pages/user/forum-posts",
  "/pages/user/notifications",
  "/pages/activity/list",
  "/pages/activity/space",
  "/pages/user/orders",
  "/pages/user/registration",
  "/pages/user/review",
  "/pages/user/pending-reviews"
]);

export function usesMemberNavigation(path: string) {
  return memberTransactionRoutes.has(String(path || "").split("?")[0]);
}

export function memberNavigationTab(path: string): MobileUserTab {
  const route = String(path || "").split("?")[0];
  if (route.startsWith("/pages/activity/")) return "home";
  if (route === "/pages/user/notifications") return "messages";
  return "me";
}
