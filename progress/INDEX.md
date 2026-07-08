# BeArrow 진행 기록 INDEX

> 이 폴더는 `.gitignore` 처리되어 있으며 GitHub에 올라가지 않는다.
> 각 작업 완료 시 해당 Phase 폴더에 파일을 추가하고, 아래 목차를 갱신한다.

---

## 목차

### Phase 0 — 기반

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 0.1 | [phase0/01_ci_cd.md](phase0/01_ci_cd.md) | CI/CD 파이프라인 구축 | 2026-06-26 05:07 | ✅ |
| 0.2 | [phase0/02_env.md](phase0/02_env.md) | 환경 분리 | 2026-06-26 05:07 | ✅ |
| 0.3 | [phase0/03_lint_test.md](phase0/03_lint_test.md) | 린트·테스트 기반 | 2026-06-26 05:32 | ✅ |
| 0.4 | [phase0/04_theme.md](phase0/04_theme.md) | 디자인 토큰·테마 골격 | 2026-06-26 16:09 | ✅ |
| 0.5 | [phase0/05_db.md](phase0/05_db.md) | 로컬 DB 부트스트랩 | 2026-06-26 16:51 | ✅ |

### Phase 1 — 캘린더 코어

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 1.1 | [phase1/01_event_crud.md](phase1/01_event_crud.md) | Event 데이터 모델·로컬 CRUD | 2026-06-26 17:00 | ✅ |
| 1.2 | [phase1/02_month_view.md](phase1/02_month_view.md) | 월(Month) 뷰 | 2026-06-26 17:07 | ✅ |
| 1.3 | [phase1/03_week_day_view.md](phase1/03_week_day_view.md) | 주·일 뷰 | 2026-06-26 17:13 | ✅ |
| 1.4 | [phase1/04_event_form.md](phase1/04_event_form.md) | 일정 생성·편집 폼 | 2026-06-27 14:23 | ✅ |
| 1.5 | [phase1/05_rrule.md](phase1/05_rrule.md) | 반복 일정(RRULE) | 2026-06-27 14:40 | ✅ |
| 1.6 | [phase1/06_notification.md](phase1/06_notification.md) | 알림 | 2026-06-27 14:48 | ✅ |

### Phase 2 — 투두 코어

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 2.1 | [phase2/01_category_crud.md](phase2/01_category_crud.md) | Category CRUD | 2026-06-27 14:52 | ✅ |
| 2.2 | [phase2/02_todo_crud.md](phase2/02_todo_crud.md) | Todo 데이터 모델·CRUD | 2026-06-27 14:56 | ✅ |
| 2.3 | [phase2/03_todo_list_ui.md](phase2/03_todo_list_ui.md) | 투두 목록 UI | 2026-06-27 15:00 | ✅ |
| 2.4 | [phase2/04_todo_date.md](phase2/04_todo_date.md) | 할일 날짜 지정·변경 | 2026-06-27 15:06 | ✅ |

### Phase 3 — 통합·테마

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 3.1 | [phase3/01_cal_todo_link.md](phase3/01_cal_todo_link.md) | 캘린더–투두 연동 표시 | 2026-06-27 15:11 | ✅ |
| 3.2 | [phase3/02_daily_view.md](phase3/02_daily_view.md) | 통합 데일리 뷰 | 2026-06-27 15:14 | ✅ |
| 3.3 | [phase3/03_event_to_todo.md](phase3/03_event_to_todo.md) | 일정→할일 파생 | 2026-06-27 15:19 | ✅ |
| 3.4 | [phase3/04_color_ui.md](phase3/04_color_ui.md) | 색상 커스터마이징 UI | 2026-06-27 15:31 | ✅ |

### Phase 4 — 동기화·백엔드

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 4.1 | [phase4/01_supabase_auth.md](phase4/01_supabase_auth.md) | Supabase 연결·인증 | 2026-06-27 15:35 | ✅ |
| 4.2 | [phase4/02_sync_engine.md](phase4/02_sync_engine.md) | 동기화 엔진(push/pull) | 2026-06-27 15:42 | ✅ |
| 4.3 | [phase4/03_google_calendar_sync.md](phase4/03_google_calendar_sync.md) | Google 캘린더 양방향 동기화 | 2026-06-29 15:28 | ✅ |
| 4.4 | [phase4/04_rls_security.md](phase4/04_rls_security.md) | RLS·보안 점검 | 2026-06-29 15:57 | ✅ |

