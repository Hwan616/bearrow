# 2.1 Category CRUD

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 14:52 |
| 요구사항 | FR-CAT-001, FR-CAT-002, FR-CAT-003 |
| 커밋 | e81d7c8 |

## 한 일

- `categories.ts` — 카테고리 생성·이름변경·삭제·순서변경·색상지정 CRUD 함수
- `src/features/category/types.ts` — `Category` 타입, `CATEGORY_COLORS` 프리셋 팔레트
- `migrate 0004` — categories 테이블 생성 (id, name, color, sort_order, created_at, updated_at)
- 단위 테스트 작성

## 주요 결정

- 색상은 HEX 문자열로 저장, 프리셋 12색 제공
- soft delete 없이 hard delete (연결된 이벤트/할일의 category_id 는 NULL 처리)

## 남은 과제 / 주의사항

- 카테고리 삭제 시 연결된 이벤트·할일의 categoryId 를 NULL 로 업데이트하는 로직 필요
