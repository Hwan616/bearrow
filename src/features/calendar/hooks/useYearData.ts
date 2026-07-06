import { useMemo, useState } from "react";

import { buildMonthGrid, type CalendarDay } from "../utils/calendarUtils";

export interface MonthGridData {
  month: number;
  grid: CalendarDay[];
}

export function useYearData(initialYear?: number) {
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());

  const months: MonthGridData[] = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => ({
        month: m,
        grid: buildMonthGrid(year, m),
      })),
    [year],
  );

  return {
    year,
    months,
    goToPrevYear: () => setYear((y) => y - 1),
    goToNextYear: () => setYear((y) => y + 1),
  };
}
