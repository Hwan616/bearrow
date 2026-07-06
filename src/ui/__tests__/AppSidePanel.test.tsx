import React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      surface: { raised: "#fff" },
      border: { default: "#eee" },
    },
  }),
}));

// eslint-disable-next-line import/first
import { AppSidePanel } from "../AppSidePanel";

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("AppSidePanel", () => {
  it("visible=true 시 side-panel testID가 렌더된다", async () => {
    await render(
      <AppSidePanel visible={true} onClose={jest.fn()}>
        <Text>패널 내용</Text>
      </AppSidePanel>,
    );
    expect(screen.getByTestId("side-panel")).toBeTruthy();
  });

  it("visible=false 시 side-panel이 렌더되지 않는다", async () => {
    await render(
      <AppSidePanel visible={false} onClose={jest.fn()}>
        <Text>패널 내용</Text>
      </AppSidePanel>,
    );
    expect(screen.queryByTestId("side-panel")).toBeNull();
  });

  it("children이 side-panel 안에 렌더된다", async () => {
    await render(
      <AppSidePanel visible={true} onClose={jest.fn()}>
        <Text testID="panel-child">자식 컨텐츠</Text>
      </AppSidePanel>,
    );
    expect(screen.getByTestId("panel-child")).toBeTruthy();
  });

  it("visible=false → true 전환 시 children이 나타난다", async () => {
    const { rerender } = await render(
      <AppSidePanel visible={false} onClose={jest.fn()}>
        <Text testID="panel-child">자식 컨텐츠</Text>
      </AppSidePanel>,
    );
    expect(screen.queryByTestId("panel-child")).toBeNull();

    await act(async () => {
      await rerender(
        <AppSidePanel visible={true} onClose={jest.fn()}>
          <Text testID="panel-child">자식 컨텐츠</Text>
        </AppSidePanel>,
      );
    });
    expect(screen.getByTestId("panel-child")).toBeTruthy();
  });

  it("width prop이 전달되면 해당 width로 렌더된다", async () => {
    await render(
      <AppSidePanel visible={true} onClose={jest.fn()} width={400}>
        <Text>내용</Text>
      </AppSidePanel>,
    );
    const panel = screen.getByTestId("side-panel");
    expect(panel.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 400 })]),
    );
  });
});
