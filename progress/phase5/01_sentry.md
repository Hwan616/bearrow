# 5.1 Sentry 연동

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-29 16:05 |
| 상태 | ✅ 완료 |
| 요구사항 | NFR-MNT-001 |

## 구현 내용

- `src/lib/sentry.ts` — Sentry 래퍼 (initSentry, captureException, captureMessage, setSentryUser)
  - `EXPO_PUBLIC_SENTRY_DSN` 없으면 전 함수 no-op
  - production 환경에서만 tracesSampleRate 0.1 적용
  - release 는 `EXPO_PUBLIC_APP_VERSION` 환경변수(없으면 "0.1.0")
- `index.ts` — 앱 진입 시 `initSentry()` 호출
- `App.tsx` — `Sentry.ErrorBoundary`로 루트 컴포넌트 감싸기 (렌더 에러 포착)
- `src/features/auth/hooks/useAuth.ts` — 로그인·로그아웃 시 `setSentryUser` 호출
- `app.config.ts` — `@sentry/react-native/expo` 플러그인 추가 (네이티브 빌드 소스맵·심볼 업로드)

## 테스트

- `src/lib/__tests__/sentry.test.ts` — 12개 테스트
  - DSN 미설정 시 no-op (5개)
  - DSN 설정 시 init/captureException/captureMessage/setSentryUser 동작 (7개)

## 실사용 전 체크리스트

- [ ] Sentry 대시보드에서 프로젝트 생성 후 DSN 획득
- [ ] `.env`(또는 CI 시크릿)에 `EXPO_PUBLIC_SENTRY_DSN` 설정
- [ ] `app.config.ts`의 `organization`, `project` 값을 실제 값으로 교체
- [ ] 네이티브 빌드 후 Sentry Auth Token 설정 (`SENTRY_AUTH_TOKEN`)
