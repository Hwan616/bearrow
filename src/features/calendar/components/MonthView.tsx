import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
const MAX_TRACKS = 2;
const EVENT_AREA_HEIGHT = MAX_TRACKS * (BAR_HEIGHT + BAR_MARGIN) + BAR_MARGIN;

// ── 레이아웃 상수 ──────────────────────────────────────────────────────────────
const MONTH_LABEL_HEIGHT = Math.round(MONTH_VIEW.labelOnFirstSize * 1.32) + 8;
const WEEK_ROW_HEIGHT = MONTH_VIEW.weekRowHeight;
const DAY_CELL_HEIGHT = WEEK_ROW_HEIGHT - EVENT_AREA_HEIGHT;

const MONTH_WINDOW = 49; // ±24 months

// 해당 월에 필요한 주(행) 수
function getWeekCount(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.ceil((firstDay + daysInMonth) / 7);
}

// FlatList getItemLayout 용 높이 계산
function getMonthItemHeight(year: number, month: number): number {
  return MONTH_LABEL_HEIGHT + getWeekCount(year, month) * WEEK_ROW_HEIGHT;
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

  const trackEndCols: number[] = [-1, -1];
  const bars: EventBarData[] = [];

  for (const event of weekEvents) {
    const cols = getEventColumns(weekDays, event);
    if (!cols) continue;

    // 현재 달 셀 범위로 클램핑 — 이전/다음 달 빈 셀 위에 바 표시 방지
    const startCol = Math.max(cols.startCol, firstCurrentCol);
    const endCol = Math.min(cols.endCol, lastCurrentCol);
    if (startCol > endCol) continue;

    let track = -1;
    for (let t = 0; t < MAX_TRACKS; t++) {
      if ((trackEndCols[t] ?? -1) < startCol) {
        track = t;
        trackEndCols[t] = endCol;
        break;
      }
    }
    if (track === -1) continue;

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
    while (usedTracks.includes(track) && track < MAX_TRACKS) track++;
    if (track < MAX_TRACKS) {
      result.push({
        eventId: `holiday-${date.toISOString()}`,
        title: name,
        color: holidayColor,
        startCol: col,
        endCol: col,
        track,
      });
    }
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
}

export const MonthView = React.forwardRef<MonthViewHandle, MonthViewProps>(
  function MonthView({ initialDate, onDayPress, onVisibleMonthChange }, ref) {
  const { colors } = useTheme();
  const { showHolidays } = useAppSettings();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => initialDate ?? new Date(), []);
  const months = useRef(generateMonthList(base)).current;
  const initialIndex = Math.floor(MONTH_WINDOW / 2);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const listRef = useRef<FlatList<YearMonth>>(null);
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);

  useImperativeHandle(ref, () => ({
    scrollToMonth(year: number, month: number) {
      const idx = months.findIndex((m) => m.year === year && m.month === month);
      if (idx < 0) return;
      let offset = 0;
      for (let i = 0; i < idx; i++) {
        offset += getMonthItemHeight(months[i]!.year, months[i]!.month);
      }
      // MONTH_LABEL_HEIGHT만큼 더 스크롤해 1일 위 레이블을 숨기고 첫 행 구분선부터 보이게 함
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
        monthOffset += getMonthItemHeight(months[i]!.year, months[i]!.month);
      }
      // 해당 날짜가 속한 주 행 인덱스 계산
      const firstDay = new Date(year, month, 1).getDay();
      const weekRowIdx = Math.floor((firstDay + date.getDate() - 1) / 7);
      const weekRowTop = monthOffset + MONTH_LABEL_HEIGHT + weekRowIdx * WEEK_ROW_HEIGHT;
      const weekRowBottom = weekRowTop + WEEK_ROW_HEIGHT;
      const viewTop = scrollYRef.current;
      const viewBottom = viewTop + viewportHeightRef.current;
      return weekRowTop < viewBottom && weekRowBottom > viewTop;
    },
  }), [months]);

  const onVisibleMonthChangeRef = useRef(onVisibleMonthChange);
  onVisibleMonthChangeRef.current = onVisibleMonthChange;

  // 월별 FlatList 아이템 높이·오프셋 (가변 행 수에 맞게 사전 계산)
  const itemLayouts = useMemo(() => {
    const result: { height: number; offset: number }[] = [];
    let offset = 0;
    for (const m of months) {
      const height = getMonthItemHeight(m.year, m.month);
      result.push({ height, offset });
      offset += height;
    }
    return result;
  }, [months]);

  // 스크롤 위치 기반 서브타이틀 갱신 (Issue 6):
  // 요일바 하단이 해당 달 마지막 행의 상단 구분선을 지나면 다음 달로 전환
  const activeMonthIdxRef = useRef(initialIndex);
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = scrollY;
      let newIdx = 0;
      for (let i = 0; i < months.length; i++) {
        const weekCount = getWeekCount(months[i]!.year, months[i]!.month);
        const lastRowTopY =
          itemLayouts[i]!.offset + MONTH_LABEL_HEIGHT + (weekCount - 1) * WEEK_ROW_HEIGHT;
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
    [months, itemLayouts],
  );

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
        showHolidays={showHolidays}
        colors={colors}
      />
    ),
    [selectedDate, handleDayPress, showHolidays, colors],
  );

  const keyExtractor = useCallback(
    (item: YearMonth) => `${item.year}-${item.month}`,
    [],
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      onLayout={(e) => { viewportHeightRef.current = e.nativeEvent.layout.height; }}
    >
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
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 72 }}
        testID="month-list"
      />
    </View>
  );
});

