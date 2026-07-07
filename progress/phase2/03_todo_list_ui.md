# 2.3 투두 목록 UI

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:00 |
| 요구사항 | FR-TODO-001, UI-001 |
| 커밋 | 47666d7 |

## 한 일

- `TodoList.tsx` — 카테고리별 섹션 목록, 미완료/완료 구분
- `TodoItem.tsx` — 체크박스, 스와이프 삭제 (react-native-gesture-handler Swipeable)
- `useTodos.ts` — 할일 상태 훅 (로드·완료토글·삭제)
- `todoListUtils.ts` — 카테고리별 그룹핑·정렬 유틸리티

## 주요 결정

- GestureHandlerRootView 를 App.tsx 최상단에 감싸서 스와이프 제스처 활성화
- 스와이프 삭제 시 즉시 삭제 (확인 다이얼로그 없음 — 빠른 UX 우선)

## 남은 과제 / 주의사항

- 완료 항목 숨기기/보이기 토글은 미구현
