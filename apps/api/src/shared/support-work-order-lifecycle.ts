export const supportWorkOrderTransitions: Record<string, string[]> = {
  open: ["assigned", "processing", "waiting_user", "resolved", "closed"],
  assigned: ["processing", "waiting_user", "resolved", "closed"],
  processing: ["waiting_user", "resolved", "closed"],
  waiting_user: ["processing", "resolved", "closed"],
  resolved: ["closed", "processing"],
  closed: ["processing"]
};

export function canTransitionSupportWorkOrder(from: string, to: string) {
  return (supportWorkOrderTransitions[from] || []).includes(to);
}

export function supportWorkOrderDueHours(priority: string) {
  return priority === "urgent" ? 2 : priority === "high" ? 8 : priority === "low" ? 72 : 24;
}
