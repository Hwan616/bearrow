import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { MONTH_VIEW } from "@/config/layout";
import { useAppSettings } from "@/features/settings/AppSettingsContext";
import { useTheme } from "@/theme";

import { useMonthItems } from "../hooks/useMonthItems";
import type { Event } from "../types";
import type { CalendarDay } from "../utils/calendarUtils";
import {
  buildMonthGrid,
  getTodosForDay,
  isSameDay,
} from "../utils/calendarUtils";
import { getHolidaysForMonth } from "../utils/koreanHolidays";

const BAR_HEIGHT = 14;
const BAR_MARGIN = 2;
const THIN_BAR_HEIGHT = 3;
const THIN_BAR_SLOT = THIN_BAR_HEIGHT + BAR_MARGIN; // 5px per thin-bar slot
const DOT_SIZE = 4;
const DOT_GAP = 2;

// ── 레이아웃 상수 ──────────────────────────────────────────────────────────────
const MONTH_LABEL_HEIGHT = Math.round(MONTH_VIEW.labelOnFirstSize * 1.32) + 8;
const DAY_CELL_PADDING_TOP = 6;
const DAY_CIRCLE_CONTAINER_H = 36;
// 이벤트 바/점 시작 Y (weekRow 기준): 날짜 원형 바로 아래 4px 간격
const EVENT_BAR_START = DAY_CELL_PADDING_TOP + DAY_CIRCLE_CONTAINER_H + 4; // 46

// ── 줌 레벨 설정 (Level 0 = 최소, Level 5 = 최대·기본) ──────────────────────
type ZoomMode = "dots" | "thin_bars" | "bars";

interface ZoomConfig {
  mode: ZoomMode;
  weekRowHeight: number;
  maxTracks: number;
}

// weekRowHeight 계산식 (bars 모드): 52 + maxTracks * 16
// EVENT_BAR_START(46) + maxTracks*(BAR_HEIGHT+BAR_MARGIN)(16) + BAR_MARGIN(2) + padding(4) = 52 + n*16
const ZOOM_LEVELS: ZoomConfig[] = [
  { mode: "dots", weekRowHeight: 60, maxTracks: 5 },               // Level 0: 점
  { mode: "thin_bars", weekRowHeight: 77, maxTracks: 5 },          // Level 1: 얇은 막대
  { mode: "bars", weekRowHeight: 84, maxTracks: 2 },               // Level 2: 박스 2개
  { mode: "bars", weekRowHeight: 100, maxTracks: 3 },              // Level 3: 박스 3개
  { mode: "bars", weekRowHeight: 116, maxTracks: 4 },              // Level 4: 박스 4개
  { mode: "bars", weekRowHeight: MONTH_VIEW.weekRowHeight, maxTracks: 5 }, // Level 5: 박스 5개 (기본)
];

const DEFAULT_ZOOM_LEVEL = 5;
const MONTH_WINDOW = 49; // ±24 months

// 핀치 확대/축소 높이 한계 (worklet에서 사용하도록 단순 숫자로 hoist)
const PINCH_MIN_H = ZOOM_LEVELS[0]!.weekRowHeight;
const PINCH_MAX_H = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!.weekRowHeight;

// 해당 월에 필요한 주(행) 수
function getWeekCount(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.ceil((firstDay + daysInMonth) / 7);
}

// FlatList getItemLayout 용 높이 계산
function getMonthItemHeight(year: number, month: number, weekRowHeight: number): number {
  return MONTH_LABEL_HEIGHT + getWeekCount(year, month) * weekRowHeight;
}

// 주어진 높이에서 가장 가까운 줌 레벨 인덱스 반환
function findNearestZoomLevel(height: number): number {
  return ZOOM_LEVELS.reduce(
    (best, cfg, idx) => {
      const dist = Math.abs(cfg.weekRowHeight - height);
      return dist < best.dist ? { idx, dist } : best;
    },
    { idx: 0, dist: Infinity },
  ).idx;
}

// ── 타입 ──────────────────────────────────────────────────────────────────────

type YearMonth = { year: number; month: number };

