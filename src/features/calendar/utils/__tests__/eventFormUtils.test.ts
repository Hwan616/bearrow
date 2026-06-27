import {
  makeDefaultValues,
  validateEventTimes,
  normalizeAllDayTimes,
  buildNewEvent,
  formatDateTimeLabel,
  mergeDateAndTime,
} from "../eventFormUtils";
import type { Event } from "../../types";

const makeDate = (h: number, m = 0) => {
  const d = new Date(2026, 5, 27); // 2026-06-27
  d.setHours(h, m, 0, 0);
  return d;
};

// ── makeDefaultValues ──────────────────────────────────────────────────────

describe("makeDefaultValues", () => {
  it("신규 이벤트: 다음 정시에서 시작해 1시간 후 종료", () => {
    const base = makeDate(14, 35); // 14:35
    const vals = makeDefaultValues(undefined, base);
    expect(vals.title).toBe("");
    expect(vals.isAllDay).toBe(false);
    expect(vals.note).toBe("");
    expect(vals.startsAt.getHours()).toBe(15); // 다음 정시
    expect(vals.startsAt.getMinutes()).toBe(0);
    expect(vals.endsAt.getHours()).toBe(16); // +1시간
  });

  it("신규 이벤트: 정시(00분)일 때 그 다음 정시", () => {
    const base = makeDate(10, 0);
    const vals = makeDefaultValues(undefined, base);
    expect(vals.startsAt.getHours()).toBe(11);
    expect(vals.endsAt.getHours()).toBe(12);
  });

  it("편집 이벤트: 기존 값을 그대로 반환", () => {
    const start = makeDate(9);
    const end = makeDate(10);
    const event = {
      id: "evt-1",
      title: "회의",
      isAllDay: false,
      startsAt: start,
      endsAt: end,
      note: "메모",
      categoryId: null,
      source: "local" as const,
      externalId: null,
      rrule: null,
      recurringEventId: null,
      exceptionDate: null,
      isDeleted: false,
      updatedAt: new Date(),
    } satisfies Event;

    const vals = makeDefaultValues(event);
    expect(vals.title).toBe("회의");
    expect(vals.isAllDay).toBe(false);
    expect(vals.startsAt).toBe(start);
    expect(vals.endsAt).toBe(end);
    expect(vals.note).toBe("메모");
  });

  it("편집 이벤트: note가 null이면 빈 문자열", () => {
    const event = {
      id: "evt-2",
      title: "점심",
      isAllDay: false,
      startsAt: makeDate(12),
      endsAt: makeDate(13),
      note: null,
      categoryId: null,
      source: "local" as const,
      externalId: null,
      rrule: null,
      recurringEventId: null,
      exceptionDate: null,
      isDeleted: false,
      updatedAt: new Date(),
    } satisfies Event;
    expect(makeDefaultValues(event).note).toBe("");
  });
});

// ── validateEventTimes ────────────────────────────────────────────────────

describe("validateEventTimes", () => {
  it("시작 < 종료이면 null 반환", () => {
    expect(validateEventTimes(makeDate(9), makeDate(10))).toBeNull();
  });

  it("종료 ≤ 시작이면 오류 메시지 반환", () => {
    expect(validateEventTimes(makeDate(10), makeDate(9))).not.toBeNull();
  });

  it("시작 === 종료이면 오류 메시지 반환", () => {
    const t = makeDate(10);
    expect(validateEventTimes(t, t)).not.toBeNull();
  });
});

// ── normalizeAllDayTimes ──────────────────────────────────────────────────

describe("normalizeAllDayTimes", () => {
  it("시작은 자정(00:00:00), 종료는 23:59:59.999로 설정", () => {
    const { startsAt, endsAt } = normalizeAllDayTimes(makeDate(9), makeDate(10));
    expect(startsAt.getHours()).toBe(0);
    expect(startsAt.getMinutes()).toBe(0);
    expect(endsAt.getHours()).toBe(23);
    expect(endsAt.getMinutes()).toBe(59);
    expect(endsAt.getSeconds()).toBe(59);
  });

  it("원본 Date를 변경하지 않는다 (불변)", () => {
    const orig = makeDate(9);
    normalizeAllDayTimes(orig, makeDate(10));
    expect(orig.getHours()).toBe(9);
  });
});

// ── buildNewEvent ─────────────────────────────────────────────────────────

describe("buildNewEvent", () => {
  const now = makeDate(8);

  it("일반 이벤트 빌드", () => {
    const result = buildNewEvent(
      "uuid-1",
      { title: "  팀 회의  ", isAllDay: false, startsAt: makeDate(9), endsAt: makeDate(10), note: "  메모  ", recurrence: "none" as const },
      now,
    );
    expect(result.id).toBe("uuid-1");
    expect(result.title).toBe("팀 회의"); // trim
    expect(result.note).toBe("메모"); // trim
    expect(result.isAllDay).toBe(false);
    expect(result.source).toBe("local");
    expect(result.categoryId).toBeNull();
    expect(result.externalId).toBeNull();
    expect(result.updatedAt).toBe(now);
  });

  it("note가 공백만이면 null로 저장", () => {
    const result = buildNewEvent(
      "uuid-2",
      { title: "점심", isAllDay: false, startsAt: makeDate(12), endsAt: makeDate(13), note: "   ", recurrence: "none" as const },
      now,
    );
    expect(result.note).toBeNull();
  });

  it("종일 이벤트는 시각이 자정/23:59로 정규화된다", () => {
    const result = buildNewEvent(
      "uuid-3",
      { title: "출장", isAllDay: true, startsAt: makeDate(9), endsAt: makeDate(10), note: "", recurrence: "none" as const },
      now,
    );
    expect(result.isAllDay).toBe(true);
    expect(result.startsAt.getHours()).toBe(0);
    expect(result.endsAt.getHours()).toBe(23);
  });
});

// ── formatDateTimeLabel ───────────────────────────────────────────────────

describe("formatDateTimeLabel", () => {
  it("isAllDay=false이면 날짜와 시각 모두 포함", () => {
    const label = formatDateTimeLabel(makeDate(14, 30), false);
    expect(label).toContain("2026");
    expect(label).toContain("6");
    expect(label).toContain("27");
    expect(label).toMatch(/오후|2:30/);
  });

  it("isAllDay=true이면 날짜만 포함", () => {
    const label = formatDateTimeLabel(makeDate(9), true);
    expect(label).toContain("2026");
    expect(label).not.toMatch(/오전|오후/);
  });
});

// ── mergeDateAndTime ──────────────────────────────────────────────────────

describe("mergeDateAndTime", () => {
  it("datePart의 날짜에 timePart의 시각을 합친다", () => {
    const datePart = new Date(2026, 5, 27); // 2026-06-27
    const timePart = makeDate(15, 30);
    const merged = mergeDateAndTime(datePart, timePart);
    expect(merged.getFullYear()).toBe(2026);
    expect(merged.getMonth()).toBe(5);
    expect(merged.getDate()).toBe(27);
    expect(merged.getHours()).toBe(15);
    expect(merged.getMinutes()).toBe(30);
  });

  it("원본을 변경하지 않는다 (불변)", () => {
    const datePart = new Date(2026, 5, 27);
    mergeDateAndTime(datePart, makeDate(10));
    expect(datePart.getHours()).toBe(0);
  });
});
