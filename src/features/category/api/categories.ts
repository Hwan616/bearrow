import * as Crypto from "expo-crypto";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { categories, events, todos } from "@/db/schema";

import type { Category, CategoryScope, NewCategory } from "../types";

export async function createCategory(data: NewCategory): Promise<Category> {
  const rows = await db.insert(categories).values(data).returning();
  const row = rows[0];
  if (!row) throw new Error("카테고리 생성 실패");
  return row;
}

export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoriesByScope(scope: CategoryScope): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.scope, scope))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
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
  const target = all.find((c) => c.id === id);
  if (!target) throw new Error("카테고리를 찾을 수 없습니다");

  const sameScope = all.filter((c) => c.scope === target.scope);
  if (sameScope.length <= 1) throw new Error("마지막 카테고리는 삭제할 수 없습니다");

  const fallback = sameScope.find((c) => c.id !== id);
  if (!fallback) throw new Error("재배정할 카테고리가 없습니다");

  if (target.scope === "event") {
    await db.update(events).set({ categoryId: fallback.id }).where(eq(events.categoryId, id));
  } else {
    await db.update(todos).set({ categoryId: fallback.id }).where(eq(todos.categoryId, id));
  }
  await db.delete(categories).where(eq(categories.id, id));
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(categories).set({ sortOrder: index }).where(eq(categories.id, id)),
    ),
  );
}

export async function ensureDefaultCategoriesExist(): Promise<void> {
  const existing = await getCategories();
  const now = new Date();
  const hasEvent = existing.some((c) => c.scope === "event");
  const hasTodo = existing.some((c) => c.scope === "todo");

  if (!hasEvent) {
    await createCategory({
      id: Crypto.randomUUID(),
      name: "일상",
      color: "#2F80FF",
      scope: "event",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (!hasTodo) {
    await createCategory({
      id: Crypto.randomUUID(),
      name: "할일",
      color: "#2DE84D",
      scope: "todo",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/** @deprecated use ensureDefaultCategoriesExist */
export const ensureDefaultCategory = ensureDefaultCategoriesExist;
