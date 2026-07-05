import * as Crypto from "expo-crypto";
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
  const all = await getCategories();
  if (all.length <= 1) throw new Error("마지막 카테고리는 삭제할 수 없습니다");

  // 삭제 후 남을 카테고리 중 첫 번째로 할일·일정 재배정
  const fallback = all.find((c) => c.id !== id);
  if (!fallback) throw new Error("재배정할 카테고리가 없습니다");

  await db.update(events).set({ categoryId: fallback.id }).where(eq(events.categoryId, id));
  await db.update(todos).set({ categoryId: fallback.id }).where(eq(todos.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(categories).set({ sortOrder: index }).where(eq(categories.id, id)),
    ),
  );
}

// 카테고리가 하나도 없으면 기본 카테고리('카테고리')를 생성한다.
export async function ensureDefaultCategory(): Promise<void> {
  const existing = await getCategories();
  if (existing.length === 0) {
    const now = new Date();
    await createCategory({
      id: Crypto.randomUUID(),
      name: "카테고리",
      color: "#2E5AAC",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
}
