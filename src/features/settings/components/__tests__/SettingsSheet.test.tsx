import React from "react";
import { act, render, screen } from "@testing-library/react-native";

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

jest.mock("../SettingsScreen", () => ({
  SettingsScreen: () =>
    require("react").createElement(
      require("react-native").View,
      { testID: "mock-settings-screen" },
    ),
}));

// eslint-disable-next-line import/first
import { SettingsSheet } from "../SettingsSheet";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  isWide: false,
};

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("SettingsSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("visible=true 시 settings-sheet-content가 렌더된다", async () => {
    await render(<SettingsSheet {...defaultProps} />);
    expect(screen.getByTestId("settings-sheet-content")).toBeTruthy();
  });

  it("SettingsScreen이 렌더된다", async () => {
    await render(<SettingsSheet {...defaultProps} />);
    expect(screen.getByTestId("mock-settings-screen")).toBeTruthy();
  });

  it("isWide=false 시 BottomSheet가 렌더된다", async () => {
    await render(<SettingsSheet {...defaultProps} isWide={false} />);
    expect(screen.getByTestId("mock-bottom-sheet")).toBeTruthy();
  });

  it("isWide=true 시 side-panel이 렌더된다", async () => {
    await render(<SettingsSheet {...defaultProps} isWide={true} />);
    expect(screen.getByTestId("side-panel")).toBeTruthy();
  });

  it("isWide=true 시 닫기 버튼이 표시된다", async () => {
    await render(<SettingsSheet {...defaultProps} isWide={true} />);
    expect(screen.getByTestId("btn-settings-close")).toBeTruthy();
  });

  it("isWide=false 시 닫기 버튼이 없다", async () => {
    await render(<SettingsSheet {...defaultProps} isWide={false} />);
    expect(screen.queryByTestId("btn-settings-close")).toBeNull();
  });

  it("isWide=true visible=false 시 side-panel이 렌더되지 않는다", async () => {
    await render(<SettingsSheet {...defaultProps} isWide={true} visible={false} />);
    expect(screen.queryByTestId("side-panel")).toBeNull();
  });

  it("isWide=true 시 닫기 버튼 탭 시 onClose가 호출된다", async () => {
    const onClose = jest.fn();
    await render(<SettingsSheet {...defaultProps} isWide={true} onClose={onClose} />);
    const { fireEvent } = require("@testing-library/react-native");
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-settings-close"));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
