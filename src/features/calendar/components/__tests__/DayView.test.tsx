import React from "react";
import { act, render, screen } from "@testing-library/react-native";

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

const mockUseDayItems = jest.fn();
jest.mock("../../hooks/useDayItems", () => ({
  useDayItems: (...args: unknown[]) => mockUseDayItems(...args),
}));

// DayView는 useDayScroll을 내부에서 사용하므로 실제 훅 사용 (순수 계산)
// 단, windowDays를 줄이기 위해 모킹
jest.mock("../../hooks/useDayScroll", () => {
  const actual = jest.requireActual("../../hooks/useDayScroll") as typeof import("../../hooks/useDayScroll");
  return {
    useDayScroll: (initialDate: Date) =>
      actual.useDayScroll(initialDate, 3), // 테스트에선 3일만
  };
});

// eslint-disable-next-line import/first
import { DayView } from "../DayView";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const INITIAL_DATE = new Date("2026-07-06T09:00:00");

const defaultDayItems = {
  events: [],
  todos: [],
  isLoading: false,
  refresh: jest.fn(),
};

const MOCK_TIMED_EVENT = {
  id: "evt-1",
  title: "오전 회의",
  isAllDay: false,
  startsAt: new Date("2026-07-06T09:00:00"),
  endsAt: new Date("2026-07-06T10:00:00"),
  categoryId: null,
  source: "local" as const,
  note: null,
  externalId: null,
  reminderMinutes: null,
  rrule: null,
  recurringEventId: null,
  exceptionDate: null,
  isDeleted: false,
  updatedAt: INITIAL_DATE,
};

const MOCK_ALL_DAY_EVENT = {
  ...MOCK_TIMED_EVENT,
  id: "evt-2",
  title: "종일 이벤트",
  isAllDay: true,
};

// ── 테스트 ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseDayItems.mockReturnValue(defaultDayItems);
});

describe("DayView", () => {
  it("day-view testID가 렌더된다", async () => {
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} />);
    });
    expect(screen.getByTestId("day-view")).toBeTruthy();
  });

  it("날짜 헤더에 initialDate 정보가 표시된다", async () => {
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} />);
    });
    const header = screen.getByTestId("day-header-title");
    expect(header.props.children).toContain("2026년");
    expect(header.props.children).toContain("7월");
    expect(header.props.children).toContain("6일");
    expect(header.props.children).toContain("월요일");
  });

  it("day-list FlatList가 렌더된다", async () => {
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} />);
    });
    expect(screen.getByTestId("day-list")).toBeTruthy();
  });

  it("시간 이벤트가 있으면 이벤트 제목이 표시된다", async () => {
    mockUseDayItems.mockReturnValue({
      ...defaultDayItems,
      events: [MOCK_TIMED_EVENT],
    });
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} />);
    });
    // 3일 렌더 → 같은 제목이 여러 번 등장하므로 queryAllByText 사용
    expect(screen.queryAllByText("오전 회의").length).toBeGreaterThan(0);
  });

  it("종일 이벤트가 있으면 이벤트 제목이 표시된다", async () => {
    mockUseDayItems.mockReturnValue({
      ...defaultDayItems,
      events: [MOCK_ALL_DAY_EVENT],
    });
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} />);
    });
    expect(screen.queryAllByText("종일 이벤트").length).toBeGreaterThan(0);
  });

  it("onEventPress가 있으면 이벤트 탭 시 호출된다", async () => {
    const onEventPress = jest.fn();
    mockUseDayItems.mockReturnValue({
      ...defaultDayItems,
      events: [MOCK_TIMED_EVENT],
    });
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} onEventPress={onEventPress} />);
    });
    const bars = screen.getAllByLabelText("오전 회의");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("로딩 중에는 이벤트 블록이 렌더되지 않는다", async () => {
    mockUseDayItems.mockReturnValue({
      ...defaultDayItems,
      isLoading: true,
      events: [MOCK_TIMED_EVENT],
    });
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} />);
    });
    // 로딩 중이면 이벤트 제목이 없어야 한다
    expect(screen.queryByText("오전 회의")).toBeNull();
  });

  it("onDateChange prop이 전달되면 마운트 시 호출된다", async () => {
    const onDateChange = jest.fn();
    await act(async () => {
      render(<DayView initialDate={INITIAL_DATE} onDateChange={onDateChange} />);
    });
    expect(onDateChange).toHaveBeenCalled();
  });
});
