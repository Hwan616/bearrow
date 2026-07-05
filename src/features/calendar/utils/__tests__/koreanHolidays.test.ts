import { getHolidayName, getHolidaysForMonth } from "../koreanHolidays";

describe("getHolidayName", () => {
  describe("양력 고정 공휴일", () => {
    it.each([
      [1, 1, "신정"],
      [3, 1, "삼일절"],
      [5, 1, "근로자의날"],
      [5, 5, "어린이날"],
      [6, 6, "현충일"],
      [8, 15, "광복절"],
      [10, 3, "개천절"],
      [10, 9, "한글날"],
      [12, 25, "성탄절"],
    ])("%d월 %d일 → %s", (month, day, expected) => {
      const date = new Date(2026, month - 1, day);
      expect(getHolidayName(date)).toBe(expected);
    });
  });

  describe("음력 기반 공휴일 (2026년)", () => {
    it("설날 전날", () => expect(getHolidayName(new Date(2026, 1, 16))).toBe("설날 연휴"));
    it("설날", () => expect(getHolidayName(new Date(2026, 1, 17))).toBe("설날"));
    it("설날 다음날", () => expect(getHolidayName(new Date(2026, 1, 18))).toBe("설날 연휴"));
    it("부처님오신날", () => expect(getHolidayName(new Date(2026, 4, 24))).toBe("부처님오신날"));
    it("추석 전날", () => expect(getHolidayName(new Date(2026, 8, 24))).toBe("추석 연휴"));
    it("추석", () => expect(getHolidayName(new Date(2026, 8, 25))).toBe("추석"));
    it("추석 다음날", () => expect(getHolidayName(new Date(2026, 8, 26))).toBe("추석 연휴"));
  });

  describe("음력 기반 공휴일 — 다른 연도", () => {
    it("2025년 설날", () => expect(getHolidayName(new Date(2025, 0, 29))).toBe("설날"));
    it("2025년 추석", () => expect(getHolidayName(new Date(2025, 9, 6))).toBe("추석"));
    it("2027년 설날", () => expect(getHolidayName(new Date(2027, 1, 7))).toBe("설날"));
    it("2030년 추석", () => expect(getHolidayName(new Date(2030, 8, 12))).toBe("추석"));
  });

  describe("음력이 양력 공휴일보다 우선 적용 (겹치는 날짜)", () => {
    // 2025년 부처님오신날 = 5월 5일 (어린이날과 동일)
    it("2025-05-05는 어린이날이 아닌 부처님오신날", () => {
      expect(getHolidayName(new Date(2025, 4, 5))).toBe("부처님오신날");
    });
  });

  describe("공휴일이 아닌 날", () => {
    it("평일은 null", () => expect(getHolidayName(new Date(2026, 6, 6))).toBeNull());
    it("토요일 일반일은 null", () => expect(getHolidayName(new Date(2026, 6, 11))).toBeNull());
    it("설날 연휴 밖의 날은 null", () => expect(getHolidayName(new Date(2026, 1, 19))).toBeNull());
  });
});

describe("getHolidaysForMonth", () => {
  it("2026년 2월의 공휴일 맵을 반환한다", () => {
    const map = getHolidaysForMonth(2026, 1); // month 0-indexed
    expect(map.get(16)).toBe("설날 연휴");
    expect(map.get(17)).toBe("설날");
    expect(map.get(18)).toBe("설날 연휴");
    expect(map.size).toBe(3);
  });

  it("2026년 1월은 신정만 포함한다", () => {
    const map = getHolidaysForMonth(2026, 0);
    expect(map.get(1)).toBe("신정");
    expect(map.size).toBe(1);
  });

  it("공휴일 없는 달은 빈 맵을 반환한다", () => {
    const map = getHolidaysForMonth(2026, 3); // 4월 — 해당 연도 공휴일 없음
    expect(map.size).toBe(0);
  });

  it("해당 월의 일수만큼만 조회한다 (2월 28일/29일 경계)", () => {
    // 2026년 2월은 28일까지
    const map = getHolidaysForMonth(2026, 1);
    expect(map.has(29)).toBe(false);
  });
});
