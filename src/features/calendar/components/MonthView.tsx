import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

import { useMonthEvents } from "../hooks/useMonthEvents";
import { type Event } from "../types";
import {
  buildMonthGrid,
  formatMonthTitle,
  getEventsForDay,
  isSameDay,
} from "../utils/calendarUtils";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MAX_DOTS = 3;

interface MonthViewProps {
  initialDate?: Date;
  onDayPress?: (date: Date, events: Event[]) => void;
}

export function MonthView({ initialDate, onDayPress }: MonthViewProps) {
  const base = initialDate ?? new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { colors } = useTheme();
  const { events } = useMonthEvents(year, month);
  const today = new Date();
  const grid = buildMonthGrid(year, month, today);

  const goToPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    onDayPress?.(date, getEventsForDay(events, date));
  };

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable onPress={goToPrev} style={s.navBtn} hitSlop={12}>
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Text style={s.monthTitle}>{formatMonthTitle(year, month)}</Text>
        <Pressable onPress={goToNext} style={s.navBtn} hitSlop={12}>
          <Text style={s.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* 요일 헤더 */}
      <View style={s.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text
            key={d}
            style={[s.weekLabel, d === "일" && s.sunday, d === "토" && s.saturday]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={s.grid}>
        {grid.map(({ date, isCurrentMonth, isToday }) => {
          const dayEvents = getEventsForDay(events, date);
          const isSelected = selectedDate != null && isSameDay(date, selectedDate);
          const isSun = date.getDay() === 0;
          const isSat = date.getDay() === 6;

          return (
            <Pressable
              key={date.toISOString()}
              style={s.cell}
              onPress={() => handleDayPress(date)}
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
                    !isToday && isSun && s.sunday,
                    !isToday && isSat && s.saturday,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>

              {/* 이벤트 점 */}
              <View style={s.dots}>
                {dayEvents.slice(0, MAX_DOTS).map((e) => (
                  <View
                    key={e.id}
                    style={[s.dot, { backgroundColor: colors.accent.primary }]}
                  />
                ))}
              </View>
            </Pressable>
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
    weekRow: {
      flexDirection: "row",
      marginBottom: 4,
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
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: `${100 / 7}%`,
      alignItems: "center",
      paddingVertical: 2,
      minHeight: 44, // 터치 타깃 최소 44pt (UI-003)
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
    dots: {
      flexDirection: "row",
      gap: 2,
      height: 6,
      marginTop: 1,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
  });
