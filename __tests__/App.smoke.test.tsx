/**
 * 앱 셸(헤더·푸터·뷰 전환·시트 열림)에 대한 컴포넌트 수준 스모크 테스트.
 * 하위 feature 컴포넌트는 모킹하여 App 수준 플로우에만 집중한다.
 */

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

// ── 외부 의존성 모킹 ─────────────────────────────────────────────────────────

const mockRunMigrations = jest.fn();

jest.mock("@/db/client", () => ({ sqliteDb: {} }));
jest.mock("@/db/migrate", () => ({
  runMigrations: (...args: unknown[]) => mockRunMigrations(...args),
}));

jest.mock("@/features/calendar/api/notifications", () => ({
  setupNotificationHandler: jest.fn(),
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
  isSupabaseConfigured: false,
}));

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

// ── feature 컴포넌트 모킹 ─────────────────────────────────────────────────────
// App.tsx가 직접 import하는 컴포넌트만 모킹한다.

jest.mock("@/features/calendar/components/YearView", () => ({
  YearView: () => null,
}));
jest.mock("@/features/calendar/components/MonthView", () => ({
  MonthView: () => null,
}));
jest.mock("@/features/calendar/components/DayView", () => ({
  DayView: () => null,
}));
jest.mock("@/features/calendar/components/EventDetailSheet", () => ({
  EventDetailSheet: () => null,
}));
jest.mock("@/features/todo/components/TodoForm", () => ({
  TodoForm: () => null,
}));

// 시트 컴포넌트 — visible=true 일 때 testID를 노출해 열림 여부를 검증할 수 있게 한다.
jest.mock("@/features/todo/components/TodoSheet", () => ({
  TodoSheet: ({ visible }: { visible: boolean }) =>
    visible
      ? require("react").createElement(require("react-native").View, {
          testID: "mock-todo-sheet",
        })
      : null,
}));
jest.mock("@/features/calendar/components/AddSheet", () => ({
  AddSheet: ({ visible }: { visible: boolean }) =>
    visible
      ? require("react").createElement(require("react-native").View, {
          testID: "mock-add-sheet",
        })
      : null,
}));
jest.mock("@/features/calendar/components/SearchSheet", () => ({
  SearchSheet: ({ visible }: { visible: boolean }) =>
    visible
      ? require("react").createElement(require("react-native").View, {
          testID: "mock-search-sheet",
        })
      : null,
}));
jest.mock("@/features/settings/components/SettingsSheet", () => ({
  SettingsSheet: ({ visible }: { visible: boolean }) =>
    visible
      ? require("react").createElement(require("react-native").View, {
          testID: "mock-settings-sheet",
        })
      : null,
}));

jest.mock("@/features/todo/hooks/useTodos", () => ({
  useTodos: () => ({
    sections: [],
    allTodos: [],
    isLoading: false,
    refresh: jest.fn(),
    handleToggle: jest.fn(),
    handleDelete: jest.fn(),
    handleCreate: jest.fn(),
    handleUpdate: jest.fn(),
    handleReorder: jest.fn(),
  }),
}));

jest.mock("@/features/category/api/categories", () => ({
  ensureDefaultCategory: jest.fn().mockResolvedValue(undefined),
}));

// ── App import ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line import/first
import App from "../App";

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function renderReady() {
  mockRunMigrations.mockResolvedValue(undefined);
  await act(async () => {
    render(<App />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ── 1. 앱 초기화 ──────────────────────────────────────────────────────────────

describe("앱 초기화", () => {
  it("마이그레이션 전에는 헤더 버튼이 보이지 않는다", async () => {
    mockRunMigrations.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      render(<App />);
    });
    expect(screen.queryByTestId("btn-add")).toBeNull();
  });

  it("마이그레이션 완료 후 헤더·푸터가 나타난다", async () => {
    await renderReady();
    expect(screen.getByTestId("btn-add")).toBeTruthy();
    expect(screen.getByTestId("btn-search")).toBeTruthy();
    expect(screen.getByTestId("btn-today")).toBeTruthy();
    expect(screen.getByTestId("btn-settings-sheet")).toBeTruthy();
  });
});

// ── 2. 뷰 전환 ────────────────────────────────────────────────────────────────

describe("뷰 전환", () => {
  it("기본 뷰는 Month(월)다", async () => {
    await renderReady();
    expect(screen.getByTestId("view-month")).toBeTruthy();
  });

  it("오늘 버튼을 누르면 Day 뷰로 이동한다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-today"));
    });
    expect(screen.getByTestId("view-day")).toBeTruthy();
  });

  it("Month 뷰에서 뒤로가기를 누르면 Year 뷰로 이동한다", async () => {
    await renderReady();
    expect(screen.getByTestId("view-month")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-back"));
    });
    expect(screen.getByTestId("view-year")).toBeTruthy();
  });

  it("Day 뷰에서 뒤로가기를 누르면 Month 뷰로 이동한다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-today"));
    });
    expect(screen.getByTestId("view-day")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-back"));
    });
    expect(screen.getByTestId("view-month")).toBeTruthy();
  });

  it("Year 뷰에서는 뒤로가기 버튼이 없다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-back"));
    });
    expect(screen.getByTestId("view-year")).toBeTruthy();
    expect(screen.queryByTestId("btn-back")).toBeNull();
  });
});

// ── 3. 푸터 버튼 ──────────────────────────────────────────────────────────────

describe("푸터 버튼", () => {
  it("Year 뷰에서는 할일 버튼이 없다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-back"));
    });
    expect(screen.queryByTestId("btn-todo-sheet")).toBeNull();
  });

  it("Month 뷰에서는 할일 버튼이 있다", async () => {
    await renderReady();
    expect(screen.getByTestId("btn-todo-sheet")).toBeTruthy();
  });

  it("설정 버튼이 항상 렌더된다", async () => {
    await renderReady();
    expect(screen.getByTestId("btn-settings-sheet")).toBeTruthy();
    // Year 뷰에서도 설정 버튼은 유지
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-back"));
    });
    expect(screen.getByTestId("btn-settings-sheet")).toBeTruthy();
  });
});

// ── 4. 헤더 버튼 ──────────────────────────────────────────────────────────────

describe("헤더 버튼", () => {
  it("검색 버튼이 렌더된다", async () => {
    await renderReady();
    expect(screen.getByTestId("btn-search")).toBeTruthy();
  });

  it("추가(+) 버튼이 렌더된다", async () => {
    await renderReady();
    expect(screen.getByTestId("btn-add")).toBeTruthy();
  });
});

// ── 5. 시트 열림 동작 ──────────────────────────────────────────────────────────

describe("시트 열림 동작", () => {
  it("추가(+) 버튼 탭 시 AddSheet가 열린다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-add"));
    });
    expect(screen.getByTestId("mock-add-sheet")).toBeTruthy();
  });

  it("검색 버튼 탭 시 SearchSheet가 열린다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-search"));
    });
    expect(screen.getByTestId("mock-search-sheet")).toBeTruthy();
  });

  it("할일 버튼 탭 시 TodoSheet가 열린다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-todo-sheet"));
    });
    expect(screen.getByTestId("mock-todo-sheet")).toBeTruthy();
  });

  it("설정 버튼 탭 시 SettingsSheet가 열린다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-settings-sheet"));
    });
    expect(screen.getByTestId("mock-settings-sheet")).toBeTruthy();
  });
});
