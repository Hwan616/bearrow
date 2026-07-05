# BACKLOG — 프롬프트 가능한 작업 목록

각 작업은 **독립적으로 하나의 프롬프트로 실행**할 수 있도록 작게 쪼갰다.
에이전트는 위에서부터 미완료(`[ ]`) 작업을 골라 `CLAUDE.md` 의 자율 워크플로대로 진행한다.

작업 형식: `ID · 제목` → 완료 조건 / 주요 파일 / 관련 요구사항 / 프롬프트 예시.

---

## Phase 0 — 기반 (완료)

- [x] **0.1 CI/CD 파이프라인** — GitHub Actions 4종 + `eas.json`
- [x] **0.2 환경 분리** — `app.config.ts`, `src/config/env.ts` · `NFR-POR-001`
- [x] **0.3 린트·테스트 기반** — eslint/prettier/jest, 통과하는 샘플 테스트
- [x] **0.4 디자인 토큰·테마 골격**
  - 완료: `src/theme/` 에 색상 토큰(라이트/다크), `useTheme` 훅, 테마 단위 테스트.
  - 파일: `src/theme/tokens.ts`, `src/theme/index.ts`, `src/theme/__tests__/`
  - 요구사항: `UI-002`, `NFR-CON-001`
  - 프롬프트: "0.4 디자인 토큰·테마 골격 작업 진행해"
- [x] **0.5 로컬 DB 부트스트랩**
  - 완료: expo-sqlite + Drizzle 연결, 마이그레이션 러너, 빈 스키마 모듈.
  - 파일: `src/db/client.ts`, `src/db/schema.ts`, `src/db/__tests__/`
  - 요구사항: `NFR-CON-002`, `NFR-REL-001`
  - 프롬프트: "0.5 로컬 DB 부트스트랩 진행해"

## Phase 1 — 캘린더 코어

- [x] **1.1 Event 데이터 모델·로컬 CRUD**
  - 완료: `events` 테이블 스키마 + 생성/조회(기간)/수정/삭제 함수 + 테스트.
  - 파일: `src/db/schema.ts`, `src/features/calendar/api/`, `__tests__/`
  - 요구사항: `FR-CAL-001`, `FR-CAL-003`
- [x] **1.2 월(Month) 뷰**
  - 완료: 월 그리드 렌더, 날짜별 일정 점/칩 표시, 월 이동.
  - 파일: `src/features/calendar/components/MonthView.tsx`, `src/features/calendar/hooks/useMonthItems.ts`, `src/features/calendar/utils/calendarUtils.ts`
  - 요구사항: `FR-CAL-002`, `UI-001`
- [x] **1.3 주·일 뷰**
  - 완료: 시간축 기반 주/일 뷰, 뷰 전환 토글.
  - 파일: `src/features/calendar/components/WeekDayView.tsx`, `src/features/calendar/hooks/useWeekEvents.ts`, `src/features/calendar/utils/timeGridUtils.ts`
  - 요구사항: `FR-CAL-002`, `UI-001`
- [x] **1.4 일정 생성·편집 폼**
  - 완료: 제목·시간·종일·메모·카테고리 입력, 저장 시 로컬 반영.
  - 파일: `src/features/calendar/components/EventForm.tsx`, `src/features/calendar/utils/eventFormUtils.ts`, `src/features/calendar/api/events.ts`
  - 요구사항: `FR-CAL-001`, `FR-CAL-003`, `FR-CAL-004`
- [x] **1.5 반복 일정(RRULE)**
  - 완료: 기본 반복(매일/매주/매월) 생성·전개, 예외 처리, 테스트.
  - 파일: `src/features/calendar/utils/rruleUtils.ts`, `src/db/migrate.ts` (0002_add_recurrence)
  - 요구사항: `FR-CAL-005`
- [x] **1.6 알림**
  - 완료: expo-notifications 로 일정 전 로컬 알림 예약/취소.
  - 파일: `src/features/calendar/api/notifications.ts`, `src/features/calendar/utils/notificationUtils.ts`, `src/db/migrate.ts` (0003_add_reminder)
  - 요구사항: `FR-CAL-006`

## Phase 2 — 투두 코어

- [x] **2.1 Category CRUD**
  - 완료: 카테고리 생성·이름변경·삭제·순서변경·색상지정 + 테스트.
  - 파일: `src/features/category/api/categories.ts`, `src/features/category/types.ts`, `src/db/migrate.ts` (0004_create_categories)
  - 요구사항: `FR-CAT-001`, `FR-CAT-002`, `FR-CAT-003`
