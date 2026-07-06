import { searchAll } from "../search";

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/db/client", () => ({
  db: { select: jest.fn() },
}));

jest.mock("drizzle-orm", () => ({
  like: jest.fn((col, val) => ({ op: "like", col, val })),
}));

// ── helpers ─────────────────────────────────────────────────────────────────

function setupDbSelect(eventsRows: object[], todosRows: object[]) {
  const { db } = jest.requireMock("@/db/client") as { db: { select: jest.Mock } };
  const eventsWhere = jest.fn().mockResolvedValue(eventsRows);
  const eventsFrom = jest.fn(() => ({ where: eventsWhere }));
  const todosWhere = jest.fn().mockResolvedValue(todosRows);
  const todosFrom = jest.fn(() => ({ where: todosWhere }));
  db.select
    .mockReturnValueOnce({ from: eventsFrom })
    .mockReturnValueOnce({ from: todosFrom });
}

// ── fixtures ────────────────────────────────────────────────────────────────

const now = new Date("2026-07-06T09:00:00");

const mockEvent = { id: "evt-1", title: "팀 미팅", startsAt: now, isDeleted: false };
const mockTodo = { id: "todo-1", title: "팀 미팅 준비", dueDate: now };

// ── tests ────────────────────────────────────────────────────────────────

describe("searchAll", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("빈 쿼리이면 빈 배열을 반환한다", async () => {
    const result = await searchAll("");
    expect(result).toEqual([]);
  });

  it("공백만 있는 쿼리이면 빈 배열을 반환한다", async () => {
    const result = await searchAll("   ");
    expect(result).toEqual([]);
  });

  it("검색 결과에 일정과 할일이 모두 포함된다", async () => {
    setupDbSelect([mockEvent], [mockTodo]);
    const results = await searchAll("팀");
    expect(results.some((r) => r.kind === "event")).toBe(true);
    expect(results.some((r) => r.kind === "todo")).toBe(true);
  });

  it("isDeleted=true인 이벤트는 결과에서 제외된다", async () => {
    setupDbSelect([{ ...mockEvent, isDeleted: true }], []);
    const results = await searchAll("팀");
    expect(results.filter((r) => r.kind === "event")).toHaveLength(0);
  });

  it("결과는 날짜 오름차순으로 정렬된다", async () => {
    const later = new Date("2026-08-01T09:00:00");
    const evtLater = { id: "evt-2", title: "나중 일정", startsAt: later, isDeleted: false };
    setupDbSelect([evtLater, mockEvent], []);
    const results = await searchAll("일정");
    const dates = results.map((r) => r.date?.getTime() ?? 0);
    expect(dates[0]).toBeLessThanOrEqual(dates[1] ?? Infinity);
  });
});
