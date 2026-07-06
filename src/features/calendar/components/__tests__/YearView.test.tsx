import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      background: { primary: "#fff", secondary: "#f8f9fa", tertiary: "#f1f3f5" },
      surface: { default: "#fff", raised: "#fff", overlay: "rgba(0,0,0,0.4)" },
      text: { primary: "#212529", secondary: "#6c757d", disabled: "#ced4da", inverse: "#fff" },
      border: { default: "#e9ecef", strong: "#ced4da" },
      accent: { primary: "#2e5aac", primaryLight: "#ebf0fb", primaryDark: "#1c3c75" },
      status: { error: "#d93535", success: "#4caf50", warning: "#ff9800" },
    },
  }),
}));

// eslint-disable-next-line import/first
import { YearView } from "../YearView";

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("YearView", () => {
  it("12개 월 버튼이 렌더된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`year-month-${i}`)).toBeTruthy();
    }
  });

  it("연도 타이틀이 표시된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    expect(screen.getByText("2025년")).toBeTruthy();
  });

  it("월을 탭하면 onMonthPress(year, month)가 호출된다", async () => {
    const onMonthPress = jest.fn();
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={onMonthPress} />);
    });
    fireEvent.press(screen.getByTestId("year-month-3")); // 4월
    expect(onMonthPress).toHaveBeenCalledWith(2025, 3);
  });

  it("이전 연도 버튼을 누르면 연도가 변경된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-prev-year"));
    });
    expect(screen.getByText("2024년")).toBeTruthy();
  });

  it("다음 연도 버튼을 누르면 연도가 변경된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-next-year"));
    });
    expect(screen.getByText("2026년")).toBeTruthy();
  });

  it("연도 변경 후 onMonthPress가 새 연도로 호출된다", async () => {
    const onMonthPress = jest.fn();
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={onMonthPress} />);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-next-year"));
    });
    fireEvent.press(screen.getByTestId("year-month-0")); // 2026년 1월
    expect(onMonthPress).toHaveBeenCalledWith(2026, 0);
  });
});
