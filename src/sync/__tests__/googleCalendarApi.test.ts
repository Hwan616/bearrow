import {
  GoogleSyncTokenExpiredError,
  googleCreateEvent,
  googleDeleteEvent,
  googleFetchEvents,
  googleUpdateEvent,
} from "../googleCalendarApi";

// ── fetch mock ────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  };
}

beforeEach(() => jest.clearAllMocks());

// ── googleFetchEvents ──────────────────────────────────────────────────────────

describe("googleFetchEvents", () => {
  it("syncToken을 쿼리 파라미터에 포함한다", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { items: [], nextSyncToken: "tok-new" }));
    await googleFetchEvents("access-token", "tok-old");

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("syncToken=tok-old");
  });

  it("syncToken 없이도 호출할 수 있다", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { items: [] }));
    const result = await googleFetchEvents("access-token");
    expect(result.items).toEqual([]);
  });

  it("410 응답 시 GoogleSyncTokenExpiredError 를 던진다", async () => {
    mockFetch.mockResolvedValue(makeResponse(410));
    await expect(googleFetchEvents("access-token", "expired-tok")).rejects.toThrow(
      GoogleSyncTokenExpiredError,
    );
  });

  it("기타 에러 응답 시 일반 Error 를 던진다", async () => {
    mockFetch.mockResolvedValue(makeResponse(500));
    await expect(googleFetchEvents("access-token")).rejects.toThrow("500");
  });
});

// ── googleCreateEvent ──────────────────────────────────────────────────────────

describe("googleCreateEvent", () => {
  it("POST 요청 후 생성된 이벤트 id를 반환한다", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { id: "g-new-id" }));
    const id = await googleCreateEvent("access-token", { summary: "테스트" });

    expect(id).toBe("g-new-id");
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
  });
});

// ── googleUpdateEvent ──────────────────────────────────────────────────────────

describe("googleUpdateEvent", () => {
  it("PUT 요청을 올바른 URL로 보낸다", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, {}));
    await googleUpdateEvent("access-token", "g-event-1", { summary: "수정됨" });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("g-event-1");
    expect(options.method).toBe("PUT");
  });
});

// ── googleDeleteEvent ──────────────────────────────────────────────────────────

describe("googleDeleteEvent", () => {
  it("DELETE 요청을 보낸다", async () => {
    mockFetch.mockResolvedValue({ status: 204, ok: true });
    await googleDeleteEvent("access-token", "g-event-1");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("DELETE");
  });

  it("404 응답은 에러 없이 처리한다", async () => {
    mockFetch.mockResolvedValue({ status: 404, ok: false });
    await expect(googleDeleteEvent("access-token", "missing")).resolves.toBeUndefined();
  });

  it("410 응답은 에러 없이 처리한다", async () => {
    mockFetch.mockResolvedValue({ status: 410, ok: false });
    await expect(googleDeleteEvent("access-token", "gone")).resolves.toBeUndefined();
  });
});
