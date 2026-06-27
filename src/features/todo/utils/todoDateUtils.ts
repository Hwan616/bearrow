const DAY_MS = 1000 * 60 * 60 * 24;

function toMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// 마감일까지 남은 일수 (음수 = 지난 날짜)
export function dueDayOffset(dueDate: Date, now: Date = new Date()): number {
  return Math.round((toMidnight(dueDate).getTime() - toMidnight(now).getTime()) / DAY_MS);
}

export function isDueDatePast(dueDate: Date, now: Date = new Date()): boolean {
  return dueDayOffset(dueDate, now) < 0;
}

export function isDueDateToday(dueDate: Date, now: Date = new Date()): boolean {
  return dueDayOffset(dueDate, now) === 0;
}

// 마감일을 한국어 레이블로 포맷 ("오늘", "내일", "어제", "6월 27일 (금)", "6월 25일 (수) (지연)")
export function formatDueDate(dueDate: Date, now: Date = new Date()): string {
  const offset = dueDayOffset(dueDate, now);
  if (offset === 0) return "오늘";
  if (offset === 1) return "내일";
  if (offset === -1) return "어제";

  const label = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(dueDate);

  return offset < 0 ? `${label} (지연)` : label;
}
