import { useEffect, useState } from "react";

import { getTodosByDueDateRange } from "@/features/todo/api/todos";
import type { Todo } from "@/features/todo/types";

import { getEventsByDateRange } from "../api/events";
import type { Event } from "../types";
import { getMonthDateRange } from "../utils/calendarUtils";

export interface UseMonthItemsResult {
  events: Event[];
  dueTodos: Todo[];       // 해당 월에 마감일이 있는 할일
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMonthItems(year: number, month: number): UseMonthItemsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [dueTodos, setDueTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const { from, to } = getMonthDateRange(year, month);
    Promise.all([getEventsByDateRange(from, to), getTodosByDueDateRange(from, to)])
      .then(([evts, todos]) => {
        if (!cancelled) {
          setEvents(evts);
          setDueTodos(todos);
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
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
