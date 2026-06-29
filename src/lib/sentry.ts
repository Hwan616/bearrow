import * as Sentry from "@sentry/react-native";

import { config } from "@/config/env";

// EXPO_PUBLIC_SENTRY_DSN 이 없으면 모든 함수가 no-op 으로 동작한다.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
const RELEASE = process.env.EXPO_PUBLIC_APP_VERSION ?? "0.1.0";

export const isSentryEnabled = Boolean(DSN);

export function initSentry(): void {
  if (!isSentryEnabled) return;
  Sentry.init({
    dsn: DSN,
    environment: config.env,
    release: RELEASE,
    // production 에서만 트레이스 수집 (비용 절감)
    tracesSampleRate: config.env === "production" ? 0.1 : 0,
  });
}

export function captureException(error: unknown): void {
  if (!isSentryEnabled) return;
  Sentry.captureException(error);
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
  if (!isSentryEnabled) return;
  Sentry.captureMessage(message, level);
}

export function setSentryUser(userId: string | null): void {
  if (!isSentryEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
