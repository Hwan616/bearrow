import type { SupabaseClient } from "@supabase/supabase-js";
import type { SQLiteBindValue } from "expo-sqlite";

import { sqliteDb } from "@/db/client";

import { getSyncMeta, setSyncMeta } from "./queue";

// 서버에서 받아오는 각 엔티티 행 타입 (user_id는 RLS용, 로컬에는 저장 안 함)
type ServerEventRow = {
  id: string; title: string; note: string | null; is_all_day: number;
  starts_at: number; ends_at: number; category_id: string | null;
  source: string; external_id: string | null; updated_at: number;
  rrule: string | null; recurring_event_id: string | null;
  exception_date: number | null; is_deleted: number; reminder_minutes: number | null;
};

type ServerTodoRow = {
  id: string; title: string; note: string | null; is_completed: number;
  completed_at: number | null; due_date: number | null; category_id: string | null;
  event_id: string | null; sort_order: number; created_at: number; updated_at: number;
  assigned_date: number; has_due_time: number;
};

type ServerCategoryRow = {
  id: string; name: string; color: string;
  sort_order: number; created_at: number; updated_at: number;
};

async function getLocalUpdatedAt(table: string, id: string): Promise<number | null> {
  const row = await sqliteDb.getFirstAsync<{ updated_at: number }>(
    `SELECT updated_at FROM ${table} WHERE id = ?`,
    [id],
  );
  return row?.updated_at ?? null;
}

async function applyServerEvent(row: ServerEventRow): Promise<boolean> {
  const localAt = await getLocalUpdatedAt("events", row.id);
  if (localAt !== null && localAt >= row.updated_at) return false;

  const vals: SQLiteBindValue[] = [
    row.id, row.title, row.note, row.is_all_day,
    row.starts_at, row.ends_at, row.category_id, row.source,
    row.external_id, row.updated_at, row.rrule, row.recurring_event_id,
    row.exception_date, row.is_deleted, row.reminder_minutes,
  ];
  await sqliteDb.runAsync(
    `INSERT OR REPLACE INTO events
       (id, title, note, is_all_day, starts_at, ends_at, category_id, source,
        external_id, updated_at, rrule, recurring_event_id, exception_date, is_deleted, reminder_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    vals,
  );
  return true;
}

async function applyServerTodo(row: ServerTodoRow): Promise<boolean> {
  const localAt = await getLocalUpdatedAt("todos", row.id);
  if (localAt !== null && localAt >= row.updated_at) return false;

  const vals: SQLiteBindValue[] = [
    row.id, row.title, row.note, row.is_completed,
    row.completed_at, row.due_date, row.category_id,
    row.event_id, row.sort_order, row.created_at, row.updated_at,
    row.assigned_date, row.has_due_time,
  ];
  await sqliteDb.runAsync(
    `INSERT OR REPLACE INTO todos
       (id, title, note, is_completed, completed_at, due_date, category_id,
        event_id, sort_order, created_at, updated_at, assigned_date, has_due_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    vals,
  );
  return true;
}

async function applyServerCategory(row: ServerCategoryRow): Promise<boolean> {
  const localAt = await getLocalUpdatedAt("categories", row.id);
  if (localAt !== null && localAt >= row.updated_at) return false;

  const vals: SQLiteBindValue[] = [
    row.id, row.name, row.color, row.sort_order, row.created_at, row.updated_at,
  ];
  await sqliteDb.runAsync(
    `INSERT OR REPLACE INTO categories (id, name, color, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    vals,
  );
  return true;
}

// Supabase 에서 변경분을 가져와 로컬에 반영한다.
// last_pulled_at_* sync_meta 키를 기준으로 증분 pull 한다.
export async function pullChanges(client: SupabaseClient): Promise<{ pulled: number }> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { pulled: 0 };

  const nowMs = Date.now().toString();
  let pulled = 0;

  async function pullEntity<T extends { updated_at: number }>(
    metaKey: string,
    table: string,
    apply: (row: T) => Promise<boolean>,
  ) {
    const lastPulledAt = await getSyncMeta(metaKey);
    let query: any = client.from(table).select("*").eq("user_id", user!.id); // noqa
    if (lastPulledAt) query = query.gt("updated_at", parseInt(lastPulledAt, 10));

    const { data: rows, error } = await query;
    if (error || !rows) return;

    for (const row of rows as T[]) {
      if (await apply(row)) pulled++;
    }
    await setSyncMeta(metaKey, nowMs);
  }

  await pullEntity<ServerEventRow>("last_pulled_at_events", "events", applyServerEvent);
  await pullEntity<ServerTodoRow>("last_pulled_at_todos", "todos", applyServerTodo);
  await pullEntity<ServerCategoryRow>("last_pulled_at_categories", "categories", applyServerCategory);

  return { pulled };
}
