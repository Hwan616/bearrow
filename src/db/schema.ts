import { int, text, sqliteTable } from "drizzle-orm/sqlite-core";

import { commonColumns } from "./helpers";

export { commonColumns } from "./helpers";

export const events = sqliteTable("events", {
  ...commonColumns,
  title: text("title").notNull(),
  note: text("note"),
  isAllDay: int("is_all_day", { mode: "boolean" }).notNull().default(false),
  startsAt: int("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: int("ends_at", { mode: "timestamp" }).notNull(),
  categoryId: text("category_id"),
  source: text("source", { enum: ["local", "google", "apple"] })
    .notNull()
    .default("local"),
  externalId: text("external_id"),
});

// Phase 2+ 에서 추가 예정: categories, todos
