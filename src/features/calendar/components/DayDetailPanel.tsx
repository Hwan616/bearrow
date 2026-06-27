import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Todo } from "@/features/todo/types";
import { useTheme } from "@/theme";

import { type Event } from "../types";
import { useDayItems } from "../hooks/useDayItems";

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
}

export function DayDetailPanel({ date, onEventPress }: Props) {
  const { colors } = useTheme();
  const { events, todos, isLoading } = useDayItems(date);
  const s = makeStyles(colors);

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events
    .filter((e) => !e.isAllDay)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const total = events.length + todos.length;

  return (
    <View style={s.container}>
      {/* 날짜 헤더 */}
      <View style={[s.dateHeader, { borderBottomColor: colors.border.default }]}>
        <Text style={s.dateTitle}>{formatDayTitle(date)}</Text>
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
                <TodoRow key={t.id} todo={t} colors={colors} />
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
}

function TodoRow({ todo, colors }: TodoRowProps) {
  const s = makeStyles(colors);
  return (
    <View style={s.row}>
      <View
        style={[
          s.todoCircle,
          todo.isCompleted && { backgroundColor: colors.status.success, borderColor: colors.status.success },
        ]}
      >
        {todo.isCompleted && <Text style={s.checkMark}>✓</Text>}
      </View>
      <View style={s.rowContent}>
        <Text
          style={[s.rowTitle, todo.isCompleted && { textDecorationLine: "line-through", color: colors.text.disabled }]}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </View>
    </View>
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
    dateTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text.primary,
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
