import { useEffect, useState } from "react";

import { getCategories } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";
import { getTodosByDueDateRange } from "@/features/todo/api/todos";
import type { Todo } from "@/features/todo/types";

import { getEventsByDateRange } from "../api/events";
import type { Event } from "../types";
import { getMonthDateRange } from "../utils/calendarUtils";

export interface UseMonthItemsResult {
  events: Event[];
  dueTodos: Todo[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMonthItems(year: number, month: number): UseMonthItemsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [dueTodos, setDueTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const { from, to } = getMonthDateRange(year, month);
    Promise.all([
      getEventsByDateRange(from, to),
      getTodosByDueDateRange(from, to),
      getCategories(),
    ])
      .then(([evts, todos, cats]) => {
        if (!cancelled) {
          setEvents(evts);
          setDueTodos(todos);
          setCategories(cats);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, month, tick]);

  return {
    events,
    dueTodos,
    categories,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
