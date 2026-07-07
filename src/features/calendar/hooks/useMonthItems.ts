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

// 월별 마지막 조회 결과 캐시 — 재방문(빠른 스크롤 왕복) 시 즉시 렌더해
// 빈 화면 깜빡임을 제거한다. 백그라운드 재조회로 항상 최신값으로 갱신.
interface MonthCacheEntry {
  events: Event[];
  dueTodos: Todo[];
  categories: Category[];
}
const monthCache = new Map<string, MonthCacheEntry>();

/** 이벤트·투두·카테고리 변경 후 호출 — 캐시를 비워 다음 렌더가 최신값을 반영하게 한다. */
export function invalidateMonthItemsCache(): void {
  monthCache.clear();
}

export function useMonthItems(year: number, month: number): UseMonthItemsResult {
  const cacheKey = `${year}-${month}`;
  const cached = monthCache.get(cacheKey);

  const [events, setEvents] = useState<Event[]>(cached?.events ?? []);
  const [dueTodos, setDueTodos] = useState<Todo[]>(cached?.dueTodos ?? []);
  const [categories, setCategories] = useState<Category[]>(cached?.categories ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const key = `${year}-${month}`;
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
          monthCache.set(key, { events: evts, dueTodos: todos, categories: cats });
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
