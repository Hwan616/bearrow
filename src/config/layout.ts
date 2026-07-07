/**
 * UI 레이아웃 상수 — 이 파일만 수정하면 Fast Refresh로 즉시 앱에 반영됩니다.
 *
 * 사용법:
 *  1. Expo 개발 서버 실행 중인 상태에서 이 파일을 열어 값 수정
 *  2. 저장(Cmd+S)하면 시뮬레이터/기기에 즉시 반영
 *
 * 주의:
 *  - YEAR_VIEW.dayCircleSize 변경 시 cellHeight(= 2 + dayCircleSize)도 자동 반영됨
 *  - MONTH_VIEW.labelOnFirstSize 변경 시 FlatList 행 높이도 자동 재계산됨
 *  - MONTH_VIEW.weekRowHeight 변경 시 레이아웃 전체 높이가 바뀌므로 스크롤 위치 리셋됨
 */

// ── 네비게이션 헤더 ──────────────────────────────────────────────────────────
export const NAV = {
  /** 헤더 최소 높이 (px) */
  headerHeight: 44,
  /** 헤더 좌우 여백 */
  headerPaddingH: 16,
  /** 버튼 내용이 상단에서 시작하는 여백 (클수록 버튼이 아래로 내려감) */
  btnPaddingTop: 6,
  /** 뒤로가기·이동 버튼 텍스트 크기 (YYYY년·MM월) */
  btnTextSize: 20,
  /** 앱 타이틀 "BeArrow" 크기 */
  appTitleSize: 18,
  /** 뒤로가기 화살표(<) 크기 */
  chevronSize: 19,
  /** 설정 기어 아이콘 크기 */
  gearSize: 22,
} as const;

// ── 공통 푸터 pill 버튼 바 ────────────────────────────────────────────────────
export const FOOTER = {
  /** 화면 하단에서 버튼까지 거리 (홈 인디케이터 위 여백) */
  bottom: 17,
  /** 버튼 바 좌우 여백 */
  paddingH: 22,
  /** 버튼 높이 */
  btnHeight: 37,
  /** 버튼 최소 너비 */
  btnMinWidth: 69,
  /** 버튼 내부 좌우 패딩 */
  btnPaddingH: 16,
  /** 버튼 모서리 반지름 (btnHeight/2 이상이면 완전 원형) */
  btnRadius: 18,
  /** 버튼 텍스트 크기 */
  btnTextSize: 15,
  /** 버튼 사이 간격 (ToDo ↔ +) */
  btnGap: 8,
} as const;

// ── Month View ───────────────────────────────────────────────────────────────
export const MONTH_VIEW = {
  /**
   * 1주 행 높이 (날짜 셀 + 이벤트 바 포함).
   * 늘리면 각 주 셀이 커지고 한 달이 더 긴 공간을 차지함.
   */
  weekRowHeight: 132,
  /** 캘린더 상단 "MM월" 대형 서브타이틀 크기 */
  subtitleSize: 26,
  /** 요일 바 (일·월·화…토) 글자 크기 */
  weekdayLabelSize: 12,
  /**
   * 각 달 1일 위에 표시되는 "MM월" 레이블 크기.
   * 변경하면 FlatList 행 높이(MONTH_LABEL_HEIGHT)가 자동 재계산됨.
   */
  labelOnFirstSize: 21,
  /** 날짜 숫자 크기 */
  dayNumSize: 14,
  /** 오늘 날짜 원형 배경 지름 */
  dayCircleSize: 26,
  /**
   * 일정 박스 불투명도 (0=완전투명, 1=완전불투명).
   * 직접 수정 후 저장하면 Fast Refresh로 즉시 반영됨.
   */
  eventBarOpacity: 0.4,
} as const;

// ── Year View ────────────────────────────────────────────────────────────────
export const YEAR_VIEW = {
  /**
   * 날짜 원형 배경 지름.
   * 셀 높이(cellHeight) = 2 + dayCircleSize 로 자동 계산됨.
   */
  dayCircleSize: 13,
  /** 날짜 숫자 크기 */
  dayTextSize: 10,
  /**
   * "1월·2월…" 미니 달력 제목 크기.
   * 변경 시 MINI_TITLE_HEIGHT(≈ fontSize×1.32 + 4)가 자동 재계산됨.
   */
  monthTitleSize: 21,
  /** 화면 베젤 ↔ 달력 수평 여백 (클수록 베젤에 더 붙음) */
  outerPaddingH: 22,
  /** 달력 ↔ 달력 사이 수평 여백 한쪽 (작을수록 달력끼리 더 가까움) */
  monthPaddingH: 4,
  /** 달력 상하 여백 */
  monthPaddingV: 17,
} as const;
