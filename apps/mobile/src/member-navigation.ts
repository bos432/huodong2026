const memberTransactionRoutes = new Set([
  "/pages/user/orders",
  "/pages/user/registration",
  "/pages/user/review",
  "/pages/user/pending-reviews"
]);

export function usesMemberNavigation(path: string) {
  return memberTransactionRoutes.has(String(path || "").split("?")[0]);
}
