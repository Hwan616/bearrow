# 4.2 동기화 엔진(push/pull)

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:42 |
| 요구사항 | FR-SYNC-002, FR-SYNC-004, NFR-CON-002, NFR-PERF-002 |
| 커밋 | 8567668 |

## 한 일

- `migrate 0007` — `pending_changes`(entity당 최신 1건, PK: entity_type+entity_id) + `sync_meta` 테이블
- `src/sync/types.ts` — SyncEntityType, SyncOperation, PendingChange, SyncResult 타입
- `src/sync/queue.ts` — enqueuePush / getPendingChanges / deletePendingChange / getSyncMeta / setSyncMeta
- `src/sync/push.ts` — 큐 변경 → Supabase upsert/delete, 성공 항목 큐 제거, failedPush 카운트
- `src/sync/pull.ts` — 엔티티별 증분 pull(gt updated_at) + last-write-wins 충돌 해결
- `src/sync/engine.ts` — syncAll() 진입점 (push → pull 순서)

## 주요 결정

- `(entity_type, entity_id)` 복합 PK로 같은 엔티티의 중복 큐 자동 방지
- last-write-wins: 서버 updated_at ≤ 로컬 updated_at 이면 skip
- push 실패 항목은 큐에 남겨 다음 sync 시 재시도

## 남은 과제 / 주의사항

- CRUD 함수에서 변경 시 enqueuePush 를 자동으로 호출하는 연동은 미구현 (4.4 이후 대상)
- Supabase 백엔드 테이블에 user_id 컬럼과 RLS 정책 필요 (4.4에서 구현)
