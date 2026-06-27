import { type ColorTokens, darkTokens, lightTokens } from "./tokens";

export interface Theme {
  colors: ColorTokens;
  isDark: boolean;
}

// accentColor가 주어지면 accent 토큰을 재정의한다
export function resolveTheme(
  scheme: string | null | undefined,
  accentColor?: string | null,
): Theme {
  const isDark = scheme === "dark";
  const base = isDark ? darkTokens : lightTokens;
  if (!accentColor) return { colors: base, isDark };

  return {
    isDark,
    colors: {
      ...base,
      accent: {
        primary: accentColor,
        primaryLight: `${accentColor}20`,  // ~12% 불투명도 배경용
        primaryDark: accentColor,
      },
    },
  };
}
