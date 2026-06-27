import { darkTokens, lightTokens } from "../tokens";
import { resolveTheme } from "../resolve";

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

describe("resolveTheme — accentColor 재정의", () => {
  it("accentColor가 없으면 기본 토큰을 그대로 반환한다", () => {
    expect(resolveTheme("light")).toEqual({ colors: lightTokens, isDark: false });
    expect(resolveTheme("dark")).toEqual({ colors: darkTokens, isDark: true });
  });

  it("accentColor를 지정하면 accent 토큰만 교체된다", () => {
    const theme = resolveTheme("light", "#E74C3C");
    expect(theme.colors.accent.primary).toBe("#E74C3C");
    expect(theme.colors.accent.primaryLight).toBe("#E74C3C20");
    expect(theme.colors.accent.primaryDark).toBe("#E74C3C");
    // 나머지 토큰은 유지된다
    expect(theme.colors.background).toEqual(lightTokens.background);
    expect(theme.colors.text).toEqual(lightTokens.text);
    expect(theme.isDark).toBe(false);
  });

  it("다크 모드에서도 accent만 교체된다", () => {
    const theme = resolveTheme("dark", "#27AE60");
    expect(theme.colors.accent.primary).toBe("#27AE60");
    expect(theme.colors.background).toEqual(darkTokens.background);
    expect(theme.isDark).toBe(true);
  });

  it("accentColor가 null이면 기본 토큰을 유지한다", () => {
    const theme = resolveTheme("light", null);
    expect(theme.colors).toEqual(lightTokens);
  });
});
