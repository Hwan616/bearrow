import { pushChanges } from "../push";
import type { PendingChange } from "../types";

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockGetPendingChanges = jest.fn<Promise<PendingChange[]>, []>();
const mockDeletePendingChange = jest.fn();

jest.mock("../queue", () => ({
  getPendingChanges: () => mockGetPendingChanges(),
  deletePendingChange: (...args: unknown[]) => mockDeletePendingChange(...args),
}));

// Supabase client mock — 체인 가능한 빌더 패턴
function makeClient(
  getUserResult = { data: { user: { id: "uid-1" } }, error: null },
) {
  const builder = {
    upsert: jest.fn().mockResolvedValue({ error: null }),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  };
  // delete().eq().eq() 가 최종적으로 Promise를 반환하도록
  builder.eq.mockImplementation(() => ({
    ...builder,
    then: (fn: (v: { error: null }) => unknown) => Promise.resolve({ error: null }).then(fn),
  }));

  return {
    auth: { getUser: jest.fn().mockResolvedValue(getUserResult) },
    from: jest.fn().mockReturnValue(builder),
    _builder: builder,
  };
}

beforeEach(() => jest.clearAllMocks());

// ── pushChanges ───────────────────────────────────────────────────────────────

describe("pushChanges", () => {
  it("upsert 항목을 Supabase 에 전송하고 큐에서 삭제한다", async () => {
    const change: PendingChange = {
      entityType: "event",
      entityId: "ev-1",
      operation: "upsert",
      payload: { id: "ev-1", title: "테스트" },
      createdAt: new Date(),
    };
    mockGetPendingChanges.mockResolvedValue([change]);
    mockDeletePendingChange.mockResolvedValue(undefined);

    const client = makeClient();
    const result = await pushChanges(client as never);

    expect(client.from).toHaveBeenCalledWith("events");
    expect(client._builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ev-1", title: "테스트", user_id: "uid-1" }),
    );
    expect(mockDeletePendingChange).toHaveBeenCalledWith("event", "ev-1");
    expect(result.pushed).toBe(1);
    expect(result.failedPush).toBe(0);
  });

  it("미인증 상태면 건너뛴다", async () => {
    const client = makeClient({ data: { user: null }, error: null } as never);
    mockGetPendingChanges.mockResolvedValue([]);

    const result = await pushChanges(client as never);

    expect(result).toEqual({ pushed: 0, failedPush: 0 });
    expect(mockGetPendingChanges).not.toHaveBeenCalled();
  });

  it("Supabase 에러 시 failedPush 카운트가 증가한다", async () => {
    const change: PendingChange = {
      entityType: "todo",
      entityId: "td-1",
      operation: "upsert",
      payload: { id: "td-1", title: "할일" },
      createdAt: new Date(),
    };
    mockGetPendingChanges.mockResolvedValue([change]);

    const client = makeClient();
    client._builder.upsert.mockResolvedValue({ error: new Error("서버 오류") });

    const result = await pushChanges(client as never);

    expect(result.pushed).toBe(0);
    expect(result.failedPush).toBe(1);
    expect(mockDeletePendingChange).not.toHaveBeenCalled();
  });

  it("빈 큐면 아무것도 전송하지 않는다", async () => {
    mockGetPendingChanges.mockResolvedValue([]);
    const client = makeClient();

    const result = await pushChanges(client as never);

    expect(result).toEqual({ pushed: 0, failedPush: 0 });
    expect(client.from).not.toHaveBeenCalled();
  });
});
