export const HOUR_HEIGHT = 60; // 시간당 픽셀 높이
export const TIME_LABEL_WIDTH = 44; // 시간 레이블 컬럼 너비
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export interface WeekDay {
  date: Date;
  isToday: boolean;
}

// 주어진 날짜가 속한 주의 7일(일~토) 반환
export function buildWeekDays(date: Date, today: Date = new Date()): WeekDay[] {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  sunday.setHours(0, 0, 0, 0);

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return { date: d, isToday: d.getTime() === todayMidnight.getTime() };
  });
}

// 그 주 전체(일 00:00 ~ 토 23:59:59)의 API 쿼리 범위
export function getWeekDateRange(date: Date): { from: Date; to: Date } {
  const days = buildWeekDays(date);
  const from = new Date(days[0]!.date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(days[6]!.date);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

// 자정으로부터의 Y 좌표(px) — 타임그리드 이벤트 상단 위치
export function timeToTopOffset(date: Date, hourHeight = HOUR_HEIGHT): number {
  return (date.getHours() + date.getMinutes() / 60) * hourHeight;
}

// 이벤트 지속시간을 높이(px)로 변환 — 최소 20px
export function durationToHeight(
  startsAt: Date,
  endsAt: Date,
  hourHeight = HOUR_HEIGHT,
): number {
  const hours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  return Math.max(20, hours * hourHeight);
}

// "00:00" 형식 시간 포맷
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// 주 헤더용 요일·일 포맷 — { short: "월", date: 15 }
export function formatWeekDayHeader(date: Date): { short: string; date: number } {
  const SHORT_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
  return { short: SHORT_DAYS[date.getDay()]!, date: date.getDate() };
}

// 특정 날짜의 종일 이벤트 필터 — 제네릭으로 구체 타입 보존
export function getAllDayEvents<
  T extends { isAllDay: boolean; startsAt: Date; endsAt: Date },
>(events: T[], day: Date): T[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return events.filter((e) => e.isAllDay && e.startsAt <= dayEnd && e.endsAt >= dayStart);
}

// 특정 날짜의 시간 지정 이벤트 필터 — 제네릭으로 구체 타입 보존
export function getTimedEvents<
  T extends { isAllDay: boolean; startsAt: Date; endsAt: Date },
>(events: T[], day: Date): T[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return events.filter((e) => !e.isAllDay && e.startsAt <= dayEnd && e.endsAt >= dayStart);
}
