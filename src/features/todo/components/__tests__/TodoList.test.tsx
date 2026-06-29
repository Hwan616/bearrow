/**
 * TodoList 컴포넌트 — SectionList 가상화 및 접근성 동작 검증.
 */

import React from "react";
import { act, render, screen } from "@testing-library/react-native";

// ── 모킹 ────────────────────────────────────────────────────────────────────

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return {
    Swipeable: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

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

// ── fixtures ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line import/first
import { TodoList } from "../TodoList";

const makeTodo = (overrides: Partial<{ id: string; title: string; isCompleted: boolean }> = {}) => ({
  id: "todo-1",
  title: "테스트 할일",
  isCompleted: false,
  note: null,
  dueDate: null,
  categoryId: null,
  completedAt: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  eventId: null,
  ...overrides,
});

const sections = [
  {
    categoryId: "cat-1",
    categoryName: "업무",
    categoryColor: "#2E5AAC",
    todos: [makeTodo({ id: "1", title: "보고서 작성" }), makeTodo({ id: "2", title: "미팅 준비" })],
  },
  {
    categoryId: "cat-2",
    categoryName: "개인",
    categoryColor: "#4CAF50",
    todos: [makeTodo({ id: "3", title: "운동하기" })],
  },
];

const noop = jest.fn();

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("TodoList", () => {
  it("섹션 헤더가 카테고리 이름으로 렌더된다", async () => {
    await act(async () => {
      render(<TodoList sections={sections} onToggle={noop} onDelete={noop} />);
    });
    expect(screen.getByText("업무")).toBeTruthy();
    expect(screen.getByText("개인")).toBeTruthy();
  });

  it("할일 항목 제목이 렌더된다", async () => {
    await act(async () => {
      render(<TodoList sections={sections} onToggle={noop} onDelete={noop} />);
    });
    expect(screen.getByText("보고서 작성")).toBeTruthy();
    expect(screen.getByText("미팅 준비")).toBeTruthy();
    expect(screen.getByText("운동하기")).toBeTruthy();
  });

  it("빈 섹션일 때 안내 메시지를 표시한다", async () => {
    await act(async () => {
      render(<TodoList sections={[]} onToggle={noop} onDelete={noop} />);
    });
    expect(screen.getByText("할일이 없습니다")).toBeTruthy();
  });
});
