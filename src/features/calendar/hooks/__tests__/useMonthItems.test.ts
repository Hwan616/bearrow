import { act, renderHook, waitFor } from "@testing-library/react-native";

// ── 모킹 ─────────────────────────────────────────────────────────────────────

const mockGetEvents = jest.fn();
const mockGetTodos = jest.fn();
const mockGetCategories = jest.fn();

jest.mock("@/features/calendar/api/events", () => ({
  getEventsByDateRange: (...args: unknown[]) => mockGetEvents(...args),
}));

jest.mock("@/features/todo/api/todos", () => ({
  getTodosByDueDateRange: (...args: unknown[]) => mockGetTodos(...args),
}));

jest.mock("@/features/category/api/categories", () => ({
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

// eslint-disable-next-line import/first
import { useMonthItems } from "../useMonthItems";

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-06T12:00:00.000Z");

const MOCK_EVENT = {
  id: "evt-1",
  title: "회의",
  isAllDay: false,
  startsAt: NOW,
  endsAt: NOW,
  categoryId: "cat-1",
  source: "local" as const,
  note: null,
  externalId: null,
  reminderMinutes: null,
  rrule: null,
  recurringEventId: null,
  exceptionDate: null,
  isDeleted: false,
  updatedAt: NOW,
};

const MOCK_TODO = {
  id: "todo-1",
  title: "보고서 작성",
  isCompleted: false,
  completedAt: null,
  dueDate: NOW,
  categoryId: "cat-1",
  note: null,
  eventId: null,
  sortOrder: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_CATEGORY = {
  id: "cat-1",
  name: "업무",
  color: "#2E5AAC",
  sortOrder: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe("useMonthItems", () => {
  beforeEach(() => {
    mockGetEvents.mockResolvedValue([]);
    mockGetTodos.mockResolvedValue([]);
    mockGetCategories.mockResolvedValue([]);
  });

  it("초기 상태는 빈 배열이다", async () => {
    const { result } = await renderHook(() => useMonthItems(2026, 6));
    await waitFor(() => !result.current.isLoading);
    expect(result.current.events).toEqual([]);
    expect(result.current.dueTodos).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });

  it("이벤트·투두·카테고리를 함께 반환한다", async () => {
    mockGetEvents.mockResolvedValue([MOCK_EVENT]);
    mockGetTodos.mockResolvedValue([MOCK_TODO]);
    mockGetCategories.mockResolvedValue([MOCK_CATEGORY]);

    const { result } = await renderHook(() => useMonthItems(2026, 6));
    await waitFor(() => !result.current.isLoading);

    expect(result.current.events).toHaveLength(1);
    expect(result.current.dueTodos).toHaveLength(1);
    expect(result.current.categories).toHaveLength(1);
    expect(result.current.categories[0]!.id).toBe("cat-1");
  });

  it("getCategories가 호출된다", async () => {
    const { result } = await renderHook(() => useMonthItems(2026, 6));
    await waitFor(() => !result.current.isLoading);
    expect(mockGetCategories).toHaveBeenCalled();
  });

  it("오류 발생 시 error 필드가 채워진다", async () => {
    mockGetEvents.mockRejectedValue(new Error("DB 오류"));

    const { result } = await renderHook(() => useMonthItems(2026, 6));
    await waitFor(() => !result.current.isLoading);

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe("DB 오류");
  });

  it("refetch를 호출하면 데이터를 다시 불러온다", async () => {
    mockGetEvents.mockResolvedValue([]);
    const { result } = await renderHook(() => useMonthItems(2026, 6));
    await waitFor(() => !result.current.isLoading);

    mockGetEvents.mockResolvedValue([MOCK_EVENT]);
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => !result.current.isLoading);

    expect(result.current.events).toHaveLength(1);
  });

  it("month가 변경되면 데이터를 다시 불러온다", async () => {
    mockGetEvents.mockResolvedValue([]);
    const { result, rerender } = await renderHook(
      ({ month }: { month: number }) => useMonthItems(2026, month),
      { initialProps: { month: 6 } },
    );
    await waitFor(() => !result.current.isLoading);

    mockGetEvents.mockResolvedValue([MOCK_EVENT]);
    await act(async () => {
      rerender({ month: 7 });
    });
    await waitFor(() => !result.current.isLoading);

    expect(mockGetEvents.mock.calls.length).toBeGreaterThan(1);
  });
});
