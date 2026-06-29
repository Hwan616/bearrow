import React from "react";

// ── mocks ──────────────────────────────────────────────────────────────────

const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockSetUser = jest.fn();

jest.mock("@sentry/react-native", () => ({
  init: (...args: unknown[]) => mockInit(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  setUser: (...args: unknown[]) => mockSetUser(...args),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/config/env", () => ({
  config: { env: "production" },
}));

// DSN 환경변수를 각 테스트 그룹에서 동적으로 설정한다
const REAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = { ...REAL_ENV };
});

afterAll(() => {
  process.env = REAL_ENV;
});

// ── helpers ──────────────────────────────────────────────────────────────────

function loadSentry() {
  return jest.requireActual("../sentry") as typeof import("../sentry");
}

// ── DSN 없을 때 (no-op) ───────────────────────────────────────────────────────

describe("DSN 미설정 시 no-op", () => {
  beforeEach(() => {
    delete process.env["EXPO_PUBLIC_SENTRY_DSN"];
  });

  it("isSentryEnabled 가 false 다", () => {
    const { isSentryEnabled } = loadSentry();
    expect(isSentryEnabled).toBe(false);
  });

  it("initSentry 호출해도 Sentry.init 이 실행되지 않는다", () => {
    const { initSentry } = loadSentry();
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("captureException 이 no-op 이다", () => {
    const { captureException } = loadSentry();
    captureException(new Error("test"));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("captureMessage 이 no-op 이다", () => {
    const { captureMessage } = loadSentry();
    captureMessage("hello");
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it("setSentryUser 가 no-op 이다", () => {
    const { setSentryUser } = loadSentry();
    setSentryUser("user-1");
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});

// ── DSN 설정 시 ────────────────────────────────────────────────────────────────

describe("DSN 설정 시 Sentry 기능 동작", () => {
  const TEST_DSN = "https://key@o123.ingest.sentry.io/456";

  beforeEach(() => {
    process.env["EXPO_PUBLIC_SENTRY_DSN"] = TEST_DSN;
  });

  it("initSentry 가 DSN·environment·release 를 전달한다", () => {
    const { initSentry } = loadSentry();
    initSentry();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: TEST_DSN,
        environment: "production",
      }),
    );
  });

  it("production 에서 tracesSampleRate 가 0 초과다", () => {
    const { initSentry } = loadSentry();
    initSentry();
    const [arg] = mockInit.mock.calls[0] as [{ tracesSampleRate: number }];
    expect(arg.tracesSampleRate).toBeGreaterThan(0);
  });

  it("captureException 이 에러를 전달한다", () => {
    const { captureException } = loadSentry();
    const err = new Error("boom");
    captureException(err);
    expect(mockCaptureException).toHaveBeenCalledWith(err);
  });

  it("captureMessage 가 메시지와 레벨을 전달한다", () => {
    const { captureMessage } = loadSentry();
    captureMessage("sync failed", "error");
    expect(mockCaptureMessage).toHaveBeenCalledWith("sync failed", "error");
  });

  it("captureMessage 기본 레벨은 info 다", () => {
    const { captureMessage } = loadSentry();
    captureMessage("hello");
    expect(mockCaptureMessage).toHaveBeenCalledWith("hello", "info");
  });

  it("setSentryUser 가 userId 를 전달한다", () => {
    const { setSentryUser } = loadSentry();
    setSentryUser("user-abc");
    expect(mockSetUser).toHaveBeenCalledWith({ id: "user-abc" });
  });

  it("setSentryUser(null) 이 사용자 컨텍스트를 초기화한다", () => {
    const { setSentryUser } = loadSentry();
    setSentryUser(null);
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });
});
