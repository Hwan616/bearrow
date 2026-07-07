import type { categories } from "@/db/schema";

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryScope = "event" | "todo";

// 형광색에 가까운 밝고 선명한 팔레트
export const CATEGORY_COLORS = [
  "#2F80FF", // 네온 블루
  "#FF4D5E", // 네온 레드
  "#FF9F1C", // 네온 오렌지
  "#FFD23D", // 네온 옐로
  "#2DE84D", // 네온 그린
  "#1FE0C4", // 네온 청록
  "#A24BFF", // 네온 퍼플
  "#FF5DC8", // 네온 핑크
  "#00CFFF", // 네온 시안
  "#B6FF3D", // 네온 라임
] as const;
