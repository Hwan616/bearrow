import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  formatMonthTitle,
  getTodosForDay,
  isSameDay,
} from "../utils/calendarUtils";
import { getHolidaysForMonth } from "../utils/koreanHolidays";
import { YearMonthPicker } from "./YearMonthPicker";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"] as const;
const BAR_HEIGHT = 14;
const BAR_MARGIN = 2;
const MAX_TRACKS = 2;
const EVENT_AREA_HEIGHT = MAX_TRACKS * (BAR_HEIGHT + BAR_MARGIN) + BAR_MARGIN;

// ── 레이아웃 상수 ──────────────────────────────────────────────────────────────
const MONTH_HEADER_HEIGHT = 44;    // paddingVertical:12×2 + title text
const WEEK_LABELS_HEIGHT = 24;     // paddingVertical:4×2 + text + marginBottom:2
const WEEK_ROW_HEIGHT = 90;        // dayCells:44 + eventBars:34 + holidays:12
const FIXED_WEEKS = 6;             // always 6 rows per month (padded)
const MONTH_ITEM_HEIGHT =
  MONTH_HEADER_HEIGHT + WEEK_LABELS_HEIGHT + FIXED_WEEKS * WEEK_ROW_HEIGHT;
// 44 + 24 + 540 = 608

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

// ── MonthView ─────────────────────────────────────────────────────────────────

interface MonthViewProps {
  initialDate?: Date;
  onDayPress?: (date: Date) => void;
}

export function MonthView({ initialDate, onDayPress }: MonthViewProps) {
  const { colors } = useTheme();
  const { showHolidays } = useAppSettings();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => initialDate ?? new Date(), []);
  const months = useRef(generateMonthList(base)).current;
  const initialIndex = Math.floor(MONTH_WINDOW / 2);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickerYear, setPickerYear] = useState(base.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(base.getMonth());
  const [pickerVisible, setPickerVisible] = useState(false);

  const listRef = useRef<FlatList<YearMonth>>(null);

  useEffect(() => {
    const offset = initialIndex * MONTH_ITEM_HEIGHT;
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [initialIndex]);

  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first) {
        const ym = first.item as YearMonth;
        setPickerYear(ym.year);
        setPickerMonth(ym.month);
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

  const handleTitlePress = useCallback((year: number, month: number) => {
    setPickerYear(year);
    setPickerMonth(month);
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback(
    (y: number, m: number) => {
      setPickerVisible(false);
      const idx = months.findIndex((item) => item.year === y && item.month === m);
      if (idx >= 0) {
        listRef.current?.scrollToIndex({ index: idx, animated: true });
      }
    },
    [months],
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
        onTitlePress={handleTitlePress}
        showHolidays={showHolidays}
        colors={colors}
      />
    ),
    [selectedDate, handleDayPress, handleTitlePress, showHolidays, colors],
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        testID="month-list"
      />
      <YearMonthPicker
        year={pickerYear}
        month={pickerMonth}
        visible={pickerVisible}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

// ── MonthItem ─────────────────────────────────────────────────────────────────

interface MonthItemProps {
  year: number;
  month: number;
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
  onTitlePress: (year: number, month: number) => void;
  showHolidays: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}

const MonthItem = React.memo(function MonthItem({
  year,
  month,
  selectedDate,
  onDayPress,
  onTitlePress,
  showHolidays,
  colors,
}: MonthItemProps) {
  const s = makeStyles(colors);
  const { events, dueTodos, categories } = useMonthItems(year, month);
  const today = new Date();
  const rawGrid = buildMonthGrid(year, month, today);
  const grid = padTo6Weeks(rawGrid);
  const rows = chunkBy7(grid);

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
      {/* 월 제목 — 탭하면 YearMonthPicker 열림 */}
      <Pressable
        style={s.header}
        onPress={() => onTitlePress(year, month)}
        accessibilityLabel="연월 선택"
        accessibilityRole="button"
      >
        <Text style={s.monthTitle} maxFontSizeMultiplier={1.3}>
          {formatMonthTitle(year, month)}
        </Text>
      </Pressable>

      {/* 요일 헤더 */}
      <View style={s.weekLabelRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text
            key={d}
            style={[s.weekLabel, d === "일" && s.sunday, d === "토" && s.saturday]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* 주(週) 단위 그리드 */}
      <View testID="month-grid">
        {rows.map((weekDays, rowIndex) => {
          const eventBars = computeEventBars(weekDays, events, getCategoryColor);

          return (
            <View key={rowIndex} style={s.weekRow}>
              {/* 날짜 셀 행 */}
              <View style={s.dayCellsRow}>
                {weekDays.map(({ date, isCurrentMonth, isToday }) => {
                  const dayTodos = getTodosForDay(dueTodos, date);
                  const incompleteCount = dayTodos.filter((t) => !t.isCompleted).length;
                  const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
                  const isSun = date.getDay() === 0;
                  const isSat = date.getDay() === 6;
                  const holidayName = isCurrentMonth ? (holidayMap.get(date.getDate()) ?? null) : null;
                  const isHoliday = holidayName !== null;

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
                            !isCurrentMonth && s.outsideMonth,
                            isToday && s.todayText,
                            !isToday && (isSun || isHoliday) && s.sunday,
                            !isToday && isSat && !isHoliday && s.saturday,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                      {incompleteCount > 0 && isCurrentMonth && (
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

              {/* 이벤트 바 레이어 */}
              <View style={s.eventBarsRow}>
                {eventBars.map((bar) => (
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

              {/* 공휴일 레이블 행 */}
              <View style={s.holidayLabelsRow}>
                {weekDays.map(({ date, isCurrentMonth }) => {
                  const name = isCurrentMonth ? (holidayMap.get(date.getDate()) ?? null) : null;
                  return (
                    <Text key={date.toISOString()} style={s.holidayLabel} numberOfLines={1}>
                      {name ?? ""}
                    </Text>
                  );
                })}
              </View>
            </View>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    monthTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text.primary,
    },
    weekLabelRow: {
      flexDirection: "row",
      marginBottom: 2,
    },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "500",
      color: colors.text.secondary,
      paddingVertical: 4,
    },
    sunday: { color: "#D93535" },
    saturday: { color: "#2E5AAC" },
    weekRow: {},
    dayCellsRow: {
      flexDirection: "row",
    },
    dayCell: {
      width: `${100 / 7}%` as `${number}%`,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: {
      fontSize: 14,
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
    holidayLabelsRow: {
      flexDirection: "row",
      marginBottom: 2,
    },
    holidayLabel: {
      flex: 1,
      fontSize: 8,
      color: "#D93535",
      height: 10,
      lineHeight: 10,
      textAlign: "center",
      letterSpacing: -0.3,
    },
  });
