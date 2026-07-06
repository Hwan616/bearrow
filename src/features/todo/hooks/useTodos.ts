import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCategories } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";

import {
  createTodo,
  deleteTodo,
  getTodos,
  toggleTodo,
  updateSortOrders,
  updateTodo,
} from "../api/todos";
import type { Todo } from "../types";
import { groupTodosByCategory, type TodoSection } from "../utils/todoListUtils";

export type UseTodosReturn = {
  sections: TodoSection[];
  allTodos: Todo[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  handleToggle: (id: string, completed: boolean) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleCreate: (
    title: string,
    categoryId: string,
    note?: string,
    dueDate?: Date | null,
  ) => Promise<void>;
  handleUpdate: (
    id: string,
    title: string,
    categoryId: string,
    note?: string,
    dueDate?: Date | null,
  ) => Promise<void>;
  handleReorder: (orderedIds: string[]) => Promise<void>;
};

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ref로 최신 todos 참조 (handleCreate의 sortOrder 계산 시 stale closure 방지)
  const todosRef = useRef(todos);
  todosRef.current = todos;

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
    async (title: string, categoryId: string, note?: string, dueDate?: Date | null) => {
      const now = new Date();
      const nextSortOrder =
        todosRef.current.reduce((m, t) => Math.max(m, t.sortOrder), -1) + 1;
      await createTodo({
        id: Crypto.randomUUID(),
        title: title.trim(),
        note: note?.trim() || null,
        isCompleted: false,
        completedAt: null,
        dueDate: dueDate ?? null,
        categoryId,
        sortOrder: nextSortOrder,
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [refresh],
  );

  const handleUpdate = useCallback(
    async (id: string, title: string, categoryId: string, note?: string, dueDate?: Date | null) => {
      await updateTodo(id, {
        title: title.trim(),
        categoryId,
        note: note?.trim() || null,
        dueDate: dueDate ?? null,
        updatedAt: new Date(),
      });
      await refresh();
    },
    [refresh],
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      await updateSortOrders(orderedIds);
      await refresh();
    },
    [refresh],
  );

  const sections = groupTodosByCategory(todos, categories);

  return {
    sections,
    allTodos: todos,
    isLoading,
    refresh,
    handleToggle,
    handleDelete,
    handleCreate,
    handleUpdate,
    handleReorder,
  };
}
