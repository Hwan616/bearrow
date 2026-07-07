import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { YearMonthPicker } from "@/features/calendar/components/YearMonthPicker";
import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { buildMonthGrid, formatMonthTitle, isSameDay } from "../../calendar/utils/calendarUtils";
import type { Todo } from "../types";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"] as const;

interface Props {
  todos: Todo[];
  reschedulingTodo: Todo | null;
  onDatePick: (date: Date) => void;
  onCancelReschedule: () => void;
}

export function TodoMiniCalendar({
  todos,
  reschedulingTodo,
  onDatePick,
  onCancelReschedule,
}: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [pickerVisible, setPickerVisible] = useState(false);

  const { colors } = useTheme();
  const s = makeStyles(colors);

  const grid = buildMonthGrid(year, month, now);

  // 날짜별 미완료 할일 수 (현재 표시 월 기준)
  const todoCounts = useMemo(() => {
    const map = new Map<number, number>(); // day (1-31) → count
    for (const todo of todos) {
      if (
        !todo.isCompleted &&
        todo.dueDate &&
        todo.dueDate.getFullYear() === year &&
        todo.dueDate.getMonth() === month
      ) {
        const day = todo.dueDate.getDate();
        map.set(day, (map.get(day) ?? 0) + 1);
      }
    }
    return map;
  }, [todos, year, month]);

  const goToPrev = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else { setMonth((m) => m - 1); }
  };
  const goToNext = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else { setMonth((m) => m + 1); }
  };

  return (
    <View style={[s.container, reschedulingTodo && s.containerReschedule]}>
      {/* 날짜 이동 배너 */}
      {reschedulingTodo && (
        <View style={s.rescheduleBar}>
          <Text style={s.rescheduleText} numberOfLines={1}>
            <Text style={s.rescheduleTitle}>{`"${reschedulingTodo.title}"`}</Text>
            {" — 새 날짜를 선택하세요"}
          </Text>
          <Pressable
            onPress={onCancelReschedule}
            hitSlop={8}
            accessibilityLabel="날짜 변경 취소"
          >
            <Text style={s.cancelText}>취소</Text>
          </Pressable>
        </View>
      )}

      {/* 헤더: 연월 + 화살표 */}
      <View style={s.header}>
        <Pressable onPress={goToPrev} style={s.navBtn} hitSlop={12} accessibilityLabel="이전 달">
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => setPickerVisible(true)}
          accessibilityLabel="연월 선택"
          accessibilityRole="button"
        >
          <Text style={s.monthTitle}>{formatMonthTitle(year, month)}</Text>
        </Pressable>
        <Pressable onPress={goToNext} style={s.navBtn} hitSlop={12} accessibilityLabel="다음 달">
          <Text style={s.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* 요일 헤더 */}
      <View style={s.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={[s.weekLabel, d === "일" && s.sunColor, d === "토" && s.satColor]}>
            {d}
          </Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={s.grid}>
        {grid.map(({ date, isCurrentMonth, isToday }) => {
          const isSun = date.getDay() === 0;
          const isSat = date.getDay() === 6;
          const count = isCurrentMonth ? (todoCounts.get(date.getDate()) ?? 0) : 0;

          // 날짜 이동 모드에서 현재 대상 할일의 마감일
          const isRescheduleCurrent =
            reschedulingTodo?.dueDate != null && isSameDay(date, reschedulingTodo.dueDate);

          return (
            <Pressable
              key={date.toISOString()}
              style={s.cell}
              onPress={() => onDatePick(date)}
              accessibilityLabel={`${date.getMonth() + 1}월 ${date.getDate()}일${count > 0 ? `, 할일 ${count}개` : ""}`}
            >
              <View
                style={[
                  s.dayCircle,
                  isToday && { backgroundColor: colors.accent.primary },
                  isRescheduleCurrent && !isToday && { backgroundColor: "#FF9800" },
                ]}
              >
                <Text
                  style={[
                    s.dayText,
                    !isCurrentMonth && s.outsideMonth,
                    isToday && s.todayText,
                    !isToday && isSun && s.sunColor,
                    !isToday && isSat && s.satColor,
                    isRescheduleCurrent && !isToday && s.todayText,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              {/* 미완료 할일 수 */}
              {count > 0 && isCurrentMonth ? (
                <Text style={s.countBadge}>{count > 9 ? "9+" : String(count)}</Text>
              ) : (
                <View style={s.countPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>

      <YearMonthPicker
        year={year}
        month={month}
        visible={pickerVisible}
        onSelect={(y, m) => { setYear(y); setMonth(m); }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.primary,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.default,
      paddingHorizontal: 4,
    },
    containerReschedule: {
      borderWidth: 1.5,
      borderColor: "#FF9800",
      borderRadius: 0,
    },
    rescheduleBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: "#FFF8E1",
    },
    rescheduleText: {
      flex: 1,
      fontSize: 12,
      color: "#7B5800",
      marginRight: 8,
    },
    rescheduleTitle: {
      fontWeight: "600",
    },
    cancelText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FF9800",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    navBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    navArrow: {
      fontSize: 24,
      color: colors.text.primary,
      lineHeight: 28,
    },
    monthTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text.primary,
    },
    weekRow: {
      flexDirection: "row",
      marginBottom: 2,
    },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "500",
      color: colors.text.secondary,
      paddingVertical: 2,
    },
    sunColor: { color: colors.text.secondary },
    satColor: { color: colors.text.secondary },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: `${100 / 7}%`,
      alignItems: "center",
      paddingVertical: 2,
      minHeight: 44,
    },
    dayCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: {
      fontSize: 13,
      color: colors.text.primary,
    },
    outsideMonth: {
      color: colors.text.disabled,
    },
    todayText: {
      color: colors.text.inverse,
      fontWeight: "700",
    },
    countBadge: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.status.success,
      lineHeight: 12,
      height: 12,
    },
    countPlaceholder: {
      height: 12,
    },
  });
}
