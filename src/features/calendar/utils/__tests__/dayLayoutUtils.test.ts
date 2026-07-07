import { layoutTimedEvents } from "../dayLayoutUtils";
import type { Event } from "../../types";

// 테스트용 최소 Event 팩토리 (시:분만 지정)
function makeEvent(id: string, startH: number, startM: number, endH: number, endM: number): Event {
  const base = new Date(2026, 6, 8);
  const startsAt = new Date(base);
  startsAt.setHours(startH, startM, 0, 0);
  const endsAt = new Date(base);
  endsAt.setHours(endH, endM, 0, 0);
  return {
    id,
    title: id,
    isAllDay: false,
    startsAt,
    endsAt,
    note: null,
    categoryId: null,
    source: "local",
    externalId: null,
    reminderMinutes: null,
    rrule: null,
    recurringEventId: null,
    exceptionDate: null,
    isDeleted: false,
    updatedAt: base,
  };
}

function byId(layouts: ReturnType<typeof layoutTimedEvents>) {
  return new Map(layouts.map((l) => [l.event.id, l]));
}

describe("layoutTimedEvents", () => {
  it("겹치지 않는 이벤트는 각각 단일 컬럼(전체 너비)", () => {
    const events = [makeEvent("a", 9, 0, 10, 0), makeEvent("b", 11, 0, 12, 0)];
    const map = byId(layoutTimedEvents(events));
    expect(map.get("a")).toMatchObject({ colIndex: 0, colCount: 1 });
    expect(map.get("b")).toMatchObject({ colIndex: 0, colCount: 1 });
  });

  it("두 이벤트가 겹치면 2등분, 먼저 시작한 쪽이 왼쪽", () => {
    const events = [makeEvent("a", 9, 0, 10, 30), makeEvent("b", 9, 30, 11, 0)];
    const map = byId(layoutTimedEvents(events));
    expect(map.get("a")).toMatchObject({ colIndex: 0, colCount: 2 });
    expect(map.get("b")).toMatchObject({ colIndex: 1, colCount: 2 });
  });

  it("세 이벤트 동시 겹침 → 3등분", () => {
    const events = [
      makeEvent("a", 9, 0, 11, 0),
      makeEvent("b", 9, 30, 11, 0),
      makeEvent("c", 10, 0, 11, 0),
    ];
    const map = byId(layoutTimedEvents(events));
    expect(map.get("a")).toMatchObject({ colIndex: 0, colCount: 3 });
    expect(map.get("b")).toMatchObject({ colIndex: 1, colCount: 3 });
    expect(map.get("c")).toMatchObject({ colIndex: 2, colCount: 3 });
  });

  it("연쇄 겹침(A-B, B-C, A∦C)은 컬럼 재사용으로 2등분 유지", () => {
    // A 9:00-10:00, B 9:30-10:30, C 10:15-11:00
    // A와 C는 안 겹침 → C는 A의 컬럼(0) 재사용, 최대 동시 겹침 2
    const events = [
      makeEvent("a", 9, 0, 10, 0),
      makeEvent("b", 9, 30, 10, 30),
      makeEvent("c", 10, 15, 11, 0),
    ];
    const map = byId(layoutTimedEvents(events));
    expect(map.get("a")).toMatchObject({ colIndex: 0, colCount: 2 });
    expect(map.get("b")).toMatchObject({ colIndex: 1, colCount: 2 });
    expect(map.get("c")).toMatchObject({ colIndex: 0, colCount: 2 });
  });

  it("맞닿은 이벤트(끝==시작)는 겹치지 않아 별도 컬럼 없이 전체 너비", () => {
    const events = [makeEvent("a", 9, 0, 10, 0), makeEvent("b", 10, 0, 11, 0)];
    const map = byId(layoutTimedEvents(events));
    expect(map.get("a")).toMatchObject({ colIndex: 0, colCount: 1 });
    expect(map.get("b")).toMatchObject({ colIndex: 0, colCount: 1 });
  });

  it("최소 표시 길이(30분) 때문에 짧은 이벤트도 겹침으로 처리", () => {
    // a 9:00-9:10 이지만 최소 30분 → 9:00-9:30, b 9:15 시작 → 겹침
    const events = [makeEvent("a", 9, 0, 9, 10), makeEvent("b", 9, 15, 10, 0)];
    const map = byId(layoutTimedEvents(events));
    expect(map.get("a")).toMatchObject({ colCount: 2 });
    expect(map.get("b")).toMatchObject({ colCount: 2 });
  });

  it("빈 배열 → 빈 결과", () => {
    expect(layoutTimedEvents([])).toEqual([]);
  });
});
