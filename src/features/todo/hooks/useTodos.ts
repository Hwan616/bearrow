import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useState } from "react";

import { getCategories } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";

import { createTodo, deleteTodo, getTodos, toggleTodo, updateTodo } from "../api/todos";
import type { Todo } from "../types";
import { groupTodosByCategory, type TodoSection } from "../utils/todoListUtils";

export type UseTodosReturn = {
  sections: TodoSection[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  handleToggle: (id: string, completed: boolean) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleCreate: (title: string, categoryId: string | null, note?: string, dueDate?: Date | null) => Promise<void>;
  handleUpdateDueDate: (id: string, dueDate: Date | null) => Promise<void>;
};

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [t, c] = await Promise.all([getTodos(), getCategories()]);
    setTodos(t);
    setCategories(c);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggle = useCallback(
    async (id: string, completed: boolean) => {
      await toggleTodo(id, completed);
      await refresh();
    },
    [refresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTodo(id);
      await refresh();
    },
    [refresh],
  );

  const handleCreate = useCallback(
    async (title: string, categoryId: string | null, note?: string, dueDate?: Date | null) => {
      const now = new Date();
      await createTodo({
        id: Crypto.randomUUID(),
        title: title.trim(),
        note: note?.trim() || null,
        isCompleted: false,
        completedAt: null,
        dueDate: dueDate ?? null,
        categoryId,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [refresh],
  );

  const handleUpdateDueDate = useCallback(
    async (id: string, dueDate: Date | null) => {
      await updateTodo(id, { dueDate, updatedAt: new Date() });
      await refresh();
    },
    [refresh],
  );

  const sections = groupTodosByCategory(todos, categories);

  return { sections, isLoading, refresh, handleToggle, handleDelete, handleCreate, handleUpdateDueDate };
}
