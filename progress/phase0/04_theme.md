# 0.4 디자인 토큰·테마 골격

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 16:09 |
| 요구사항 | UI-002, NFR-CON-001 |
| 커밋 | 6fbd5f0 |

## 한 일

- `src/theme/tokens.ts`
  - `palette` — 원시 색상 상수 (blue, grey, white/black, 상태 색상)
  - `ColorTokens` 인터페이스 — background / surface / text / border / accent / status 6개 그룹
  - `lightTokens` / `darkTokens` — 라이트·다크 모드별 토큰 구현
- `src/theme/index.ts`
  - `resolveTheme(scheme)` — 순수 함수, `useColorScheme` 반환값을 받아 `Theme` 객체 반환
  - `useTheme()` — `useColorScheme` 훅을 래핑한 React 훅
- `src/theme/__tests__/tokens.test.ts` — 토큰 구조 일관성 검증 (라이트·다크 키 동일 여부)
- `src/theme/__tests__/useTheme.test.ts` — `resolveTheme` 입력별 동작 검증

## 주요 결정

- **`resolveTheme` 분리**: `useColorScheme`을 직접 모킹하지 않고 순수 함수로 로직을 분리해 `@testing-library/react-native` 없이 테스트. 훅은 얇은 래퍼로만 유지.
- **브랜드 블루**: `#2E5AAC` (blue500)을 라이트 모드 기준 강조색으로 고정. 다크 모드는 `#7A9DD6` (blue300)으로 명도 조정.
- **`surface` 그룹 추가**: `background`(뷰 배경)와 `surface`(카드·시트 등 부유 요소)를 명확히 분리해 추후 다크 모드 층위 표현에 대비.

## 남은 과제 / 주의사항

- 실제 UI 컴포넌트 작성 시 `StyleSheet.create` 내부에서 `useTheme().colors.xxx` 패턴으로 사용.
- 카테고리 색상(사용자 지정)은 토큰에 포함되지 않음 — Phase 3.4에서 별도 처리.
- 다크 모드 `surface.raised`가 `background.primary`와 육안으로 구분되도록 대비 검토 필요.
