import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      background: { primary: "#fff", secondary: "#f8f9fa", tertiary: "#f1f3f5" },
      surface: { default: "#fff", raised: "#fff", overlay: "rgba(0,0,0,0.4)" },
      text: {
        primary: "#212529",
        secondary: "#6c757d",
        disabled: "#ced4da",
        inverse: "#fff",
      },
      border: { default: "#e9ecef", strong: "#ced4da" },
      accent: { primary: "#2e5aac", primaryLight: "#ebf0fb", primaryDark: "#1c3c75" },
      status: { error: "#d93535", success: "#4caf50", warning: "#ff9800" },
    },
  }),
}));

jest.mock("@/features/settings/AppSettingsContext", () => ({
  useAppSettings: () => ({ showHolidays: false }),
}));

const mockUseMonthItems = jest.fn();
jest.mock("../../hooks/useMonthItems", () => ({
  useMonthItems: (...args: unknown[]) => mockUseMonthItems(...args),
}));

jest.mock("../../utils/koreanHolidays", () => ({
  getHolidaysForMonth: () => new Map<number, string>(),
}));

jest.mock("../YearMonthPicker", () => ({
  YearMonthPicker: () => null,
}));

// eslint-disable-next-line import/first
import { MonthView } from "../MonthView";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-06T00:00:00.000");
NOW.setHours(0, 0, 0, 0);

const defaultItems = {
  events: [],
  dueTodos: [],
  categories: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

const MOCK_EVENT = {
  id: "evt-1",
  title: "회의",
  isAllDay: false,
  startsAt: new Date("2026-07-06T09:00:00"),
  endsAt: new Date("2026-07-07T10:00:00"),
  categoryId: null,
  source: "local" as const,
  note: null,
  externalId: null,
  reminderMinutes: null,
  rrule: null,
  recurringEventId: null,
  exceptionDate: null,
  isDeleted: false,
  updatedAt: NOW,
};

const MOCK_TODO_INCOMPLETE = {
  id: "todo-1",
  title: "할일",
  isCompleted: false,
  completedAt: null,
  dueDate: new Date("2026-07-05T00:00:00"),
  categoryId: null,
  note: null,
  eventId: null,
  sortOrder: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_TODO_COMPLETE = {
  ...MOCK_TODO_INCOMPLETE,
  id: "todo-2",
  isCompleted: true,
  completedAt: NOW,
};

// ── 테스트 ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseMonthItems.mockReturnValue(defaultItems);
});

describe("MonthView", () => {
  it("month-grid가 렌더된다", async () => {
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    expect(screen.getByTestId("month-grid")).toBeTruthy();
  });

  it("날짜를 탭하면 onDayPress가 호출된다", async () => {
    const onDayPress = jest.fn();
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} onDayPress={onDayPress} />);
    });
    fireEvent.press(screen.getByLabelText("2026년 7월 1일"));
    expect(onDayPress).toHaveBeenCalledWith(expect.any(Date));
    const calledDate: Date = onDayPress.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(1);
    expect(calledDate.getMonth()).toBe(6);
    expect(calledDate.getFullYear()).toBe(2026);
  });

  it("미완료 할일이 있는 날짜에 카운트 배지가 표시된다", async () => {
    mockUseMonthItems.mockReturnValue({
      ...defaultItems,
      dueTodos: [MOCK_TODO_INCOMPLETE],
    });
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    // MOCK_TODO_INCOMPLETE.dueDate = July 5 2026 → month index 6
    expect(screen.getByTestId("todo-count-2026-6-5")).toBeTruthy();
  });

  it("완료된 할일은 카운트 배지에서 제외된다", async () => {
    mockUseMonthItems.mockReturnValue({
      ...defaultItems,
      dueTodos: [MOCK_TODO_COMPLETE],
    });
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    expect(screen.queryByTestId("todo-count-2026-6-5")).toBeNull();
  });

  it("이벤트가 있으면 이벤트 바가 렌더된다", async () => {
    mockUseMonthItems.mockReturnValue({
      ...defaultItems,
      events: [MOCK_EVENT],
    });
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    // event bar for evt-1 should appear; use getAllByTestId for safety (multi-week events)
    const bars = screen.getAllByTestId("event-bar-evt-1");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("이벤트 바에 제목이 표시된다", async () => {
    mockUseMonthItems.mockReturnValue({
      ...defaultItems,
      events: [MOCK_EVENT],
    });
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    expect(screen.queryByText("회의")).toBeTruthy();
  });

  it("카테고리 색상이 있는 이벤트 바가 카테고리 색상을 사용한다", async () => {
    mockUseMonthItems.mockReturnValue({
      ...defaultItems,
      events: [{ ...MOCK_EVENT, categoryId: "cat-1" }],
      categories: [{ id: "cat-1", name: "업무", color: "#E74C3C", sortOrder: 0, createdAt: NOW, updatedAt: NOW }],
    });
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    const bars = screen.getAllByTestId("event-bar-evt-1");
    expect(bars.length).toBeGreaterThan(0);
    // bar should have the category color as background
    expect(bars[0]!.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: "#E74C3C" })]),
    );
  });

  it("이전 달 버튼을 누르면 월이 변경된다", async () => {
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText("이전 달"));
    });
    expect(screen.getByText("2026년 6월")).toBeTruthy();
  });

  it("다음 달 버튼을 누르면 월이 변경된다", async () => {
    await act(async () => {
      render(<MonthView initialDate={new Date(2026, 6, 1)} />);
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText("다음 달"));
    });
    expect(screen.getByText("2026년 8월")).toBeTruthy();
  });
});
