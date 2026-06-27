import { sqliteDb } from "@/db/client";

import type { PendingChange, SyncEntityType, SyncOperation } from "./types";

type RawPendingRow = {
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string | null;
  created_at: number;
};

// 로컬 변경을 큐에 적재한다. 같은 (entity_type, entity_id) 가 있으면 최신 상태로 교체한다.
export async function enqueuePush(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload?: Record<string, unknown> | null,
): Promise<void> {
  await sqliteDb.runAsync(
    `INSERT OR REPLACE INTO pending_changes (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [entityType, entityId, operation, payload ? JSON.stringify(payload) : null, Date.now()],
  );
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const rows = await sqliteDb.getAllAsync<RawPendingRow>(
    "SELECT * FROM pending_changes ORDER BY created_at ASC",
  );
  return rows.map((row) => ({
    entityType: row.entity_type as SyncEntityType,
    entityId: row.entity_id,
    operation: row.operation as SyncOperation,
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
    createdAt: new Date(row.created_at),
  }));
}

export async function deletePendingChange(
  entityType: SyncEntityType,
  entityId: string,
): Promise<void> {
  await sqliteDb.runAsync(
    "DELETE FROM pending_changes WHERE entity_type = ? AND entity_id = ?",
    [entityType, entityId],
  );
}

export async function clearPendingChanges(): Promise<void> {
  await sqliteDb.runAsync("DELETE FROM pending_changes");
}

// ── sync_meta 헬퍼 ────────────────────────────────────────────────────────────

export async function getSyncMeta(key: string): Promise<string | null> {
  const row = await sqliteDb.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  await sqliteDb.runAsync(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    [key, value],
  );
}
