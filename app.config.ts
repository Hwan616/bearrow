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

// EAS 프로젝트 생성 후 `eas init` 이 채워주는 값. CI 에서는 환경변수로 주입.
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? "00000000-0000-0000-0000-000000000000";

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
    updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
    runtimeVersion: { policy: "appVersion" },
    extra: {
      appEnv: APP_ENV,
      eas: { projectId: EAS_PROJECT_ID },
    },
  };
};
