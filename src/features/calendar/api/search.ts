import { like } from "drizzle-orm";

import { db } from "@/db/client";
import { events, todos } from "@/db/schema";

export type SearchResultKind = "event" | "todo";

export interface SearchResult {
  id: string;
  title: string;
  kind: SearchResultKind;
  date: Date | null;
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const pattern = `%${query.trim()}%`;

  const [matchedEvents, matchedTodos] = await Promise.all([
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt, isDeleted: events.isDeleted })
      .from(events)
      .where(like(events.title, pattern)),
    db
      .select({ id: todos.id, title: todos.title, dueDate: todos.dueDate })
      .from(todos)
      .where(like(todos.title, pattern)),
  ]);

  const eventResults: SearchResult[] = matchedEvents
    .filter((e) => !e.isDeleted)
    .map((e) => ({ id: e.id, title: e.title, kind: "event", date: e.startsAt }));

  const todoResults: SearchResult[] = matchedTodos.map((t) => ({
    id: t.id,
    title: t.title,
    kind: "todo",
    date: t.dueDate,
  }));

  return [...eventResults, ...todoResults].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });
}
