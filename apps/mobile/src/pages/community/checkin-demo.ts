export const DEMO_CHECKIN_ROUTE = "/pages/checkin/index";

export function getDemoCheckinFallback(errorMessage: string) {
  return {
    title: "演示挑战已准备",
    description: "今天还没有正式运营任务。你可以进入本地演示挑战，逐项完成任务并查看进度；不会写入真实签到记录。",
    errorMessage,
    route: DEMO_CHECKIN_ROUTE,
  };
}
