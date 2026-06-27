import type { SupabaseClient } from "@supabase/supabase-js";

import { deletePendingChange, getPendingChanges } from "./queue";
import type { SyncEntityType } from "./types";

const TABLE: Record<SyncEntityType, string> = {
  event: "events",
  todo: "todos",
  category: "categories",
};

// 로컬 변경 큐를 Supabase 로 전송한다. 성공한 항목은 큐에서 제거한다.
export async function pushChanges(
  client: SupabaseClient,
): Promise<{ pushed: number; failedPush: number }> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { pushed: 0, failedPush: 0 };

  const pending = await getPendingChanges();
  let pushed = 0;
  let failedPush = 0;

  for (const change of pending) {
    try {
      if (change.operation === "upsert" && change.payload) {
        const { error } = await client
          .from(TABLE[change.entityType])
          .upsert({ ...change.payload, user_id: user.id });
        if (error) throw error;
      } else if (change.operation === "delete") {
        const { error } = await client
          .from(TABLE[change.entityType])
          .delete()
          .eq("id", change.entityId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
      await deletePendingChange(change.entityType, change.entityId);
      pushed++;
    } catch {
      failedPush++;
    }
  }

  return { pushed, failedPush };
}