interface EventBarData {
  eventId: string;
  title: string;
  color: string;
  startCol: number;
  endCol: number;
  track: number;
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function generateMonthList(center: Date): YearMonth[] {
  const half = Math.floor(MONTH_WINDOW / 2);
  return Array.from({ length: MONTH_WINDOW }, (_, i) => {
    const d = new Date(center.getFullYear(), center.getMonth() + (i - half), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

function chunkBy7<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += 7) {
    result.push(arr.slice(i, i + 7));
  }
  return result;
}

function getEventColumns(
  weekDays: CalendarDay[],
  event: Event,
): { startCol: number; endCol: number } | null {
  let startCol = -1;
  let endCol = -1;
  for (let col = 0; col < 7; col++) {
    const day = weekDays[col]!;
    const dayEndMs = day.date.getTime() + 24 * 60 * 60 * 1000 - 1;
    if (event.startsAt.getTime() <= dayEndMs && event.endsAt.getTime() >= day.date.getTime()) {
      if (startCol === -1) startCol = col;
      endCol = col;
    }
  }
  return startCol === -1 ? null : { startCol, endCol };
}

function computeEventBars(
  weekDays: CalendarDay[],
  events: Event[],
  getCategoryColor: (id: string | null | undefined) => string,
): EventBarData[] {
  // 이번 주에서 현재 달에 속하는 첫/마지막 열 — 이 범위를 벗어난 셀에는 바를 그리지 않음
  const firstCurrentCol = weekDays.findIndex((d) => d.isCurrentMonth);
  const lastCurrentCol = weekDays.reduce((acc, d, i) => (d.isCurrentMonth ? i : acc), -1);
  if (firstCurrentCol < 0) return [];

  const weekStart = weekDays[0]!.date;
  const weekEndDay = weekDays[6]!.date;
  const weekEndMs = weekEndDay.getTime() + 24 * 60 * 60 * 1000 - 1;

  const weekEvents = events
    .filter((e) => e.startsAt.getTime() <= weekEndMs && e.endsAt.getTime() >= weekStart.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  // 트랙 상한 없이 모두 계산 — 렌더링 단계에서 maxTracks 기준으로 overflow 처리
  const trackEndCols: number[] = [];
  const bars: EventBarData[] = [];

  for (const event of weekEvents) {
    const cols = getEventColumns(weekDays, event);
    if (!cols) continue;

    // 현재 달 셀 범위로 클램핑
    const startCol = Math.max(cols.startCol, firstCurrentCol);
    const endCol = Math.min(cols.endCol, lastCurrentCol);
    if (startCol > endCol) continue;

    let track = trackEndCols.findIndex((end) => end < startCol);
    if (track === -1) {
      track = trackEndCols.length;
      trackEndCols.push(endCol);
    } else {
      trackEndCols[track] = endCol;
    }

    bars.push({
      eventId: event.id,
      title: event.title,
      color: getCategoryColor(event.categoryId),
      startCol,
      endCol,
      track,
    });
  }

  return bars;
}

function computeHolidayBars(
  weekDays: CalendarDay[],
  holidayMap: Map<number, string>,
  existingBars: EventBarData[],
  holidayColor: string,
): EventBarData[] {
  const result: EventBarData[] = [];
  weekDays.forEach(({ date, isCurrentMonth }, col) => {
    if (!isCurrentMonth) return;
    const name = holidayMap.get(date.getDate());
    if (!name) return;
    const usedTracks = existingBars
      .filter((b) => b.startCol <= col && b.endCol >= col)
      .map((b) => b.track);
    let track = 0;
    while (usedTracks.includes(track)) track++;
    result.push({
      eventId: `holiday-${date.toISOString()}`,
      title: name,
      color: holidayColor,
      startCol: col,
      endCol: col,
      track,
    });
  });
  return result;
}

// ── MonthView ─────────────────────────────────────────────────────────────────

export interface MonthViewHandle {
  scrollToMonth: (year: number, month: number) => void;
  clearSelection: () => void;
  /** 해당 날짜가 속한 주(週) 행이 현재 뷰포트 안에 보이는지 여부 */
  isWeekVisible: (date: Date) => boolean;
}

interface MonthViewProps {
  initialDate?: Date;
  onDayPress?: (date: Date) => void;
  onVisibleMonthChange?: (year: number, month: number) => void;
  onEventPress?: (event: Event) => void;
}

export const MonthView = React.forwardRef<MonthViewHandle, MonthViewProps>(
  function MonthView({ initialDate, onDayPress, onVisibleMonthChange, onEventPress }, ref) {
  const { colors } = useTheme();
  const { showHolidays } = useAppSettings();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => initialDate ?? new Date(), []);
  const months = useRef(generateMonthList(base)).current;
  const initialIndex = Math.floor(MONTH_WINDOW / 2);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);

  const zoomCfg = ZOOM_LEVELS[zoomLevel]!;
  // 레이아웃·렌더 높이는 항상 스냅된 레벨 높이 — 핀치 중엔 transform으로 미리보기
  const stableWeekRowHeight = zoomCfg.weekRowHeight;
  const renderWeekRowHeight = stableWeekRowHeight;
  const zoomMode = zoomCfg.mode;
  const maxTracks = zoomCfg.maxTracks;

  const listRef = useRef<FlatList<YearMonth>>(null);
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const activeMonthIdxRef = useRef(initialIndex);
  // 핀치 스냅 후 적용할 절대 스크롤 오프셋 (포컬 앵커 유지)
  const pendingScrollOffsetRef = useRef<number | null>(null);

  // 핀치: 터치 지점(포컬)을 기준으로 transform 확대/축소 → 모션 동안 화면 이동 없음
  const pinchScale = useSharedValue(1);
  const focalCx = useSharedValue(0);
  const focalCy = useSharedValue(0);
  const viewW = useSharedValue(0);
  const viewH = useSharedValue(0);
  const curHeight = useSharedValue(stableWeekRowHeight);
  useEffect(() => { curHeight.value = stableWeekRowHeight; }, [stableWeekRowHeight, curHeight]);

  const pinchAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: focalCx.value },
      { translateY: focalCy.value },
      { scale: pinchScale.value },
      { translateX: -focalCx.value },
      { translateY: -focalCy.value },
    ],
  }));

  // onEnd(JS): 스케일 → 가장 가까운 줌 레벨로 스냅 + 포컬 행을 손가락 아래에 고정
  const commitZoomRef = useRef<(scale: number, focalY: number) => void>(() => {});
  const runCommitZoom = useCallback((scale: number, focalY: number) => {
    commitZoomRef.current(scale, focalY);
  }, []);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin((e) => {
          "worklet";
          focalCx.value = e.focalX - viewW.value / 2;
          focalCy.value = e.focalY - viewH.value / 2;
          pinchScale.value = 1;
        })
        .onUpdate((e) => {
          "worklet";
          const target = curHeight.value * e.scale;
          const clamped = Math.max(PINCH_MIN_H, Math.min(PINCH_MAX_H, target));
          pinchScale.value = clamped / curHeight.value;
        })
        .onEnd(() => {
          "worklet";
          runOnJS(runCommitZoom)(pinchScale.value, focalCy.value + viewH.value / 2);
          pinchScale.value = 1;
          focalCx.value = 0;
          focalCy.value = 0;
        }),
    [focalCx, focalCy, viewW, viewH, pinchScale, curHeight, runCommitZoom],
  );

  useImperativeHandle(ref, () => ({
    scrollToMonth(year: number, month: number) {
      const idx = months.findIndex((m) => m.year === year && m.month === month);
      if (idx < 0) return;
      let offset = 0;
      for (let i = 0; i < idx; i++) {
        offset += getMonthItemHeight(months[i]!.year, months[i]!.month, stableWeekRowHeight);
      }
      listRef.current?.scrollToOffset({ offset: offset + MONTH_LABEL_HEIGHT, animated: true });
    },
    clearSelection() {
      setSelectedDate(null);
    },
    isWeekVisible(date: Date): boolean {
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthIdx = months.findIndex((m) => m.year === year && m.month === month);
      if (monthIdx < 0) return false;
      let monthOffset = 0;
      for (let i = 0; i < monthIdx; i++) {
        monthOffset += getMonthItemHeight(months[i]!.year, months[i]!.month, stableWeekRowHeight);
      }
      const firstDay = new Date(year, month, 1).getDay();
      const weekRowIdx = Math.floor((firstDay + date.getDate() - 1) / 7);
      const weekRowTop = monthOffset + MONTH_LABEL_HEIGHT + weekRowIdx * stableWeekRowHeight;
      const weekRowBottom = weekRowTop + stableWeekRowHeight;
      const viewTop = scrollYRef.current;
      const viewBottom = viewTop + viewportHeightRef.current;
      return weekRowTop < viewBottom && weekRowBottom > viewTop;
    },
  }), [months, stableWeekRowHeight]);

  const onVisibleMonthChangeRef = useRef(onVisibleMonthChange);
  onVisibleMonthChangeRef.current = onVisibleMonthChange;

  // 월별 FlatList 아이템 높이·오프셋 — 핀치 중에도 안정적으로 유지 (stableWeekRowHeight 사용)
  const itemLayouts = useMemo(() => {
    const result: { height: number; offset: number }[] = [];
    let offset = 0;
    for (const m of months) {
      const height = getMonthItemHeight(m.year, m.month, stableWeekRowHeight);
      result.push({ height, offset });
      offset += height;
    }
    return result;
  }, [months, stableWeekRowHeight]);

  // 핀치 종료 커밋 — 최신 레이아웃/스크롤을 참조하도록 매 렌더 갱신
  commitZoomRef.current = (scale: number, focalY: number) => {
    const oldH = stableWeekRowHeight;
    const newHeight = Math.max(PINCH_MIN_H, Math.min(PINCH_MAX_H, oldH * scale));
    const newLevel = findNearestZoomLevel(newHeight);
    const newH = ZOOM_LEVELS[newLevel]!.weekRowHeight;

    // 포컬이 가리키는 콘텐츠 좌표(구 레이아웃) → 해당 월·행 파악
    const contentY = scrollYRef.current + focalY;
    let mIdx = months.length - 1;
    for (let i = 0; i < months.length; i++) {
      const bottom = itemLayouts[i]!.offset + itemLayouts[i]!.height;
      if (contentY < bottom) { mIdx = i; break; }
    }
    const localY = contentY - itemLayouts[mIdx]!.offset;
    // MM월 레이블 높이는 줌과 무관, 그 아래 주(週) 영역만 비율 스케일
    const newLocalY =
      localY <= MONTH_LABEL_HEIGHT
        ? localY
        : MONTH_LABEL_HEIGHT + ((localY - MONTH_LABEL_HEIGHT) / oldH) * newH;
    let newOffset = 0;
    for (let i = 0; i < mIdx; i++) {
      newOffset += getMonthItemHeight(months[i]!.year, months[i]!.month, newH);
    }
    // 포컬 콘텐츠가 같은 화면 Y(focalY)에 오도록 스크롤 오프셋 산출
    pendingScrollOffsetRef.current = Math.max(0, newOffset + newLocalY - focalY);
    setZoomLevel(newLevel);
  };

  // 스크롤 위치 기반 서브타이틀 갱신
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = scrollY;
      let newIdx = 0;
      for (let i = 0; i < months.length; i++) {
        const weekCount = getWeekCount(months[i]!.year, months[i]!.month);
        const lastRowTopY =
          itemLayouts[i]!.offset + MONTH_LABEL_HEIGHT + (weekCount - 1) * stableWeekRowHeight;
        if (scrollY > lastRowTopY) {
          newIdx = i + 1;
        } else {
          break;
        }
      }
      newIdx = Math.min(newIdx, months.length - 1);
      if (newIdx !== activeMonthIdxRef.current) {
        activeMonthIdxRef.current = newIdx;
        onVisibleMonthChangeRef.current?.(months[newIdx]!.year, months[newIdx]!.month);
      }
    },
    [months, itemLayouts, stableWeekRowHeight],
  );

  // 핀치 스냅 후: 포컬 앵커를 유지하도록 새 레이아웃 기준 절대 오프셋으로 스크롤 복원
  useEffect(() => {
    const off = pendingScrollOffsetRef.current;
    if (off === null) return;
    pendingScrollOffsetRef.current = null;
    listRef.current?.scrollToOffset({ offset: off, animated: false });
  }, [zoomLevel]);

  // 초기 진입 시 MM월 레이블을 숨기고 첫 주 구분선이 요일바 하단과 맞닿게 스크롤
  useEffect(() => {
    const initialOffset = itemLayouts[initialIndex]!.offset + MONTH_LABEL_HEIGHT;
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
    }, 0);
    return () => clearTimeout(id);
  // 마운트 시 1회만
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDayPress = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      onDayPress?.(date);
    },
    [onDayPress],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemLayouts[index]!.height,
      offset: itemLayouts[index]!.offset,
      index,
    }),
    [itemLayouts],
  );

  const renderItem = useCallback(
    ({ item }: { item: YearMonth }) => (
      <MonthItem
        year={item.year}
        month={item.month}
        selectedDate={selectedDate}
        onDayPress={handleDayPress}
        onEventPress={onEventPress}
        showHolidays={showHolidays}
        colors={colors}
        weekRowHeight={renderWeekRowHeight}
        maxTracks={maxTracks}
        zoomMode={zoomMode}
      />
    ),
    [selectedDate, handleDayPress, onEventPress, showHolidays, colors, renderWeekRowHeight, maxTracks, zoomMode],
  );

  const keyExtractor = useCallback(
    (item: YearMonth) => `${item.year}-${item.month}`,
    [],
  );

  return (
    <GestureDetector gesture={pinchGesture}>
      <View
        style={{ flex: 1, backgroundColor: colors.background.primary }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          viewportHeightRef.current = height;
          viewW.value = width;
          viewH.value = height;
        }}
      >
        <Animated.View style={[{ flex: 1 }, pinchAnimStyle]}>
          <FlatList<YearMonth>
            ref={listRef}
            data={months}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
            onScrollToIndexFailed={() => {
              listRef.current?.scrollToOffset({
                offset: itemLayouts[initialIndex]!.offset + MONTH_LABEL_HEIGHT,
                animated: false,
              });
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            windowSize={9}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={40}
            initialNumToRender={3}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 72 }}
            testID="month-list"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

