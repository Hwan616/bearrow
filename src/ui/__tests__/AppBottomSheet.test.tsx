import React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      surface: { raised: "#fff" },
      border: { strong: "#ccc", default: "#eee" },
    },
  }),
}));

// @gorhom/bottom-sheet 전체 모킹 — reanimated 네이티브 모듈 의존성 회피
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  let capturedOnChange: ((index: number) => void) | undefined;

  const MockBottomSheet = React.forwardRef(function MockBottomSheet(
    props: { children?: React.ReactNode; onChange?: (index: number) => void },
    ref: React.Ref<unknown>,
  ) {
    capturedOnChange = props.onChange;
    React.useImperativeHandle(ref, () => ({
      snapToIndex: jest.fn(),
      close: jest.fn(),
      expand: jest.fn(),
      collapse: jest.fn(),
    }));
    return React.createElement(View, { testID: "mock-bottom-sheet" }, props.children);
  });
  MockBottomSheet.displayName = "BottomSheet";

  const MockBottomSheetView = ({
    children,
    style,
  }: {
    children?: React.ReactNode;
    style?: unknown;
  }) => React.createElement(View, { style }, children);
  MockBottomSheetView.displayName = "BottomSheetView";

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView: MockBottomSheetView,
    // 테스트에서 onClose 시뮬레이션용 헬퍼
    __triggerOnChange: (index: number) => capturedOnChange?.(index),
  };
});

// eslint-disable-next-line import/first
import { AppBottomSheet } from "../AppBottomSheet";

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("AppBottomSheet", () => {
  it("렌더 시 mock-bottom-sheet testID가 존재한다", async () => {
    await render(
      <AppBottomSheet visible={false} onClose={jest.fn()}>
        <Text>내용</Text>
      </AppBottomSheet>,
    );
    expect(screen.getByTestId("mock-bottom-sheet")).toBeTruthy();
  });

  it("children이 렌더 트리에 포함된다", async () => {
    await render(
      <AppBottomSheet visible={false} onClose={jest.fn()}>
        <Text testID="sheet-child">시트 내용</Text>
      </AppBottomSheet>,
    );
    expect(screen.getByTestId("sheet-child")).toBeTruthy();
  });

  it("visible=true → visible=false 전환 시 크래시 없이 렌더된다", async () => {
    const { rerender } = await render(
      <AppBottomSheet visible={true} onClose={jest.fn()}>
        <Text>내용</Text>
      </AppBottomSheet>,
    );
    await act(async () => {
      await rerender(
        <AppBottomSheet visible={false} onClose={jest.fn()}>
          <Text>내용</Text>
        </AppBottomSheet>,
      );
    });
    expect(screen.getByTestId("mock-bottom-sheet")).toBeTruthy();
  });

  it("BottomSheet onChange(-1) 발생 시 onClose가 호출된다", async () => {
    const onClose = jest.fn();
    await render(
      <AppBottomSheet visible={true} onClose={onClose}>
        <Text>내용</Text>
      </AppBottomSheet>,
    );

    const bottomSheetMock = jest.requireMock("@gorhom/bottom-sheet") as {
      __triggerOnChange: (index: number) => void;
    };
    act(() => {
      bottomSheetMock.__triggerOnChange(-1);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("BottomSheet onChange(0) 발생 시 onClose가 호출되지 않는다", async () => {
    const onClose = jest.fn();
    await render(
      <AppBottomSheet visible={true} onClose={onClose}>
        <Text>내용</Text>
      </AppBottomSheet>,
    );

    const bottomSheetMock = jest.requireMock("@gorhom/bottom-sheet") as {
      __triggerOnChange: (index: number) => void;
    };
    act(() => {
      bottomSheetMock.__triggerOnChange(0);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
