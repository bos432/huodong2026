export type SeriesSession = { startTime: string; endTime: string; registrationDeadline: string; location: string };
export function validateSeriesBatch(input: unknown, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('排期格式不正确');
  const value = input as Record<string, any>;
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error('系列版本无效');
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 120) throw new Error('系列名称须为1-120字');
  if (!Array.isArray(value.sessions) || !value.sessions.length || value.sessions.length > 12) throw new Error('每次创建1-12个场次');
  const sessions: SeriesSession[] = value.sessions.map((row: any) => {
    const times = ['startTime', 'endTime', 'registrationDeadline'].map(key => {
      if (typeof row?.[key] !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row[key])) throw new Error('排期必须包含完整日期、时间和时区');
      const date = new Date(row[key]); if (!Number.isFinite(+date)) throw new Error('排期日期无效'); return date;
    });
    const [start, end, deadline] = times;
    if (+start <= +now || +deadline <= +now || +end <= +start || +deadline >= +start) throw new Error('截止时间须在未来且早于开场，结束须晚于开场');
    if (typeof row.location !== 'string' || !row.location.trim() || row.location.length > 255) throw new Error('请填写每场地点（最多255字）');
    return { startTime: start.toISOString(), endTime: end.toISOString(), registrationDeadline: deadline.toISOString(), location: row.location.trim() };
  });
  const sorted = [...sessions].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  if (sorted.some((row, i) => i > 0 && +new Date(row.startTime) < +new Date(sorted[i - 1].endTime))) throw new Error('同系列场次时间不可重叠');
  return { revision: value.revision as number, title: value.title.trim() as string, sessions: sorted };
}
