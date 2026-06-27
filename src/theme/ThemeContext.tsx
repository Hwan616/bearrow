import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { resolveTheme } from "./resolve";
import { palette } from "./tokens";
import type { ColorTokens } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

export const ACCENT_PRESETS: { label: string; color: string }[] = [
  { label: "블루", color: palette.blue500 },
  { label: "퍼플", color: "#9B59B6" },
  { label: "그린", color: "#27AE60" },
  { label: "오렌지", color: "#E67E22" },
  { label: "레드", color: "#E74C3C" },
  { label: "틸", color: "#1ABC9C" },
];

const STORAGE_KEY_MODE = "@bearrow/theme_mode";
const STORAGE_KEY_ACCENT = "@bearrow/accent_color";

export interface ThemeContextValue {
  colors: ColorTokens;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  accentColor: string;
  setAccentColor: (c: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: Props) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accentColor, setAccentState] = useState<string>(palette.blue500);

  // 앱 시작 시 영속된 설정 복원
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_MODE),
      AsyncStorage.getItem(STORAGE_KEY_ACCENT),
    ]).then(([savedMode, savedAccent]) => {
      if (savedMode === "light" || savedMode === "dark" || savedMode === "system") {
        setModeState(savedMode);
      }
      if (savedAccent) setAccentState(savedAccent);
    });
  }, []);

  const effectiveScheme = mode === "system" ? systemScheme : mode;
  const theme = resolveTheme(effectiveScheme, accentColor);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY_MODE, m);
  };

  const handleSetAccentColor = async (c: string) => {
    setAccentState(c);
    await AsyncStorage.setItem(STORAGE_KEY_ACCENT, c);
  };

  return (
    <ThemeContext.Provider
      value={{ ...theme, mode, setMode, accentColor, setAccentColor: handleSetAccentColor }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const systemScheme = useColorScheme();

  if (ctx) return ctx;

  // ThemeProvider 외부 폴백 (테스트 환경 등)
  const theme = resolveTheme(systemScheme);
  return {
    ...theme,
    mode: "system",
    setMode: async () => {},
    accentColor: palette.blue500,
    setAccentColor: async () => {},
  };
}
