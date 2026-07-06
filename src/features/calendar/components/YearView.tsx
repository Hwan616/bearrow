import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { useYearData } from "../hooks/useYearData";
import type { CalendarDay } from "../utils/calendarUtils";

const DAYS_SHORT = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
] as const;

interface Props {
  initialYear?: number;
  onMonthPress: (year: number, month: number) => void;
}

export function YearView({ initialYear, onMonthPress }: Props) {
  const { year, months, goToPrevYear, goToNextYear } = useYearData(initialYear);
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const today = new Date();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 연도 내비게이션 헤더 */}
      <View style={s.yearHeader}>
        <Pressable
          testID="btn-prev-year"
          onPress={goToPrevYear}
          style={s.yearNavBtn}
          hitSlop={12}
          accessibilityLabel="이전 연도"
          accessibilityRole="button"
        >
          <Text style={s.yearNavArrow}>‹</Text>
        </Pressable>
        <Text style={s.yearTitle}>{year}년</Text>
        <Pressable
          testID="btn-next-year"
          onPress={goToNextYear}
          style={s.yearNavBtn}
          hitSlop={12}
          accessibilityLabel="다음 연도"
          accessibilityRole="button"
        >
          <Text style={s.yearNavArrow}>›</Text>
        </Pressable>
      </View>

      {/* 12개월 그리드 (3열 × 4행) */}
      <View style={s.monthsGrid}>
        {months.map(({ month, grid }) => {
          const isCurrentMonth =
            today.getFullYear() === year && today.getMonth() === month;
          return (
            <Pressable
              key={month}
              testID={`year-month-${month}`}
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
    </ScrollView>
  );
}

interface MiniMonthGridProps {
  grid: CalendarDay[];
  s: ReturnType<typeof makeStyles>;
}

function MiniMonthGrid({ grid, s }: MiniMonthGridProps) {
  return (
    <>
      {/* 요일 헤더 */}
      <View style={s.miniWeekRow}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={s.miniWeekLabel}>
            {d}
          </Text>
        ))}
      </View>
      {/* 날짜 그리드 */}
      <View style={s.miniGrid}>
        {grid.map(({ date, isCurrentMonth, isToday }) => {
          const isSun = date.getDay() === 0;
          return (
            <View key={date.toISOString()} style={s.miniCell}>
              <View style={[s.miniDayCircle, isToday && s.miniDayCircleToday]}>
                <Text
                  style={[
                    s.miniDayText,
                    !isCurrentMonth && s.miniDayTextOutside,
                    isToday && s.miniDayTextToday,
                    !isToday && isSun && isCurrentMonth && s.miniDayTextSun,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    scrollContent: {
      paddingBottom: 24,
    },

    // 연도 헤더
    yearHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      gap: 24,
    },
    yearNavBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    yearNavArrow: {
      fontSize: 28,
      lineHeight: 32,
      color: colors.text.primary,
    },
    yearTitle: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: colors.text.primary,
    },

    // 12개월 그리드
    monthsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 8,
    },
    miniMonthWrapper: {
      width: "33.33%",
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    miniMonthTitle: {
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 4,
      color: colors.text.primary,
    },
    miniMonthTitleCurrent: {
      color: colors.accent.primary,
    },

    // 미니 월 그리드
    miniWeekRow: {
      flexDirection: "row",
    },
    miniWeekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 8,
      fontWeight: "500",
      color: colors.text.secondary,
    },
    miniGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    miniCell: {
      width: `${100 / 7}%`,
      alignItems: "center",
      paddingVertical: 1,
    },
    miniDayCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    miniDayCircleToday: {
      backgroundColor: colors.accent.primary,
    },
    miniDayText: {
      fontSize: 9,
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
      color: "#D93535",
    },
  });
}
