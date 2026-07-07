# 1.2 월(Month) 뷰

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 17:07 |
| 요구사항 | FR-CAL-002, UI-001 |
| 커밋 | 15dc194 |

## 한 일

- `src/features/calendar/utils/calendarUtils.ts` — 순수 유틸 함수 4개
  - `buildMonthGrid(year, month, today?)` — 35/42칸 CalendarDay 배열 (일요일 시작)
  - `getMonthDateRange(year, month)` — 그리드 패딩 포함 API 쿼리 범위
  - `isSameDay(a, b)` — 날짜 비교 (시간 무시)
  - `getEventsForDay(events, day)` — overlap 방식 이벤트 필터
  - `formatMonthTitle(year, month)` — "2026년 6월" 형식 한국어 포맷
- `src/features/calendar/hooks/useMonthEvents.ts` — 월별 이벤트 로드 훅 (refetch 지원)
- `src/features/calendar/components/MonthView.tsx` — 월 뷰 컴포넌트
  - 헤더: 이전/다음 월 탐색 (‹ ›)
  - 요일 행: 일~토 (일=빨강, 토=파랑)
  - 날짜 그리드: 패딩(당월 외) 회색, 오늘=파랑 원, 선택일=연파랑 원
  - 이벤트 점: 날짜 아래 최대 3개 표시
  - 터치 타깃 최소 44pt (UI-003 준수)
- 단위 테스트 20개 추가 (총 54개 green)

## 주요 결정

- **today를 파라미터로 받는 순수 함수**: `new Date()`를 내부에서 호출하지 않고 파라미터로 받아 isToday 테스트 가능. 컴포넌트에서 `new Date()`를 한 번만 생성 후 전달.
- **getMonthDateRange가 패딩 포함**: 이전 달 마지막 주와 다음 달 첫 주 날짜도 그리드에 표시되므로, API 쿼리 범위를 그리드 전체로 설정. 패딩 영역 이벤트도 올바르게 표시됨.
- **makeStyles 패턴**: `useTheme().colors`를 StyleSheet에 전달하는 팩토리 함수로 구성. 컴포넌트 리렌더 시 매번 새 StyleSheet을 생성하는 비용이 있으나, 다크모드 전환 반응성을 위해 유지. 성능 이슈 발생 시 useMemo로 감쌀 것.

## 남은 과제 / 주의사항

- **앱 진입점 연결**: `App.tsx`에서 `MonthView`를 렌더링하고, `runMigrations`를 앱 시작 시 호출하는 코드 추가 필요 (1.4 이전에 처리 권장).
- **이벤트 점 색상**: 현재 모든 점이 `accent.primary`(파랑) 단색. Phase 2.1에서 카테고리 색상 연결 예정.
- **이벤트 3개 초과 표시**: 현재 MAX_DOTS=3으로 자름. 추후 "+N" 텍스트로 표시하는 방식으로 개선 가능.
