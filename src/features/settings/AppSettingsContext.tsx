import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY_HOLIDAYS = "@bearrow/show_holidays";

export interface AppSettingsValue {
  showHolidays: boolean;
  setShowHolidays: (v: boolean) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [showHolidays, setShowHolidaysState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_HOLIDAYS).then((val) => {
      if (val !== null) setShowHolidaysState(val === "true");
    });
  }, []);

  const setShowHolidays = async (v: boolean) => {
    setShowHolidaysState(v);
    await AsyncStorage.setItem(STORAGE_KEY_HOLIDAYS, String(v));
  };

  return (
    <AppSettingsContext.Provider value={{ showHolidays, setShowHolidays }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (ctx) return ctx;
  return {
    showHolidays: true,
    setShowHolidays: async () => {},
  };
}
