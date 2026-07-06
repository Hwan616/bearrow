import { useCallback, useEffect, useState } from "react";

import {
  clearICloudCredentials,
  getICloudCredentials,
  saveICloudCredentials,
  syncICloud,
  verifyICloudConnection,
} from "@/sync/icloudCalendarSync";

export function useICloudSync() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getICloudCredentials().then((creds) => {
      setEmail(creds?.email ?? null);
      setIsLoading(false);
    });
  }, []);

  const connect = useCallback(async (newEmail: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const ok = await verifyICloudConnection(newEmail, password);
      if (!ok) {
        setError("연결 실패 — Apple ID와 앱 전용 암호를 확인해 주세요.");
        return false;
      }
      await saveICloudCredentials(newEmail, password);
      setEmail(newEmail);
      return true;
    } catch {
      setError("연결 중 오류가 발생했습니다.");
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await clearICloudCredentials();
    setEmail(null);
    setLastResult(null);
    setError(null);
  }, []);

  const sync = useCallback(async () => {
    const creds = await getICloudCredentials();
    if (!creds) return;
    setIsSyncing(true);
    setError(null);
    try {
      const result = await syncICloud(creds);
      setLastResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    email,
    isConnected: email !== null,
    isLoading,
    isSyncing,
    lastResult,
    error,
    connect,
    disconnect,
    sync,
  };
}
