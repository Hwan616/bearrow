# 1.4 일정 생성·편집 폼

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 14:23 |
| 요구사항 | FR-CAL-001, FR-CAL-003, FR-CAL-004 |
| 커밋 | cbbdf4b |

## 한 일

**신규 패키지**
- `expo-crypto` — `randomUUID()` 로 Event id 생성
- `react-hook-form` — 비제어 폼 관리
- `@react-native-community/datetimepicker` — 네이티브 날짜·시각 선택기

**신규 파일**
- `src/features/calendar/utils/eventFormUtils.ts` — 순수 함수
  - `makeDefaultValues(event?, base?)` — 신규: 다음 정시~+1시간 / 편집: 기존 값
  - `validateEventTimes(start, end)` — 종료 ≤ 시작 시 오류 메시지
  - `normalizeAllDayTimes(start, end)` — 종일 이벤트 자정 정규화
  - `buildNewEvent(id, values, now?)` — 폼 값 → NewEvent
  - `formatDateTimeLabel(date, isAllDay)` — "2026년 6월 27일 (토) 오후 3:00"
  - `mergeDateAndTime(datePart, timePart)` — Android 날짜+시각 합산
- `src/features/calendar/utils/__tests__/eventFormUtils.test.ts` — 단위 테스트 16개

- `src/features/calendar/components/EventForm.tsx`
  - 제목 TextInput (필수 유효성 검사)
  - 종일 Switch
  - 시작·종료 날짜·시각 선택 (DateTimeField)
  - 메모 TextInput (multiline, optional)
  - 저장/취소 헤더 버튼
  - 저장 시 `createEvent` / 편집 시 `updateEvent` 호출

**수정 파일**
- `src/db/client.ts` — `sqliteDb` export 추가 (App.tsx에서 runMigrations 호출용)
- `app.config.ts` — `@react-native-community/datetimepicker` 플러그인 추가
- `App.tsx` — runMigrations 시작 시 실행, MonthView + FAB + EventForm 모달 통합

## 주요 결정

- **플랫폼별 DateTimePicker 전략**:
  - iOS: `display='compact'` + `mode='datetime'` — 인라인 컴팩트 버튼, 팝오버 선택
  - Android: `display='default'` 날짜 다이얼로그 → `key` prop 변경으로 리마운트 → 시각 다이얼로그
  - Web: DateTimePicker 없이 레이블 텍스트만 표시
  - 웹 예외 처리: 모듈 레벨 require + `Platform.OS !== 'web'` 조건으로 번들 분리

- **저장 후 MonthView 재조회**: `calendarKey` state를 증가시켜 MonthView를 `key` prop으로 리마운트. 단순하고 효과적이나 강제 언마운트/마운트 비용 있음 — Zustand/TanStack Query 도입(Phase 1.4 계획 완료) 후 구독 기반으로 교체 권장.

- **react-hook-form Controller 패턴**: Date 타입 필드는 비표준이므로 `Controller`로 래핑해 controlled 컴포넌트로 연결.

- **runMigrations 위치**: App.tsx useEffect에서 앱 시작 시 1회 실행. 마이그레이션 완료 후 `ready` 상태로 전환해 UI 렌더링.

## 남은 과제 / 주의사항

- **Zustand + TanStack Query 미도입**: 계획과 달리 이번 작업에서는 추가하지 않았음. MonthView 재조회가 key-remount 방식으로 구현됨. Phase 2 시작 전에 도입 권장.
- **Expo Router 미도입**: EventForm을 Modal로 구현해 네비게이션 없이 동작. Phase 2에서 탭 네비게이션 도입 시 Expo Router 추가 예정.
- **편집 진입점 없음**: 현재 MonthView의 이벤트 점을 눌러도 편집 폼이 열리지 않음 (MonthView에 onEventPress 미구현). 추후 Phase 3에서 통합 뷰 구현 시 연결.
- **카테고리 필드**: Phase 2.1 Category CRUD 이후 추가 예정. 현재 항상 null.
