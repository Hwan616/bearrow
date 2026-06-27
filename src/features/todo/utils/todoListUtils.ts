import type { Category } from "@/features/category/types";

import type { Todo } from "../types";

export type TodoSection = {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  todos: Todo[];
};

const UNCATEGORIZED_COLOR = "#607D8B";

/**
 * 카테고리 순서대로 섹션을 만들고, 미분류 항목은 마지막에 배치한다.
 * 할일이 없는 카테고리 섹션은 생성하지 않는다.
 * 존재하지 않는 categoryId를 가진 할일은 미분류로 처리한다.
 */
export function groupTodosByCategory(todos: Todo[], categories: Category[]): TodoSection[] {
  if (todos.length === 0) return [];

  const catIds = new Set(categories.map((c) => c.id));

  // categoryId → Todo[] 매핑 (유효하지 않은 categoryId는 null로)
  const groups = new Map<string | null, Todo[]>();
  for (const todo of todos) {
    const key = todo.categoryId !== null && catIds.has(todo.categoryId) ? todo.categoryId : null;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(todo);
    } else {
      groups.set(key, [todo]);
    }
  }

  const sections: TodoSection[] = [];

  // 카테고리 순서대로 섹션 추가 (빈 섹션 제외)
  for (const cat of categories) {
    const catTodos = groups.get(cat.id);
    if (catTodos && catTodos.length > 0) {
      sections.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        todos: catTodos,
      });
    }
  }

  // 미분류 섹션은 마지막
  const uncategorized = groups.get(null);
  if (uncategorized && uncategorized.length > 0) {
    sections.push({
      categoryId: null,
      categoryName: "미분류",
      categoryColor: UNCATEGORIZED_COLOR,
      todos: uncategorized,
    });
  }

  return sections;
}
