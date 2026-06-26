import { resolveConfig } from "./env";

describe("resolveConfig", () => {
  it("APP_ENV 미지정 시 development 로 기본 설정", () => {
    expect(resolveConfig(undefined).env).toBe("development");
  });

  it("production 환경에서는 devTools 비활성화", () => {
    const c = resolveConfig("production");
    expect(c.env).toBe("production");
    expect(c.enableDevTools).toBe(false);
    expect(c.apiUrl).toBe("https://api.bearrow.app");
  });

  it("staging 환경 해석", () => {
    expect(resolveConfig("staging").env).toBe("staging");
  });

  it("알 수 없는 환경값은 예외", () => {
    expect(() => resolveConfig("nope")).toThrow(/Unknown APP_ENV/);
  });
});
