# 0.3 린트·테스트 기반

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 05:32 |
| 요구사항 | — (개발 품질 기반) |
| 커밋 | 3830ab1, 7ffe53b |

## 한 일

- ESLint (`eslint-config-expo`) + Prettier 설정
- Jest + `jest-expo` 프리셋 설정
- `babel-preset-expo` devDependency 추가 (jest 실행 오류 수정 — 7ffe53b)
- `tsconfig.json` — `strict` + `noUncheckedIndexedAccess`, `@/` 경로 별칭

## 주요 결정

- **`jest-expo` 프리셋**: React Native 환경 모킹을 자동 처리해 별도 설정 최소화.
- **`@testing-library/react-native` 미설치**: 훅 테스트가 필요할 때 순수 함수 추출 방식으로 대응 (0.4에서 실증). 설치는 UI 컴포넌트 테스트가 본격화되는 시점에 추가 예정.

## 남은 과제 / 주의사항

- UI 컴포넌트 테스트가 필요해지면 `@testing-library/react-native` 추가 설치.
- `noUncheckedIndexedAccess` 활성화로 배열·객체 접근 시 `undefined` 체크 필요 — 신규 코드 작성 시 유의.
