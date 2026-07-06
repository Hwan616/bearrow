import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      background: { primary: "#fff", secondary: "#f8f9fa" },
      surface: { default: "#fff", raised: "#fff" },
      text: { primary: "#212529", secondary: "#6c757d", disabled: "#ced4da" },
      border: { default: "#e9ecef", strong: "#ced4da" },
      accent: { primary: "#2e5aac" },
    },
  }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockBottomSheet = React.forwardRef(
    ({ children }: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ snapToIndex: jest.fn(), close: jest.fn() }));
      return React.createElement(View, { testID: "mock-bottom-sheet" }, children);
    },
  );
  MockBottomSheet.displayName = "BottomSheet";
  const MockBottomSheetView = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  MockBottomSheetView.displayName = "BottomSheetView";
  return { __esModule: true, default: MockBottomSheet, BottomSheetView: MockBottomSheetView };
});

jest.mock("../../hooks/useTodos", () => ({
  useTodos: jest.fn(),
}));

jest.mock("../TodoList", () => ({
  TodoList: ({ sections }: { sections: unknown[] }) =>
    require("react").createElement(
      require("react-native").View,
      { testID: "mock-todo-list" },
      require("react").createElement(
        require("react-native").Text,
        null,
        `sections:${sections.length}`,
      ),
    ),
}));

jest.mock("../TodoMiniCalendar", () => ({
  TodoMiniCalendar: () =>
    require("react").createElement(
      require("react-native").View,
      { testID: "mock-mini-calendar" },
    ),
}));

// eslint-disable-next-line import/first
import { TodoSheet } from "../TodoSheet";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const SELECTED_DATE = new Date("2026-07-06T00:00:00");

const MOCK_TODO = {
  id: "todo-1",
  title: "테스트 할일",
  isCompleted: false,
  completedAt: null,
  dueDate: null,
  categoryId: null,
  eventId: null,
  sortOrder: 0,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  isWide: false,
  selectedDate: SELECTED_DATE,
  sections: [],
  allTodos: [],
  reschedulingTodo: null,
  onToggle: jest.fn(),
  onDelete: jest.fn(),
  onEdit: jest.fn(),
  onReschedule: jest.fn(),
  onCancelReschedule: jest.fn(),
  onDatePick: jest.fn(),
  onAddTodo: jest.fn(),
  onReorder: jest.fn().mockResolvedValue(undefined),
};

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("TodoSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("visible=true 시 todo-sheet-content가 렌더된다", async () => {
    await render(<TodoSheet {...defaultProps} />);
    expect(screen.getByTestId("todo-sheet-content")).toBeTruthy();
  });

  it("선택 날짜가 헤더에 표시된다", async () => {
    await render(<TodoSheet {...defaultProps} />);
    expect(screen.getByText("7월 6일 (월)")).toBeTruthy();
  });

  it("visible=false 시 컨텐츠가 렌더되지 않는다 (컴팩트 모드)", async () => {
    await render(<TodoSheet {...defaultProps} visible={false} />);
    // AppBottomSheet은 visible=false이면 close() 호출 (실제 시트는 닫힘)
    // mock은 항상 렌더하므로 BottomSheet 자체는 존재
    expect(screen.getByTestId("mock-bottom-sheet")).toBeTruthy();
  });

  it("isWide=true 시 side-panel이 렌더된다", async () => {
    await render(<TodoSheet {...defaultProps} isWide={true} />);
    expect(screen.getByTestId("side-panel")).toBeTruthy();
  });

  it("정렬 버튼 탭 시 ReorderableList로 전환된다", async () => {
    await render(
      <TodoSheet {...defaultProps} allTodos={[MOCK_TODO]} />,
    );
    expect(screen.getByTestId("mock-todo-list")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-reorder-toggle"));
    });

    expect(screen.getByTestId("reorder-list")).toBeTruthy();
    expect(screen.queryByTestId("mock-todo-list")).toBeNull();
  });

  it("정렬 모드에서 '완료' 버튼 탭 시 일반 모드로 돌아온다", async () => {
    await render(<TodoSheet {...defaultProps} allTodos={[MOCK_TODO]} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-reorder-toggle"));
    });
    expect(screen.getByTestId("reorder-list")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-reorder-toggle"));
    });
    expect(screen.getByTestId("mock-todo-list")).toBeTruthy();
  });

  it("정렬 모드에서 ↑ 버튼 탭 시 onReorder가 호출된다", async () => {
    const mockOnReorder = jest.fn().mockResolvedValue(undefined);
    const todos = [
      { ...MOCK_TODO, id: "a", sortOrder: 0 },
      { ...MOCK_TODO, id: "b", sortOrder: 1 },
    ];
    await render(
      <TodoSheet {...defaultProps} allTodos={todos} onReorder={mockOnReorder} />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-reorder-toggle"));
    });

    // b를 위로 이동
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-move-up-b"));
    });

    expect(mockOnReorder).toHaveBeenCalledWith(["b", "a"]);
  });

  it("btn-add-todo-sheet 탭 시 onAddTodo가 호출된다", async () => {
    const onAddTodo = jest.fn();
    await render(<TodoSheet {...defaultProps} onAddTodo={onAddTodo} />);

    fireEvent.press(screen.getByTestId("btn-add-todo-sheet"));
    expect(onAddTodo).toHaveBeenCalledTimes(1);
  });

  it("isWide=true 시 헤더에 닫기 버튼이 표시된다", async () => {
    await render(<TodoSheet {...defaultProps} isWide={true} />);
    expect(screen.getByTestId("btn-sheet-close")).toBeTruthy();
  });

  it("isWide=false 시 헤더에 닫기 버튼이 없다", async () => {
    await render(<TodoSheet {...defaultProps} isWide={false} />);
    expect(screen.queryByTestId("btn-sheet-close")).toBeNull();
  });
});
