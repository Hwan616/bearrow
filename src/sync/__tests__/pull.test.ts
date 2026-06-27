import { pullChanges } from "../pull";

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockGetSyncMeta = jest.fn();
const mockSetSyncMeta = jest.fn();

jest.mock("../queue", () => ({
  getSyncMeta: (key: string) => mockGetSyncMeta(key),
  setSyncMeta: (key: string, value: string) => mockSetSyncMeta(key, value),
}));

const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

jest.mock("@/db/client", () => ({
  sqliteDb: {
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
  },
}));

type QueryResult = { data: unknown[] | null; error: Error | null };
type ThenFn = (v: QueryResult) => QueryResult | PromiseLike<QueryResult>;

function makeQueryResult(rows: unknown[], error: Error | null = null): QueryResult {
  return { data: error ? null : rows, error };
}

// Supabase client mock — 체인 가능한 쿼리 빌더
function makeClient(
  user: { id: string } | null = { id: "uid-1" },
  queryResults: Record<string, unknown[]> = {},
) {
  function makeTableBuilder(table: string) {
    const result = makeQueryResult(queryResults[table] ?? []);
    const builder: Record<string, unknown> = {
      select: () => makeTableBuilder(table),
      eq: () => makeTableBuilder(table),
      gt: () => makeTableBuilder(table),
      then: (fn: ThenFn) => Promise.resolve(result).then(fn),
    };
    return builder;
  }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: jest.fn().mockImplementation((table: string) => makeTableBuilder(table)),
  };
}

beforeEach(() => jest.clearAllMocks());

// ── pullChanges ────────────────────────────────────────────────────────────────

describe("pullChanges", () => {
  it("미인증 상태면 아무것도 가져오지 않는다", async () => {
    const client = makeClient(null);
    const result = await pullChanges(client as never);

    expect(result).toEqual({ pulled: 0 });
    expect(mockSetSyncMeta).not.toHaveBeenCalled();
  });

  it("서버 이벤트가 로컬보다 최신이면 로컬에 반영한다", async () => {
    const serverEvent = {
      id: "ev-1", title: "서버 이벤트", note: null, is_all_day: 0,
      starts_at: 1000, ends_at: 2000, category_id: null, source: "local",
      external_id: null, updated_at: 9999, user_id: "uid-1",
      rrule: null, recurring_event_id: null, exception_date: null,
      is_deleted: 0, reminder_minutes: null,
    };
    mockGetSyncMeta.mockResolvedValue(null); // 첫 pull
    mockGetFirstAsync.mockResolvedValue(null); // 로컬에 없음
    mockRunAsync.mockResolvedValue(undefined);

    const client = makeClient({ id: "uid-1" }, { events: [serverEvent] });
    const result = await pullChanges(client as never);

    expect(result.pulled).toBe(1);
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO events"),
      expect.arrayContaining(["ev-1", "서버 이벤트"]),
    );
    expect(mockSetSyncMeta).toHaveBeenCalledWith("last_pulled_at_events", expect.any(String));
  });

  it("로컬이 서버보다 최신이면 덮어쓰지 않는다 (last-write-wins)", async () => {
    const serverEvent = {
      id: "ev-1", title: "구버전", updated_at: 1000, user_id: "uid-1",
      note: null, is_all_day: 0, starts_at: 0, ends_at: 0,
      category_id: null, source: "local", external_id: null,
      rrule: null, recurring_event_id: null, exception_date: null,
      is_deleted: 0, reminder_minutes: null,
    };
    mockGetSyncMeta.mockResolvedValue(null);
    // 로컬 updated_at 이 서버보다 큼
    mockGetFirstAsync.mockImplementation((sql: string) => {
      if ((sql as string).includes("events")) return Promise.resolve({ updated_at: 9999 });
      return Promise.resolve(null);
    });
    mockRunAsync.mockResolvedValue(undefined);

    const client = makeClient({ id: "uid-1" }, { events: [serverEvent] });
    const result = await pullChanges(client as never);

    expect(result.pulled).toBe(0);
    expect(mockRunAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO events"),
      expect.anything(),
    );
  });
});
