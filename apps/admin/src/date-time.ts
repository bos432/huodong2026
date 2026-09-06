type DateInput = string | number | Date | null | undefined;

const shanghaiFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function parseDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isFinite(+value) ? value : null;
  let source = value;
  if (typeof source === 'string') {
    source = source.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(source)) source += 'T00:00:00+08:00';
    else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(source)) source = source.replace(' ', 'T') + '+08:00';
  }
  const date = new Date(source);
  return Number.isFinite(+date) ? date : null;
}

export function formatShanghaiDateTime(value: DateInput, fallback = '-', seconds = false) {
  const date = parseDate(value);
  if (!date) return fallback;
  const parts = Object.fromEntries(shanghaiFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}${seconds ? `:${parts.second}` : ''}`;
}

export function shanghaiDateTimeToIso(value: string) {
  const date = parseDate(value);
  const civil = value.trim().replace('T', ' ');
  if (!date || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(civil)
    || formatShanghaiDateTime(date, '', true) !== civil) throw new Error('请输入有效的北京时间');
  return date.toISOString();
}
