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
  // 반복 일정
  rrule: text("rrule"),                                                   // 마스터: RRULE 문자열 (e.g. "FREQ=DAILY")
  recurringEventId: text("recurring_event_id"),                           // 예외: 마스터 id 참조
  exceptionDate: int("exception_date", { mode: "timestamp" }),            // 예외: 원래 인스턴스 날짜
  isDeleted: int("is_deleted", { mode: "boolean" }).notNull().default(false), // 예외: 삭제된 인스턴스
});

// Phase 2+ 에서 추가 예정: categories, todos
