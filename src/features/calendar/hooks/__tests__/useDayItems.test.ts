import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useDayItems } from "../useDayItems";

// ── 모킹 ─────────────────────────────────────────────────────────────────────
// factory 없이 auto-mock 하면 expo-sqlite 체인이 로드되어 실패하므로
// factory 함수로 직접 mock 함수를 반환한다.
// 변수 이름이 'mock' 접두사여야 babel-jest 호이스팅이 적용된다.

const mockGetEvents = jest.fn();
const mockGetTodos = jest.fn();

jest.mock("@/features/calendar/api/events", () => ({
  getEventsByDateRange: (...args: unknown[]) => mockGetEvents(...args),
}));

jest.mock("@/features/todo/api/todos", () => ({
  getTodosByDueDateRange: (...args: unknown[]) => mockGetTodos(...args),
}));

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-07-05T12:00:00.000Z");

const MOCK_EVENTS = [
  {
    id: "evt-1",
    title: "회의",
    startDate: TODAY,
    endDate: TODAY,
    isAllDay: false,
    categoryId: "cat-1",
    createdAt: TODAY,
    updatedAt: TODAY,
  },
];

const MOCK_TODOS = [
  {
    id: "todo-1",
    title: "보고서 작성",
    isCompleted: false,
    completedAt: null,
    categoryId: "cat-1",
    dueDate: TODAY,
    note: null as string | null,
    eventId: null,
    assignedDate: TODAY,
    hasDueTime: false,
    sortOrder: 0,
    createdAt: TODAY,
    updatedAt: TODAY,
  },
];

// ── 테스트 ───────────────────────────────────────────────────────────────────

describe("useDayItems", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvents.mockResolvedValue(MOCK_EVENTS);
    mockGetTodos.mockResolvedValue(MOCK_TODOS);
  });

  it("초기 상태는 isLoading=true이고 빈 배열이다", async () => {
    // 조회를 지연시켜 초기 상태를 관찰한다
    let resolveEvents!: () => void;
    mockGetEvents.mockReturnValue(
      new Promise((r) => { resolveEvents = () => r([]); }),
    );

    // renderHook은 async이므로 await 필요
    const { result } = await renderHook(() => useDayItems(TODAY));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.todos).toEqual([]);

    await act(async () => { resolveEvents(); });
  });

  it("비동기 조회가 완료되면 events·todos를 채우고 isLoading=false가 된다", async () => {
    const { result } = await renderHook(() => useDayItems(TODAY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.events).toEqual(MOCK_EVENTS);
    expect(result.current.todos).toEqual(MOCK_TODOS);
  });

  it("올바른 날짜 범위(00:00:00~23:59:59)로 API를 호출한다", async () => {
    const { result } = await renderHook(() => useDayItems(TODAY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [fromArg, toArg] = mockGetEvents.mock.calls[0] as [Date, Date];
    expect(fromArg.getHours()).toBe(0);
    expect(fromArg.getMinutes()).toBe(0);
    expect(fromArg.getSeconds()).toBe(0);
    expect(toArg.getHours()).toBe(23);
    expect(toArg.getMinutes()).toBe(59);
    expect(toArg.getSeconds()).toBe(59);
  });

  it("refresh()를 호출하면 API를 다시 조회한다", async () => {
    const { result } = await renderHook(() => useDayItems(TODAY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetEvents).toHaveBeenCalledTimes(1);

    // RTLN의 act()는 내부적으로 async로 래핑하므로 반드시 await해야 한다
    await act(async () => { result.current.refresh(); });

    await waitFor(() => expect(mockGetEvents).toHaveBeenCalledTimes(2));
    expect(mockGetTodos).toHaveBeenCalledTimes(2);
  });

  it("refresh() 후 갱신된 데이터를 반환한다", async () => {
    const { result } = await renderHook(() => useDayItems(TODAY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const UPDATED = [{ ...MOCK_EVENTS[0], title: "업데이트된 회의" }];
    mockGetEvents.mockResolvedValue(UPDATED);

    await act(async () => { result.current.refresh(); });

    await waitFor(() =>
      expect(result.current.events[0]?.title).toBe("업데이트된 회의"),
    );
  });

  it("API 실패 시 isLoading=false로 복구된다", async () => {
    mockGetEvents.mockRejectedValue(new Error("DB error"));

    const { result } = await renderHook(() => useDayItems(TODAY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([]);
  });
});
