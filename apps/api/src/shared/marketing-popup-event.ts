export function marketingPopupEventCounter(event: string) {
  if (event === "click") return "clickCount" as const;
  if (event === "close") return "closeCount" as const;
  return "impressionCount" as const;
}
