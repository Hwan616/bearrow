import {
  createTodo,
  createTodoFromEvent,
  deleteTodo,
  getTodos,
  getTodosByDate,
  getTodosByDueDateRange,
  toggleTodo,
  updateSortOrders,
  updateTodo,
} from "../todos";

// ── mocks ──────────────────────────────────────────────────────────────────

const mockTodoReturning = jest.fn();
const mockTodoValues = jest.fn();
const mockTodoFrom = jest.fn();
const mockTodoOrderBy = jest.fn();
const mockTodoSet = jest.fn();
const mockTodoUpdateWhere = jest.fn();
const mockTodoDeleteWhere = jest.fn();
const mockTodoWhere = jest.fn(); // select().from().where().orderBy() 용

jest.mock("@/db/client", () => ({
  db: {
    insert: jest.fn(() => ({ values: mockTodoValues })),
    select: jest.fn(() => ({ from: mockTodoFrom })),
    update: jest.fn(() => ({ set: mockTodoSet })),
    delete: jest.fn(() => ({ where: mockTodoDeleteWhere })),
  },
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "mock-uuid"),
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((col, val) => ({ op: "eq", col, val })),
  asc: jest.fn((col) => ({ op: "asc", col })),
  and: jest.fn((...args) => ({ op: "and", args })),
  gte: jest.fn((col, val) => ({ op: "gte", col, val })),
  lte: jest.fn((col, val) => ({ op: "lte", col, val })),
}));

// ── fixtures ────────────────────────────────────────────────────────────────

const now = new Date("2026-06-27T09:00:00Z");

const mockTodo = {
  id: "todo-1",
  title: "발표 자료 준비",
  note: null,
  isCompleted: false,
  completedAt: null,
  dueDate: null,
  categoryId: null,
  eventId: null,
  assignedDate: now,
  hasDueTime: false,
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTodoValues.mockReturnValue({ returning: mockTodoReturning });
  mockTodoFrom.mockReturnValue({ orderBy: mockTodoOrderBy, where: mockTodoWhere });
  mockTodoWhere.mockReturnValue({ orderBy: mockTodoOrderBy });
  mockTodoOrderBy.mockResolvedValue([mockTodo]);
  mockTodoSet.mockReturnValue({ where: mockTodoUpdateWhere });
  // updateTodo: set().where().returning()
  mockTodoUpdateWhere.mockReturnValue({ returning: mockTodoReturning });
  mockTodoDeleteWhere.mockResolvedValue(undefined);
});

// ── createTodo ──────────────────────────────────────────────────────────────

describe("createTodo", () => {
  it("삽입 후 할일을 반환한다", async () => {
    mockTodoReturning.mockResolvedValue([mockTodo]);
    const result = await createTodo(mockTodo);
    expect(mockTodoValues).toHaveBeenCalledWith(mockTodo);
    expect(result).toEqual(mockTodo);
  });

  it("반환 행이 없으면 에러를 던진다", async () => {
    mockTodoReturning.mockResolvedValue([]);
    await expect(createTodo(mockTodo)).rejects.toThrow("할일 생성 실패");
  });
});

// ── getTodos ────────────────────────────────────────────────────────────────

describe("getTodos", () => {
  it("정렬된 할일 목록을 반환한다", async () => {
    const result = await getTodos();
    expect(mockTodoFrom).toHaveBeenCalled();
    expect(mockTodoOrderBy).toHaveBeenCalled();
    expect(result).toEqual([mockTodo]);
  });

  it("빈 목록을 반환할 수 있다", async () => {
    mockTodoOrderBy.mockResolvedValue([]);
    expect(await getTodos()).toEqual([]);
  });

  it("orderBy에 isCompleted, sortOrder, createdAt 3개 인자가 전달된다", async () => {
    await getTodos();
    // asc mock이 3번 호출됐는지 확인
    const { asc } = jest.requireMock("drizzle-orm") as { asc: jest.Mock };
    expect(asc).toHaveBeenCalledTimes(3);
  });
});

// ── updateTodo ──────────────────────────────────────────────────────────────

describe("updateTodo", () => {
  it("제목을 업데이트하고 반환한다", async () => {
    const updated = { ...mockTodo, title: "수정된 제목" };
    mockTodoReturning.mockResolvedValue([updated]);
    const result = await updateTodo("todo-1", { title: "수정된 제목" });
    expect(mockTodoSet).toHaveBeenCalledWith({ title: "수정된 제목" });
    expect(result).toEqual(updated);
  });

  it("카테고리를 연결한다", async () => {
    const updated = { ...mockTodo, categoryId: "cat-1" };
    mockTodoReturning.mockResolvedValue([updated]);
    const result = await updateTodo("todo-1", { categoryId: "cat-1" });
    expect(mockTodoSet).toHaveBeenCalledWith({ categoryId: "cat-1" });
    expect(result.categoryId).toBe("cat-1");
  });

  it("메모를 업데이트한다", async () => {
    const updated = { ...mockTodo, note: "새 메모" };
    mockTodoReturning.mockResolvedValue([updated]);
    const result = await updateTodo("todo-1", { note: "새 메모" });
    expect(result.note).toBe("새 메모");
  });

  it("해당 할일이 없으면 에러를 던진다", async () => {
    mockTodoReturning.mockResolvedValue([]);
    await expect(updateTodo("없는id", { title: "x" })).rejects.toThrow(
      "할일을 찾을 수 없습니다",
    );
  });

});

// ── getTodosByDate ──────────────────────────────────────────────────────────

