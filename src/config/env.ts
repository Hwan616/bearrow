// 앱 환경 설정. app.config.ts 의 APP_ENV 와 동일한 값을 사용한다.
// 순수 모듈로 작성하여 단위 테스트가 가능하도록 한다.

export type AppEnv = "development" | "staging" | "production";

export interface AppConfig {
  env: AppEnv;
  apiUrl: string;
  enableDevTools: boolean;
}

const CONFIG: Record<AppEnv, AppConfig> = {
  development: {
    env: "development",
    apiUrl: "https://dev.api.bearrow.app",
    enableDevTools: true,
  },
  staging: {
    env: "staging",
    apiUrl: "https://staging.api.bearrow.app",
    enableDevTools: true,
  },
  production: {
    env: "production",
    apiUrl: "https://api.bearrow.app",
    enableDevTools: false,
  },
};

const isAppEnv = (value: string): value is AppEnv => value in CONFIG;

/** APP_ENV 문자열을 받아 환경 설정을 반환한다. 미지정 시 development. */
export function resolveConfig(appEnv: string | undefined): AppConfig {
  const env = appEnv ?? "development";
  if (!isAppEnv(env)) {
    throw new Error(`Unknown APP_ENV: "${appEnv}"`);
  }
  return CONFIG[env];
}

export const config = resolveConfig(process.env.APP_ENV);