- [x] **2.2 Todo 데이터 모델·CRUD**
  - 완료: 할일 생성/수정/삭제/완료, 메모, 카테고리 연결 + 테스트.
  - 파일: `src/features/todo/api/todos.ts`, `src/features/todo/types.ts`, `src/db/migrate.ts` (0005_create_todos)
  - 요구사항: `FR-TODO-001`, `FR-TODO-002`, `FR-TODO-003`, `FR-TODO-004`, `FR-TODO-006`
- [x] **2.3 투두 목록 UI**
  - 완료: 카테고리별 섹션, 체크 완료, 스와이프 삭제.
  - 파일: `src/features/todo/components/TodoList.tsx`, `src/features/todo/components/TodoItem.tsx`, `src/features/todo/hooks/useTodos.ts`, `src/features/todo/utils/todoListUtils.ts`
  - 요구사항: `FR-TODO-001`, `UI-001`
- [x] **2.4 할일 날짜 지정·변경**
  - 완료: due_date 설정/변경 UI, 변경 시 캘린더 연동 반영.
  - 파일: `src/features/todo/components/TodoForm.tsx`, `src/features/todo/utils/todoDateUtils.ts`, `App.tsx`
  - 요구사항: `FR-TODO-005`

## Phase 3 — 통합·테마

- [x] **3.1 캘린더–투두 연동 표시**
  - 완료: 마감일 있는 할일이 해당 날짜 캘린더에 표시.
  - 파일: `src/features/calendar/utils/calendarUtils.ts` (getTodosForDay), `src/features/todo/api/todos.ts` (getTodosByDueDateRange), `src/features/calendar/hooks/useMonthItems.ts`, `src/features/calendar/components/MonthView.tsx`
  - 요구사항: `FR-INT-001`, `FR-INT-002`
- [x] **3.2 통합 데일리 뷰**
  - 완료: 특정 날짜의 일정+할일을 하나의 타임라인으로.
  - 파일: `src/features/calendar/hooks/useDayItems.ts`, `src/features/calendar/components/DayDetailPanel.tsx`, `App.tsx`
  - 요구사항: `FR-INT-003`
- [x] **3.3 일정→할일 파생**
  - 완료: 일정 상세에서 "할일로 추가"로 연관 Todo 생성(event_id).
  - 파일: `src/features/calendar/components/EventDetailSheet.tsx`, `src/features/todo/api/todos.ts` (createTodoFromEvent), `src/db/migrate.ts` (0006_add_event_id_to_todos)
  - 요구사항: `FR-INT-004`
- [x] **3.4 색상 커스터마이징 UI**
  - 완료: 카테고리·강조색 변경 화면, 다크모드 토글, 영속화.
  - 파일: `src/theme/ThemeContext.tsx`, `src/theme/resolve.ts`, `src/features/settings/components/SettingsScreen.tsx`, `App.tsx`
  - 요구사항: `UI-002`

## Phase 4 — 동기화·백엔드

- [x] **4.1 Supabase 연결·인증**
  - 완료: Supabase 클라이언트, Google OAuth 로그인/로그아웃, 세션 영속화.
  - 파일: `src/lib/supabase.ts`, `src/features/auth/api/auth.ts`, `src/features/auth/hooks/useAuth.ts`, `src/features/settings/components/SettingsScreen.tsx`
  - 요구사항: `FR-SYNC-001`, `IF-003`, `NFR-SEC-001`
- [x] **4.2 동기화 엔진(push/pull)**
  - 완료: 변경 큐, updatedAt 기반 충돌 해결, 백엔드 push/pull + 테스트.
  - 파일: `src/sync/types.ts`, `src/sync/queue.ts`, `src/sync/push.ts`, `src/sync/pull.ts`, `src/sync/engine.ts`, `src/db/migrate.ts` (0007_create_sync_tables)
  - 요구사항: `FR-SYNC-002`, `FR-SYNC-004`, `NFR-CON-002`, `NFR-PERF-002`
- [x] **4.3 Google 캘린더 양방향 동기화**
  - 완료: OAuth 연결, syncToken 증분 동기화, 410→full sync, 삭제 반영.
  - 파일: `src/sync/googleCalendarApi.ts`, `src/sync/googleCalendarUtils.ts`, `src/sync/googleCalendarSync.ts`, `src/sync/engine.ts`, `src/features/auth/api/auth.ts`
  - 요구사항: `FR-SYNC-003`, `IF-001`
- [x] **4.4 RLS·보안 점검**
  - 완료: Postgres RLS 정책, 토큰 secure-store 저장 검증.
  - 요구사항: `NFR-SEC-001`, `NFR-SEC-002`

## Phase 5 — 안정화

