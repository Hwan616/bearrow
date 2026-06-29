import type { SQLiteBindValue } from "expo-sqlite";

import { sqliteDb } from "@/db/client";

import {
  GoogleSyncTokenExpiredError,
  googleCreateEvent,
  googleDeleteEvent,
  googleFetchEvents,
  googleUpdateEvent,
} from "./googleCalendarApi";
import { mapGoogleEventToLocal, mapLocalEventToGoogle } from "./googleCalendarUtils";
import { getSyncMeta, setSyncMeta } from "./queue";
import type { GoogleEventItem } from "./googleCalendarApi";
import type { LocalEventForPush } from "./googleCalendarUtils";

const META_SYNC_TOKEN = "google_pull_sync_token";
const META_PUSH_AT = "google_push_at";

// ── Pull: Google Calendar → 로컬 ─────────────────────────────────────────────

async function applyGoogleEvent(item: GoogleEventItem): Promise<void> {
  const existing = await sqliteDb.getFirstAsync<{ id: string; updated_at: number }>(
    "SELECT id, updated_at FROM events WHERE external_id = ? AND source = 'google'",
    [item.id],
  );

  const mapped = mapGoogleEventToLocal(item, existing?.id);

  // 로컬이 더 최신이면 skip (last-write-wins)
  if (existing && existing.updated_at >= mapped.updatedAt) return;

  const vals: SQLiteBindValue[] = [
    mapped.id, mapped.title, mapped.note, mapped.isAllDay,
    mapped.startsAt, mapped.endsAt, "google", mapped.externalId,
    mapped.updatedAt, mapped.isDeleted,
  ];

  await sqliteDb.runAsync(
    `INSERT OR REPLACE INTO events
       (id, title, note, is_all_day, starts_at, ends_at, source, external_id,
        updated_at, is_deleted, category_id, rrule, recurring_event_id, exception_date, reminder_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)`,
    vals,
  );
}

// 페이지네이션을 포함한 전체 이벤트 수집
async function fetchAllPages(
  accessToken: string,
  syncToken: string | null,
): Promise<{ items: GoogleEventItem[]; nextSyncToken: string | null }> {
  const items: GoogleEventItem[] = [];
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;

  do {
    const res = await googleFetchEvents(accessToken, syncToken, pageToken);
    items.push(...(res.items ?? []));
    nextSyncToken = res.nextSyncToken ?? null;
    pageToken = res.nextPageToken ?? null;
  } while (pageToken);

  return { items, nextSyncToken };
}

export async function pullFromGoogle(accessToken: string): Promise<number> {
  const storedToken = await getSyncMeta(META_SYNC_TOKEN);
  const syncToken = storedToken || null;

  let items: GoogleEventItem[];
  let nextSyncToken: string | null;

  try {
    ({ items, nextSyncToken } = await fetchAllPages(accessToken, syncToken));
  } catch (err) {
    if (err instanceof GoogleSyncTokenExpiredError) {
      // 410 Gone → syncToken 삭제 후 전체 동기화
      await setSyncMeta(META_SYNC_TOKEN, "");
      ({ items, nextSyncToken } = await fetchAllPages(accessToken, null));
    } else {
      throw err;
    }
  }

  for (const item of items) {
    await applyGoogleEvent(item);
  }

  if (nextSyncToken) await setSyncMeta(META_SYNC_TOKEN, nextSyncToken);

  return items.length;
}

// ── Push: 로컬 → Google Calendar ─────────────────────────────────────────────

export async function pushToGoogle(accessToken: string): Promise<number> {
  const lastPushAtStr = await getSyncMeta(META_PUSH_AT);
  const since = lastPushAtStr ? parseInt(lastPushAtStr, 10) : 0;

  const events = await sqliteDb.getAllAsync<LocalEventForPush>(
    `SELECT id, title, note,
            is_all_day   AS isAllDay,
            starts_at    AS startsAt,
            ends_at      AS endsAt,
            external_id  AS externalId,
            is_deleted   AS isDeleted
     FROM events
     WHERE source = 'local' AND updated_at > ?`,
    [since],
  );

  let pushed = 0;

  for (const event of events) {
    try {
      const body = mapLocalEventToGoogle(event);

      if (event.isDeleted && event.externalId) {
        // 삭제된 이벤트 → Google에서도 삭제
        await googleDeleteEvent(accessToken, event.externalId);
      } else if (!event.isDeleted && !event.externalId) {
        // 신규 이벤트 → Google에 생성 후 external_id 반영
        const googleId = await googleCreateEvent(accessToken, body);
        await sqliteDb.runAsync(
          "UPDATE events SET external_id = ? WHERE id = ?",
          [googleId, event.id],
        );
      } else if (!event.isDeleted && event.externalId) {
        // 기존 이벤트 수정
        await googleUpdateEvent(accessToken, event.externalId, body);
      }
      pushed++;
    } catch {
      // 단일 이벤트 실패는 건너뜀 — 다음 sync 시 재시도
    }
  }

  await setSyncMeta(META_PUSH_AT, Date.now().toString());
  return pushed;
}

// ── 진입점 ────────────────────────────────────────────────────────────────────

export async function syncGoogleCalendar(
  accessToken: string,
): Promise<{ pulled: number; pushed: number }> {
  const pulled = await pullFromGoogle(accessToken);
  const pushed = await pushToGoogle(accessToken);
  return { pulled, pushed };
}
