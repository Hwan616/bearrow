# 0.2 환경 분리

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 05:07 |
| 요구사항 | NFR-POR-001 |
| 커밋 | 3830ab1 |

## 한 일

- `app.config.ts` — `APP_ENV` 환경변수로 dev/staging/production 앱 이름·번들 ID 분기
- `src/config/env.ts` — 런타임 설정(`apiUrl`, `enableDevTools`) 반환, 순수 함수로 테스트 가능
- `src/config/env.test.ts` — `resolveConfig` 유닛 테스트
- `.env.example` — 로컬 개발용 템플릿 (실제 값 없음)

## 주요 결정

- **번들 ID 분리**: `app.bearrow.dev` / `app.bearrow.staging` / `app.bearrow` 로 세 환경을 동시에 기기에 설치 가능.
- **순수 함수 설계**: `resolveConfig(appEnv)` 가 환경을 인자로 받아 설정을 반환하므로, `process.env` 없이 단위 테스트 가능.

## 남은 과제 / 주의사항

- Phase 4.1(Supabase 연결) 시 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`를 `env.ts`에 추가하고 `.env.example`에 키만 기재.
- `src/config/env.ts`의 `apiUrl`은 현재 플레이스홀더. 실제 Supabase URL로 교체 필요.
