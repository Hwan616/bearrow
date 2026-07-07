import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

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
// iOS 시스템 폰트 lineHeight 계수 ≈ 1.32
// monthLabelOnFirst: fontSize:17 lineHeight≈23 + paddingVertical:8 = 31
const MONTH_LABEL_HEIGHT = 31;     // monthLabelAboveRow 높이
const WEEK_ROW_HEIGHT = 93;        // dayCells:59 + eventBars:34
const FIXED_WEEKS = 6;
const MONTH_ITEM_HEIGHT = MONTH_LABEL_HEIGHT + FIXED_WEEKS * WEEK_ROW_HEIGHT;
// 31 + 6×93 = 589

const MONTH_WINDOW = 49; // ±24 months

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

function padTo6Weeks(grid: CalendarDay[]): CalendarDay[] {
  const padded = [...grid];
  while (padded.length < 42) {
    const last = padded[padded.length - 1]!;
    const d = new Date(last.date);
    d.setDate(last.date.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    padded.push({ date: d, isCurrentMonth: false, isToday: false });
  }
  return padded;
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

    const { startCol, endCol } = cols;

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

  useImperativeHandle(ref, () => ({
    scrollToMonth(year: number, month: number) {
      const idx = months.findIndex((m) => m.year === year && m.month === month);
      if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true });
    },
    clearSelection() {
      setSelectedDate(null);
    },
  }), [months]);

  const onVisibleMonthChangeRef = useRef(onVisibleMonthChange);
  onVisibleMonthChangeRef.current = onVisibleMonthChange;

  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first) {
        const ym = first.item as YearMonth;
        onVisibleMonthChangeRef.current?.(ym.year, ym.month);
      }
    },
  );
  const onViewableItemsChanged = onViewableItemsChangedRef.current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleDayPress = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      onDayPress?.(date);
    },
    [onDayPress],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: MONTH_ITEM_HEIGHT,
      offset: MONTH_ITEM_HEIGHT * index,
      index,
    }),
    [],
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
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <FlatList<YearMonth>
        ref={listRef}
        data={months}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={() => {
          listRef.current?.scrollToOffset({
            offset: initialIndex * MONTH_ITEM_HEIGHT,
            animated: false,
          });
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
  const grid = padTo6Weeks(rawGrid);
  const rows = chunkBy7(grid);

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
                  <Text style={[s.monthLabelOnFirst, isThisMonth && s.monthLabelCurrent, isThisMonth && { opacity: 0 }]}>
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
                          backgroundColor: bar.color,
                        },
                      ]}
                    >
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
      fontSize: 17,
      fontWeight: "700",
      color: colors.text.secondary,
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
    },
    dayCell: {
      width: `${100 / 7}%` as `${number}%`,
      minHeight: 59,
      alignItems: "center",
      justifyContent: "center",
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
    },
    eventBarText: {
      fontSize: 10,
      color: colors.text.inverse,
      fontWeight: "500",
    },
  });
