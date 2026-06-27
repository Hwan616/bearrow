import { useEffect, useState } from "react";

import { getTodosByDueDateRange } from "@/features/todo/api/todos";
import type { Todo } from "@/features/todo/types";

import { getEventsByDateRange } from "../api/events";
import type { Event } from "../types";

export interface UseDayItemsResult {
  events: Event[];
  todos: Todo[];
  isLoading: boolean;
}

export function useDayItems(date: Date): UseDayItemsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    Promise.all([getEventsByDateRange(from, to), getTodosByDueDateRange(from, to)])
      .then(([evts, tdos]) => {
        if (!cancelled) {
          setEvents(evts);
          setTodos(tdos);
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
  }, [dateKey]);

  return { events, todos, isLoading };
}
