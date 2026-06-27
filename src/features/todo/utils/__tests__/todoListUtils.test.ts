import { groupTodosByCategory } from "../todoListUtils";
import type { Category } from "@/features/category/types";
import type { Todo } from "../../types";

// ── 팩토리 ──────────────────────────────────────────────────────────────────

function makeCat(id: string, name: string, sortOrder = 0): Category {
  const now = new Date();
  return { id, name, color: "#2E5AAC", sortOrder, createdAt: now, updatedAt: now };
}

function makeTodo(id: string, categoryId: string | null = null): Todo {
  const now = new Date();
  return {
    id,
    title: `할일 ${id}`,
    note: null,
    isCompleted: false,
    completedAt: null,
    dueDate: null,
    categoryId,
    eventId: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ── 테스트 ──────────────────────────────────────────────────────────────────

describe("groupTodosByCategory", () => {
  it("빈 할일 목록이면 빈 배열을 반환한다", () => {
    expect(groupTodosByCategory([], [])).toEqual([]);
    expect(groupTodosByCategory([], [makeCat("c1", "업무")])).toEqual([]);
  });

  it("카테고리별로 그룹화한다", () => {
    const cats = [makeCat("c1", "업무"), makeCat("c2", "개인")];
    const todos = [makeTodo("t1", "c1"), makeTodo("t2", "c2"), makeTodo("t3", "c1")];
    const result = groupTodosByCategory(todos, cats);
    expect(result).toHaveLength(2);
    expect(result[0]?.categoryId).toBe("c1");
    expect(result[0]?.todos).toHaveLength(2);
    expect(result[1]?.categoryId).toBe("c2");
    expect(result[1]?.todos).toHaveLength(1);
  });

  it("할일이 없는 카테고리는 섹션을 생성하지 않는다", () => {
    const cats = [makeCat("c1", "업무"), makeCat("c2", "개인")];
    const todos = [makeTodo("t1", "c1")];
    const result = groupTodosByCategory(todos, cats);
    expect(result).toHaveLength(1);
    expect(result[0]?.categoryId).toBe("c1");
  });

  it("미분류 항목은 마지막 섹션에 위치한다", () => {
    const cats = [makeCat("c1", "업무")];
    const todos = [makeTodo("t1", null), makeTodo("t2", "c1")];
    const result = groupTodosByCategory(todos, cats);
    expect(result).toHaveLength(2);
    expect(result[0]?.categoryId).toBe("c1");
    expect(result[1]?.categoryId).toBeNull();
    expect(result[1]?.categoryName).toBe("미분류");
  });

  it("카테고리 순서를 따른다", () => {
    const cats = [makeCat("c2", "B", 0), makeCat("c1", "A", 1)];
    const todos = [makeTodo("t1", "c1"), makeTodo("t2", "c2")];
    const result = groupTodosByCategory(todos, cats);
    expect(result[0]?.categoryId).toBe("c2"); // B가 먼저
    expect(result[1]?.categoryId).toBe("c1");
  });

  it("존재하지 않는 categoryId는 미분류로 처리한다", () => {
    const todos = [makeTodo("t1", "deleted-cat")];
    const result = groupTodosByCategory(todos, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.categoryId).toBeNull();
    expect(result[0]?.todos).toHaveLength(1);
  });

  it("미분류만 있는 경우", () => {
    const todos = [makeTodo("t1", null), makeTodo("t2", null)];
    const result = groupTodosByCategory(todos, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.todos).toHaveLength(2);
  });

  it("섹션 메타데이터(categoryName, categoryColor)가 올바르다", () => {
    const cats = [{ ...makeCat("c1", "업무"), color: "#E74C3C" }];
    const todos = [makeTodo("t1", "c1")];
    const result = groupTodosByCategory(todos, cats);
    expect(result[0]?.categoryName).toBe("업무");
    expect(result[0]?.categoryColor).toBe("#E74C3C");
  });
});
