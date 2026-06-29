import * as Crypto from "expo-crypto";

import type { GoogleEventItem } from "./googleCalendarApi";

// 로컬 DB에 저장할 이벤트 모양 (raw 값 — Drizzle 매핑 전)
export interface MappedLocalEvent {
  id: string;
  title: string;
  note: string | null;
  isAllDay: number;
  startsAt: number;
  endsAt: number;
  source: string;
  externalId: string;
  updatedAt: number;
  isDeleted: number;
}

// push 단계에서 조회하는 로컬 이벤트 최소 필드
export interface LocalEventForPush {
  id: string;
  title: string;
  note: string | null;
  isAllDay: number;
  startsAt: number;
  endsAt: number;
  externalId: string | null;
  isDeleted: number;
}

// Google Calendar 이벤트 → 로컬 저장 형식
export function mapGoogleEventToLocal(
  item: GoogleEventItem,
  existingLocalId?: string,
): MappedLocalEvent {
  const isAllDay = !!item.start.date;
  const startsAt = isAllDay
    ? new Date(item.start.date!).getTime()
    : new Date(item.start.dateTime!).getTime();
  const endsAt = isAllDay
    ? new Date(item.end.date!).getTime()
    : new Date(item.end.dateTime!).getTime();

  return {
    id: existingLocalId ?? Crypto.randomUUID(),
    title: item.summary ?? "(제목 없음)",
    note: item.description ?? null,
    isAllDay: isAllDay ? 1 : 0,
    startsAt,
    endsAt,
    source: "google",
    externalId: item.id,
    updatedAt: new Date(item.updated).getTime(),
    isDeleted: item.status === "cancelled" ? 1 : 0,
  };
}

// 로컬 이벤트 → Google Calendar API 요청 바디
export function mapLocalEventToGoogle(event: LocalEventForPush): Record<string, unknown> {
  const startMs = event.startsAt;
  const endMs = event.endsAt;

  if (event.isAllDay) {
    return {
      summary: event.title,
      ...(event.note ? { description: event.note } : {}),
      start: { date: new Date(startMs).toISOString().slice(0, 10) },
      end: { date: new Date(endMs).toISOString().slice(0, 10) },
    };
  }
  return {
    summary: event.title,
    ...(event.note ? { description: event.note } : {}),
    start: { dateTime: new Date(startMs).toISOString() },
    end: { dateTime: new Date(endMs).toISOString() },
  };
}