// ── MonthItem ─────────────────────────────────────────────────────────────────

interface MonthItemProps {
  year: number;
  month: number;
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
  showHolidays: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}

const MonthItem = React.memo(function MonthItem({
  year,
  month,
  selectedDate,
  onDayPress,
  showHolidays,
  colors,
}: MonthItemProps) {
  const s = makeStyles(colors);
  const { events, dueTodos, categories } = useMonthItems(year, month);
  const today = new Date();
  const isThisMonth = year === today.getFullYear() && month === today.getMonth();
  const rawGrid = buildMonthGrid(year, month, today);
  const rows = chunkBy7(rawGrid);

  // 첫 번째 주에서 현재 달 첫 번째 날의 열(column) 인덱스
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

          // 이번 주에서 현재 달에 속하는 첫 번째·마지막 열 인덱스
          const firstActiveCol = weekDays.findIndex((d) => d.isCurrentMonth);
          const lastActiveCol = weekDays.reduce(
            (acc, d, i) => (d.isCurrentMonth ? i : acc),
            -1,
          );

          const holidayBars = computeHolidayBars(weekDays, holidayMap, eventBars, colors.status.error);
          const allBars = [...eventBars, ...holidayBars];

          return (
            <React.Fragment key={rowIndex}>
              {/* MM월 레이블 — 1일 위 열에 정렬 */}
              {rowIndex === 0 && (
                <View style={s.monthLabelAboveRow}>
                  {Array.from({ length: firstDayCol }, (_, i) => (
                    <View key={`sp-${i}`} style={s.monthLabelSpacer} />
                  ))}
                  {/* 헤더 서브타이틀에 이미 표시되는 당월은 숨김 (레이아웃 높이 유지) */}
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
                  {weekDays.map(({ date, isCurrentMonth, isToday }) => {
                    const dayTodos = getTodosForDay(dueTodos, date);
                    const incompleteCount = dayTodos.filter((t) => !t.isCompleted).length;
                    const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
                    const isSun = date.getDay() === 0;
                    const isSat = date.getDay() === 6;

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
                      </Pressable>
                    );
                  })}
                </View>

                {/* 이벤트 + 공휴일 바 레이어 */}
                <View style={s.eventBarsRow}>
                  {allBars.map((bar) => (
                    <View
                      key={`${bar.eventId}-${rowIndex}`}
                      testID={`event-bar-${bar.eventId}`}
                      style={[
                        s.eventBar,
                        {
                          left: `${(bar.startCol / 7) * 100}%` as `${number}%`,
                          right: `${((6 - bar.endCol) / 7) * 100}%` as `${number}%`,
                          top: bar.track * (BAR_HEIGHT + BAR_MARGIN) + BAR_MARGIN,
                        },
                      ]}
                    >
                      {/* 배경만 불투명도 적용 — 텍스트에는 영향 없음 */}
                      <View testID={`event-bar-bg-${bar.eventId}`} style={[StyleSheet.absoluteFillObject, s.eventBarBg, { backgroundColor: bar.color }]} />
                      <Text style={s.eventBarText} numberOfLines={1}>
                        {bar.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
});

// ── 스타일 ────────────────────────────────────────────────────────────────────

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
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
    },
    dayCell: {
      width: `${100 / 7}%` as `${number}%`,
      height: DAY_CELL_HEIGHT,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 6,
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
    eventBarsRow: {
      height: EVENT_AREA_HEIGHT,
      position: "relative",
    },
    eventBar: {
      position: "absolute",
      height: BAR_HEIGHT,
      borderRadius: 2,
      paddingHorizontal: 3,
      justifyContent: "center",
      overflow: "hidden",
      marginHorizontal: 0.5,
    },
    eventBarBg: {
      borderRadius: 2,
      opacity: MONTH_VIEW.eventBarOpacity,
    },
    eventBarText: {
      fontSize: 10,
      color: colors.text.primary,
      fontWeight: "500",
    },
  });
