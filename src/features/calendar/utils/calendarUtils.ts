import { type Event } from "../types";

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

// 월 그리드를 구성하는 날짜 배열 반환 (35 또는 42칸, 일요일 시작)
// today 파라미터를 받아 순수 함수로 유지 → 테스트 용이
export function buildMonthGrid(
  year: number,
  month: number,
  today: Date = new Date(),
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=일, 6=토
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, month, 1 - startPad + i);
    date.setHours(0, 0, 0, 0);
    return {
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: date.getTime() === todayMidnight.getTime(),
    };
  });
}

// API 호출용 날짜 범위 — 그리드에 보이는 패딩 날짜까지 포함
export function getMonthDateRange(
  year: number,
  month: number,
): { from: Date; to: Date } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const endPad = 6 - lastDay.getDay();

  const from = new Date(year, month, 1 - startPad);
  from.setHours(0, 0, 0, 0);

  const to = new Date(year, month + 1, endPad);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 특정 날짜와 겹치는 이벤트 반환 (종일·시간 이벤트 모두 포함)
export function getEventsForDay(events: Event[], day: Date): Event[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return events.filter(
    (e) => e.startsAt <= dayEnd && e.endsAt >= dayStart,
  );
}

export function formatMonthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("ko", {
    year: "numeric",
    month: "long",
  }).format(new Date(year, month));
}
