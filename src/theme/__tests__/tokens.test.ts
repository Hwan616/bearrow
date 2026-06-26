import { darkTokens, lightTokens } from "../tokens";

describe("lightTokens", () => {
  it("배경·텍스트·강조색이 정의되어 있다", () => {
    expect(lightTokens.background.primary).toBeDefined();
    expect(lightTokens.text.primary).toBeDefined();
    expect(lightTokens.accent.primary).toBeDefined();
  });

  it("강조 기본색이 베어로우 브랜드 블루이다", () => {
    expect(lightTokens.accent.primary).toBe("#2E5AAC");
  });
});

describe("darkTokens", () => {
  it("배경·텍스트·강조색이 정의되어 있다", () => {
    expect(darkTokens.background.primary).toBeDefined();
    expect(darkTokens.text.primary).toBeDefined();
    expect(darkTokens.accent.primary).toBeDefined();
  });

  it("다크 배경이 라이트 배경보다 어둡다 (간단 휘도 비교)", () => {
    const hex = (color: string) => parseInt(color.replace("#", ""), 16);
    expect(hex(darkTokens.background.primary)).toBeLessThan(
      hex(lightTokens.background.primary),
    );
  });
});

describe("토큰 구조 일관성", () => {
  const keys = <T extends object>(o: T) => Object.keys(o).sort();

  it("라이트·다크 토큰의 최상위 키가 동일하다", () => {
    expect(keys(lightTokens)).toEqual(keys(darkTokens));
  });

  it("background 서브키가 동일하다", () => {
    expect(keys(lightTokens.background)).toEqual(keys(darkTokens.background));
  });

  it("text 서브키가 동일하다", () => {
    expect(keys(lightTokens.text)).toEqual(keys(darkTokens.text));
  });

  it("accent 서브키가 동일하다", () => {
    expect(keys(lightTokens.accent)).toEqual(keys(darkTokens.accent));
  });
});
