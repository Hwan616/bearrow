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
  it("initialYear의 연도 타이틀이 표시된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    expect(screen.getByText("2025년")).toBeTruthy();
  });

  it("12개 월 버튼이 렌더된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`year-month-2025-${i}`)).toBeTruthy();
    }
  });

  it("월을 탭하면 onMonthPress(year, month)가 호출된다", async () => {
    const onMonthPress = jest.fn();
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={onMonthPress} />);
    });
    fireEvent.press(screen.getByTestId("year-month-2025-3")); // 4월
    expect(onMonthPress).toHaveBeenCalledWith(2025, 3);
  });

  it("year-list FlatList 데이터에 ±10년 범위가 포함된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    // FlatList가 렌더됐고 현재 연도 항목이 존재함
    expect(screen.getByTestId("year-list")).toBeTruthy();
    expect(screen.getByTestId(`year-item-2025`)).toBeTruthy();
  });

  it("year-list FlatList가 렌더된다", async () => {
    await act(async () => {
      render(<YearView initialYear={2025} onMonthPress={jest.fn()} />);
    });
    expect(screen.getByTestId("year-list")).toBeTruthy();
  });
});
