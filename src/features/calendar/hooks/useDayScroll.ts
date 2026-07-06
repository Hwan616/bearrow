import { useMemo, useState } from "react";

export interface UseDayScrollResult {
  dates: Date[];
  initialIndex: number;
  visibleDate: Date;
  onVisibleDateChange: (date: Date) => void;
}

/**
 * 멀티-데이 연속 스크롤용 날짜 배열과 현재 보이는 날짜를 관리한다.
 * @param initialDate  처음 보여줄 날짜
 * @param windowDays   전후 포함 총 날짜 수 (홀수 권장, 기본 61 = ±30일)
 */
export function useDayScroll(
  initialDate: Date,
  windowDays = 61,
): UseDayScrollResult {
  const [visibleDate, onVisibleDateChange] = useState(() => {
    const d = new Date(initialDate);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dates = useMemo(() => {
    const center = new Date(initialDate);
    center.setHours(0, 0, 0, 0);
    const half = Math.floor(windowDays / 2);
    return Array.from({ length: windowDays }, (_, i) => {
      const d = new Date(center);
      d.setDate(center.getDate() + (i - half));
      return d;
    });
  }, [initialDate, windowDays]);

  const initialIndex = Math.floor(windowDays / 2);

  return { dates, initialIndex, visibleDate, onVisibleDateChange };
}
