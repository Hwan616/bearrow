import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      background: { primary: "#fff", secondary: "#f8f9fa" },
      surface: { default: "#fff", raised: "#fff" },
      text: { primary: "#212529", secondary: "#6c757d", disabled: "#ced4da", inverse: "#fff" },
      border: { default: "#e9ecef", strong: "#ced4da" },
      accent: { primary: "#2e5aac" },
    },
  }),
}));

jest.mock("../EventForm", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  const EventForm = React.forwardRef(
    (
      { onSave, onCancel }: { onSave: () => void; onCancel: () => void },
      ref: React.Ref<{ submit(): void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({ submit: onSave }));
      return React.createElement(
        View,
        { testID: "mock-event-form" },
        React.createElement(Pressable, { testID: "btn-event-save", onPress: onSave }),
        React.createElement(Pressable, { testID: "btn-event-cancel", onPress: onCancel }),
      );
    },
  );
  EventForm.displayName = "EventForm";
  return { EventForm };
});

jest.mock("@/features/todo/components/TodoForm", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  const TodoForm = React.forwardRef(
    (
      {
        onSave,
        onCancel,
      }: {
        onSave: (title: string, categoryId: string) => Promise<void>;
        onCancel: () => void;
      },
      ref: React.Ref<{ submit(): void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        submit: () => void onSave("제목", "cat-1"),
      }));
      return React.createElement(
        View,
        { testID: "mock-todo-form" },
        React.createElement(Pressable, {
          testID: "btn-todo-save",
          onPress: () => void onSave("제목", "cat-1"),
        }),
        React.createElement(Pressable, { testID: "btn-todo-cancel", onPress: onCancel }),
      );
    },
  );
  TodoForm.displayName = "TodoForm";
  return { TodoForm };
});

// eslint-disable-next-line import/first
import { AddSheet } from "../AddSheet";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  isWide: false,
  initialDate: new Date("2026-07-06"),
  initialSegment: "event" as const,
  onEventSave: jest.fn(),
  onTodoSave: jest.fn().mockResolvedValue(undefined),
};

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("AddSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("visible=true 시 add-sheet-content가 렌더된다", async () => {
    await render(<AddSheet {...defaultProps} />);
    expect(screen.getByTestId("add-sheet-content")).toBeTruthy();
  });

  it("닫기 버튼이 항상 표시된다", async () => {
    await render(<AddSheet {...defaultProps} />);
    expect(screen.getByTestId("btn-add-sheet-close")).toBeTruthy();
  });

  it("추가 버튼이 표시된다", async () => {
    await render(<AddSheet {...defaultProps} />);
    expect(screen.getByTestId("btn-add-sheet-save")).toBeTruthy();
  });

  it("기본 세그먼트가 event이면 EventForm이 렌더된다", async () => {
    await render(<AddSheet {...defaultProps} initialSegment="event" />);
    expect(screen.getByTestId("mock-event-form")).toBeTruthy();
    expect(screen.queryByTestId("mock-todo-form")).toBeNull();
  });

  it("initialSegment=todo이면 TodoForm이 렌더된다", async () => {
    await render(<AddSheet {...defaultProps} initialSegment="todo" />);
    expect(screen.getByTestId("mock-todo-form")).toBeTruthy();
    expect(screen.queryByTestId("mock-event-form")).toBeNull();
  });

  it("ToDo 세그먼트 버튼 탭 시 TodoForm으로 전환된다", async () => {
    await render(<AddSheet {...defaultProps} initialSegment="event" />);
    expect(screen.getByTestId("mock-event-form")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-segment-todo"));
    });

    expect(screen.getByTestId("mock-todo-form")).toBeTruthy();
    expect(screen.queryByTestId("mock-event-form")).toBeNull();
  });

  it("일정 세그먼트 버튼 탭 시 EventForm으로 전환된다", async () => {
    await render(<AddSheet {...defaultProps} initialSegment="todo" />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-segment-event"));
    });

    expect(screen.getByTestId("mock-event-form")).toBeTruthy();
  });

  it("EventForm onSave 시 onEventSave가 호출된다", async () => {
    const onEventSave = jest.fn();
    await render(<AddSheet {...defaultProps} onEventSave={onEventSave} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-event-save"));
    });

    expect(onEventSave).toHaveBeenCalledTimes(1);
  });

  it("TodoForm onSave 시 onTodoSave가 호출된다", async () => {
    const onTodoSave = jest.fn().mockResolvedValue(undefined);
    await render(<AddSheet {...defaultProps} initialSegment="todo" onTodoSave={onTodoSave} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-todo-save"));
    });

    expect(onTodoSave).toHaveBeenCalledWith("제목", "cat-1");
  });
});
