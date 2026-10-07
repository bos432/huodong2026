export interface ChallengeRecordInput {
  id: number;
  title: string;
  total: number;
  completed: number;
}

export function getChallengeRecordSummary(input: ChallengeRecordInput) {
  if (input.completed <= 0) return null;
  const completed = Math.min(Math.max(0, input.completed), Math.max(0, input.total));
  return {
    id: input.id,
    title: input.title,
    status: completed >= input.total ? "已完成" : "进行中",
    progress: `${completed} / ${input.total}`,
    note: "本地演示记录 · 不代表真实活动参与"
  };
}
