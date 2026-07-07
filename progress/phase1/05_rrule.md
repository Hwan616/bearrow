# 1.5 반복 일정(RRULE)

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 14:40 |
| 요구사항 | FR-CAL-005 |
| 커밋 | df55e81 |

## 한 일

- `rruleUtils.ts` — RRULE 문자열 생성·파싱, 반복 일정 전개(날짜 범위 내 발생일 계산), 예외 날짜 처리
- `migrate 0002` — events 테이블에 `rrule`, `recurring_event_id`, `exception_date`, `is_deleted` 컬럼 추가

## 주요 결정

- rrule 라이브러리를 사용해 RFC 5545 RRULE 표준을 준수
- 반복 일정의 단일 항목 삭제는 `exception_date` 를 추가하는 방식으로 처리 (원본 이벤트 수정 없음)

## 남은 과제 / 주의사항

- 반복 일정 편집 시 "이 일정만" / "이후 모두" / "전체" 분기는 Phase 5 이후 고도화 대상
