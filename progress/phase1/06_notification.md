# 1.6 알림

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 14:48 |
| 요구사항 | FR-CAL-006 |
| 커밋 | 05c375e |

## 한 일

- `notificationUtils.ts` — 알림 예약/취소 유틸리티 (일정 시작 전 N분 로컬 알림)
- `notifications.ts` — expo-notifications 래퍼 (권한 요청, 예약, 취소)
- `migrate 0003` — events 테이블에 `reminder_minutes` 컬럼 추가
- EventForm 에 알림 설정 UI 통합

## 주요 결정

- expo-notifications 로컬 알림만 사용 (서버 푸시는 Phase 5 Sentry 연동 이후)
- 알림 식별자는 `event-{id}` 형식으로 이벤트 ID 와 1:1 매핑

## 남은 과제 / 주의사항

- 반복 일정의 경우 각 발생일마다 별도 알림 예약 필요 (현재는 단일 알림만)
