# 3.3 일정→할일 파생

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:19 |
| 요구사항 | FR-INT-004 |
| 커밋 | 834486e |

## 한 일

- `EventDetailSheet.tsx` — 이벤트 상세 시트 (제목·일시·메모 표시, "할일로 추가" 버튼)
- `todos.ts` — `createTodoFromEvent()` 추가 (event_id 연결, 이벤트 시작일을 마감일로)
- `migrate 0006` — todos 테이블에 `event_id` 컬럼 추가
- `db/schema.ts` — eventId 필드 추가

## 주요 결정

- 파생 할일의 마감일은 이벤트 시작일 자정으로 정규화
- event_id 로 원본 이벤트와 연결 고리를 유지 (향후 양방향 업데이트 가능)

## 남은 과제 / 주의사항

- 이벤트 삭제 시 파생 할일의 event_id 를 NULL 처리하는 로직 미구현