### Phase 5 — 안정화

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 5.1 | [phase5/01_sentry.md](phase5/01_sentry.md) | Sentry 연동 | 2026-06-29 16:05 | ✅ |
| 5.2 | [phase5/02_e2e.md](phase5/02_e2e.md) | E2E 스모크 테스트 | 2026-06-29 16:24 | ✅ |
| 5.3 | [phase5/03_perf_a11y.md](phase5/03_perf_a11y.md) | 성능·접근성 점검 | 2026-06-29 16:41 | ✅ |
| 5.4 | phase5/04_ota.md | self-hosted OTA | — | ⬜ |

### Phase 6 — 기능 고도화·UI 완성

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 6.1 | [phase6/6.1-category-management.md](phase6/6.1-category-management.md) | 카테고리 관리 완성 (투두) | 2026-07-05 22:05 | ✅ |
| 6.2 | [phase6/6.2-todo-edit.md](phase6/6.2-todo-edit.md) | 할일 편집 기능 추가 | 2026-07-05 22:13 | ✅ |
| 6.3 | [phase6/6.3-crud-completion.md](phase6/6.3-crud-completion.md) | 이벤트·할일 CRUD 완성 | 2026-07-05 22:20 | ✅ |
| 6.4 | [phase6/6.4-korean-holidays.md](phase6/6.4-korean-holidays.md) | 한국 공휴일 표시 및 설정 | 2026-07-05 22:49 | ✅ |
| 6.5 | [phase6/6.5-calendar-scroll-yearmonth-todo-calendar.md](phase6/6.5-calendar-scroll-yearmonth-todo-calendar.md) | 캘린더 통합 스크롤 · 연월 피커 · 투두 미니 캘린더 | 2026-07-05 23:07 | ✅ |
| 6.6 | [phase6/6.6-responsive-crossplatform.md](phase6/6.6-responsive-crossplatform.md) | 반응형·크로스플랫폼 레이아웃 | 2026-07-05 23:17 | ✅ |
| 6.7 | [phase6/6.7-external-calendar-sync.md](phase6/6.7-external-calendar-sync.md) | 외부 캘린더 연동 (Google · iCloud CalDAV) | 2026-07-06 10:19 | ✅ |

### Phase 7 — 캘린더 기반 UI 전면 개편

