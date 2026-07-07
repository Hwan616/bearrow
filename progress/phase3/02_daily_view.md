# 3.2 통합 데일리 뷰

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:14 |
| 요구사항 | FR-INT-003 |
| 커밋 | 7fd183d |

## 한 일

- `useDayItems.ts` — 선택 날짜의 이벤트 + 할일 병렬 fetch 훅
- `DayDetailPanel.tsx` — 날짜 헤더("오늘" 표시), 이벤트 행(시간·제목), 할일 행(체크박스·취소선), 빈 상태 메시지
- `App.tsx` — 캘린더 탭에서 날짜 선택 시 DayDetailPanel 표시

## 주요 결정

- `dateKey` 문자열(YYYY-M-D)로 useEffect 의존성을 관리해 react-hooks/exhaustive-deps 경고 회피
- 이벤트 클릭 시 EventDetailSheet 로 이동 (onEventPress 콜백)

## 남은 과제 / 주의사항

- 없음
