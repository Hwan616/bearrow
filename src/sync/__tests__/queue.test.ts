import { clearPendingChanges, deletePendingChange, enqueuePush, getPendingChanges, getSyncMeta, setSyncMeta } from "../queue";

// ── mock ──────────────────────────────────────────────────────────────────────

const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

jest.mock("@/db/client", () => ({
  sqliteDb: {
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
  },
}));

beforeEach(() => jest.clearAllMocks());

// ── enqueuePush ───────────────────────────────────────────────────────────────

describe("enqueuePush", () => {
  it("INSERT OR REPLACE 로 pending_changes 에 삽입한다", async () => {
    mockRunAsync.mockResolvedValue(undefined);
    await enqueuePush("event", "ev-1", "upsert", { title: "test" });

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO pending_changes"),
      expect.arrayContaining(["event", "ev-1", "upsert", JSON.stringify({ title: "test" })]),
    );
  });

  it("payload 없으면 null 로 저장한다", async () => {
    mockRunAsync.mockResolvedValue(undefined);
    await enqueuePush("todo", "td-1", "delete");

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["todo", "td-1", "delete", null]),
    );
  });
});

// ── getPendingChanges ─────────────────────────────────────────────────────────

describe("getPendingChanges", () => {
  it("raw 행을 PendingChange 객체로 변환한다", async () => {
    const rawRow = {
      entity_type: "event",
      entity_id: "ev-1",
      operation: "upsert",
      payload: JSON.stringify({ title: "테스트" }),
      created_at: 1000,
    };
    mockGetAllAsync.mockResolvedValue([rawRow]);

    const result = await getPendingChanges();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      entityType: "event",
      entityId: "ev-1",
      operation: "upsert",
      payload: { title: "테스트" },
    });
    expect(result[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("payload 가 null 이면 null 로 반환한다", async () => {
    mockGetAllAsync.mockResolvedValue([
      { entity_type: "todo", entity_id: "td-1", operation: "delete", payload: null, created_at: 2000 },
    ]);
    const result = await getPendingChanges();
    expect(result[0]?.payload).toBeNull();
  });
});

// ── deletePendingChange ───────────────────────────────────────────────────────

describe("deletePendingChange", () => {
  it("entity_type, entity_id 로 삭제한다", async () => {
    mockRunAsync.mockResolvedValue(undefined);
    await deletePendingChange("event", "ev-1");

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM pending_changes"),
      ["event", "ev-1"],
    );
  });
});

// ── clearPendingChanges ───────────────────────────────────────────────────────

describe("clearPendingChanges", () => {
  it("전체 삭제 SQL을 실행한다", async () => {
    mockRunAsync.mockResolvedValue(undefined);
    await clearPendingChanges();
    expect(mockRunAsync).toHaveBeenCalledWith("DELETE FROM pending_changes");
  });
});

// ── sync_meta ─────────────────────────────────────────────────────────────────

describe("getSyncMeta", () => {
  it("저장된 값을 반환한다", async () => {
    mockGetFirstAsync.mockResolvedValue({ value: "12345" });
    const result = await getSyncMeta("last_pulled_at_events");
    expect(result).toBe("12345");
  });

  it("없으면 null 을 반환한다", async () => {
    mockGetFirstAsync.mockResolvedValue(null);
    expect(await getSyncMeta("missing_key")).toBeNull();
  });
});

describe("setSyncMeta", () => {
  it("INSERT OR REPLACE 로 저장한다", async () => {
    mockRunAsync.mockResolvedValue(undefined);
    await setSyncMeta("last_pulled_at_events", "99999");

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO sync_meta"),
      ["last_pulled_at_events", "99999"],
    );
  });
});
