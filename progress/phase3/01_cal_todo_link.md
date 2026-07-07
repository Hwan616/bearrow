# 3.1 캘린더–투두 연동 표시

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:11 |
| 요구사항 | FR-INT-001, FR-INT-002 |
| 커밋 | 240fe5e |

## 한 일

- `calendarUtils.ts` — `getTodosForDay()` 추가 (날짜별 할일 필터)
- `todos.ts` — `getTodosByDueDateRange()` 추가 (기간 내 마감일 있는 할일 조회)
- `useMonthItems.ts` — 이벤트 + 마감일 할일 병렬 fetch 훅
- `MonthView.tsx` — 날짜별 이벤트 점(파란색) + 할일 점(초록색) 표시 (최대 2+1)

## 주요 결정

- 이벤트 점: `colors.accent.primary` (파란색), 할일 점: `colors.status.success` (초록색)으로 시각적 구분
- 할일 점은 개수와 무관하게 1개만 표시 (공간 절약)

## 남은 과제 / 주의사항

- 없음
