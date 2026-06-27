import { and, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { events } from "@/db/schema";

import { type Event, type NewEvent } from "../types";
import { expandRecurringEvent } from "../utils/rruleUtils";

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
