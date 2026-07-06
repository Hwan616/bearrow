import { act, renderHook } from "@testing-library/react-native";

import { useDayScroll } from "../useDayScroll";

const BASE_DATE = new Date("2026-07-06T09:00:00");

describe("useDayScroll", () => {
  it("기본 windowDays(61)만큼의 날짜를 반환한다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE));
    expect(result.current.dates).toHaveLength(61);
  });

  it("windowDays 파라미터가 반영된다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE, 11));
    expect(result.current.dates).toHaveLength(11);
  });

  it("initialIndex는 배열 중앙을 가리킨다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE, 61));
    expect(result.current.initialIndex).toBe(30);
  });

  it("dates[initialIndex]의 날짜가 initialDate와 같다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE, 61));
    const { dates, initialIndex } = result.current;
    const center = dates[initialIndex]!;
    expect(center.getFullYear()).toBe(BASE_DATE.getFullYear());
    expect(center.getMonth()).toBe(BASE_DATE.getMonth());
    expect(center.getDate()).toBe(BASE_DATE.getDate());
  });

  it("dates 배열이 오름차순 정렬되어 있다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE, 61));
    const { dates } = result.current;
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]!.getTime()).toBeGreaterThan(dates[i - 1]!.getTime());
    }
  });

  it("visibleDate 초기값이 initialDate와 같은 날이다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE));
    const { visibleDate } = result.current;
    expect(visibleDate.getFullYear()).toBe(BASE_DATE.getFullYear());
    expect(visibleDate.getMonth()).toBe(BASE_DATE.getMonth());
    expect(visibleDate.getDate()).toBe(BASE_DATE.getDate());
  });

  it("onVisibleDateChange를 호출하면 visibleDate가 갱신된다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE));
    const newDate = new Date("2026-07-10T00:00:00");
    await act(async () => {
      result.current.onVisibleDateChange(newDate);
    });
    expect(result.current.visibleDate.getDate()).toBe(10);
  });

  it("dates[0]는 initialDate에서 windowDays/2일 이전이다", async () => {
    const { result } = await renderHook(() => useDayScroll(BASE_DATE, 61));
    const first = result.current.dates[0]!;
    const expectedFirst = new Date(BASE_DATE);
    expectedFirst.setDate(BASE_DATE.getDate() - 30);
    expectedFirst.setHours(0, 0, 0, 0);
    expect(first.toDateString()).toBe(expectedFirst.toDateString());
  });
});
