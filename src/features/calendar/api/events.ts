import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { events } from "@/db/schema";

import { type Event, type NewEvent } from "../types";

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

// 기간 내 이벤트 조회 — 범위와 겹치는 모든 이벤트 반환 (overlap)
// 조건: event.startsAt <= to AND event.endsAt >= from
export async function getEventsByDateRange(
  from: Date,
  to: Date,
): Promise<Event[]> {
  return db
    .select()
    .from(events)
    .where(and(lte(events.startsAt, to), gte(events.endsAt, from)));
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
