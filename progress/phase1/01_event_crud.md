# 1.1 Event 데이터 모델·로컬 CRUD

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 17:00 |
| 요구사항 | FR-CAL-001, FR-CAL-003 |
| 커밋 | 5dfc0ff |

## 한 일

- `src/db/schema.ts` — `events` 테이블 정의 (Drizzle)
  - commonColumns (id, updated_at) + title / note / isAllDay / startsAt / endsAt / categoryId / source / externalId
- `src/db/migrate.ts` — `0001_create_events` 마이그레이션 SQL 추가
- `src/features/calendar/types.ts` — `Event`, `NewEvent`, `EventSource` 타입 (schema에서 infer)
- `src/features/calendar/api/events.ts` — CRUD 5개 함수
  - `createEvent` / `getEventById` / `getEventsByDateRange` / `updateEvent` / `deleteEvent`
- `package.json` — jest `moduleNameMapper` 추가 (`@/` 별칭 테스트 지원)
- 테스트 10개 추가 (총 34개 green)

## 주요 결정

- **overlap 쿼리**: `getEventsByDateRange`는 `lte(startsAt, to) AND gte(endsAt, from)` 조건으로 범위와 겹치는 모든 이벤트를 반환. 월 뷰(1.2)에서 다일 이벤트가 올바르게 표시되도록 하기 위함.
- **source 컬럼 선제 추가**: Phase 4 동기화 전이지만 `source`('local'|'google'|'apple')와 `externalId`를 지금 포함. 이후 마이그레이션으로 컬럼을 추가하는 것보다 초기 설계에 반영하는 것이 데이터 일관성상 유리.
- **categoryId nullable**: Phase 2.1 Category CRUD 전까지 FK 없이 nullable TEXT로 유지.

## 남은 과제 / 주의사항

- **UUID 생성**: `createEvent` 호출 전 id를 생성해야 함. Phase 1.4(일정 폼) 구현 시 `expo-crypto`의 `randomUUID()` 사용 예정.
- **App.tsx 마이그레이션 호출**: `runMigrations(sqliteDb)` 를 앱 시작 시 호출하는 코드가 아직 없음. Phase 1.2(월 뷰) 전에 추가 필요.
- **검색(FR-CAL-007)**: Could 우선순위로 백로그에 별도 항목 없음 — 필요 시 추가.
