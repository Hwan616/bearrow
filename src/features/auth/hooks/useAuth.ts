import { useEffect, useState } from "react";

import { getSession, mapUser, onAuthStateChange, signInWithGoogle, signOut } from "../api/auth";
import type { AuthUser } from "../types";

export interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 앱 시작 시 영속 세션 복원
    getSession()
      .then((session) => setUser(mapUser(session?.user ?? null)))
      .finally(() => setIsLoading(false));

    // 로그인·로그아웃 등 인증 상태 변화 구독
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    signIn: signInWithGoogle,
    signOut,
  };
}
