# 4.3 Google 캘린더 양방향 동기화

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-29 15:28 |
| 상태 | ✅ 완료 |
| 요구사항 | FR-SYNC-003, IF-001 |

## 구현 내용

- `src/sync/googleCalendarApi.ts` — Google Calendar REST API 래퍼 (fetch/create/update/delete), `GoogleSyncTokenExpiredError` (410 처리)
- `src/sync/googleCalendarUtils.ts` — Google ↔ 로컬 이벤트 변환 (`mapGoogleEventToLocal`, `mapLocalEventToGoogle`)
- `src/sync/googleCalendarSync.ts` — `pullFromGoogle` (syncToken 증분, 410→full sync, 페이지네이션), `pushToGoogle` (신규·수정·삭제)
- `src/sync/engine.ts` — `syncAll()`에 Google Calendar 단계 통합 (provider_token 있을 때만 실행)
- `src/features/auth/api/auth.ts` — Google OAuth scope에 `calendar` 추가

## 테스트

- `src/sync/__tests__/googleCalendarApi.test.ts` (fetch mock, 410 에러 등)
- `src/sync/__tests__/googleCalendarUtils.test.ts` (시간/종일/cancelled 이벤트 변환)
- `src/sync/__tests__/googleCalendarSync.test.ts` (pull/push 전체 시나리오)
