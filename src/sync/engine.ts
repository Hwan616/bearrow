import { supabase } from "@/lib/supabase";

import { pullChanges } from "./pull";
import { pushChanges } from "./push";
import type { SyncResult } from "./types";

// push → pull 순서로 동기화한다. 인증되지 않은 경우 건너뜬다.
export async function syncAll(): Promise<SyncResult> {
  const pushResult = await pushChanges(supabase);
  const pullResult = await pullChanges(supabase);

  return {
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    failedPush: pushResult.failedPush,
  };
}