describe("getTodosByDate", () => {
  it("해당 날짜의 할일을 반환한다", async () => {
    const date = new Date(2026, 6, 7); // 2026-07-07
    mockTodoOrderBy.mockResolvedValue([mockTodo]);
    const result = await getTodosByDate(date);
    expect(mockTodoFrom).toHaveBeenCalled();
    expect(mockTodoWhere).toHaveBeenCalled();
    expect(mockTodoOrderBy).toHaveBeenCalled();
    expect(result).toEqual([mockTodo]);
  });

  it("빈 결과를 반환할 수 있다", async () => {
    mockTodoOrderBy.mockResolvedValue([]);
    expect(await getTodosByDate(new Date())).toEqual([]);
  });
});

// ── deleteTodo ──────────────────────────────────────────────────────────────

describe("deleteTodo", () => {
  it("할일을 삭제한다", async () => {
    await deleteTodo("todo-1");
    expect(mockTodoDeleteWhere).toHaveBeenCalled();
  });
});

// ── getTodosByDueDateRange ──────────────────────────────────────────────────

describe("getTodosByDueDateRange", () => {
  it("마감일 범위 내 할일을 정렬해서 반환한다", async () => {
    const from = new Date(2026, 5, 1);
    const to = new Date(2026, 5, 30);
    mockTodoOrderBy.mockResolvedValue([mockTodo]);
    const result = await getTodosByDueDateRange(from, to);
    expect(mockTodoFrom).toHaveBeenCalled();
    expect(mockTodoWhere).toHaveBeenCalled();
    expect(mockTodoOrderBy).toHaveBeenCalled();
    expect(result).toEqual([mockTodo]);
  });

  it("빈 결과를 반환할 수 있다", async () => {
    mockTodoOrderBy.mockResolvedValue([]);
    expect(await getTodosByDueDateRange(new Date(), new Date())).toEqual([]);
  });
});

// ── createTodoFromEvent ─────────────────────────────────────────────────────

describe("createTodoFromEvent", () => {
  it("이벤트 제목·eventId·마감일을 채워 할일을 생성한다", async () => {
    const event = { id: "ev-1", title: "팀 미팅", startsAt: new Date(2026, 5, 15, 10, 0) };
    const todoNow = new Date(2026, 5, 15);
    const created = { ...mockTodo, title: "팀 미팅", eventId: "ev-1", id: "mock-uuid" };
    mockTodoReturning.mockResolvedValue([created]);

    const result = await createTodoFromEvent(event, todoNow);

    const expectedDueDate = new Date(2026, 5, 15, 0, 0, 0, 0);
    expect(mockTodoValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mock-uuid",
        title: "팀 미팅",
        eventId: "ev-1",
        dueDate: expectedDueDate,
        assignedDate: expectedDueDate,
        isCompleted: false,
        categoryId: null,
      }),
    );
    expect(result.eventId).toBe("ev-1");
    expect(result.title).toBe("팀 미팅");
  });
});

// ── toggleTodo ──────────────────────────────────────────────────────────────

describe("toggleTodo", () => {
  it("완료로 전환하면 isCompleted=true, completedAt이 설정된다", async () => {
    const completed = { ...mockTodo, isCompleted: true, completedAt: now };
    mockTodoReturning.mockResolvedValue([completed]);
    const result = await toggleTodo("todo-1", true, now);
    expect(mockTodoSet).toHaveBeenCalledWith({
      isCompleted: true,
      completedAt: now,
    });
    expect(result.isCompleted).toBe(true);
    expect(result.completedAt).toEqual(now);
  });

  it("미완료로 전환하면 isCompleted=false, completedAt=null이 설정된다", async () => {
    const uncompleted = { ...mockTodo, isCompleted: false, completedAt: null };
    mockTodoReturning.mockResolvedValue([uncompleted]);
    const result = await toggleTodo("todo-1", false, now);
    expect(mockTodoSet).toHaveBeenCalledWith({
      isCompleted: false,
      completedAt: null,
    });
    expect(result.isCompleted).toBe(false);
    expect(result.completedAt).toBeNull();
  });

  it("now 기본값은 현재 시각", async () => {
    mockTodoReturning.mockResolvedValue([{ ...mockTodo, isCompleted: true, completedAt: new Date() }]);
    await toggleTodo("todo-1", true); // now 생략
    const setArg = mockTodoSet.mock.calls[0]?.[0] as { completedAt: Date };
    expect(setArg.completedAt).toBeInstanceOf(Date);
  });
});

// ── updateSortOrders ─────────────────────────────────────────────────────────

describe("updateSortOrders", () => {
  it("각 id를 인덱스 순서로 업데이트한다", async () => {
    mockTodoUpdateWhere.mockResolvedValue(undefined);
    await updateSortOrders(["c", "a", "b"]);
    // update가 3번 호출됐는지 확인
    const { db } = jest.requireMock("@/db/client") as { db: { update: jest.Mock } };
    expect(db.update).toHaveBeenCalledTimes(3);
    // 첫 번째 set에 sortOrder:0 포함
    expect(mockTodoSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sortOrder: 0 }),
    );
    expect(mockTodoSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sortOrder: 1 }),
    );
    expect(mockTodoSet).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sortOrder: 2 }),
    );
  });

  it("빈 배열이면 update를 호출하지 않는다", async () => {
    await updateSortOrders([]);
    const { db } = jest.requireMock("@/db/client") as { db: { update: jest.Mock } };
    expect(db.update).not.toHaveBeenCalled();
  });
});
