export const DEMO_CHECKIN_ROUTE = "/pages/checkin/index";

export function getDemoCheckinFallback(errorMessage: string) {
  return {
    title: "演示挑战已准备",
    description: "今日真实任务尚未由运营发布。你可以进入本地演示挑战，完成任务并查看进度；不会写入真实签到记录。",
    errorMessage,
    route: DEMO_CHECKIN_ROUTE,
  };
}
