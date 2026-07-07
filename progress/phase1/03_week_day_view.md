# 1.3 주·일 뷰

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 17:13 |
| 요구사항 | FR-CAL-002, UI-001 |
| 커밋 | e12e591 |

## 한 일

- `src/features/calendar/utils/timeGridUtils.ts` — 타임그리드 전용 순수 함수
  - `buildWeekDays(date, today?)` — 주어진 날짜 포함 주의 일~토 7일
  - `getWeekDateRange(date)` — 일 00:00 ~ 토 23:59:59 API 쿼리 범위
  - `timeToTopOffset(date, hourHeight?)` — 자정 기준 Y 좌표(px)
  - `durationToHeight(startsAt, endsAt, hourHeight?)` — 이벤트 높이(px, 최소 20)
  - `getAllDayEvents<T>(events, day)` / `getTimedEvents<T>(events, day)` — 제네릭 필터
  - `formatHour(h)` — "09:00" 형식 / `formatWeekDayHeader(date)` — { short, date }
- `src/features/calendar/hooks/useWeekEvents.ts` — 주별 이벤트 로드 훅
- `src/features/calendar/components/WeekDayView.tsx` — 주·일 뷰 컴포넌트
  - 뷰 전환: "주 | 일" 토글 버튼
  - 탐색: ‹ · › (주 모드 ±7일, 일 모드 ±1일)
  - 날짜 헤더: 요일 + 일자, 오늘 강조(원)
  - 종일 행: 종일 이벤트 칩 (최대 2개 표시)
  - 타임 그리드: 24시간 × N열, 현재 시각 표시선(빨강)
  - 이벤트 블록: 절대 위치, 시작·종료 시각 기반 top/height 계산
  - ScrollView 자동 현재 시각으로 스크롤
- 단위 테스트 23개 추가 (총 77개)

## 주요 결정

- **제네릭 필터 함수**: `getAllDayEvents<T>`, `getTimedEvents<T>`를 제네릭으로 작성해 Event 구체 타입을 보존. 유틸 레이어가 특정 도메인 타입에 의존하지 않도록 유지.
- **weekKey로 effect 안정화**: `useWeekEvents`가 Date 객체(매 렌더 새 참조)를 의존성으로 받으면 무한 재조회 발생. 주의 일요일 ISO 날짜 문자열을 key로 사용해 동일 주 내 리렌더 시 재조회 방지.
- **HOUR_HEIGHT = 60**: 1시간 = 60px. 24시간 총 높이 1440px — ScrollView에서 스크롤 가능.
- **이벤트 블록 최소 높이 20px**: 1분짜리 이벤트도 탭 가능하도록 최소값 보장.

## 남은 과제 / 주의사항

- **이벤트 겹침 처리**: 같은 시간대 이벤트가 여러 개면 모두 동일 너비로 겹쳐 보임. Phase 1.4 이후 별도 overlap resolution 알고리즘 추가 고려.
- **주 뷰 이벤트 제목 가독성**: 7개 컬럼 기준 이벤트 블록이 좁아 글자가 잘릴 수 있음. 탭 시 상세 보기(1.4)로 해결.
- **`displayDays[colIdx]?.isToday` 접근**: 현재 nowLine을 위해 colIdx로 displayDays를 접근 중. 추후 day 객체에서 직접 isToday 참조하도록 리팩터링 권장.
