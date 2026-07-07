import {
  buildRRuleString,
  expandRecurringEvent,
  isSameDateKey,
  parseRRuleDescription,
  parseRRuleEnd,
  parseRRuleToOption,
  stripRRuleEnd,
} from "../rruleUtils";
import type { Event } from "../../types";

// 테스트용 최소 Event 팩토리
function makeEvent(overrides: Partial<Event> = {}): Event {
  const base = new Date(2026, 5, 1, 9, 0, 0); // 2026-06-01 09:00 (월)
  return {
    id: "evt-1",
    title: "회의",
    isAllDay: false,
    startsAt: base,
    endsAt: new Date(base.getTime() + 60 * 60 * 1000), // +1시간
    note: null,
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
  };
}

// ── buildRRuleString ──────────────────────────────────────────────────────

describe("buildRRuleString", () => {
  it("daily → FREQ=DAILY", () => {
    const result = buildRRuleString("daily", new Date(2026, 5, 1));
    expect(result).toBe("FREQ=DAILY");
  });

  it("weekly 월요일 → FREQ=WEEKLY;BYDAY=MO", () => {
    const monday = new Date(2026, 5, 1); // 2026-06-01은 월요일
    expect(monday.getDay()).toBe(1);
    expect(buildRRuleString("weekly", monday)).toBe("FREQ=WEEKLY;BYDAY=MO");
  });

  it("weekly 금요일 → FREQ=WEEKLY;BYDAY=FR", () => {
    const friday = new Date(2026, 5, 5); // 2026-06-05는 금요일
    expect(friday.getDay()).toBe(5);
    expect(buildRRuleString("weekly", friday)).toBe("FREQ=WEEKLY;BYDAY=FR");
  });

  it("monthly 15일 → FREQ=MONTHLY;BYMONTHDAY=15", () => {
    expect(buildRRuleString("monthly", new Date(2026, 5, 15))).toBe(
      "FREQ=MONTHLY;BYMONTHDAY=15",
    );
  });

  it("biweekly 월요일 → FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", () => {
    const monday = new Date(2026, 5, 1);
    expect(buildRRuleString("biweekly", monday)).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO");
  });

  it("yearly → FREQ=YEARLY", () => {
    expect(buildRRuleString("yearly", new Date(2026, 5, 1))).toBe("FREQ=YEARLY");
  });

  it("count 종료 조건 → ;COUNT=N 추가", () => {
    expect(buildRRuleString("daily", new Date(2026, 5, 1), { type: "count", count: 10 })).toBe(
      "FREQ=DAILY;COUNT=10",
    );
  });

  it("until 종료 조건 → ;UNTIL=YYYYMMDDT235959Z 추가", () => {
    expect(
      buildRRuleString("daily", new Date(2026, 5, 1), { type: "until", date: new Date(2026, 11, 31) }),
    ).toBe("FREQ=DAILY;UNTIL=20261231T235959Z");
  });
});

// ── parseRRuleToOption ────────────────────────────────────────────────────