// ── MonthItem ─────────────────────────────────────────────────────────────────

interface MonthItemProps {
  year: number;
  month: number;
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
  onEventPress?: (event: Event) => void;
  showHolidays: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  weekRowHeight: number;
  maxTracks: number;
  zoomMode: ZoomMode;
}

const MonthItem = React.memo(function MonthItem({
  year,
  month,
  selectedDate,
  onDayPress,
  onEventPress,
  showHolidays,
  colors,
  weekRowHeight,
  maxTracks,
  zoomMode,
}: MonthItemProps) {
  const s = makeStyles(colors, weekRowHeight, maxTracks);
  const { events, dueTodos, categories } = useMonthItems(year, month);
  const today = new Date();
  const isThisMonth = year === today.getFullYear() && month === today.getMonth();
  const rawGrid = buildMonthGrid(year, month, today);
  const rows = chunkBy7(rawGrid);

  const firstDayCol = rows[0]?.findIndex((d) => d.isCurrentMonth) ?? 0;

  const holidayMap = useMemo(
    () => (showHolidays ? getHolidaysForMonth(year, month) : new Map<number, string>()),
    [year, month, showHolidays],
  );

  const categoryColorMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.color])),
    [categories],
  );

  const getCategoryColor = (categoryId: string | null | undefined): string =>
    (categoryId ? categoryColorMap.get(categoryId) : undefined) ?? colors.accent.primary;

  return (
    <View style={s.monthItem}>
      <View testID="month-grid">
        {rows.map((weekDays, rowIndex) => {
          const eventBars = computeEventBars(weekDays, events, getCategoryColor);

          const firstActiveCol = weekDays.findIndex((d) => d.isCurrentMonth);
          const lastActiveCol = weekDays.reduce(
            (acc, d, i) => (d.isCurrentMonth ? i : acc),
            -1,
          );

          const holidayBars = computeHolidayBars(weekDays, holidayMap, eventBars, colors.status.error);
          const allBars = [...eventBars, ...holidayBars];

          // 날짜별 커버 바 수
          const colBarCounts = Array.from({ length: 7 }, (_, col) =>
            allBars.filter((b) => b.startCol <= col && b.endCol >= col).length,
          );

          // overflow는 bars 모드에서만 적용 (thin_bars·dots는 그냥 maxTracks까지 표시)
          const rowHasOverflow =
            zoomMode === "bars" &&
            weekDays.some((d, col) => d.isCurrentMonth && (colBarCounts[col] ?? 0) > maxTracks);

          const displayBars = allBars.filter(
            (b) => b.track < (rowHasOverflow ? maxTracks - 1 : maxTracks),
          );

          // dots 모드: 날짜별 색상 목록 (최대 maxTracks개)
          const dayColors =
            zoomMode === "dots"
              ? Array.from({ length: 7 }, (_, col) =>
                  allBars
                    .filter((b) => b.startCol <= col && b.endCol >= col)
                    .slice(0, maxTracks)
                    .map((b) => b.color),
                )
              : null;

          return (
            <React.Fragment key={rowIndex}>
              {/* MM월 레이블 — 1일 위 열에 정렬 */}
              {rowIndex === 0 && (
                <View style={s.monthLabelAboveRow}>
                  {Array.from({ length: firstDayCol }, (_, i) => (
                    <View key={`sp-${i}`} style={s.monthLabelSpacer} />
                  ))}
                  <Text style={[s.monthLabelOnFirst, isThisMonth && s.monthLabelCurrent]}>
                    {month + 1}월
                  </Text>
                </View>
              )}

              <View style={s.weekRow}>
                {/* 실제 날짜 구간만 커버하는 구분선 */}
                {firstActiveCol >= 0 && (
                  <View
                    style={[
                      s.weekTopLine,
                      {
                        left: `${(firstActiveCol / 7) * 100}%` as `${number}%`,
                        right: `${((6 - lastActiveCol) / 7) * 100}%` as `${number}%`,
                      },
                    ]}
                  />
                )}

                {/* 날짜 셀 행 */}
                <View style={s.dayCellsRow}>
                  {weekDays.map(({ date, isCurrentMonth, isToday }, col) => {
                    const dayTodos = getTodosForDay(dueTodos, date);
                    const incompleteCount = dayTodos.filter((t) => !t.isCompleted).length;
                    const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
                    const isSun = date.getDay() === 0;
                    const isSat = date.getDay() === 6;

                    const colBarCount = colBarCounts[col] ?? 0;
                    // bars 모드에서만 overflow indicator 표시
                    const colOverflow =
                      zoomMode === "bars" && isCurrentMonth && colBarCount > maxTracks
                        ? colBarCount - (maxTracks - 1)
                        : 0;

                    const cellDotColors = dayColors?.[col] ?? [];

                    if (!isCurrentMonth) {
                      return <View key={date.toISOString()} style={s.dayCell} />;
                    }

                    return (
                      <Pressable
                        key={date.toISOString()}
                        style={s.dayCell}
                        onPress={() => onDayPress(date)}
                        accessibilityLabel={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
                        accessibilityRole="button"
                      >
                        <View
                          style={[
                            s.dayCircle,
                            isToday && { backgroundColor: colors.accent.primary },
                            isSelected && !isToday && { backgroundColor: colors.accent.primaryLight },
                          ]}
                        >
                          <Text
                            style={[
                              s.dayText,
                              isToday && s.todayText,
                              !isToday && isSun && s.sunday,
                              !isToday && isSat && s.saturday,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </View>
                        {incompleteCount > 0 && (
                          <Text
                            style={s.todoCount}
                            testID={`todo-count-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                          >
                            {incompleteCount}
                          </Text>
                        )}
                        {/* dots 모드: 날짜 원형 아래 중앙 정렬 색상 점 */}
                        {zoomMode === "dots" && cellDotColors.length > 0 && (
                          <View style={s.dotsRow}>
                            {cellDotColors.map((color, i) => (
                              <View key={i} style={[s.dot, { backgroundColor: color }]} />
                            ))}
                          </View>
                        )}
                        {/* bars 모드: 날짜 셀 하단 중앙 초과 indicator */}
                        {colOverflow > 0 && (
                          <Text style={s.colOverflowText}>+{colOverflow}개</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* 이벤트 + 공휴일 바 레이어 (dots 모드에서는 숨김) */}
                {zoomMode !== "dots" && (
                  <View style={s.eventBarsRow}>
                    {displayBars.map((bar) => {
                      const isThin = zoomMode === "thin_bars";
                      const barTop = isThin
                        ? bar.track * THIN_BAR_SLOT + BAR_MARGIN
                        : bar.track * (BAR_HEIGHT + BAR_MARGIN) + BAR_MARGIN;
                      const barH = isThin ? THIN_BAR_HEIGHT : BAR_HEIGHT;
                      const isHoliday = bar.eventId.startsWith("holiday-");

                      const barContent = isThin ? (
                        /* thin_bars: 텍스트 없이 단색 */
                        <View
                          style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: bar.color, borderRadius: 1 },
                          ]}
                        />
                      ) : (
                        /* bars: 글씨(검정/흰색) 위에 카테고리 색 박스를 덧입힘 */
                        <>
                          <Text style={s.eventBarText} numberOfLines={1}>
                            {bar.title}
                          </Text>
                          <View
                            testID={`event-bar-bg-${bar.eventId}`}
                            style={[
                              StyleSheet.absoluteFillObject,
                              s.eventBarBg,
                              { backgroundColor: bar.color },
                            ]}
                          />
                        </>
                      );

                      const barStyle = [
                        isThin ? s.thinEventBar : s.eventBar,
                        {
                          left: `${(bar.startCol / 7) * 100}%` as `${number}%`,
                          right: `${((6 - bar.endCol) / 7) * 100}%` as `${number}%`,
                          top: barTop,
                          height: barH,
                        },
                      ];

                      if (!isHoliday && onEventPress) {
                        const ev = events.find((e) => e.id === bar.eventId);
                        return (
                          <Pressable
                            key={`${bar.eventId}-${rowIndex}`}
                            testID={`event-bar-${bar.eventId}`}
                            style={barStyle}
                            onPress={() => ev && onEventPress(ev)}
                          >
                            {barContent}
                          </Pressable>
                        );
                      }

                      return (
                        <View
                          key={`${bar.eventId}-${rowIndex}`}
                          testID={`event-bar-${bar.eventId}`}
                          style={barStyle}
                        >
                          {barContent}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
});

// ── 스타일 ────────────────────────────────────────────────────────────────────

const makeStyles = (
  colors: ReturnType<typeof useTheme>["colors"],
  weekRowHeight: number,
  maxTracks: number,
) =>
  StyleSheet.create({
    monthItem: {
      backgroundColor: colors.background.primary,
      paddingHorizontal: 4,
    },
    sunday: { color: colors.text.secondary },
    saturday: { color: colors.text.secondary },
    monthLabelAboveRow: {
      flexDirection: "row",
      paddingTop: 6,
      paddingBottom: 2,
    },
    monthLabelSpacer: {
      width: `${100 / 7}%` as `${number}%`,
    },
    monthLabelOnFirst: {
      width: `${100 / 7}%` as `${number}%`,
      fontSize: MONTH_VIEW.labelOnFirstSize,
      fontWeight: "700",
      color: colors.text.primary,
      textAlign: "center",
    },
    monthLabelCurrent: {
      color: colors.status.error,
    },
    weekRow: {
      position: "relative",
      height: weekRowHeight,
      overflow: "hidden",
    },
    weekTopLine: {
      position: "absolute",
      top: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.default,
      zIndex: 1,
    },
    dayCellsRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      height: weekRowHeight,
    },
    dayCell: {
      width: `${100 / 7}%` as `${number}%`,
      height: weekRowHeight,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: DAY_CELL_PADDING_TOP,
      position: "relative",
    },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: {
      fontSize: 18,
      color: colors.text.primary,
    },
    outsideMonth: {
      color: colors.text.disabled,
    },
    todayText: {
      color: colors.text.inverse,
      fontWeight: "700",
    },
    todoCount: {
      position: "absolute",
      right: 3,
      top: 4,
      fontSize: 9,
      color: colors.text.secondary,
      fontWeight: "500",
    },
    // dots 모드: 날짜 원형 아래 중앙 정렬 점 행
    dotsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: DOT_GAP,
      paddingTop: 4,
      paddingHorizontal: 3,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
    },
    eventBarsRow: {
      position: "absolute",
      top: EVENT_BAR_START,
      left: 0,
      right: 0,
    },
    colOverflowText: {
      position: "absolute",
      // overflow 표시 위치: 마지막 visible 바(maxTracks-1번째) 바로 아래
      top: EVENT_BAR_START + (maxTracks - 1) * (BAR_HEIGHT + BAR_MARGIN) + BAR_MARGIN,
      left: 0,
      right: 0,
      fontSize: 9,
      color: colors.text.secondary,
      textAlign: "center",
      fontWeight: "500",
    },
    // 일반 이벤트 박스 (글씨 위에 색 박스를 덧입힘)
    eventBar: {
      position: "absolute",
      borderRadius: 3,
      paddingHorizontal: 3,
      justifyContent: "center",
      overflow: "hidden",
      marginHorizontal: 1.5,
    },
    eventBarBg: {
      borderRadius: 3,
      opacity: MONTH_VIEW.eventBarOpacity,
    },
    eventBarText: {
      fontSize: 10,
      color: colors.text.primary,
      fontWeight: "500",
    },
    // 얇은 막대 (텍스트 없이 단색)
    thinEventBar: {
      position: "absolute",
      borderRadius: 1,
      overflow: "hidden",
      marginHorizontal: 1.5,
    },
  });
