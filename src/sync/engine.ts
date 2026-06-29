import { getSession } from "@/features/auth/api/auth";
import { supabase } from "@/lib/supabase";

import { syncGoogleCalendar } from "./googleCalendarSync";
import { pullChanges } from "./pull";
import { pushChanges } from "./push";
import type { SyncResult } from "./types";

// Supabase push/pull → Google Calendar 동기화 순서로 실행한다.
// 미인증 또는 Google 토큰 없는 경우 해당 단계를 건너뜬다.
export async function syncAll(): Promise<SyncResult> {
  const supabasePush = await pushChanges(supabase);
  const supabasePull = await pullChanges(supabase);

  let googlePulled = 0;
  let googlePushed = 0;
  const session = await getSession();
  if (session?.provider_token) {
    const gResult = await syncGoogleCalendar(session.provider_token);
    googlePulled = gResult.pulled;
    googlePushed = gResult.pushed;
  }

  return {
    pushed: supabasePush.pushed + googlePushed,
    pulled: supabasePull.pulled + googlePulled,
    failedPush: supabasePush.failedPush,
  };
}
