export type FundRiskLifecycle = {
  status: string;
  occurrenceCount: number;
  handledBy?: string | null;
  handledAt?: Date | null;
  handlingRemark?: string | null;
};

export function rediscoverFundRisk(current: FundRiskLifecycle) {
  if (current.status !== "resolved") return { ...current, occurrenceCount: current.occurrenceCount + 1 };
  return {
    ...current,
    status: "open",
    occurrenceCount: current.occurrenceCount + 1,
    handledBy: null,
    handledAt: null,
    handlingRemark: "异常再次出现，系统自动重新打开"
  };
}

export function shouldRediscoverFundRisk(type: string, status: string) {
  return type !== "callback_failed" || status !== "resolved";
}
