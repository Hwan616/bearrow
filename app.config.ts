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
    icon: "./assets/icon.png",
    splash: { image: "./assets/splash.png", backgroundColor: "#ffffff" },
    ios: {
      bundleIdentifier: variant.id,
      supportsTablet: true,
      icon: "./assets/icon.png",
    },
    android: {
      package: variant.id,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    plugins: [
      "expo-secure-store",
      "expo-sqlite",
      "@react-native-community/datetimepicker",
      ["expo-notifications", { icon: "./assets/adaptive-icon.png", color: "#2E5AAC" }],
      // Sentry: 네이티브 빌드 시 소스맵·심볼 업로드. org/project는 실제 Sentry 프로젝트 값으로 교체.
      ["@sentry/react-native/expo", { organization: "bearrow", project: "bearrow-mobile" }],
    ],
    extra: {
      appEnv: APP_ENV,
    },
  };
};
