import type { categories } from "@/db/schema";

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryScope = "event" | "todo";

export const CATEGORY_COLORS = [
  "#2E5AAC", // 기본 파랑
  "#E74C3C", // 빨강
  "#E67E22", // 주황
  "#F1C40F", // 노랑
  "#2ECC71", // 초록
  "#1ABC9C", // 청록
  "#9B59B6", // 보라
  "#E91E63", // 핑크
  "#607D8B", // 회색
  "#795548", // 갈색
] as const;
