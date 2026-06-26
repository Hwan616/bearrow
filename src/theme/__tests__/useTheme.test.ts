import { darkTokens, lightTokens } from "../tokens";
import { resolveTheme } from "../index";

describe("resolveTheme", () => {
  it("라이트 모드일 때 lightTokens 를 반환한다", () => {
    const theme = resolveTheme("light");
    expect(theme.colors).toEqual(lightTokens);
    expect(theme.isDark).toBe(false);
  });

  it("다크 모드일 때 darkTokens 를 반환한다", () => {
    const theme = resolveTheme("dark");
    expect(theme.colors).toEqual(darkTokens);
    expect(theme.isDark).toBe(true);
  });

  it("시스템 설정 미지정(null)일 때 lightTokens 를 반환한다", () => {
    const theme = resolveTheme(null);
    expect(theme.colors).toEqual(lightTokens);
    expect(theme.isDark).toBe(false);
  });

  it("알 수 없는 값일 때 lightTokens 를 반환한다", () => {
    const theme = resolveTheme(undefined);
    expect(theme.colors).toEqual(lightTokens);
    expect(theme.isDark).toBe(false);
  });
});
