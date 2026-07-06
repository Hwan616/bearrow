import { useCallback, useState } from "react";

import { getSession } from "@/features/auth/api/auth";
import { syncGoogleCalendar } from "@/sync/googleCalendarSync";

export function useGoogleCalendarSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ pulled: number; pushed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const session = await getSession();
      // provider_token = Google OAuth 액세스 토큰 (캘린더 스코프 포함)
      const token = session?.provider_token;
      if (!token) throw new Error("Google 계정으로 로그인 후 다시 시도해 주세요.");
      const result = await syncGoogleCalendar(token);
      setLastResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google 동기화 오류");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { isSyncing, lastResult, error, sync };
}
