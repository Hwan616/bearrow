import { mapGoogleEventToLocal, mapLocalEventToGoogle } from "../googleCalendarUtils";
import type { GoogleEventItem } from "../googleCalendarApi";
import type { LocalEventForPush } from "../googleCalendarUtils";

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "new-uuid") }));

// ── 픽스처 ────────────────────────────────────────────────────────────────────

const timedItem: GoogleEventItem = {
  id: "g-event-1",
  summary: "팀 미팅",
  description: "주간 회의",
  status: "confirmed",
  updated: "2026-06-27T10:00:00Z",
  start: { dateTime: "2026-06-27T09:00:00Z" },
  end: { dateTime: "2026-06-27T10:00:00Z" },
};

const allDayItem: GoogleEventItem = {
  id: "g-event-2",
  summary: "휴가",
  status: "confirmed",
  updated: "2026-06-27T00:00:00Z",
  start: { date: "2026-06-28" },
  end: { date: "2026-06-29" },
};

const cancelledItem: GoogleEventItem = {
  id: "g-event-3",
  status: "cancelled",
  updated: "2026-06-27T11:00:00Z",
  start: { dateTime: "2026-06-27T12:00:00Z" },
  end: { dateTime: "2026-06-27T13:00:00Z" },
};

// ── mapGoogleEventToLocal ─────────────────────────────────────────────────────

describe("mapGoogleEventToLocal", () => {
  it("시간 있는 이벤트를 로컬 형식으로 변환한다", () => {
    const result = mapGoogleEventToLocal(timedItem);
    expect(result).toMatchObject({
      title: "팀 미팅",
      note: "주간 회의",
      isAllDay: 0,
      source: "google",
      externalId: "g-event-1",
      isDeleted: 0,
    });
    expect(result.startsAt).toBe(new Date("2026-06-27T09:00:00Z").getTime());
    expect(result.endsAt).toBe(new Date("2026-06-27T10:00:00Z").getTime());
  });

  it("종일 이벤트는 isAllDay=1 로 변환한다", () => {
    const result = mapGoogleEventToLocal(allDayItem);
    expect(result.isAllDay).toBe(1);
    expect(result.startsAt).toBe(new Date("2026-06-28").getTime());
  });

  it("cancelled 이벤트는 isDeleted=1 로 변환한다", () => {
    const result = mapGoogleEventToLocal(cancelledItem);
    expect(result.isDeleted).toBe(1);
  });

  it("existingLocalId 가 있으면 그것을 사용한다", () => {
    const result = mapGoogleEventToLocal(timedItem, "existing-id");
    expect(result.id).toBe("existing-id");
  });

  it("existingLocalId 가 없으면 새 UUID를 사용한다", () => {
    const result = mapGoogleEventToLocal(timedItem);
    expect(result.id).toBe("new-uuid");
  });

  it("summary 없으면 기본 제목을 사용한다", () => {
    const result = mapGoogleEventToLocal({ ...timedItem, summary: undefined });
    expect(result.title).toBe("(제목 없음)");
  });
});

// ── mapLocalEventToGoogle ─────────────────────────────────────────────────────

const timedLocalEvent: LocalEventForPush = {
  id: "local-1",
  title: "약속",
  note: "메모",
  isAllDay: 0,
  startsAt: new Date("2026-06-27T09:00:00Z").getTime(),
  endsAt: new Date("2026-06-27T10:00:00Z").getTime(),
  externalId: null,
  isDeleted: 0,
};

const allDayLocalEvent: LocalEventForPush = {
  ...timedLocalEvent,
  isAllDay: 1,
  startsAt: new Date("2026-06-28").getTime(),
  endsAt: new Date("2026-06-29").getTime(),
};

describe("mapLocalEventToGoogle", () => {
  it("시간 있는 이벤트를 Google API 바디로 변환한다", () => {
    const body = mapLocalEventToGoogle(timedLocalEvent);
    expect(body["summary"]).toBe("약속");
    expect(body["description"]).toBe("메모");
    expect((body["start"] as Record<string, string>)["dateTime"]).toBeDefined();
    expect((body["start"] as Record<string, string>)["date"]).toBeUndefined();
  });

  it("종일 이벤트는 date 형식으로 변환한다", () => {
    const body = mapLocalEventToGoogle(allDayLocalEvent);
    expect((body["start"] as Record<string, string>)["date"]).toBeDefined();
    expect((body["start"] as Record<string, string>)["dateTime"]).toBeUndefined();
  });

  it("note 가 없으면 description 필드를 포함하지 않는다", () => {
    const body = mapLocalEventToGoogle({ ...timedLocalEvent, note: null });
    expect(body["description"]).toBeUndefined();
  });
});
