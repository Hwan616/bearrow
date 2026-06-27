import type { Event, NewEvent } from "../types";

export type EventFormValues = {
  title: string;
  isAllDay: boolean;
  startsAt: Date;
  endsAt: Date;
  note: string;
};

// 폼 기본값 — 신규: 다음 정시~+1시간, 편집: 기존 값
export function makeDefaultValues(
  event?: Event,
  base: Date = new Date(),
): EventFormValues {
  if (event) {
    return {
      title: event.title,
      isAllDay: event.isAllDay,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      note: event.note ?? "",
    };
  }
  const start = new Date(base);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { title: "", isAllDay: false, startsAt: start, endsAt: end, note: "" };
}

// 시간 유효성 검사 — 오류 메시지 또는 null
export function validateEventTimes(
  startsAt: Date,
  endsAt: Date,
): string | null {
  if (endsAt <= startsAt) return "종료 시각은 시작 시각 이후여야 합니다.";
  return null;
}

// 종일 이벤트용 날짜 정규화 — 시각을 자정/23:59:59로 고정
export function normalizeAllDayTimes(startsAt: Date, endsAt: Date): { startsAt: Date; endsAt: Date } {
  const s = new Date(startsAt);
  s.setHours(0, 0, 0, 0);
  const e = new Date(endsAt);
  e.setHours(23, 59, 59, 999);
  return { startsAt: s, endsAt: e };
}

// 폼 값 → NewEvent 변환
export function buildNewEvent(
  id: string,
  values: EventFormValues,
  now: Date = new Date(),
): NewEvent {
  const { startsAt, endsAt } = values.isAllDay
    ? normalizeAllDayTimes(values.startsAt, values.endsAt)
    : { startsAt: values.startsAt, endsAt: values.endsAt };

  return {
    id,
    title: values.title.trim(),
    isAllDay: values.isAllDay,
    startsAt,
    endsAt,
    note: values.note.trim() || null,
    categoryId: null,
    source: "local",
    externalId: null,
    updatedAt: now,
  };
}

// 날짜 표시 레이블 ("2026년 6월 27일 (토) 오후 3:00")
export function formatDateTimeLabel(date: Date, isAllDay: boolean): string {
  const dateStr = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
  if (isAllDay) return dateStr;
  const timeStr = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${dateStr} ${timeStr}`;
}

// 날짜는 유지하고 시각만 교체 (DateTimePicker 분리 선택 시)
export function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}
