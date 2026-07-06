import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCategories } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";

import {
  createTodo,
  deleteTodo,
  getTodosByDate,
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
  handleCreate: (title: string, categoryId: string, note?: string) => Promise<void>;
  handleUpdate: (id: string, title: string, categoryId: string, note?: string) => Promise<void>;
  handleReorder: (orderedIds: string[]) => Promise<void>;
};

export function useTodos(selectedDate: Date): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const todosRef = useRef(todos);
  todosRef.current = todos;

  const refresh = useCallback(async () => {
    const [t, c] = await Promise.all([getTodosByDate(selectedDate), getCategories()]);
    setTodos(t);
    setCategories(c);
    setIsLoading(false);
  }, [selectedDate]);

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
    async (title: string, categoryId: string, note?: string) => {
      const now = new Date();
      const assignedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0, 0, 0, 0,
      );
      const nextSortOrder =
        todosRef.current.reduce((m, t) => Math.max(m, t.sortOrder), -1) + 1;
      await createTodo({
        id: Crypto.randomUUID(),
        title: title.trim(),
        note: note?.trim() || null,
        isCompleted: false,
        completedAt: null,
        dueDate: null,
        assignedDate,
        hasDueTime: false,
        categoryId,
        sortOrder: nextSortOrder,
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [refresh, selectedDate],
  );

  const handleUpdate = useCallback(
    async (id: string, title: string, categoryId: string, note?: string) => {
      await updateTodo(id, {
        title: title.trim(),
        categoryId,
        note: note?.trim() || null,
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
