import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      background: { primary: "#fff", secondary: "#f8f9fa", tertiary: "#f1f3f5" },
      surface: { default: "#fff", raised: "#fff" },
      text: { primary: "#212529", secondary: "#6c757d", disabled: "#ced4da" },
      border: { default: "#e9ecef", strong: "#ced4da" },
      accent: { primary: "#2e5aac" },
    },
  }),
}));

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

  it("닫기 버튼이 항상 렌더된다 (isWide 무관)", async () => {
    await render(<SettingsSheet {...defaultProps} isWide={false} />);
    expect(screen.getByTestId("btn-settings-close")).toBeTruthy();
  });

  it("닫기 버튼 탭 시 onClose가 호출된다", async () => {
    const onClose = jest.fn();
    await render(<SettingsSheet {...defaultProps} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId("btn-settings-close"));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("헤더에 '설정' 타이틀이 표시된다", async () => {
    await render(<SettingsSheet {...defaultProps} />);
    expect(screen.getByText("설정")).toBeTruthy();
  });
});
