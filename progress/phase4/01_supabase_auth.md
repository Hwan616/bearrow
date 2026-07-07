# 4.1 Supabase 연결·인증

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:35 |
| 요구사항 | FR-SYNC-001, IF-003, NFR-SEC-001 |
| 커밋 | bdf697b |

## 한 일

- `src/lib/supabase.ts` — LargeSecureStore 어댑터(2KB 청크 분산) + createClient
  - `isSupabaseConfigured` 플래그로 미설정 시 네트워크 호출 차단
- `src/features/auth/api/auth.ts` — signInWithGoogle(expo-web-browser OAuth), signOut, getSession, onAuthStateChange
- `src/features/auth/types.ts` — AuthUser 타입
- `src/features/auth/hooks/useAuth.ts` — 세션 복원·상태 변화 구독 훅
- `src/config/env.ts` — supabaseConfig (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)
- `index.ts` — react-native-url-polyfill 최상단 import
- `SettingsScreen.tsx` — 계정 섹션 (로그인 버튼 / 아바타·이름·로그아웃)

## 주요 결정

- SecureStore 2048 바이트 한도 → LargeSecureStore 청크 분산 저장으로 해결
- PKCE flow 사용 (skipBrowserRedirect: true + exchangeCodeForSession)

## 남은 과제 / 주의사항

- `.env`에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY 설정 필요
- Supabase 대시보드에서 Google OAuth 프로바이더 활성화 필요
- `app.config.ts`의 `scheme: "bearrow"` 를 Supabase Redirect URL에 등록 필요
