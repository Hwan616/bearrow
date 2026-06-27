import {
  buildMonthGrid,
  getEventsForDay,
  getMonthDateRange,
  isSameDay,
} from "../calendarUtils";
import { type Event } from "../../types";

// ── buildMonthGrid ────────────────────────────────────────────────────────────

describe("buildMonthGrid", () => {
  // 2026년 6월: 1일이 월요일(1), 패딩 1칸 → 30+1=31 → 5주=35칸
  const JUNE_2026 = { year: 2026, month: 5 };
  // 2026년 5월: 1일이 금요일(5), 패딩 5칸 → 31+5=36 → 6주=42칸
  const MAY_2026 = { year: 2026, month: 4 };

  it("반환 길이가 7의 배수다", () => {
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month);
    expect(grid.length % 7).toBe(0);
  });

  it("6월은 35칸(5주)이다", () => {
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month);
    expect(grid.length).toBe(35);
  });

  it("5월은 42칸(6주)이다", () => {
    const grid = buildMonthGrid(MAY_2026.year, MAY_2026.month);
    expect(grid.length).toBe(42);
  });

  it("첫 칸의 요일이 일요일(0)이다", () => {
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month);
    expect(grid[0]?.date.getDay()).toBe(0);
  });

  it("당월 날짜만 isCurrentMonth=true다", () => {
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month);
    grid.forEach(({ date, isCurrentMonth }) => {
      expect(isCurrentMonth).toBe(date.getMonth() === JUNE_2026.month);
    });
  });

  it("today와 일치하는 날만 isToday=true다", () => {
    const today = new Date(2026, 5, 15); // 6월 15일
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month, today);
    const todayCells = grid.filter((d) => d.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]?.date.getDate()).toBe(15);
  });

  it("today가 당월 밖이면 isToday=true인 칸이 없다", () => {
    const today = new Date(2026, 0, 1); // 1월 1일
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month, today);
    expect(grid.filter((d) => d.isToday)).toHaveLength(0);
  });

  it("연속된 날짜 순서를 가진다", () => {
    const grid = buildMonthGrid(JUNE_2026.year, JUNE_2026.month);
    for (let i = 1; i < grid.length; i++) {
      const diff =
        (grid[i]?.date.getTime() ?? 0) - (grid[i - 1]?.date.getTime() ?? 0);
      expect(diff).toBe(24 * 60 * 60 * 1000); // 1일 차이
    }
  });
});

// ── getMonthDateRange ─────────────────────────────────────────────────────────

describe("getMonthDateRange", () => {
  it("from이 그리드 첫 칸(일요일)의 자정이다", () => {
    const { from } = getMonthDateRange(2026, 5); // 6월, 1일=월요일 → 5월31일(일)부터
    expect(from.getDay()).toBe(0); // 일요일
    expect(from.getHours()).toBe(0);
  });

  it("to가 그리드 마지막 칸(토요일)의 23:59:59다", () => {
    const { to } = getMonthDateRange(2026, 5);
    expect(to.getDay()).toBe(6); // 토요일
    expect(to.getHours()).toBe(23);
  });

  it("from이 to보다 이전이다", () => {
    const { from, to } = getMonthDateRange(2026, 5);
    expect(from.getTime()).toBeLessThan(to.getTime());
  });
});

// ── isSameDay ─────────────────────────────────────────────────────────────────

describe("isSameDay", () => {
  it("같은 날짜면 true다", () => {
    expect(
      isSameDay(new Date(2026, 5, 15, 9, 0), new Date(2026, 5, 15, 23, 59)),
    ).toBe(true);
  });

  it("다른 날짜면 false다", () => {
    expect(isSameDay(new Date(2026, 5, 15), new Date(2026, 5, 16))).toBe(false);
  });

  it("같은 날이지만 다른 월이면 false다", () => {
    expect(isSameDay(new Date(2026, 4, 15), new Date(2026, 5, 15))).toBe(false);
  });
});

// ── getEventsForDay ───────────────────────────────────────────────────────────

const makeEvent = (
  startsAt: Date,
  endsAt: Date,
  overrides: Partial<Event> = {},
): Event => ({
  id: "evt-1",
  title: "테스트",
  note: null,
  isAllDay: false,
  startsAt,
  endsAt,
  categoryId: null,
  source: "local",
  externalId: null,
  reminderMinutes: null,
  rrule: null,
  recurringEventId: null,
  exceptionDate: null,
  isDeleted: false,
  updatedAt: new Date(),
  ...overrides,
});

describe("getEventsForDay", () => {
  const day = new Date(2026, 5, 15); // 6월 15일

  it("당일에 시작·종료하는 이벤트를 반환한다", () => {
    const event = makeEvent(
      new Date(2026, 5, 15, 10, 0),
      new Date(2026, 5, 15, 11, 0),
    );
    expect(getEventsForDay([event], day)).toHaveLength(1);
  });

  it("당일을 걸치는 다일 이벤트를 반환한다", () => {
    const event = makeEvent(
      new Date(2026, 5, 13),
      new Date(2026, 5, 17),
    );
    expect(getEventsForDay([event], day)).toHaveLength(1);
  });

  it("당일 이전에 끝난 이벤트는 반환하지 않는다", () => {
    const event = makeEvent(
      new Date(2026, 5, 13),
      new Date(2026, 5, 14, 23, 59),
    );
    expect(getEventsForDay([event], day)).toHaveLength(0);
  });

  it("당일 이후에 시작하는 이벤트는 반환하지 않는다", () => {
    const event = makeEvent(
      new Date(2026, 5, 16),
      new Date(2026, 5, 17),
    );
    expect(getEventsForDay([event], day)).toHaveLength(0);
  });

  it("이벤트가 없으면 빈 배열을 반환한다", () => {
    expect(getEventsForDay([], day)).toHaveLength(0);
  });

  it("여러 이벤트 중 해당 날만 필터링한다", () => {
    const events = [
      makeEvent(new Date(2026, 5, 15, 9, 0), new Date(2026, 5, 15, 10, 0), { id: "a" }),
      makeEvent(new Date(2026, 5, 16, 9, 0), new Date(2026, 5, 16, 10, 0), { id: "b" }),
      makeEvent(new Date(2026, 5, 14, 9, 0), new Date(2026, 5, 15, 8, 0), { id: "c" }),
    ];
    const result = getEventsForDay(events, day);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(expect.arrayContaining(["a", "c"]));
  });
});
