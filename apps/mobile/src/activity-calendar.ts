export type ActivityCalendarInput = {
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
};

function parseActivityTime(value?: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeIcs(value?: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildActivityIcs(input: ActivityCalendarInput) {
  const start = parseActivityTime(input.startTime);
  if (!start) throw new Error("活动开始时间无效");
  const end = parseActivityTime(input.endTime) || new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SlowPi//Activity Registration//CN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:slowpi-${start.getTime()}@activity`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `LOCATION:${escapeIcs(input.location)}`,
    `DESCRIPTION:${escapeIcs(input.description || "慢π活动提醒")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:活动将在 30 分钟后开始",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

export async function addActivityToCalendar(input: ActivityCalendarInput) {
  const start = parseActivityTime(input.startTime);
  if (!start) throw new Error("活动开始时间无效");
  const end = parseActivityTime(input.endTime) || new Date(start.getTime() + 2 * 60 * 60 * 1000);

  // #ifdef MP-WEIXIN
  const wxApi = wx as any;
  if (typeof wxApi.addPhoneCalendar === "function") {
    await new Promise<void>((resolve, reject) => wxApi.addPhoneCalendar({
      title: input.title,
      startTime: Math.floor(start.getTime() / 1000),
      endTime: String(Math.floor(end.getTime() / 1000)),
      description: input.description || "慢π活动提醒",
      location: input.location || "",
      alarm: true,
      success: () => resolve(),
      fail: (error: any) => reject(new Error(error?.errMsg || "添加日历失败"))
    }));
    return;
  }
  // #endif

  // #ifdef H5
  const blob = new Blob(["\ufeff", buildActivityIcs(input)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${input.title.replace(/[\\/:*?"<>|]/g, "-") || "活动提醒"}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return;
  // #endif

  const text = `${input.title}\n${input.startTime}${input.endTime ? ` - ${input.endTime}` : ""}\n${input.location || ""}`;
  await new Promise<void>((resolve, reject) => uni.setClipboardData({ data: text, success: () => resolve(), fail: () => reject(new Error("复制活动信息失败")) }));
}
