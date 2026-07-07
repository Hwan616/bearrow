import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { YEAR_VIEW } from "@/config/layout";
import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { buildMonthGrid } from "../utils/calendarUtils";
import type { CalendarDay } from "../utils/calendarUtils";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
] as const;

// ── 레이아웃 상수 ──────────────────────────────────────────────────────────────
// iOS 시스템 폰트 lineHeight 계수 ≈ 1.32
// YEAR_VIEW 상수 변경 시 아래 파생 값들이 자동 재계산됨
const MINI_CELL_HEIGHT = 2 + YEAR_VIEW.dayCircleSize;      // paddingVertical:1×2 + circle
const MINI_TITLE_HEIGHT = Math.round(YEAR_VIEW.monthTitleSize * 1.32) + 4; // lineHeight + marginBottom
const FIXED_MINI_ROWS = 6;
const MINI_MONTH_HEIGHT =
  YEAR_VIEW.monthPaddingV * 2 + MINI_TITLE_HEIGHT + FIXED_MINI_ROWS * MINI_CELL_HEIGHT;
const YEAR_HEADER_HEIGHT = 76;     // paddingVertical:16×2 + fontSize:29 lineHeight≈38 + divider-margin:6
const YEAR_ITEM_HEIGHT = YEAR_HEADER_HEIGHT + 4 * MINI_MONTH_HEIGHT;

const YEAR_WINDOW = 21; // ±10 years

function generateYearList(initialYear: number): number[] {
  const half = Math.floor(YEAR_WINDOW / 2);
  return Array.from({ length: YEAR_WINDOW }, (_, i) => initialYear + (i - half));
}

function padMiniGridTo6Rows(grid: CalendarDay[]): CalendarDay[] {
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

// ── YearView ──────────────────────────────────────────────────────────────────

interface Props {
  initialYear?: number;
  onMonthPress: (year: number, month: number) => void;
}

export function YearView({ initialYear, onMonthPress }: Props) {
  const { colors } = useTheme();
  const today = useMemo(() => new Date(), []);

  const baseYear = initialYear ?? today.getFullYear();
  const years = useRef(generateYearList(baseYear)).current;
  const initialIndex = Math.floor(YEAR_WINDOW / 2);

  const listRef = useRef<FlatList<number>>(null);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: YEAR_ITEM_HEIGHT,
      offset: YEAR_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item: year }: { item: number }) => (
      <YearItem
        year={year}
        today={today}
        onMonthPress={onMonthPress}
        colors={colors}
      />
    ),
    [onMonthPress, colors, today],
  );

  const keyExtractor = useCallback((year: number) => String(year), []);

  useEffect(() => {
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: initialIndex * YEAR_ITEM_HEIGHT,
        animated: false,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [initialIndex]);

  return (
    <FlatList<number>
      ref={listRef}
      data={years}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      initialScrollIndex={initialIndex}
      windowSize={3}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      testID="year-list"
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

// ── YearItem ──────────────────────────────────────────────────────────────────

interface YearItemProps {
  year: number;
  today: Date;
  onMonthPress: (year: number, month: number) => void;
  colors: ColorTokens;
}

const YearItem = React.memo(function YearItem({
  year,
  today,
  onMonthPress,
  colors,
}: YearItemProps) {
  const s = makeStyles(colors);

  return (
    <View testID={`year-item-${year}`} style={{ height: YEAR_ITEM_HEIGHT }}>
      <View style={s.yearHeader}>
        <Text style={[s.yearTitle, year === today.getFullYear() && s.yearTitleCurrent]}>
          {year}년
        </Text>
        <View style={s.yearDivider} />
      </View>
      <View style={s.monthsGrid}>
        {Array.from({ length: 12 }, (_, month) => {
          const rawGrid = buildMonthGrid(year, month);
          const grid = padMiniGridTo6Rows(rawGrid);
          const isCurrentMonth =
            today.getFullYear() === year && today.getMonth() === month;

          return (
            <Pressable
              key={month}
              testID={`year-month-${year}-${month}`}
              style={s.miniMonthWrapper}
              onPress={() => onMonthPress(year, month)}
              accessibilityLabel={`${year}년 ${month + 1}월`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  s.miniMonthTitle,
                  isCurrentMonth && s.miniMonthTitleCurrent,
                ]}
              >
                {MONTH_NAMES[month]}
              </Text>
              <MiniMonthGrid grid={grid} s={s} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

// ── MiniMonthGrid ─────────────────────────────────────────────────────────────

interface MiniMonthGridProps {
  grid: CalendarDay[];
  s: ReturnType<typeof makeStyles>;
}

function MiniMonthGrid({ grid, s }: MiniMonthGridProps) {
  const rows: CalendarDay[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }
  return (
    <View>
      {rows.map((week, wi) => (
        <View key={wi} style={s.miniRow}>
          {week.map(({ date, isCurrentMonth, isToday }) => {
            if (!isCurrentMonth) {
              return <View key={date.toISOString()} style={s.miniCell} />;
            }
            const isSun = date.getDay() === 0;
            return (
              <View key={date.toISOString()} style={s.miniCell}>
                <View style={[s.miniDayCircle, isToday && s.miniDayCircleToday]}>
                  <Text
                    style={[
                      s.miniDayText,
                      isToday && s.miniDayTextToday,
                      !isToday && isSun && s.miniDayTextSun,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    yearHeader: {
      alignItems: "stretch",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    yearTitle: {
      fontSize: 29,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: colors.text.primary,
    },
    yearTitleCurrent: {
      color: colors.status.error,
    },
    yearDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.default,
      marginTop: 6,
    },
    monthsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: YEAR_VIEW.outerPaddingH,
    },
    miniMonthWrapper: {
      width: "33.33%",
      paddingHorizontal: YEAR_VIEW.monthPaddingH,
      paddingVertical: YEAR_VIEW.monthPaddingV,
    },
    miniMonthTitle: {
      fontSize: YEAR_VIEW.monthTitleSize,
      fontWeight: "700",
      textAlign: "left",
      marginBottom: 4,
      color: colors.text.primary,
    },
    miniMonthTitleCurrent: {
      color: colors.status.error,
    },
    miniRow: {
      flexDirection: "row",
    },
    miniCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 1,
    },
    miniDayCircle: {
      width: YEAR_VIEW.dayCircleSize,
      height: YEAR_VIEW.dayCircleSize,
      borderRadius: YEAR_VIEW.dayCircleSize / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    miniDayCircleToday: {
      backgroundColor: colors.status.error,
    },
    miniDayText: {
      fontSize: YEAR_VIEW.dayTextSize,
      color: colors.text.primary,
    },
    miniDayTextOutside: {
      color: colors.text.disabled,
    },
    miniDayTextToday: {
      color: colors.text.inverse,
      fontWeight: "700",
    },
    miniDayTextSun: {
      color: colors.text.secondary,
    },
  });
}
