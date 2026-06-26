# CONVENTIONS — 코딩·구조 규칙

에이전트와 사람이 동일하게 따르는 규칙. 새 코드는 항상 이 문서에 맞춘다.

## 디렉터리 구조

기능 단위(feature-first)로 묶는다.

```
src/
├─ config/            # env.ts 등 앱/환경 설정
├─ db/                # client.ts, schema.ts, migrations, 쿼리
├─ features/<name>/   # 기능 모듈
│  ├─ components/     #   화면/UI 컴포넌트
│  ├─ hooks/          #   상태·로직 훅
│  ├─ api/            #   로컬 DB / 서버 접근 함수
│  ├─ types.ts        #   기능 전용 타입
│  └─ __tests__/      #   단위 테스트
├─ sync/              # 동기화 엔진
├─ lib/               # 공용 유틸, supabase 클라이언트
├─ theme/             # 색상 토큰·테마
└─ ui/                # 기능 무관 공용 컴포넌트(Button 등)
```

규칙: 한 기능에 필요한 코드는 그 `features/<name>/` 안에 둔다. 기능 간 직접 import 대신 공용 코드는 `lib`·`ui`·`theme` 로 올린다.

## 네이밍

- 파일: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`, 테스트 `*.test.ts(x)`.
- 변수/함수 `camelCase`, 타입/컴포넌트 `PascalCase`, 상수 `UPPER_SNAKE`.
- import 별칭 `@/` = `src/` (tsconfig paths).

## TypeScript

- `strict` + `noUncheckedIndexedAccess` 준수. `any` 금지(불가피하면 `unknown` + 좁히기).
- 모듈은 **named export** 우선(컴포넌트 default export는 화면 엔트리에 한정).
- 부수효과 없는 순수 함수로 분리해 테스트 가능하게 작성(예: `src/config/env.ts`).

## React Native

- 함수형 컴포넌트 + 훅만 사용.
- 상태: 로컬 UI 상태는 `useState`, 전역 클라이언트 상태는 Zustand, 서버/DB 캐시는 TanStack Query.
- 스타일은 `StyleSheet.create`, 색상은 하드코딩 대신 `theme` 토큰 사용.

## 데이터·동기화

- 모든 레코드는 `id`(uuid) · `updated_at` 을 가진다. 동기화 대상은 `source`·`external_id`·동기화 상태 포함.
- UI 는 로컬 DB 만 직접 다룬다. 원격 반영은 `sync/` 를 통해서만.
- 충돌 기본 정책: 최신 수정 우선(LWW), 외부 원본 항목은 외부 우선.

## 테스트

- 새 로직(특히 `api/`, `sync/`, 순수 유틸)은 단위 테스트 필수.
- 테스트는 대상과 같은 폴더의 `__tests__/` 또는 `*.test.ts` 로.
- 외부 의존(네트워크, 네이티브)은 모킹.

## 커밋·PR

- 커밋 메시지: `<type>(<scope>): 요약` (type: feat/fix/chore/docs/refactor/test).
  예) `feat(calendar): 월 뷰 추가`
- 작은 PR 단위(가능하면 백로그 1항목 = 1 PR). PR 본문은 템플릿을 따른다.
- 머지 전 CI(typecheck·lint·test) green 필수.

## 접근성·국제화

- 기본 언어 한국어. 사용자 문자열은 추후 i18n 키로 분리 가능하도록 한 곳에 모은다.
- 터치 타깃 최소 44pt, 색 대비 준수, 폰트 스케일 대응.
