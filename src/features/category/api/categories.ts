import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { categories, events, todos } from "@/db/schema";

import type { Category, NewCategory } from "../types";

export async function createCategory(data: NewCategory): Promise<Category> {
  const rows = await db.insert(categories).values(data).returning();
  const row = rows[0];
  if (!row) throw new Error("카테고리 생성 실패");
  return row;
}

export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<NewCategory, "id">>,
): Promise<Category> {
  const rows = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new Error("카테고리를 찾을 수 없습니다");
  return row;
}

export async function deleteCategory(id: string): Promise<void> {
  // 연결된 이벤트·할일의 categoryId 초기화 후 카테고리 삭제
  await db.update(events).set({ categoryId: null }).where(eq(events.categoryId, id));
  await db.update(todos).set({ categoryId: null }).where(eq(todos.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}

// orderedIds 배열 순서로 sortOrder 재설정 (0, 1, 2, ...)
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(categories).set({ sortOrder: index }).where(eq(categories.id, id)),
    ),
  );
}
