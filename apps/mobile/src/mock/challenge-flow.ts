export type DemoChallengeStatus = "not_started" | "in_progress" | "completed";

export interface ChallengeProgress {
  completedTaskIds: string[];
}

export function createChallengeProgress(_total: number): ChallengeProgress {
  return { completedTaskIds: [] };
}

export function completeChallengeTask(progress: ChallengeProgress, taskId: string): ChallengeProgress {
  if (!taskId || progress.completedTaskIds.includes(taskId)) return progress;
  return { completedTaskIds: [...progress.completedTaskIds, taskId] };
}

export function getChallengeProgress(progress: ChallengeProgress, total: number) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const completed = Math.min(safeTotal, progress.completedTaskIds.length);
  const percent = safeTotal ? Math.round((completed / safeTotal) * 100) : 0;
  const status: DemoChallengeStatus = completed >= safeTotal && safeTotal > 0 ? "completed" : completed > 0 ? "in_progress" : "not_started";
  return { completed, total: safeTotal, percent, status };
}
