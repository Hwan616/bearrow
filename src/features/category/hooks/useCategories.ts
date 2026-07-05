import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useState } from "react";

import { createCategory, deleteCategory, getCategories, updateCategory } from "../api/categories";
import type { Category } from "../types";

export type UseCategoriesReturn = {
  categories: Category[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  handleCreate: (name: string, color: string) => Promise<void>;
  handleUpdate: (id: string, name: string, color: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
};

export function useCategories(): UseCategoriesReturn {
  const [cats, setCats] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getCategories();
    setCats(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(
    async (name: string, color: string) => {
      const now = new Date();
      await createCategory({
        id: Crypto.randomUUID(),
        name: name.trim() || "카테고리",
        color,
        sortOrder: cats.length,
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [cats.length, refresh],
  );

  const handleUpdate = useCallback(
    async (id: string, name: string, color: string) => {
      await updateCategory(id, { name: name.trim() || "카테고리", color, updatedAt: new Date() });
      await refresh();
    },
    [refresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteCategory(id);
      await refresh();
    },
    [refresh],
  );

  return { categories: cats, isLoading, refresh, handleCreate, handleUpdate, handleDelete };
}
