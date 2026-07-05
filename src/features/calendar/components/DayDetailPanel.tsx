import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppSettings } from "@/features/settings/AppSettingsContext";
import { toggleTodo } from "@/features/todo/api/todos";
import type { Todo } from "@/features/todo/types";
import { useTheme } from "@/theme";

import { useDayItems } from "../hooks/useDayItems";
import { type Event } from "../types";
import { getHolidayName } from "../utils/koreanHolidays";

const SHORT_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatDayTitle(date: Date): string {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const suffix = isToday ? " (오늘)" : "";
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${SHORT_DAYS[date.getDay()]})${suffix}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface Props {
  date: Date;
  onEventPress?: (event: Event) => void;
  onEditTodo?: (todo: Todo) => void;
}

export function DayDetailPanel({ date, onEventPress, onEditTodo }: Props) {
  const { colors } = useTheme();
  const { showHolidays } = useAppSettings();
  const { events, todos, isLoading, refresh } = useDayItems(date);
  const holidayName = showHolidays ? getHolidayName(date) : null;
  const s = makeStyles(colors);

  async function handleTodoToggle(todo: Todo) {
    await toggleTodo(todo.id, !todo.isCompleted);
    refresh();
  }

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events
    .filter((e) => !e.isAllDay)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const total = events.length + todos.length;

  return (
    <View style={s.container}>
      {/* 날짜 헤더 */}
      <View style={[s.dateHeader, { borderBottomColor: colors.border.default }]}>
        <View style={s.dateHeaderRow}>
          <Text style={s.dateTitle}>{formatDayTitle(date)}</Text>
          {holidayName && (
            <View style={s.holidayBadge}>
              <Text style={s.holidayBadgeText}>{holidayName}</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Text style={s.emptyText}>불러오는 중…</Text>
        </View>
      ) : total === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>이 날의 일정·할일이 없습니다.</Text>
        </View>
      ) : (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {/* 종일 이벤트 */}
          {allDayEvents.map((e) => (
            <EventRow key={e.id} event={e} colors={colors} onPress={onEventPress} />
          ))}

          {/* 시간 이벤트 */}
          {timedEvents.map((e) => (
            <EventRow key={e.id} event={e} colors={colors} onPress={onEventPress} />
          ))}

          {/* 할일 구분선 */}
          {todos.length > 0 && events.length > 0 && (
            <View style={[s.divider, { backgroundColor: colors.border.default }]} />
          )}

          {/* 할일 목록 */}
          {todos.length > 0 && (
            <>
              <Text style={s.sectionLabel}>할일</Text>
              {todos.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  colors={colors}
                  onToggle={() => void handleTodoToggle(t)}
                  onEdit={onEditTodo ? () => onEditTodo(t) : undefined}
                />
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── EventRow ──────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: Event;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress?: (event: Event) => void;
}

function EventRow({ event, colors, onPress }: EventRowProps) {
  const s = makeStyles(colors);
  return (
    <Pressable style={s.row} onPress={() => onPress?.(event)}>
      <View style={[s.eventBar, { backgroundColor: colors.accent.primary }]} />
      <View style={s.rowContent}>
        {event.isAllDay ? (
          <Text style={s.timeLabel}>종일</Text>
        ) : (
          <Text style={s.timeLabel}>
            {formatTime(event.startsAt)}–{formatTime(event.endsAt)}
          </Text>
        )}
        <Text style={s.rowTitle} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
    </Pressable>
  );
}

// ── TodoRow ───────────────────────────────────────────────────────────────────

interface TodoRowProps {
  todo: Todo;
  colors: ReturnType<typeof useTheme>["colors"];
  onToggle?: () => void;
  onEdit?: () => void;
}

function TodoRow({ todo, colors, onToggle, onEdit }: TodoRowProps) {
  const s = makeStyles(colors);
  return (
    <Pressable style={s.row} onPress={onEdit} accessibilityLabel={`${todo.title} 편집`}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.isCompleted }}
        accessibilityLabel={todo.isCompleted ? "완료 취소" : "완료"}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View
          style={[
            s.todoCircle,
            todo.isCompleted && { backgroundColor: colors.status.success, borderColor: colors.status.success },
          ]}
        >
          {todo.isCompleted && <Text style={s.checkMark}>✓</Text>}
        </View>
      </Pressable>
      <View style={s.rowContent}>
        <Text
          style={[s.rowTitle, todo.isCompleted && { textDecorationLine: "line-through", color: colors.text.disabled }]}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </View>
    </Pressable>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    dateHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dateHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dateTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text.primary,
    },
    holidayBadge: {
      backgroundColor: "#FFF0F0",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    holidayBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#D93535",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 14,
      color: colors.text.disabled,
    },
    list: {
      flex: 1,
      paddingHorizontal: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text.secondary,
      marginTop: 4,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      gap: 10,
    },
    eventBar: {
      width: 3,
      height: 36,
      borderRadius: 2,
    },
    rowContent: {
      flex: 1,
    },
    timeLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      marginBottom: 1,
    },
    rowTitle: {
      fontSize: 15,
      color: colors.text.primary,
    },
    todoCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border.default,
      alignItems: "center",
      justifyContent: "center",
    },
    checkMark: {
      fontSize: 12,
      color: "#fff",
      fontWeight: "700",
    },
  });
