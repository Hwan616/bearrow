import { and, asc, eq, gte, lte } from "drizzle-orm";
import * as Crypto from "expo-crypto";

import { db } from "@/db/client";
import { todos } from "@/db/schema";

import type { NewTodo, Todo } from "../types";

export async function createTodo(data: NewTodo): Promise<Todo> {
  const rows = await db.insert(todos).values(data).returning();
  const row = rows[0];
  if (!row) throw new Error("할일 생성 실패");
  return row;
}

// 미완료 우선, sortOrder → createdAt 순 정렬
export async function getTodos(): Promise<Todo[]> {
  return db
    .select()
    .from(todos)
    .orderBy(asc(todos.isCompleted), asc(todos.sortOrder), asc(todos.createdAt));
}

export async function updateTodo(
  id: string,
  data: Partial<Omit<NewTodo, "id">>,
): Promise<Todo> {
  const updates: Partial<Omit<NewTodo, "id">> = { ...data };
  // dueDate가 변경될 때 assignedDate·hasDueTime 자동 동기화
  if ("dueDate" in data) {
    if (data.dueDate != null) {
      updates.assignedDate = data.dueDate;
      updates.hasDueTime = true;
    } else {
      updates.hasDueTime = false;
    }
  }
  const rows = await db.update(todos).set(updates).where(eq(todos.id, id)).returning();
  const row = rows[0];
  if (!row) throw new Error("할일을 찾을 수 없습니다");
  return row;
}

export async function deleteTodo(id: string): Promise<void> {
  await db.delete(todos).where(eq(todos.id, id));
}

// assigned_date 범위 내 할일 반환 (캘린더 연동용) — 모든 할일이 assignedDate를 가짐
export async function getTodosByDueDateRange(from: Date, to: Date): Promise<Todo[]> {
  return db
    .select()
    .from(todos)
    .where(and(gte(todos.assignedDate, from), lte(todos.assignedDate, to)))
    .orderBy(asc(todos.assignedDate), asc(todos.sortOrder));
}

// 이벤트에서 할일 파생 — title·마감일·eventId를 이벤트에서 채운다 (FR-INT-004)
export async function createTodoFromEvent(
  event: { id: string; title: string; startsAt: Date },
  now: Date = new Date(),
): Promise<Todo> {
  const dueDate = new Date(event.startsAt);
  dueDate.setHours(0, 0, 0, 0);

  return createTodo({
    id: Crypto.randomUUID(),
    title: event.title,
    note: null,
    isCompleted: false,
    completedAt: null,
    dueDate,
    assignedDate: dueDate,
    hasDueTime: false,
    categoryId: null,
    eventId: event.id,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });
}

// 순서 일괄 업데이트 — orderedIds 배열의 순서를 sortOrder 0, 1, 2… 로 저장
export async function updateSortOrders(orderedIds: string[]): Promise<void> {
  const now = new Date();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(todos).set({ sortOrder: index, updatedAt: now }).where(eq(todos.id, id)),
    ),
  );
}

// 완료 상태 전환 — completed=true이면 completedAt을 현재 시각으로, false이면 null로
export async function toggleTodo(
  id: string,
  completed: boolean,
  now: Date = new Date(),
): Promise<Todo> {
  return updateTodo(id, {
    isCompleted: completed,
    completedAt: completed ? now : null,
  });
}
