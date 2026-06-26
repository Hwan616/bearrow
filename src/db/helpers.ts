import { int, text } from "drizzle-orm/sqlite-core";

// 모든 테이블이 공유하는 공통 컬럼 (CONVENTIONS: id·updated_at 필수)
export const commonColumns = {
  id: text("id").primaryKey(),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull(),
};
