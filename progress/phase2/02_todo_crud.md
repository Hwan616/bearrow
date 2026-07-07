# 2.2 Todo 데이터 모델·CRUD

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 14:56 |
| 요구사항 | FR-TODO-001, FR-TODO-002, FR-TODO-003, FR-TODO-004, FR-TODO-006 |
| 커밋 | 2b51ff7 |

## 한 일

- `todos.ts` — 할일 생성/수정/삭제/완료토글/카테고리 연결 CRUD
- `src/features/todo/types.ts` — `Todo` 타입 정의
- `migrate 0005` — todos 테이블 생성 (id, title, note, is_completed, completed_at, due_date, category_id, sort_order, created_at, updated_at)
- 단위 테스트 작성

## 주요 결정

- completedAt 을 별도 컬럼으로 저장해 완료 시각 추적
- sortOrder 로 수동 정렬 지원

## 남은 과제 / 주의사항

- 3.3에서 event_id 컬럼이 추가됨 (migrate 0006)
