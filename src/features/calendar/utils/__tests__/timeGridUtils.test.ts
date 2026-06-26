import {
  buildWeekDays,
  durationToHeight,
  formatHour,
  formatWeekDayHeader,
  getAllDayEvents,
  getTimedEvents,
  getWeekDateRange,
  HOUR_HEIGHT,
  timeToTopOffset,
} from "../timeGridUtils";

// ── buildWeekDays ─────────────────────────────────────────────────────────────

describe("buildWeekDays", () => {
  // 2026-06-15 = 월요일
  const monday = new Date(2026, 5, 15);

  it("항상 7일을 반환한다", () => {
    expect(buildWeekDays(monday)).toHaveLength(7);
  });

  it("첫째 날이 일요일(0)이다", () => {
    const days = buildWeekDays(monday);
    expect(days[0]?.date.getDay()).toBe(0);
  });

  it("마지막 날이 토요일(6)이다", () => {
    const days = buildWeekDays(monday);
    expect(days[6]?.date.getDay()).toBe(6);
  });

  it("입력 날짜가 속한 주의 일~토를 반환한다", () => {
    const days = buildWeekDays(monday);
    // 2026-06-15(월) → 일요일은 2026-06-14
    expect(days[0]?.date.getDate()).toBe(14);
    expect(days[6]?.date.getDate()).toBe(20);
  });

  it("today와 일치하는 날만 isToday=true다", () => {
    const today = new Date(2026, 5, 15);
    const days = buildWeekDays(monday, today);
    const todayItems = days.filter((d) => d.isToday);
    expect(todayItems).toHaveLength(1);
    expect(todayItems[0]?.date.getDay()).toBe(1); // 월요일
  });

  it("일요일 입력 시 같은 주 일요일부터 시작한다", () => {
    const sunday = new Date(2026, 5, 14);
    const days = buildWeekDays(sunday);
    expect(days[0]?.date.getDate()).toBe(14);
  });
});

// ── getWeekDateRange ──────────────────────────────────────────────────────────

describe("getWeekDateRange", () => {
  const monday = new Date(2026, 5, 15);

  it("from이 해당 주 일요일 자정이다", () => {
    const { from } = getWeekDateRange(monday);
    expect(from.getDay()).toBe(0);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
  });

  it("to가 해당 주 토요일 23:59:59다", () => {
    const { to } = getWeekDateRange(monday);
    expect(to.getDay()).toBe(6);
    expect(to.getHours()).toBe(23);
    expect(to.getSeconds()).toBe(59);
  });

  it("from < to다", () => {
    const { from, to } = getWeekDateRange(monday);
    expect(from.getTime()).toBeLessThan(to.getTime());
  });
});

// ── timeToTopOffset ───────────────────────────────────────────────────────────

describe("timeToTopOffset", () => {
  it("자정(00:00)은 0이다", () => {
    expect(timeToTopOffset(new Date(2026, 5, 15, 0, 0))).toBe(0);
  });

  it("정오(12:00)는 HOUR_HEIGHT * 12다", () => {
    expect(timeToTopOffset(new Date(2026, 5, 15, 12, 0))).toBe(HOUR_HEIGHT * 12);
  });

  it("30분은 HOUR_HEIGHT / 2다", () => {
    expect(timeToTopOffset(new Date(2026, 5, 15, 0, 30))).toBe(HOUR_HEIGHT / 2);
  });
});

// ── durationToHeight ──────────────────────────────────────────────────────────

describe("durationToHeight", () => {
  const base = new Date(2026, 5, 15, 10, 0);

  it("1시간 이벤트 높이 = HOUR_HEIGHT다", () => {
    const end = new Date(2026, 5, 15, 11, 0);
    expect(durationToHeight(base, end)).toBe(HOUR_HEIGHT);
  });

  it("30분 이벤트 높이 = HOUR_HEIGHT / 2다", () => {
    const end = new Date(2026, 5, 15, 10, 30);
    expect(durationToHeight(base, end)).toBe(HOUR_HEIGHT / 2);
  });

  it("매우 짧은 이벤트는 최소 20px이다", () => {
    const end = new Date(2026, 5, 15, 10, 1); // 1분
    expect(durationToHeight(base, end)).toBe(20);
  });
});

// ── formatHour ────────────────────────────────────────────────────────────────

describe("formatHour", () => {
  it("한 자리 시간을 0 패딩한다", () => {
    expect(formatHour(0)).toBe("00:00");
    expect(formatHour(9)).toBe("09:00");
  });

  it("두 자리 시간은 그대로다", () => {
    expect(formatHour(12)).toBe("12:00");
    expect(formatHour(23)).toBe("23:00");
  });
});

// ── formatWeekDayHeader ───────────────────────────────────────────────────────

describe("formatWeekDayHeader", () => {
  it("월요일을 올바르게 포맷한다", () => {
    const monday = new Date(2026, 5, 15); // 6월 15일 월요일
    expect(formatWeekDayHeader(monday)).toEqual({ short: "월", date: 15 });
  });

  it("일요일을 올바르게 포맷한다", () => {
    const sunday = new Date(2026, 5, 14);
    expect(formatWeekDayHeader(sunday)).toEqual({ short: "일", date: 14 });
  });
});

// ── getAllDayEvents / getTimedEvents ──────────────────────────────────────────

const day = new Date(2026, 5, 15);
const allDayEvent = {
  isAllDay: true,
  startsAt: new Date(2026, 5, 15, 0, 0),
  endsAt: new Date(2026, 5, 15, 23, 59, 59),
};
const timedEvent = {
  isAllDay: false,
  startsAt: new Date(2026, 5, 15, 10, 0),
  endsAt: new Date(2026, 5, 15, 11, 0),
};
const otherDayEvent = {
  isAllDay: false,
  startsAt: new Date(2026, 5, 16, 10, 0),
  endsAt: new Date(2026, 5, 16, 11, 0),
};

describe("getAllDayEvents", () => {
  it("종일 이벤트만 반환한다", () => {
    expect(getAllDayEvents([allDayEvent, timedEvent], day)).toHaveLength(1);
  });

  it("다른 날 이벤트는 반환하지 않는다", () => {
    const other = { ...allDayEvent, startsAt: new Date(2026, 5, 16), endsAt: new Date(2026, 5, 16) };
    expect(getAllDayEvents([other], day)).toHaveLength(0);
  });
});

describe("getTimedEvents", () => {
  it("시간 지정 이벤트만 반환한다", () => {
    expect(getTimedEvents([allDayEvent, timedEvent], day)).toHaveLength(1);
  });

  it("다른 날 이벤트는 반환하지 않는다", () => {
    expect(getTimedEvents([otherDayEvent], day)).toHaveLength(0);
  });
});
