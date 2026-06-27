import { dueDayOffset, formatDueDate, isDueDatePast, isDueDateToday } from "../todoDateUtils";

// 기준 시각: 2026-06-27 토요일 09:00
const NOW = new Date(2026, 5, 27, 9, 0, 0);

function d(year: number, month: number, day: number, h = 0) {
  return new Date(year, month - 1, day, h);
}

// ── dueDayOffset ──────────────────────────────────────────────────────────

describe("dueDayOffset", () => {
  it("오늘 → 0", () => {
    expect(dueDayOffset(d(2026, 6, 27), NOW)).toBe(0);
  });
  it("내일 → 1", () => {
    expect(dueDayOffset(d(2026, 6, 28), NOW)).toBe(1);
  });
  it("어제 → -1", () => {
    expect(dueDayOffset(d(2026, 6, 26), NOW)).toBe(-1);
  });
  it("3일 후 → 3", () => {
    expect(dueDayOffset(d(2026, 6, 30), NOW)).toBe(3);
  });
  it("시각은 무시하고 날짜만 비교한다", () => {
    // now=09:00, due=23:59이어도 같은 날이면 0
    expect(dueDayOffset(d(2026, 6, 27, 23), NOW)).toBe(0);
    // now=09:00, due=00:01이어도 어제면 -1
    expect(dueDayOffset(d(2026, 6, 26, 1), NOW)).toBe(-1);
  });
});

// ── isDueDatePast ─────────────────────────────────────────────────────────

describe("isDueDatePast", () => {
  it("어제 → true", () => {
    expect(isDueDatePast(d(2026, 6, 26), NOW)).toBe(true);
  });
  it("오늘 → false", () => {
    expect(isDueDatePast(d(2026, 6, 27), NOW)).toBe(false);
  });
  it("내일 → false", () => {
    expect(isDueDatePast(d(2026, 6, 28), NOW)).toBe(false);
  });
});

// ── isDueDateToday ────────────────────────────────────────────────────────

describe("isDueDateToday", () => {
  it("오늘 → true", () => {
    expect(isDueDateToday(d(2026, 6, 27), NOW)).toBe(true);
  });
  it("내일 → false", () => {
    expect(isDueDateToday(d(2026, 6, 28), NOW)).toBe(false);
  });
  it("어제 → false", () => {
    expect(isDueDateToday(d(2026, 6, 26), NOW)).toBe(false);
  });
});

// ── formatDueDate ─────────────────────────────────────────────────────────

describe("formatDueDate", () => {
  it("오늘이면 '오늘'", () => {
    expect(formatDueDate(d(2026, 6, 27), NOW)).toBe("오늘");
  });
  it("내일이면 '내일'", () => {
    expect(formatDueDate(d(2026, 6, 28), NOW)).toBe("내일");
  });
  it("어제이면 '어제'", () => {
    expect(formatDueDate(d(2026, 6, 26), NOW)).toBe("어제");
  });
  it("미래 날짜는 '월 일 (요일)' 형식", () => {
    const label = formatDueDate(d(2026, 7, 1), NOW);
    expect(label).toMatch(/7월/);
    expect(label).not.toContain("지연");
  });
  it("지난 날짜(어제 제외)는 '(지연)' 포함", () => {
    const label = formatDueDate(d(2026, 6, 20), NOW);
    expect(label).toContain("지연");
  });
  it("now 기본값은 현재 시각 (실행 중 오류 없음)", () => {
    expect(() => formatDueDate(new Date())).not.toThrow();
  });
});
