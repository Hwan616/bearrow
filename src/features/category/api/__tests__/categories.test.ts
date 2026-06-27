import {
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from "../categories";

// ── mocks ──────────────────────────────────────────────────────────────────

const mockCatReturning = jest.fn();
const mockCatValues = jest.fn();
const mockCatFrom = jest.fn();
const mockCatOrderBy = jest.fn();
const mockCatSet = jest.fn();
// update().set().where() — thenable(Promise<void>) 이면서 .returning() 체이닝 가능
const mockCatUpdateWhere = jest.fn();
const mockCatDeleteWhere = jest.fn();

jest.mock("@/db/client", () => ({
  db: {
    insert: jest.fn(() => ({ values: mockCatValues })),
    select: jest.fn(() => ({ from: mockCatFrom })),
    update: jest.fn(() => ({ set: mockCatSet })),
    delete: jest.fn(() => ({ where: mockCatDeleteWhere })),
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((col, val) => ({ op: "eq", col, val })),
  asc: jest.fn((col) => ({ op: "asc", col })),
}));

// ── fixtures ────────────────────────────────────────────────────────────────

const mockCategory = {
  id: "cat-1",
  name: "업무",
  color: "#2E5AAC",
  sortOrder: 0,
  createdAt: new Date("2026-06-27T00:00:00Z"),
  updatedAt: new Date("2026-06-27T00:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCatValues.mockReturnValue({ returning: mockCatReturning });
  mockCatFrom.mockReturnValue({ orderBy: mockCatOrderBy });
  mockCatOrderBy.mockResolvedValue([mockCategory]);
  mockCatSet.mockReturnValue({ where: mockCatUpdateWhere });
  mockCatDeleteWhere.mockResolvedValue(undefined);
});

// ── createCategory ──────────────────────────────────────────────────────────

describe("createCategory", () => {
  it("삽입 후 카테고리를 반환한다", async () => {
    mockCatReturning.mockResolvedValue([mockCategory]);
    const result = await createCategory(mockCategory);
    expect(mockCatValues).toHaveBeenCalledWith(mockCategory);
    expect(result).toEqual(mockCategory);
  });

  it("반환 행이 없으면 에러를 던진다", async () => {
    mockCatReturning.mockResolvedValue([]);
    await expect(createCategory(mockCategory)).rejects.toThrow("카테고리 생성 실패");
  });
});

// ── getCategories ───────────────────────────────────────────────────────────

describe("getCategories", () => {
  it("정렬된 카테고리 목록을 반환한다", async () => {
    const result = await getCategories();
    expect(mockCatFrom).toHaveBeenCalled();
    expect(mockCatOrderBy).toHaveBeenCalled();
    expect(result).toEqual([mockCategory]);
  });

  it("빈 목록을 반환할 수 있다", async () => {
    mockCatOrderBy.mockResolvedValue([]);
    const result = await getCategories();
    expect(result).toEqual([]);
  });
});

// ── updateCategory ──────────────────────────────────────────────────────────

describe("updateCategory", () => {
  beforeEach(() => {
    // update 체인: set().where().returning()
    mockCatUpdateWhere.mockReturnValue({ returning: mockCatReturning });
  });

  it("이름을 업데이트하고 반환한다", async () => {
    const updated = { ...mockCategory, name: "개인" };
    mockCatReturning.mockResolvedValue([updated]);
    const result = await updateCategory("cat-1", { name: "개인" });
    expect(mockCatSet).toHaveBeenCalledWith({ name: "개인" });
    expect(result).toEqual(updated);
  });

  it("색상을 업데이트하고 반환한다", async () => {
    const updated = { ...mockCategory, color: "#E74C3C" };
    mockCatReturning.mockResolvedValue([updated]);
    const result = await updateCategory("cat-1", { color: "#E74C3C" });
    expect(mockCatSet).toHaveBeenCalledWith({ color: "#E74C3C" });
    expect(result).toEqual(updated);
  });

  it("sortOrder를 업데이트하고 반환한다", async () => {
    const updated = { ...mockCategory, sortOrder: 2 };
    mockCatReturning.mockResolvedValue([updated]);
    const result = await updateCategory("cat-1", { sortOrder: 2 });
    expect(result.sortOrder).toBe(2);
  });

  it("해당 카테고리가 없으면 에러를 던진다", async () => {
    mockCatReturning.mockResolvedValue([]);
    await expect(updateCategory("없는id", { name: "x" })).rejects.toThrow(
      "카테고리를 찾을 수 없습니다",
    );
  });
});

// ── deleteCategory ──────────────────────────────────────────────────────────

describe("deleteCategory", () => {
  beforeEach(() => {
    // update 체인: set().where() — returning 없이 await (Promise<void>)
    mockCatUpdateWhere.mockResolvedValue(undefined);
  });

  it("연결된 이벤트와 할일의 categoryId를 null로 초기화한다", async () => {
    const { db } = jest.requireMock("@/db/client") as {
      db: { update: jest.Mock; delete: jest.Mock };
    };
    await deleteCategory("cat-1");
    // events + todos 각각 update 호출
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(mockCatSet).toHaveBeenCalledWith({ categoryId: null });
  });

  it("카테고리를 삭제한다", async () => {
    await deleteCategory("cat-1");
    expect(mockCatDeleteWhere).toHaveBeenCalled();
  });

  it("update(events) → update(todos) → delete 순서로 실행된다", async () => {
    const calls: string[] = [];
    mockCatUpdateWhere.mockImplementation(() => {
      calls.push("update");
      return Promise.resolve(undefined);
    });
    mockCatDeleteWhere.mockImplementation(() => {
      calls.push("delete");
      return Promise.resolve(undefined);
    });
    await deleteCategory("cat-1");
    expect(calls).toEqual(["update", "update", "delete"]);
  });
});

// ── reorderCategories ───────────────────────────────────────────────────────

describe("reorderCategories", () => {
  beforeEach(() => {
    mockCatUpdateWhere.mockResolvedValue(undefined);
  });

  it("각 카테고리의 sortOrder를 인덱스로 업데이트한다", async () => {
    await reorderCategories(["cat-2", "cat-1", "cat-3"]);
    expect(mockCatSet).toHaveBeenCalledTimes(3);
    expect(mockCatSet).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
    expect(mockCatSet).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
    expect(mockCatSet).toHaveBeenNthCalledWith(3, { sortOrder: 2 });
  });

  it("빈 배열이면 아무것도 하지 않는다", async () => {
    await reorderCategories([]);
    expect(mockCatSet).not.toHaveBeenCalled();
  });

  it("단일 항목도 처리한다", async () => {
    await reorderCategories(["cat-1"]);
    expect(mockCatSet).toHaveBeenCalledWith({ sortOrder: 0 });
  });
});
