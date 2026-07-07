# 5.3 성능·접근성 점검

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-29 16:41 |
| 상태 | ✅ 완료 |
| 요구사항 | NFR-PERF-001, UI-003 |

## 구현 내용

### 리스트 가상화 (NFR-PERF-001)
- `TodoList.tsx` — `ScrollView + View` → `SectionList` 전환
  - 대량 할일 목록에서 화면에 보이는 항목만 렌더하여 메모리·렌더 부하 절감
  - `stickySectionHeadersEnabled={false}`, `keyExtractor` 적용
  - `ItemSeparatorComponent`로 구분선, `SectionSeparatorComponent`로 섹션 간격 처리
  - 카드 스타일: 첫/마지막 아이템에 `borderRadius` + `overflow:hidden` 적용

### 폰트 스케일 (UI-003)
- `TodoItem.tsx` — 제목·노트·마감일 `Text`에 `maxFontSizeMultiplier={1.5}` 추가
- `TodoList.tsx` — 섹션 헤더·빈 상태 `Text`에 `maxFontSizeMultiplier={1.5}` 추가
- `MonthView.tsx` — 월 제목 `Text`에 `maxFontSizeMultiplier={1.3}` 추가 (그리드 레이아웃 보호)

### 접근성 레이블 (UI-003)
- `MonthView.tsx` — 이전/다음 달 버튼에 `accessibilityLabel`·`accessibilityRole="button"` 추가

## 테스트
- `src/features/todo/components/__tests__/TodoList.test.tsx` — 3개 신규 테스트
  - 섹션 헤더 카테고리 이름 렌더
  - 할일 항목 제목 렌더
  - 빈 상태 안내 메시지

## 남은 과제 / 주의사항
- 실기기 접근성 감사(VoiceOver/TalkBack) 는 기기 연결 후 별도 확인 필요
- 색상 대비: lightTokens의 text.secondary(#6C757D) → white가 ~4.7:1 로 WCAG AA 간신히 통과
- SectionList의 `getItemLayout`은 고정 높이 아이템에만 유효하므로 현재 제외
