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
├─ sync/              # 동기화 엔진 (Google Calendar, iCloud CalDAV)
│  └─ __tests__/
├─ lib/               # 공용 유틸, supabase 클라이언트
├─ theme/             # 색상 토큰·테마
└─ ui/                # 기능 무관 공용 컴포넌트 (미사용 예정 슬롯)
```

규칙: 한 기능에 필요한 코드는 그 `features/<name>/` 안에 둔다. 기능 간 직접 import 대신 공용 코드는 `lib`·`theme` 로 올린다.

## 네이밍

- 파일: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`, 테스트 `*.test.ts(x)`.
- 변수/함수 `camelCase`, 타입/컴포넌트 `PascalCase`, 상수 `UPPER_SNAKE`.
- import 별칭 `@/` = `src/` (tsconfig paths).

## TypeScript

- `strict` + `noUncheckedIndexedAccess` 준수. `any` 금지(불가피하면 `unknown` + 좁히기).
- 모듈은 **named export** 우선. 화면 컴포넌트(`App.tsx`)만 default export 허용.
- 부수효과 없는 순수 함수로 분리해 테스트 가능하게 작성.

## React Native

- 함수형 컴포넌트 + 훅만 사용.
- **상태 관리** (실제 채택):
  - 로컬 UI 상태 → `useState`
  - 전역 설정(테마·공휴일 표시) → React Context (`ThemeProvider`, `AppSettingsProvider`)
  - 외부 라이브러리(Zustand, TanStack Query)는 현재 미채택
- **스타일**: `StyleSheet.create`로 생성. 색상은 하드코딩 대신 `theme` 토큰 사용.
  - 컴포넌트 내부에서 `const s = makeStyles(colors)` 패턴을 따른다.
  ```ts
  function makeStyles(colors: ColorTokens) {
    return StyleSheet.create({ ... });
  }
  // 사용: const s = makeStyles(colors); // 컴포넌트 함수 안에서 호출
  ```
- **크로스플랫폼**: `android_ripple`로 Android 터치 피드백 추가. `Modal presentationStyle` iOS 전용 속성 사용 금지.
- **반응형**: `useWindowDimensions` + 768pt 기준 사이드바·컴팩트 레이아웃 분기.

## 데이터·동기화

- 모든 이벤트 레코드는 `id`(uuid)·`updated_at` 필드를 가진다.
- 외부 소스 이벤트는 `source`(`"local"` | `"google"` | `"apple"`)·`external_id`로 구분.
- UI 는 로컬 DB 만 직접 다룬다. 원격 반영은 `sync/` 를 통해서만.
- 충돌 기본 정책: 최신 수정 우선(LWW). 외부 원본(`google`·`apple`)은 외부 `updated_at` 우선.
- iCloud 연동: CalDAV(PROPFIND·REPORT) 프로토콜. Apple ID + 앱 전용 암호를 `expo-secure-store`에 저장.

## 테스트

- 새 로직(특히 `api/`, `sync/`, 순수 유틸)은 단위 테스트 필수.
- 테스트는 대상과 같은 폴더의 `__tests__/` 에 위치.
- 외부 의존(네트워크, 네이티브 API)은 모킹 (`jest.mock`).
- `@testing-library/react-native` v14: `renderHook`은 `async/await` 필요.

## 커밋·PR

- 커밋 메시지: `<type>(<scope>): 요약` (type: feat/fix/chore/docs/refactor/test).
  예) `feat(calendar): 월 뷰 추가`
- 작은 단위(백로그 1항목 = 1 커밋). 커밋 후 `git push origin main` 자동 실행.
- 머지 전 CI(typecheck·lint·test) green 필수.

## 접근성·국제화

- 기본 언어 한국어.
- 터치 타깃 최소 44pt(`minHeight: 44`), 색 대비 준수, `accessibilityLabel` 추가.
- 폰트 스케일 대응 — 고정 픽셀 대신 가능한 한 상대 단위 사용.
