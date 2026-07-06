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

const mockSearchAll = jest.fn();
jest.mock("@/features/calendar/api/search", () => ({
  searchAll: (...args: unknown[]) => mockSearchAll(...args),
}));

// eslint-disable-next-line import/first
import { SearchSheet } from "../SearchSheet";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  isWide: false,
  onNavigate: jest.fn(),
};

const MOCK_RESULTS = [
  { id: "evt-1", title: "팀 미팅", kind: "event" as const, date: new Date("2026-07-06") },
  { id: "todo-1", title: "발표 준비", kind: "todo" as const, date: null },
];

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("SearchSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchAll.mockResolvedValue([]);
  });

  it("visible=true 시 search-sheet-content가 렌더된다", async () => {
    await render(<SearchSheet {...defaultProps} />);
    expect(screen.getByTestId("search-sheet-content")).toBeTruthy();
  });

  it("isWide=false 시 BottomSheet가 렌더된다", async () => {
    await render(<SearchSheet {...defaultProps} isWide={false} />);
    expect(screen.getByTestId("mock-bottom-sheet")).toBeTruthy();
  });

  it("isWide=true 시 side-panel이 렌더된다", async () => {
    await render(<SearchSheet {...defaultProps} isWide={true} />);
    expect(screen.getByTestId("side-panel")).toBeTruthy();
  });

  it("isWide=true 시 닫기 버튼이 표시된다", async () => {
    await render(<SearchSheet {...defaultProps} isWide={true} />);
    expect(screen.getByTestId("btn-search-close")).toBeTruthy();
  });

  it("isWide=false 시 닫기 버튼이 없다", async () => {
    await render(<SearchSheet {...defaultProps} isWide={false} />);
    expect(screen.queryByTestId("btn-search-close")).toBeNull();
  });

  it("검색어 입력 시 searchAll이 호출된다", async () => {
    mockSearchAll.mockResolvedValue(MOCK_RESULTS);
    await render(<SearchSheet {...defaultProps} />);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("search-input"), "팀");
    });

    expect(mockSearchAll).toHaveBeenCalledWith("팀");
  });

  it("결과 항목 탭 시 date가 있으면 onNavigate가 호출된다", async () => {
    mockSearchAll.mockResolvedValue(MOCK_RESULTS);
    const onNavigate = jest.fn();
    await render(<SearchSheet {...defaultProps} onNavigate={onNavigate} />);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("search-input"), "팀");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("search-result-evt-1"));
    });

    expect(onNavigate).toHaveBeenCalledWith(MOCK_RESULTS[0]!.date);
  });

  it("결과 항목 탭 시 date가 null이면 onNavigate가 호출되지 않는다", async () => {
    mockSearchAll.mockResolvedValue(MOCK_RESULTS);
    const onNavigate = jest.fn();
    await render(<SearchSheet {...defaultProps} onNavigate={onNavigate} />);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("search-input"), "발표");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("search-result-todo-1"));
    });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("X 버튼 탭 시 query가 초기화된다", async () => {
    await render(<SearchSheet {...defaultProps} />);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("search-input"), "검색어");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-search-clear"));
    });

    expect(screen.getByTestId("search-input").props.value).toBe("");
  });

  it("검색 결과 없으면 안내 문구가 표시된다", async () => {
    mockSearchAll.mockResolvedValue([]);
    await render(<SearchSheet {...defaultProps} />);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("search-input"), "없는검색어");
    });

    expect(screen.getByText("검색 결과가 없습니다")).toBeTruthy();
  });
});
