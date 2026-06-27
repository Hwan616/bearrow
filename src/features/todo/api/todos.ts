import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";

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
  const rows = await db.update(todos).set(data).where(eq(todos.id, id)).returning();
  const row = rows[0];
  if (!row) throw new Error("할일을 찾을 수 없습니다");
  return row;
}

export async function deleteTodo(id: string): Promise<void> {
  await db.delete(todos).where(eq(todos.id, id));
}

// 마감일이 from~to 범위 내에 있는 할일 반환 (캘린더 연동용)
export async function getTodosByDueDateRange(from: Date, to: Date): Promise<Todo[]> {
  return db
    .select()
    .from(todos)
    .where(and(isNotNull(todos.dueDate), gte(todos.dueDate, from), lte(todos.dueDate, to)))
    .orderBy(asc(todos.dueDate), asc(todos.sortOrder));
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
