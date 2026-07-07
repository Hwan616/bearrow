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
  // 알림
  reminderMinutes: int("reminder_minutes"),                               // null = 알림 없음, 0 = 정시, N = N분 전
  // 반복 일정
  rrule: text("rrule"),                                                   // 마스터: RRULE 문자열 (e.g. "FREQ=DAILY")
  recurringEventId: text("recurring_event_id"),                           // 예외: 마스터 id 참조
  exceptionDate: int("exception_date", { mode: "timestamp" }),            // 예외: 원래 인스턴스 날짜
  isDeleted: int("is_deleted", { mode: "boolean" }).notNull().default(false), // 예외: 삭제된 인스턴스
});

export const todos = sqliteTable("todos", {
  id: text("id").notNull().primaryKey(),
  title: text("title").notNull(),
  note: text("note"),
  isCompleted: int("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: int("completed_at", { mode: "timestamp" }),
  dueDate: int("due_date", { mode: "timestamp" }),   // 마감일 (캘린더 연동, FR-TODO-005)
  categoryId: text("category_id"),
  eventId: text("event_id"),                          // 파생 출처 이벤트 (FR-INT-004)
  assignedDate: int("assigned_date", { mode: "timestamp" }).notNull(),  // 캘린더 표시 날짜 (항상 존재)
  hasDueTime: int("has_due_time", { mode: "boolean" }).notNull().default(false), // dueDate에 시간 성분 여부
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: int("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#2E5AAC"),
  scope: text("scope").$type<"event" | "todo">().notNull().default("event"),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: int("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull(),
});
