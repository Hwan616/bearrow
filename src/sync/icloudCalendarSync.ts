// iCloud CalDAV 동기화 — 인증 정보 관리 + 이벤트 가져오기

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { sqliteDb } from "@/db/client";

import { CalDAVClient } from "./caldavClient";
import { parseVCalendar } from "./icalParser";
import type { ParsedVEvent } from "./icalParser";

const KEY_EMAIL = "@bearrow/icloud_email";
const KEY_PASSWORD = "@bearrow/icloud_password";

export interface ICloudCredentials {
  email: string;
  password: string;
}

// ── 자격 증명 관리 ────────────────────────────────────────────────────────────

export async function getICloudCredentials(): Promise<ICloudCredentials | null> {
  const [email, password] = await Promise.all([
    SecureStore.getItemAsync(KEY_EMAIL),
    SecureStore.getItemAsync(KEY_PASSWORD),
  ]);
  if (!email || !password) return null;
  return { email, password };
}

export async function saveICloudCredentials(
  email: string,
  password: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_EMAIL, email),
    SecureStore.setItemAsync(KEY_PASSWORD, password),
  ]);
}

export async function clearICloudCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_EMAIL),
    SecureStore.deleteItemAsync(KEY_PASSWORD),
  ]);
}

// ── 연결 테스트 ────────────────────────────────────────────────────────────────

export async function verifyICloudConnection(
  email: string,
  password: string,
): Promise<boolean> {
  const client = new CalDAVClient(email, password);
  return client.testConnection();
}

// ── 이벤트 적용 (upsert) ──────────────────────────────────────────────────────

async function applyEvent(event: ParsedVEvent): Promise<void> {
  const existing = await sqliteDb.getFirstAsync<{ id: string; updated_at: number }>(
    "SELECT id, updated_at FROM events WHERE external_id = ? AND source = 'apple'",
    [event.uid],
  );

  const updatedAt = event.lastModified ?? Date.now();

  // 로컬이 더 최신이면 skip
  if (existing && existing.updated_at >= updatedAt) return;

  const id = existing?.id ?? (await Crypto.randomUUID());

  await sqliteDb.runAsync(
    `INSERT OR REPLACE INTO events
       (id, title, note, is_all_day, starts_at, ends_at,
        source, external_id, updated_at, is_deleted,
        category_id, rrule, recurring_event_id, exception_date, reminder_minutes)
     VALUES (?, ?, ?, ?, ?, ?, 'apple', ?, ?, 0, NULL, ?, NULL, NULL, NULL)`,
    [
      id,
      event.title,
      event.note,
      event.isAllDay ? 1 : 0,
      event.startsAt.getTime(),
      event.endsAt.getTime(),
      event.uid,
      updatedAt,
      event.rrule,
    ],
  );
}

// ── 동기화 진입점 ─────────────────────────────────────────────────────────────

export async function syncICloud(
  credentials: ICloudCredentials,
): Promise<{ imported: number }> {
  const client = new CalDAVClient(credentials.email, credentials.password);
  const calendars = await client.listCalendars();

  let imported = 0;
  for (const cal of calendars) {
    const blocks = await client.fetchEventBlocks(cal.url);
    for (const ical of blocks) {
      const events = parseVCalendar(ical);
      for (const event of events) {
        await applyEvent(event);
        imported++;
      }
    }
  }

  return { imported };
}