> 단계별 요구 → 수행 요약: [phase7/00-overview.md](phase7/00-overview.md)

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 7.1 | [phase7/7.1-app-shell.md](phase7/7.1-app-shell.md) | App.tsx 셸 재구성 (탭바 제거, Year/Month/Day 상태) | 2026-07-06 13:45 | ✅ |
| 7.2 | [phase7/7.2-year-view.md](phase7/7.2-year-view.md) | YearView 컴포넌트 | 2026-07-06 13:56 | ✅ |
| 7.3 | [phase7/7.3-month-view.md](phase7/7.3-month-view.md) | MonthView 개편 (이벤트 바, 투두 카운트) | 2026-07-06 14:13 | ✅ |
| 7.4 | [phase7/7.4-day-view.md](phase7/7.4-day-view.md) | DayView 개편 (연속 세로 스크롤, 가상화) | 2026-07-06 14:24 | ✅ |
| 7.5 | [phase7/7.5-bottom-sheet-panel.md](phase7/7.5-bottom-sheet-panel.md) | BottomSheet/SidePanel 컨테이너 시스템 | 2026-07-06 16:19 | ✅ |
| 7.6 | [phase7/7.6-todo-sheet.md](phase7/7.6-todo-sheet.md) | 투두 시트 (스냅 2단계, ↑↓ 정렬) | 2026-07-06 16:37 | ✅ |
| 7.7 | [phase7/7.7-settings-sheet.md](phase7/7.7-settings-sheet.md) | 설정 시트 | 2026-07-06 16:41 | ✅ |
| 7.8 | [phase7/7.8-add-sheet.md](phase7/7.8-add-sheet.md) | 일정·할일 추가 시트 (세그먼트 토글) | 2026-07-06 16:46 | ✅ |
| 7.9 | [phase7/7.9-search.md](phase7/7.9-search.md) | 검색 (제목 기반, 결과 → 뷰 이동) | 2026-07-06 16:52 | ✅ |
| 7.10 | [phase7/7.10-todos-schema.md](phase7/7.10-todos-schema.md) | todos 스키마 변경·마이그레이션 | 2026-07-06 17:03 | ✅ |
| 7.11 | [phase7/7.11-regression.md](phase7/7.11-regression.md) | 마무리·회귀 검증 | 2026-07-06 17:09 | ✅ |
| 7.12 | [phase7/7.12-infinite-scroll-year-month.md](phase7/7.12-infinite-scroll-year-month.md) | YearView·MonthView 무한 세로 스크롤 + 버그 수정 | 2026-07-06 17:42 | ✅ |
| 7.13 | [phase7/7.13-visual-color-event-category.md](phase7/7.13-visual-color-event-category.md) | YearView·MonthView 시각 개편 + 이벤트 카테고리 필수화 + 강조색 제거 | 2026-07-06 18:00 | ✅ |
| 7.14 | [phase7/7.14-layout-restructure.md](phase7/7.14-layout-restructure.md) | Year/Month/Day 뷰 상하 레이아웃 전면 재구성 (설정→헤더, 추가→푸터, pill 버튼, 투명 푸터) | 2026-07-07 05:41 | ✅ |
| 7.15 | [phase7/7.15-category-ui-swipe.md](phase7/7.15-category-ui-swipe.md) | 카테고리 관리 UI 개편 (스와이프 삭제·행 탭 편집·+ 아이콘) | 2026-07-07 16:37 | ✅ |
| 7.16 | [phase7/7.16-nav-theme-holiday.md](phase7/7.16-nav-theme-holiday.md) | 네비게이션·테마·공휴일 시각 개선 | 2026-07-07 16:51 | ✅ |
| 7.17 | [phase7/7.17-weekend-color.md](phase7/7.17-weekend-color.md) | 주말·공휴일 날짜 색상 단순화 | 2026-07-07 16:56 | ✅ |
| 7.18 | [phase7/7.18-nav-tuning.md](phase7/7.18-nav-tuning.md) | 네비게이션 바 세부 튜닝 (MM월 레이블, 버튼 크기·위치) | 2026-07-07 17:06 | ✅ |
| 7.19 | [phase7/7.19-yearview-font-spacing.md](phase7/7.19-yearview-font-spacing.md) | YearView 미니 날짜 폰트 1.2배·달력 간격 조정 | 2026-07-07 19:50 | ✅ |
| 7.20 | [phase7/7.20-cleanup-icons.md](phase7/7.20-cleanup-icons.md) | 중간 정리 — PlusIcon 공용 추출·BACKLOG·progress 보완 | 2026-07-07 19:57 | ✅ |
| 7.21 | [phase7/7.21-yearview-initial-scroll.md](phase7/7.21-yearview-initial-scroll.md) | YearView 진입 시 당해 글자 최상단 표시 | 2026-07-07 20:24 | ✅ |
| 7.22 | [phase7/7.22-yearview-sunday-color.md](phase7/7.22-yearview-sunday-color.md) | YearView 미니 달력 일요일 색상 통일 | 2026-07-07 20:27 | ✅ |
| 7.23 | [phase7/7.23-today-button.md](phase7/7.23-today-button.md) | '오늘' 버튼 뷰 계층 동작 구현·정밀화 | 2026-07-07 22:13 | ✅ |
| 7.24 | [phase7/7.24-monthview-fixes.md](phase7/7.24-monthview-fixes.md) | MonthView 오류 수정·레이아웃 정리(초기 스크롤·이벤트 바·셀 상단 정렬) | 2026-07-07 22:19 | ✅ |
| 7.25 | [phase7/7.25-monthview-overflow-indicator.md](phase7/7.25-monthview-overflow-indicator.md) | MonthView 이벤트 바 상단 정렬 + 초과(+x개) indicator | 2026-07-07 22:44 | ✅ |
| 7.26 | [phase7/7.26-monthview-zoom-pinch.md](phase7/7.26-monthview-zoom-pinch.md) | MonthView 6단계 이산 줌 + 핀치 확대/축소(연속→스냅) | 2026-07-07 23:18 | ✅ |
| 7.27 | [phase7/7.27-event-form-ux.md](phase7/7.27-event-form-ux.md) | 일정 편집 UX 개선(바 탭 직접 편집·섹션 재구성·라이트 모드) | 2026-07-07 23:33 | ✅ |
| 7.28 | [phase7/7.28-recurring-events-crud.md](phase7/7.28-recurring-events-crud.md) | 반복 일정 기능 강화 + CRUD 버그 수정 | 2026-07-08 01:50 | ✅ |
| 7.29 | [phase7/7.29-dayview-color-overlap.md](phase7/7.29-dayview-color-overlap.md) | DayView 날짜 레이블·카테고리 색상·겹침 컬럼 배치 | 2026-07-08 02:20 | ✅ |
| 7.30 | [phase7/7.30-style-batch.md](phase7/7.30-style-batch.md) | 캘린더·카테고리·하단바 스타일 8종 개선 | 2026-07-08 02:45 | ✅ |
| 7.31 | [phase7/7.31-nav-icons.md](phase7/7.31-nav-icons.md) | 네비 아이콘 수정(꺾쇠 세로축 반전·설정 톱니바퀴) | 2026-07-08 02:49 | ✅ |
| 7.32 | [phase7/7.32-dark-gray-picker.md](phase7/7.32-dark-gray-picker.md) | 다크 모드 회색 밝게 + 일정 편집 시각 피커 다크 대응 | 2026-07-08 02:58 | ✅ |
| 7.33 | [phase7/7.33-perf-cache-defaults.md](phase7/7.33-perf-cache-defaults.md) | 성능·UX(월 캐시·리스트 튜닝·기본 시각 5분·알림/반복 분리) | 2026-07-08 03:11 | ✅ |
| 7.34 | [phase7/7.34-view-transition-motion.md](phase7/7.34-view-transition-motion.md) | 뷰 전환 확대/축소 모션 | 2026-07-08 03:13 | ✅ |
| 7.35 | [phase7/7.35-pinch-redesign.md](phase7/7.35-pinch-redesign.md) | 핀치 확대/축소 재설계(셀 높이·상세도·앵커·줌 영속) | 2026-07-08 03:45 | ✅ |

