import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

interface EventBarData {
  eventId: string;
  title: string;
  color: string;
  startCol: number; // 0–6
  endCol: number;   // 0–6
  track: number;    // 0 or 1
}

interface MonthViewProps {
  initialDate?: Date;
  onDayPress?: (date: Date) => void;
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
    // day.date is midnight; dayEnd is end-of-day
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
    if (track === -1) continue; // all tracks occupied, skip

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

export function MonthView({ initialDate, onDayPress }: MonthViewProps) {
  const base = initialDate ?? new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const { colors } = useTheme();
  const { showHolidays } = useAppSettings();
  const { events, dueTodos, categories } = useMonthItems(year, month);
  const today = new Date();
  const grid = buildMonthGrid(year, month, today);
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

  const goToPrev = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const goToNext = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    onDayPress?.(date);
  };

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable
          onPress={goToPrev}
          style={s.navBtn}
          hitSlop={12}
          accessibilityLabel="이전 달"
          accessibilityRole="button"
        >
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => setPickerVisible(true)}
          accessibilityLabel="연월 선택"
          accessibilityRole="button"
        >
          <Text style={s.monthTitle} maxFontSizeMultiplier={1.3}>
            {formatMonthTitle(year, month)}
          </Text>
        </Pressable>
        <Pressable
          onPress={goToNext}
          style={s.navBtn}
          hitSlop={12}
          accessibilityLabel="다음 달"
          accessibilityRole="button"
        >
          <Text style={s.navArrow}>›</Text>
        </Pressable>
      </View>

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

      <YearMonthPicker
        year={year}
        month={month}
        visible={pickerVisible}
        onSelect={(y, m) => { setYear(y); setMonth(m); }}
        onClose={() => setPickerVisible(false)}
      />

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
                      onPress={() => handleDayPress(date)}
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
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.primary,
      paddingHorizontal: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    navBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    navArrow: {
      fontSize: 28,
      color: colors.text.primary,
      lineHeight: 32,
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
    weekRow: {
      // each week row contains: day cells + event bars + holiday labels
    },
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
