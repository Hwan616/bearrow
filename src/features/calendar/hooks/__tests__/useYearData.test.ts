import { act, renderHook } from "@testing-library/react-native";

import { useYearData } from "../useYearData";

describe("useYearData", () => {
  it("initialYear 미지정 시 현재 연도를 사용한다", async () => {
    const { result } = await renderHook(() => useYearData());
    expect(result.current.year).toBe(new Date().getFullYear());
  });

  it("initialYear 파라미터가 반영된다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    expect(result.current.year).toBe(2025);
  });

  it("12개 월 데이터를 반환한다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    expect(result.current.months).toHaveLength(12);
  });

  it("각 month 인덱스가 0~11이다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    result.current.months.forEach(({ month }: { month: number }, i: number) => {
      expect(month).toBe(i);
    });
  });

  it("각 월의 grid가 28일 이상의 날짜 데이터를 포함한다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    result.current.months.forEach(({ grid }: { grid: unknown[] }) => {
      expect(grid.length).toBeGreaterThanOrEqual(28);
    });
  });

  it("goToPrevYear를 호출하면 연도가 1 감소한다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    await act(async () => {
      result.current.goToPrevYear();
    });
    expect(result.current.year).toBe(2024);
  });

  it("goToNextYear를 호출하면 연도가 1 증가한다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    await act(async () => {
      result.current.goToNextYear();
    });
    expect(result.current.year).toBe(2026);
  });

  it("연도 변경 후 months가 새 연도의 데이터로 갱신된다", async () => {
    const { result } = await renderHook(() => useYearData(2025));
    await act(async () => {
      result.current.goToNextYear();
    });
    // 2026년 2월 그리드에서 현재 월의 날짜 연도가 2026이어야 한다
    const febData = result.current.months.find((m) => m.month === 1)!;
    const thisMonthDays = febData.grid.filter((d) => d.isCurrentMonth);
    expect(thisMonthDays.length).toBeGreaterThan(0);
    expect(thisMonthDays[0]!.date.getFullYear()).toBe(2026);
  });
});
