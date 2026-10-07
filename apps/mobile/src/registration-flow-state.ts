export type RegistrationFlowState =
  | "editing"
  | "validating"
  | "submitting"
  | "payment_pending"
  | "success"
  | "waitlist"
  | "review_pending"
  | "error";

export type RegistrationFlowEvent =
  | "validate"
  | "submit"
  | "payment_required"
  | "completed"
  | "waitlisted"
  | "review_required"
  | "failed"
  | "retry";

const busyStates = new Set<RegistrationFlowState>(["validating", "submitting"]);

export function transitionRegistrationFlow(current: RegistrationFlowState, event: RegistrationFlowEvent): RegistrationFlowState {
  if (event === "validate") return "validating";
  if (event === "submit") return "submitting";
  if (event === "payment_required") return "payment_pending";
  if (event === "completed") return "success";
  if (event === "waitlisted") return "waitlist";
  if (event === "review_required") return "review_pending";
  if (event === "failed") return "error";
  return "editing";
}

export function isRegistrationBusy(state: RegistrationFlowState) {
  return busyStates.has(state);
}

export function registrationFlowLabel(state: RegistrationFlowState) {
  const labels: Record<RegistrationFlowState, string> = {
    editing: "填写报名信息",
    validating: "校验报名信息",
    submitting: "提交中",
    payment_pending: "等待支付",
    success: "报名成功",
    waitlist: "已进入候补",
    review_pending: "等待审核",
    error: "提交失败"
  };
  return labels[state];
}
