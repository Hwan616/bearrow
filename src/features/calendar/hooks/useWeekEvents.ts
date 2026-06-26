import { useEffect, useMemo, useState } from "react";

import { getEventsByDateRange } from "../api/events";
import { type Event } from "../types";
import { getWeekDateRange } from "../utils/timeGridUtils";

export interface UseWeekEventsResult {
  events: Event[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWeekEvents(weekDate: Date): UseWeekEventsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  // 주의 시작일(일요일) ISO 문자열을 key로 — Date 객체 참조 비교 문제 방지
  const weekKey = useMemo(() => {
    const { from } = getWeekDateRange(weekDate);
    return from.toISOString().slice(0, 10);
  }, [weekDate]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const { from, to } = getWeekDateRange(weekDate);
    getEventsByDateRange(from, to)
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
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
    // weekKey가 변경될 때(= 다른 주로 이동)만 재조회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, tick]);

  return {
    events,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
