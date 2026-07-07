# 4.4 RLS·보안 점검

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-29 15:57 |
| 상태 | ✅ 완료 |
| 요구사항 | NFR-SEC-001, NFR-SEC-002 |

## 구현 내용

- `src/lib/largeSecureStore.ts` — LargeSecureStore 분리 추출 (1900 바이트 청크 분산 저장, NFR-SEC-001)
- `src/lib/supabase.ts` — largeSecureStore import로 변경 (기능 동일)
- `supabase/rls_policies.sql` — Postgres RLS 정책 SQL (NFR-SEC-002)
  - events / todos / categories 테이블 RLS 활성화
  - `auth.uid() = user_id` 정책으로 행 수준 격리
  - 동기화 쿼리 최적화 인덱스 포함

## 테스트

- `src/lib/__tests__/largeSecureStore.test.ts` — 12개 테스트
  - setItem: 소·경계·대용량 청크 분산
  - getItem: 직접·청크조합·누락시 null·왕복보존
  - removeItem: 단일키·청크전체·없는키
