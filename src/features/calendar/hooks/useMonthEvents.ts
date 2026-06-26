import { useEffect, useState } from "react";

import { getEventsByDateRange } from "../api/events";
import { type Event } from "../types";
import { getMonthDateRange } from "../utils/calendarUtils";

export interface UseMonthEventsResult {
  events: Event[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMonthEvents(
  year: number,
  month: number,
): UseMonthEventsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const { from, to } = getMonthDateRange(year, month);
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
  }, [year, month, tick]);

  return {
    events,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