describe("parseRRuleToOption", () => {
  it("null → none", () => {
    expect(parseRRuleToOption(null)).toBe("none");
  });
  it("FREQ=DAILY → daily", () => {
    expect(parseRRuleToOption("FREQ=DAILY")).toBe("daily");
  });
  it("FREQ=WEEKLY → weekly", () => {
    expect(parseRRuleToOption("FREQ=WEEKLY;BYDAY=MO")).toBe("weekly");
  });
  it("FREQ=WEEKLY;INTERVAL=2 → biweekly", () => {
    expect(parseRRuleToOption("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO")).toBe("biweekly");
  });
  it("FREQ=MONTHLY → monthly", () => {
    expect(parseRRuleToOption("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("monthly");
  });
  it("FREQ=YEARLY → yearly", () => {
    expect(parseRRuleToOption("FREQ=YEARLY")).toBe("yearly");
  });
});

// ── parseRRuleEnd ─────────────────────────────────────────────────────────

describe("parseRRuleEnd", () => {
  it("null → never", () => {
    expect(parseRRuleEnd(null)).toEqual({ type: "never" });
  });
  it("COUNT 없음 → never", () => {
    expect(parseRRuleEnd("FREQ=DAILY")).toEqual({ type: "never" });
  });
  it("COUNT=5 → count 5", () => {
    expect(parseRRuleEnd("FREQ=DAILY;COUNT=5")).toEqual({ type: "count", count: 5 });
  });
  it("UNTIL=20261231T235959Z → until 날짜", () => {
    const result = parseRRuleEnd("FREQ=DAILY;UNTIL=20261231T235959Z");
    expect(result.type).toBe("until");
    if (result.type === "until") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(result.date.getMonth()).toBe(11);
      expect(result.date.getDate()).toBe(31);
    }
  });
});

// ── stripRRuleEnd ─────────────────────────────────────────────────────────

describe("stripRRuleEnd", () => {
  it("COUNT 제거", () => {
    expect(stripRRuleEnd("FREQ=DAILY;COUNT=10")).toBe("FREQ=DAILY");
  });
  it("UNTIL 제거", () => {
    expect(stripRRuleEnd("FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T235959Z")).toBe(
      "FREQ=WEEKLY;BYDAY=MO",
    );
  });
  it("종료 조건 없으면 그대로", () => {
    expect(stripRRuleEnd("FREQ=DAILY")).toBe("FREQ=DAILY");
  });
});

// ── parseRRuleDescription ─────────────────────────────────────────────────

describe("parseRRuleDescription", () => {
  it("FREQ=DAILY → '매일'", () => {
    expect(parseRRuleDescription("FREQ=DAILY")).toBe("매일");
  });

  it("FREQ=WEEKLY;BYDAY=MO → '매주 월'", () => {
    expect(parseRRuleDescription("FREQ=WEEKLY;BYDAY=MO")).toBe("매주 월");
  });

  it("FREQ=WEEKLY;BYDAY=MO,WE,FR → '매주 월·수·금'", () => {
    expect(parseRRuleDescription("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe(
      "매주 월·수·금",
    );
  });

  it("FREQ=MONTHLY;BYMONTHDAY=15 → '매월 15일'", () => {
    expect(parseRRuleDescription("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("매월 15일");
  });

  it("FREQ=MONTHLY (BYMONTHDAY 없음) → '매월'", () => {
    expect(parseRRuleDescription("FREQ=MONTHLY")).toBe("매월");
  });
});

// ── isSameDateKey ─────────────────────────────────────────────────────────

describe("isSameDateKey", () => {
  it("같은 날짜·다른 시각 → true", () => {
    expect(isSameDateKey(new Date(2026, 5, 1, 9, 0), new Date(2026, 5, 1, 18, 0))).toBe(true);
  });

  it("다른 날짜 → false", () => {
    expect(isSameDateKey(new Date(2026, 5, 1), new Date(2026, 5, 2))).toBe(false);
  });

  it("다른 달 → false", () => {
    expect(isSameDateKey(new Date(2026, 5, 1), new Date(2026, 6, 1))).toBe(false);
  });
});

// ── expandRecurringEvent ──────────────────────────────────────────────────

describe("expandRecurringEvent", () => {
  it("rrule 없는 이벤트 → 빈 배열", () => {
    const event = makeEvent({ rrule: null });
    expect(expandRecurringEvent(event, new Date(2026, 5, 1), new Date(2026, 5, 7), [])).toHaveLength(0);
  });

  it("FREQ=DAILY — 3일 범위에 3개 인스턴스", () => {
    const master = makeEvent({
      startsAt: new Date(2026, 5, 1, 9, 0),
      endsAt: new Date(2026, 5, 1, 10, 0),
      rrule: "FREQ=DAILY",
    });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 1),
      new Date(2026, 5, 3),
      [],
    );
    expect(instances).toHaveLength(3);
    // 각 인스턴스 시각이 원본과 동일한지 확인
    for (const inst of instances) {
      expect(inst.startsAt.getHours()).toBe(9);
      expect(inst.startsAt.getMinutes()).toBe(0);
    }
    // 날짜가 순서대로 생성됐는지
    expect(instances[0]!.startsAt.getDate()).toBe(1);
    expect(instances[1]!.startsAt.getDate()).toBe(2);
    expect(instances[2]!.startsAt.getDate()).toBe(3);
  });

  it("FREQ=WEEKLY;BYDAY=MO — 2주 범위에 2개 인스턴스 (월요일만)", () => {
    const master = makeEvent({
      startsAt: new Date(2026, 5, 1, 9, 0), // 2026-06-01 월요일
      endsAt: new Date(2026, 5, 1, 10, 0),
      rrule: "FREQ=WEEKLY;BYDAY=MO",
    });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 1),
      new Date(2026, 5, 14), // 2주
      [],
    );
    expect(instances).toHaveLength(2);
    // 두 인스턴스 모두 월요일인지
    for (const inst of instances) {
      expect(inst.startsAt.getDay()).toBe(1);
    }
  });

  it("FREQ=MONTHLY;BYMONTHDAY=1 — 3개월 범위에 3개 인스턴스", () => {
    const master = makeEvent({
      startsAt: new Date(2026, 5, 1, 9, 0),
      endsAt: new Date(2026, 5, 1, 10, 0),
      rrule: "FREQ=MONTHLY;BYMONTHDAY=1",
    });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 1),
      new Date(2026, 7, 31), // 6~8월
      [],
    );
    expect(instances).toHaveLength(3);
    for (const inst of instances) {
      expect(inst.startsAt.getDate()).toBe(1);
    }
  });

  it("가상 ID — master.id + ':' + utcMs 형식", () => {
    const master = makeEvent({ rrule: "FREQ=DAILY" });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 1),
      new Date(2026, 5, 1),
      [],
    );
    expect(instances[0]!.id).toMatch(/^evt-1:/);
  });

  it("삭제 예외 — 해당 날짜 인스턴스 제외", () => {
    const master = makeEvent({
      startsAt: new Date(2026, 5, 1, 9, 0),
      endsAt: new Date(2026, 5, 1, 10, 0),
      rrule: "FREQ=DAILY",
    });
    const deletedException = makeEvent({
      id: "exc-del",
      recurringEventId: "evt-1",
      exceptionDate: new Date(2026, 5, 2), // 6월 2일 삭제
      isDeleted: true,
    });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 1),
      new Date(2026, 5, 3),
      [deletedException],
    );
    expect(instances).toHaveLength(2); // 3개 중 6/2 제외
    expect(instances.every((i) => i.startsAt.getDate() !== 2)).toBe(true);
  });

  it("수정 예외 — 해당 날짜 인스턴스를 수정 버전으로 대체", () => {
    const master = makeEvent({
      startsAt: new Date(2026, 5, 1, 9, 0),
      endsAt: new Date(2026, 5, 1, 10, 0),
      rrule: "FREQ=DAILY",
    });
    const modifiedException = makeEvent({
      id: "exc-mod",
      title: "수정된 회의",
      startsAt: new Date(2026, 5, 2, 14, 0), // 이동된 시각
      endsAt: new Date(2026, 5, 2, 15, 0),
      recurringEventId: "evt-1",
      exceptionDate: new Date(2026, 5, 2), // 6월 2일 수정
      isDeleted: false,
    });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 1),
      new Date(2026, 5, 3),
      [modifiedException],
    );
    expect(instances).toHaveLength(3); // 총 3개 (수정된 것 포함)
    const june2 = instances.find((i) => i.startsAt.getDate() === 2);
    expect(june2?.title).toBe("수정된 회의");
    expect(june2?.id).toBe("exc-mod");
  });

  it("범위 밖 인스턴스는 포함하지 않음", () => {
    const master = makeEvent({
      startsAt: new Date(2026, 5, 1, 9, 0),
      endsAt: new Date(2026, 5, 1, 10, 0),
      rrule: "FREQ=DAILY",
    });
    const instances = expandRecurringEvent(
      master,
      new Date(2026, 5, 3), // 6/3부터
      new Date(2026, 5, 4), // 6/4까지
      [],
    );
    expect(instances).toHaveLength(2);
    expect(instances[0]!.startsAt.getDate()).toBe(3);
    expect(instances[1]!.startsAt.getDate()).toBe(4);
  });
});
