import { useColorScheme } from "react-native";

import { type ColorTokens, darkTokens, lightTokens } from "./tokens";

export type { ColorTokens };
export { lightTokens, darkTokens, palette } from "./tokens";

export interface Theme {
  colors: ColorTokens;
  isDark: boolean;
}

export function resolveTheme(scheme: string | null | undefined): Theme {
  const isDark = scheme === "dark";
  return {
    colors: isDark ? darkTokens : lightTokens,
    isDark,
  };
}

export function useTheme(): Theme {
  return resolveTheme(useColorScheme());
}
