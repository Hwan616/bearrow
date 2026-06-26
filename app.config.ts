import type { ExpoConfig, ConfigContext } from "expo/config";

// 환경 분리: APP_ENV 로 dev / staging / production 구분
const APP_ENV = (process.env.APP_ENV ?? "development") as
  | "development"
  | "staging"
  | "production";

const VARIANTS = {
  development: { name: "BeArrow (Dev)", id: "app.bearrow.dev" },
  staging: { name: "BeArrow (Staging)", id: "app.bearrow.staging" },
  production: { name: "BeArrow", id: "app.bearrow" },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[APP_ENV];
  return {
    ...config,
    name: variant.name,
    slug: "bearrow",
    scheme: "bearrow",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: { bundleIdentifier: variant.id, supportsTablet: true },
    android: { package: variant.id },
    plugins: ["expo-secure-store"],
    extra: {
      appEnv: APP_ENV,
    },
  };
};
