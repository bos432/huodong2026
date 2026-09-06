export function normalizeActivityFollowup(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('跟进格式无效');
  const input = value as Record<string, any>;
  for (const key of ['registrationId', 'assigneeId']) if (!Number.isSafeInteger(input[key]) || input[key] < 1) throw new Error('请选择报名记录与负责人');
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw new Error('跟进版本无效');
  if (!['feedback', 'next_activity', 'return_visit'].includes(input.kind)) throw new Error('跟进类型无效');
  if (!['pending', 'done', 'declined'].includes(input.status)) throw new Error('跟进状态无效');
  if (typeof input.outcome !== 'string' || input.outcome.length > 1000) throw new Error('结果备注不能超过1000字');
  if (input.status !== 'pending' && !input.outcome.trim()) throw new Error('完成或拒绝跟进时请填写结果');
  if (typeof input.dueAt !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.dueAt) || !Number.isFinite(+new Date(input.dueAt))) throw new Error('请填写含时区的有效到期时间');
  return { registrationId: input.registrationId as number, assigneeId: input.assigneeId as number, revision: input.revision as number,
    kind: input.kind as 'feedback' | 'next_activity' | 'return_visit', status: input.status as 'pending' | 'done' | 'declined', dueAt: new Date(input.dueAt), outcome: input.outcome.trim() as string };
}