- [x] **5.1 Sentry 연동** — 크래시·에러 추적, 릴리즈 태깅.
- [x] **5.2 E2E 스모크 테스트** — 핵심 플로우 자동화.
- [x] **5.3 성능·접근성 점검** — 리스트 가상화, 대비/폰트 스케일. · `NFR-PERF-001`, `UI-003`
- [ ] **5.4 (선택) self-hosted OTA** — `expo-updates` 자체 호스팅 업데이트 서버 구성(무료). · `NFR-MNT-001`

## Phase 6 — 기능 고도화·UI 완성

> 시뮬레이터 검증 후 발견된 미완성 부분을 완성하는 단계.
> 작업 항목은 사용자 요청에 따라 순차적으로 추가한다.

- [x] **6.1 카테고리 관리 완성 (투두)**
  - 완료: 카테고리 생성·편집·삭제 UI(CategoryManager/CategoryForm), 할일은 반드시 카테고리 1개 보유, 마지막 카테고리 삭제 불가, 삭제 시 fallback 재배정, 앱 초기화 시 기본 카테고리('카테고리') 자동 생성, 이름 미입력 시 '카테고리' 기본값.
  - 파일: `src/features/category/api/categories.ts`, `src/features/category/hooks/useCategories.ts`, `src/features/category/components/CategoryManager.tsx`, `src/features/category/components/CategoryForm.tsx`, `src/features/todo/components/TodoForm.tsx`, `src/features/todo/hooks/useTodos.ts`, `src/features/settings/components/SettingsScreen.tsx`, `App.tsx`
  - 요구사항: `FR-CAT-001`, `FR-CAT-002`, `FR-CAT-003`, `FR-TODO-001`
- [x] **6.2 할일 편집 기능 추가**
  - 완료: TodoItem 행 클릭 → 편집 모달, 동그라미(원형 체크박스)만 클릭 → 완료 토글. TodoForm에 `initial?: Todo` prop 추가(편집 모드 프리필), useTodos에 handleUpdate 추가, 마감일 별도 모달 제거(편집 폼으로 통합).
  - 파일: `src/features/todo/components/TodoForm.tsx`, `src/features/todo/components/TodoItem.tsx`, `src/features/todo/components/TodoList.tsx`, `src/features/todo/hooks/useTodos.ts`, `App.tsx`
  - 요구사항: `FR-TODO-002`, `FR-TODO-003`
- [x] **6.4 한국 공휴일 표시**
  - 완료: 양력 고정 공휴일 9종 + 음력 기반 공휴일(설날 연휴 3일·추석 연휴 3일·부처님오신날) 사전 계산 테이블(2023-2030). MonthView에서 공휴일 날짜 빨간 표시 + 이름 라벨. DayDetailPanel 헤더에 공휴일 배지. 설정 화면 '캘린더' 섹션에서 공휴일 표시 토글(기본값: 켜짐), AsyncStorage 영속화.
  - 파일: `src/features/calendar/utils/koreanHolidays.ts`, `src/features/settings/AppSettingsContext.tsx`, `src/features/calendar/components/MonthView.tsx`, `src/features/calendar/components/DayDetailPanel.tsx`, `src/features/settings/components/SettingsScreen.tsx`, `App.tsx`
  - 요구사항: `UI-001`, `FR-CAL-002`
- [x] **6.3 이벤트·할일 CRUD 완성**
  - 완료: EventDetailSheet에 편집(EventForm 중첩 모달)·삭제(Alert 확인 후 deleteEvent) 추가. DayDetailPanel 할일 행을 인터랙티브하게 변경(원형 = 완료 토글, 텍스트 = 편집 모달). useDayItems에 refresh() 추가로 토글 후 즉시 재조회.
  - 파일: `src/features/calendar/components/EventDetailSheet.tsx`, `src/features/calendar/components/DayDetailPanel.tsx`, `src/features/calendar/hooks/useDayItems.ts`, `App.tsx`
  - 요구사항: `FR-CAL-003`, `FR-CAL-004`, `FR-INT-003`

## Phase 7 — 출시

- [ ] **7.1 스토어 메타데이터·스크린샷**
- [ ] **7.2 베타 배포(TestFlight/내부테스트)**
- [ ] **7.3 정식 릴리즈** — `v*` 태그 → `release.yml` 승인.

---

## 새 작업 추가 규칙

범위 밖 요구가 생기면 임의 구현 대신 이 파일의 적절한 Phase에 `[ ]` 항목을 먼저 추가하고
완료 조건·주요 파일·관련 요구사항 ID를 기재한 뒤 사용자에게 우선순위를 확인한다.
