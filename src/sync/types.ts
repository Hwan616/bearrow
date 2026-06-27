export type SyncEntityType = "event" | "todo" | "category";
export type SyncOperation = "upsert" | "delete";

export interface PendingChange {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  failedPush: number;
}
