# 3.4 색상 커스터마이징 UI

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-27 15:31 |
| 요구사항 | UI-002 |
| 커밋 | ca5a5d1 |

## 한 일

- `resolve.ts` — `resolveTheme()` 순수 함수 분리 (순환 참조 방지)
- `ThemeContext.tsx` — ThemeProvider, useTheme 훅, ACCENT_PRESETS (6색), AsyncStorage 영속화
- `theme/index.ts` — 배럴 재내보내기
- `SettingsScreen.tsx` — 화면 모드 3-way 칩 토글, 강조색 스와치 6개, 카테고리 색상 인라인 팔레트
- `App.tsx` — ThemeProvider 최상단 감싸기, 설정 탭(⚙️) 추가

## 주요 결정

- 순환 참조 문제(ThemeContext → index → ThemeContext)를 resolve.ts 분리로 해결
- accentColor 기반 primaryLight는 `color + "20"` (8자리 HEX = 약 12% 불투명도)

## 남은 과제 / 주의사항

- AsyncStorage 키: `@bearrow/theme_mode`, `@bearrow/accent_color`