### Phase 8 — 출시

| # | 파일 | 작업 | 날짜 | 상태 |
|---|---|---|---|---|
| 8.1 | phase8/8.1-store-meta.md | 스토어 메타데이터·스크린샷 | — | ⬜ |
| 8.2 | phase8/8.2-beta.md | 베타 배포 | — | ⬜ |
| 8.3 | phase8/8.3-release.md | 정식 릴리즈 | — | ⬜ |

---

## 기타 기록

| 파일 | 내용 | 날짜 |
|---|---|---|
| [misc/session_01.md](misc/session_01.md) | 1차 세션 — 프로젝트 점검·정리 | 2026-06-26 16:09 |

---

## 파일 작성 규칙

새 작업 완료 시:
1. 해당 Phase 폴더에 파일 생성 (폴더가 없으면 먼저 생성).
2. 아래 템플릿을 사용한다.
3. 위 목차 행의 날짜와 상태(`⬜` → `✅`)를 갱신한다.

```markdown
# {ID} {제목}

| 항목 | 내용 |
|---|---|
| 날짜 | YYYY-MM-DD HH:MM |
| 요구사항 | FR-XXX-000 |
| 커밋 | abc1234 |

## 한 일
(무엇을 구현했는가)

## 주요 결정
(왜 이 방식을 선택했는가, 대안은 무엇이었는가)

## 남은 과제 / 주의사항
(다음 작업자가 알아야 할 것)
```
