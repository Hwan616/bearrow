import { pullFromGoogle, pushToGoogle, syncGoogleCalendar } from "../googleCalendarSync";
import { GoogleSyncTokenExpiredError } from "../googleCalendarApi";

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockGoogleFetchEvents = jest.fn();
const mockGoogleCreateEvent = jest.fn();
const mockGoogleUpdateEvent = jest.fn();
const mockGoogleDeleteEvent = jest.fn();

jest.mock("../googleCalendarApi", () => ({
  GoogleSyncTokenExpiredError: class extends Error {},
  googleFetchEvents: (...args: unknown[]) => mockGoogleFetchEvents(...args),
  googleCreateEvent: (...args: unknown[]) => mockGoogleCreateEvent(...args),
  googleUpdateEvent: (...args: unknown[]) => mockGoogleUpdateEvent(...args),
  googleDeleteEvent: (...args: unknown[]) => mockGoogleDeleteEvent(...args),
}));

const mockGetSyncMeta = jest.fn();
const mockSetSyncMeta = jest.fn();

jest.mock("../queue", () => ({
  getSyncMeta: (k: string) => mockGetSyncMeta(k),
  setSyncMeta: (k: string, v: string) => mockSetSyncMeta(k, v),
}));

const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();

jest.mock("@/db/client", () => ({
  sqliteDb: {
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
  },
}));

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "new-local-uuid") }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSyncMeta.mockResolvedValue(null);
  mockSetSyncMeta.mockResolvedValue(undefined);
  mockRunAsync.mockResolvedValue(undefined);
  mockGetFirstAsync.mockResolvedValue(null);
  mockGetAllAsync.mockResolvedValue([]);
});

const serverEvent = {
  id: "g-1",
  summary: "Google 이벤트",
  status: "confirmed" as const,
  updated: "2026-06-27T10:00:00Z",
  start: { dateTime: "2026-06-27T09:00:00Z" },
  end: { dateTime: "2026-06-27T10:00:00Z" },
};

// ── pullFromGoogle ─────────────────────────────────────────────────────────────

describe("pullFromGoogle", () => {
  it("첫 sync 시 syncToken 없이 전체 조회한다", async () => {
    mockGoogleFetchEvents.mockResolvedValue({
      items: [serverEvent],
      nextSyncToken: "new-sync-token",
    });

    const pulled = await pullFromGoogle("access-token");

    expect(pulled).toBe(1);
    // syncToken 없이 호출됐는지 확인
    expect(mockGoogleFetchEvents).toHaveBeenCalledWith("access-token", null, null);
    // 새 syncToken 저장
    expect(mockSetSyncMeta).toHaveBeenCalledWith("google_pull_sync_token", "new-sync-token");
    // 로컬 DB에 upsert
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO events"),
      expect.arrayContaining(["new-local-uuid", "Google 이벤트"]),
    );
  });

  it("410 에러 시 syncToken 초기화 후 전체 동기화한다", async () => {
    mockGetSyncMeta.mockResolvedValue("expired-token");
    mockGoogleFetchEvents
      .mockRejectedValueOnce(new GoogleSyncTokenExpiredError())
      .mockResolvedValueOnce({ items: [serverEvent], nextSyncToken: "fresh-token" });

    const pulled = await pullFromGoogle("access-token");

    expect(pulled).toBe(1);
    expect(mockSetSyncMeta).toHaveBeenCalledWith("google_pull_sync_token", "");
    expect(mockSetSyncMeta).toHaveBeenCalledWith("google_pull_sync_token", "fresh-token");
  });

  it("로컬이 더 최신이면 upsert 하지 않는다", async () => {
    mockGoogleFetchEvents.mockResolvedValue({ items: [serverEvent], nextSyncToken: "tok" });
    // 로컬 updated_at 이 서버보다 큼
    mockGetFirstAsync.mockResolvedValue({ id: "local-id", updated_at: 9999999999999 });

    await pullFromGoogle("access-token");

    expect(mockRunAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO events"),
      expect.anything(),
    );
  });
});

// ── pushToGoogle ──────────────────────────────────────────────────────────────

describe("pushToGoogle", () => {
  it("externalId 없는 신규 이벤트를 Google에 생성하고 external_id를 저장한다", async () => {
    mockGetAllAsync.mockResolvedValue([
      { id: "local-1", title: "새 일정", note: null, isAllDay: 0,
        startsAt: 1000, endsAt: 2000, externalId: null, isDeleted: 0 },
    ]);
    mockGoogleCreateEvent.mockResolvedValue("g-new-id");

    const pushed = await pushToGoogle("access-token");

    expect(pushed).toBe(1);
    expect(mockGoogleCreateEvent).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE events SET external_id"),
      ["g-new-id", "local-1"],
    );
  });

  it("externalId 있는 이벤트를 Google에서 수정한다", async () => {
    mockGetAllAsync.mockResolvedValue([
      { id: "local-2", title: "수정된 일정", note: null, isAllDay: 0,
        startsAt: 1000, endsAt: 2000, externalId: "g-existing", isDeleted: 0 },
    ]);

    const pushed = await pushToGoogle("access-token");

    expect(pushed).toBe(1);
    expect(mockGoogleUpdateEvent).toHaveBeenCalledWith(
      "access-token", "g-existing", expect.any(Object),
    );
  });

  it("isDeleted=1 이고 externalId 있는 이벤트를 Google에서 삭제한다", async () => {
    mockGetAllAsync.mockResolvedValue([
      { id: "local-3", title: "삭제된 일정", note: null, isAllDay: 0,
        startsAt: 1000, endsAt: 2000, externalId: "g-del", isDeleted: 1 },
    ]);

    const pushed = await pushToGoogle("access-token");

    expect(pushed).toBe(1);
    expect(mockGoogleDeleteEvent).toHaveBeenCalledWith("access-token", "g-del");
  });
});

// ── syncGoogleCalendar ─────────────────────────────────────────────────────────

describe("syncGoogleCalendar", () => {
  it("pull 후 push 를 실행하고 결과를 반환한다", async () => {
    mockGoogleFetchEvents.mockResolvedValue({ items: [], nextSyncToken: "tok" });
    mockGetAllAsync.mockResolvedValue([]);

    const result = await syncGoogleCalendar("access-token");

    expect(result).toMatchObject({ pulled: 0, pushed: 0 });
    expect(mockGoogleFetchEvents).toHaveBeenCalled();
  });
});
