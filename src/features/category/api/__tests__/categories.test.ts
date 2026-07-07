import {
  createCategory,
  deleteCategory,
  ensureDefaultCategoriesExist,
  getCategories,
  getCategoriesByScope,
  reorderCategories,
  updateCategory,
} from "../categories";

// ── mocks ──────────────────────────────────────────────────────────────────

const mockCatReturning = jest.fn();
const mockCatValues = jest.fn();
const mockCatFrom = jest.fn();
const mockCatWhere = jest.fn();
const mockCatOrderBy = jest.fn();
const mockCatSet = jest.fn();
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
  scope: "event" as const,
  sortOrder: 0,
  createdAt: new Date("2026-06-27T00:00:00Z"),
  updatedAt: new Date("2026-06-27T00:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCatValues.mockReturnValue({ returning: mockCatReturning });
  // from() returns object with both .orderBy and .where
  mockCatFrom.mockReturnValue({ orderBy: mockCatOrderBy, where: mockCatWhere });
  mockCatWhere.mockReturnValue({ orderBy: mockCatOrderBy });
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

// ── getCategoriesByScope ────────────────────────────────────────────────────

describe("getCategoriesByScope", () => {
  it("scope=event 카테고리를 필터링해 반환한다", async () => {
    mockCatOrderBy.mockResolvedValue([mockCategory]);
    const result = await getCategoriesByScope("event");
    expect(mockCatWhere).toHaveBeenCalled();
    expect(mockCatOrderBy).toHaveBeenCalled();
    expect(result).toEqual([mockCategory]);
  });

  it("scope=todo 카테고리를 필터링해 반환한다", async () => {
    const todoCat = { ...mockCategory, id: "cat-t", scope: "todo" as const };
    mockCatOrderBy.mockResolvedValue([todoCat]);
    const result = await getCategoriesByScope("todo");
    expect(result).toEqual([todoCat]);
  });
});

// ── updateCategory ──────────────────────────────────────────────────────────

describe("updateCategory", () => {
  beforeEach(() => {
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
  const mockCategory2 = {
    id: "cat-2",
    name: "개인",
    color: "#E74C3C",
    scope: "event" as const,
    sortOrder: 1,
    createdAt: new Date("2026-06-27T00:00:00Z"),
    updatedAt: new Date("2026-06-27T00:00:00Z"),
  };

  beforeEach(() => {
    mockCatOrderBy.mockResolvedValue([mockCategory, mockCategory2]);
    mockCatUpdateWhere.mockResolvedValue(undefined);
  });

  it("해당 카테고리가 없으면 에러를 던진다", async () => {
    mockCatOrderBy.mockResolvedValue([]);
    await expect(deleteCategory("cat-없음")).rejects.toThrow("카테고리를 찾을 수 없습니다");
  });

  it("같은 scope의 마지막 카테고리이면 에러를 던진다", async () => {
    mockCatOrderBy.mockResolvedValue([mockCategory]);
    await expect(deleteCategory("cat-1")).rejects.toThrow("마지막 카테고리는 삭제할 수 없습니다");
  });

  it("event scope 삭제 시 이벤트만 재배정한다", async () => {
    const { db } = jest.requireMock("@/db/client") as {
      db: { update: jest.Mock; delete: jest.Mock };
    };
    await deleteCategory("cat-1");
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockCatSet).toHaveBeenCalledWith({ categoryId: "cat-2" });
  });

  it("todo scope 삭제 시 할일만 재배정한다", async () => {
    const todoCat1 = { ...mockCategory, id: "cat-t1", scope: "todo" as const };
    const todoCat2 = { ...mockCategory2, id: "cat-t2", scope: "todo" as const };
    mockCatOrderBy.mockResolvedValue([todoCat1, todoCat2]);
    const { db } = jest.requireMock("@/db/client") as {
      db: { update: jest.Mock; delete: jest.Mock };
    };
    await deleteCategory("cat-t1");
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockCatSet).toHaveBeenCalledWith({ categoryId: "cat-t2" });
  });

  it("카테고리를 삭제한다", async () => {
    await deleteCategory("cat-1");
    expect(mockCatDeleteWhere).toHaveBeenCalled();
  });

  it("재배정 후 delete 순서로 실행된다", async () => {
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
    expect(calls).toEqual(["update", "delete"]);
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

// ── ensureDefaultCategoriesExist ────────────────────────────────────────────

describe("ensureDefaultCategoriesExist", () => {
  it("카테고리가 없으면 일정·ToDo 기본 카테고리를 모두 생성한다", async () => {
    mockCatOrderBy.mockResolvedValue([]);
    mockCatReturning.mockResolvedValue([mockCategory]);
    await ensureDefaultCategoriesExist();
    expect(mockCatValues).toHaveBeenCalledTimes(2);
    expect(mockCatValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: "일상", color: "#2F80FF", scope: "event" }),
    );
    expect(mockCatValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: "할일", color: "#2DE84D", scope: "todo" }),
    );
  });

  it("일정 카테고리가 없으면 일정 기본값만 생성한다", async () => {
    mockCatOrderBy.mockResolvedValue([{ ...mockCategory, scope: "todo" as const }]);
    mockCatReturning.mockResolvedValue([mockCategory]);
    await ensureDefaultCategoriesExist();
    expect(mockCatValues).toHaveBeenCalledTimes(1);
    expect(mockCatValues).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "event" }),
    );
  });

  it("ToDo 카테고리가 없으면 ToDo 기본값만 생성한다", async () => {
    mockCatOrderBy.mockResolvedValue([{ ...mockCategory, scope: "event" as const }]);
    mockCatReturning.mockResolvedValue([mockCategory]);
    await ensureDefaultCategoriesExist();
    expect(mockCatValues).toHaveBeenCalledTimes(1);
    expect(mockCatValues).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "todo" }),
    );
  });

  it("양쪽 카테고리가 있으면 아무것도 생성하지 않는다", async () => {
    mockCatOrderBy.mockResolvedValue([
      { ...mockCategory, scope: "event" as const },
      { ...mockCategory, id: "cat-2", scope: "todo" as const },
    ]);
    await ensureDefaultCategoriesExist();
    expect(mockCatValues).not.toHaveBeenCalled();
  });
});
