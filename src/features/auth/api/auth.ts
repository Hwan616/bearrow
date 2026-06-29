import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

import type { AuthUser } from "../types";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

// 세션의 Supabase User → 앱 AuthUser 변환
export function mapUser(user: Session["user"] | null | undefined): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.["full_name"] as string | null ?? null,
    avatarUrl: user.user_metadata?.["avatar_url"] as string | null ?? null,
  };
}

// Google OAuth 로그인 — 시스템 브라우저를 열고 콜백으로 세션을 수신한다
export async function signInWithGoogle(): Promise<void> {
  const redirectUrl = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      scopes: "https://www.googleapis.com/auth/calendar",
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("OAuth URL을 받지 못했습니다.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === "success" && result.url) {
    const parsed = new URL(result.url);
    const code = parsed.searchParams.get("code");
    if (code) {
      const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchError) throw exchError;
    }
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 현재 세션 반환 (앱 시작 시 세션 복원용)
export async function getSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// 인증 상태 변경 리스너 — useAuth 훅에서 사용
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}
