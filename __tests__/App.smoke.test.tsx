/**
 * 앱 셸(탭바·FAB·화면 전환)에 대한 컴포넌트 수준 스모크 테스트.
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

// feature 컴포넌트 — 탭 콘텐츠 영역 모킹하여 탭바 플로우에만 집중
jest.mock("@/features/calendar/components/MonthView", () => ({
  MonthView: () => null,
}));
jest.mock("@/features/calendar/components/DayDetailPanel", () => ({
  DayDetailPanel: () => null,
}));
jest.mock("@/features/calendar/components/EventDetailSheet", () => ({
  EventDetailSheet: () => null,
}));
jest.mock("@/features/calendar/components/EventForm", () => ({
  EventForm: () => null,
}));
jest.mock("@/features/todo/components/TodoList", () => ({
  TodoList: () => null,
}));
jest.mock("@/features/todo/components/TodoForm", () => ({
  TodoForm: () => null,
}));
jest.mock("@/features/settings/components/SettingsScreen", () => ({
  SettingsScreen: () => null,
}));
jest.mock("@/features/todo/hooks/useTodos", () => ({
  useTodos: () => ({
    sections: [],
    isLoading: false,
    refresh: jest.fn(),
    handleToggle: jest.fn(),
    handleDelete: jest.fn(),
    handleCreate: jest.fn(),
    handleUpdate: jest.fn(),
  }),
}));

jest.mock("@/features/category/api/categories", () => ({
  ensureDefaultCategory: jest.fn().mockResolvedValue(undefined),
}));

// ── App import ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line import/first
import App from "../App";

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

/**
 * 마이그레이션 완료 후 ready 상태의 App을 렌더한다.
 * act() 내부에서 render하여 모든 pending 마이크로태스크가 플러시되도록 보장한다.
 */
async function renderReady() {
  mockRunMigrations.mockResolvedValue(undefined);
  await act(async () => {
    render(<App />);
    // runMigrations().then() 체인이 act 내부에서 완료되도록 마이크로태스크를 플러시
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ── 1. 앱 초기화 ──────────────────────────────────────────────────────────────

describe("앱 초기화", () => {
  it("마이그레이션 전에는 탭바가 보이지 않는다", async () => {
    mockRunMigrations.mockReturnValue(new Promise(() => {})); // 미완료 유지
    await act(async () => {
      render(<App />);
    });
    expect(screen.queryByTestId("tab-calendar")).toBeNull();
  });

  it("마이그레이션 완료 후 탭바 세 개가 나타난다", async () => {
    await renderReady();
    expect(screen.getByTestId("tab-calendar")).toBeTruthy();
    expect(screen.getByTestId("tab-todo")).toBeTruthy();
    expect(screen.getByTestId("tab-settings")).toBeTruthy();
  });
});

// ── 2. 탭 전환 ────────────────────────────────────────────────────────────────

describe("탭 전환", () => {
  it("기본 탭은 캘린더다", async () => {
    await renderReady();
    expect(screen.getByTestId("tab-calendar").props.accessibilityState?.selected).toBe(true);
    expect(screen.getByTestId("tab-todo").props.accessibilityState?.selected).toBe(false);
  });

  it("할일 탭을 누르면 해당 탭이 선택된다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-todo"));
    });
    expect(screen.getByTestId("tab-todo").props.accessibilityState?.selected).toBe(true);
    expect(screen.getByTestId("tab-calendar").props.accessibilityState?.selected).toBe(false);
  });

  it("설정 탭을 누르면 해당 탭이 선택된다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-settings"));
    });
    expect(screen.getByTestId("tab-settings").props.accessibilityState?.selected).toBe(true);
  });

  it("캘린더 탭으로 다시 돌아올 수 있다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-todo"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-calendar"));
    });
    expect(screen.getByTestId("tab-calendar").props.accessibilityState?.selected).toBe(true);
  });
});

// ── 3. FAB 접근성 ─────────────────────────────────────────────────────────────

describe("FAB(새로 추가) 버튼", () => {
  it("캘린더 탭에서 FAB가 렌더된다", async () => {
    await renderReady();
    expect(screen.getByTestId("fab-add-event")).toBeTruthy();
  });

  it("할일 탭에서 FAB가 렌더된다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-todo"));
    });
    expect(screen.getByTestId("fab-add-todo")).toBeTruthy();
  });

  it("설정 탭에서는 FAB가 없다", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-settings"));
    });
    expect(screen.queryByTestId("fab-add-event")).toBeNull();
    expect(screen.queryByTestId("fab-add-todo")).toBeNull();
  });
});
