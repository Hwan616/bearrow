import * as Crypto from "expo-crypto";
import { and, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { events } from "@/db/schema";

import { type Event, type NewEvent } from "../types";
import { expandRecurringEvent, stripRRuleEnd } from "../utils/rruleUtils";

export async function createEvent(data: NewEvent): Promise<Event> {
  const rows = await db.insert(events).values(data).returning();
  const row = rows[0];
  if (!row) throw new Error("createEvent: insert returned no rows");
  return row;
}

export async function getEventById(id: string): Promise<Event | null> {
  const rows = await db.select().from(events).where(eq(events.id, id));
  return rows[0] ?? null;
}

// 기간 내 이벤트 조회 — 비반복 + 반복 인스턴스 전개 + 예외 처리
export async function getEventsByDateRange(
  from: Date,
  to: Date,
): Promise<Event[]> {
  // 1. 비반복 일반 이벤트 (범위와 겹치는 것)
  const regularEvents = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.rrule),
        isNull(events.recurringEventId),
        lte(events.startsAt, to),
        gte(events.endsAt, from),
      ),
    );

  // 2. 마스터 반복 이벤트 (이 범위에 인스턴스가 생길 수 있는 것)
  const masterEvents = await db
    .select()
    .from(events)
    .where(
      and(
        isNotNull(events.rrule),
        isNull(events.recurringEventId),
        lte(events.startsAt, to), // dtstart가 범위 시작보다 이전
      ),
    );

  if (masterEvents.length === 0) {
    return regularEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  // 3. 예외 이벤트 (삭제·수정된 인스턴스)
  const masterIds = masterEvents.map((e) => e.id);
  const exceptions = await db
    .select()
    .from(events)
    .where(and(isNotNull(events.recurringEventId), inArray(events.recurringEventId, masterIds)));

  // 4. 마스터별 인스턴스 전개
  const expandedInstances = masterEvents.flatMap((master) =>
    expandRecurringEvent(
      master,
      from,
      to,
      exceptions.filter((ex) => ex.recurringEventId === master.id),
    ),
  );

  return [...regularEvents, ...expandedInstances].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<NewEvent, "id">>,
): Promise<Event | null> {
  const rows = await db
    .update(events)
    .set(data)
    .where(eq(events.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}

// ── 반복 일정 CRUD ─────────────────────────────────────────────────────────

/** 단일 인스턴스 예외 생성 (이 이벤트만 수정) */
export async function createExceptionEvent(
  masterId: string,
  instanceDate: Date,
  data: NewEvent,
): Promise<void> {
  await db.insert(events).values({
    ...data,
    rrule: null,
    recurringEventId: masterId,
    exceptionDate: instanceDate,
    isDeleted: false,
  });
}

/** 단일 인스턴스 삭제 예외 생성 (이 이벤트만 삭제) */
export async function deleteExceptionInstance(
  masterId: string,
  instanceDate: Date,
): Promise<void> {
  await db.insert(events).values({
    id: Crypto.randomUUID(),
    title: "",
    isAllDay: false,
    startsAt: instanceDate,
    endsAt: instanceDate,
    note: null,
    categoryId: null,
    source: "local",
    externalId: null,
    reminderMinutes: null,
    rrule: null,
    recurringEventId: masterId,
    exceptionDate: instanceDate,
    isDeleted: true,
    updatedAt: new Date(),
  });
}

/** 모든 인스턴스 수정 (마스터 업데이트 + 예외 초기화) */
export async function editAllRecurring(
  masterId: string,
  data: Partial<Omit<NewEvent, "id">>,
): Promise<void> {
  await db.update(events).set({ ...data, updatedAt: new Date() }).where(eq(events.id, masterId));
  // 기존 예외 모두 삭제 — 새 데이터로 초기화
  await db.delete(events).where(eq(events.recurringEventId, masterId));
}

// UNTIL 문자열 생성 — 인스턴스 날짜 전날 23:59:59Z
function buildTruncatedRrule(rrule: string | null, instanceDate: Date): string {
  const dayBefore = new Date(instanceDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const y = dayBefore.getFullYear();
  const m = String(dayBefore.getMonth() + 1).padStart(2, "0");
  const d = String(dayBefore.getDate()).padStart(2, "0");
  return `${stripRRuleEnd(rrule ?? "FREQ=DAILY")};UNTIL=${y}${m}${d}T235959Z`;
}

/** 이 인스턴스 이후 수정 (마스터 UNTIL 설정 + 새 마스터 생성) */
export async function splitAndEditThisAndFollowing(
  masterId: string,
  instanceDate: Date,
  newData: NewEvent,
): Promise<void> {
  const master = await getEventById(masterId);
  if (!master) throw new Error("Master event not found");

  const truncatedRrule = buildTruncatedRrule(master.rrule, instanceDate);
  await db.update(events).set({ rrule: truncatedRrule, updatedAt: new Date() }).where(eq(events.id, masterId));

  // instanceDate 이후 예외도 삭제 (새 마스터에는 없음)
  await db.delete(events).where(
    and(eq(events.recurringEventId, masterId), gte(events.exceptionDate, instanceDate)),
  );

  // 새 마스터 생성
  await db.insert(events).values({
    ...newData,
    recurringEventId: null,
    exceptionDate: null,
    isDeleted: false,
  });
}

/** 이 인스턴스 이후 삭제 (마스터 UNTIL 설정) */
export async function deleteThisAndFollowing(
  masterId: string,
  instanceDate: Date,
): Promise<void> {
  const master = await getEventById(masterId);
  if (!master) return;
  const truncatedRrule = buildTruncatedRrule(master.rrule, instanceDate);
  await db.update(events).set({ rrule: truncatedRrule, updatedAt: new Date() }).where(eq(events.id, masterId));
  await db.delete(events).where(
    and(eq(events.recurringEventId, masterId), gte(events.exceptionDate, instanceDate)),
  );
}

/** 모든 인스턴스 삭제 (마스터 + 예외 모두) */
export async function deleteAllRecurring(masterId: string): Promise<void> {
  await db.delete(events).where(eq(events.recurringEventId, masterId));
  await db.delete(events).where(eq(events.id, masterId));
}
