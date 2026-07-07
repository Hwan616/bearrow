import { useEffect, useState } from "react";

import { getCategories } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";
import { getTodosByDueDateRange } from "@/features/todo/api/todos";
import type { Todo } from "@/features/todo/types";

import { getEventsByDateRange } from "../api/events";
import type { Event } from "../types";

export interface UseDayItemsResult {
  events: Event[];
  todos: Todo[];
  categories: Category[];
  isLoading: boolean;
  refresh: () => void;
}

export function useDayItems(date: Date): UseDayItemsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    Promise.all([
      getEventsByDateRange(from, to),
      getTodosByDueDateRange(from, to),
      getCategories(),
    ])
      .then(([evts, tdos, cats]) => {
        if (!cancelled) {
          setEvents(evts);
          setTodos(tdos);
          setCategories(cats);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, version]);

  return { events, todos, categories, isLoading, refresh: () => setVersion((v) => v + 1) };
}
