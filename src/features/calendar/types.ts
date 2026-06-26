import { type events } from "@/db/schema";

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventSource = Event["source"];
