import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

import { MONTH_VIEW } from "@/config/layout";
import { useTheme } from "@/theme";

import { useDayItems } from "../hooks/useDayItems";
import { useDayScroll } from "../hooks/useDayScroll";
import type { Event } from "../types";
import { layoutTimedEvents } from "../utils/dayLayoutUtils";

// ── 레이아웃 상수 ──────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;
const DATE_HEADER_HEIGHT = 28;
const ALL_DAY_SECTION_HEIGHT = 40;
const TIME_LABEL_WIDTH = 48;
const DAY_ITEM_HEIGHT = DATE_HEADER_HEIGHT + ALL_DAY_SECTION_HEIGHT + HOUR_HEIGHT * 24;
const MIN_EVENT_HEIGHT = 28;
const EVENT_AREA_LEFT = TIME_LABEL_WIDTH + 4;
const EVENT_AREA_RIGHT = 8;
const COLUMN_GAP = 3; // 겹친 이벤트 컬럼 사이 간격
const EVENT_OPACITY = MONTH_VIEW.eventBarOpacity;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const FULL_DAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;
const SHORT_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function formatDayHeaderTitle(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${FULL_DAYS[date.getDay()]}`;
}

// 타임라인 상단 날짜 레이블: "YYYY.MM.DD.(W)"
export function formatDayDateLabel(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}.(${SHORT_DAYS[date.getDay()]})`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ── DayView ───────────────────────────────────────────────────────────────────

interface DayViewProps {
  initialDate: Date;
  onEventPress?: (event: Event) => void;
  onDateChange?: (date: Date) => void;
}

export function DayView({ initialDate, onEventPress, onDateChange }: DayViewProps) {
  const { colors } = useTheme();
  const { dates, initialIndex, visibleDate, onVisibleDateChange } = useDayScroll(initialDate);
  const listRef = useRef<FlatList<Date>>(null);
  const s = makeStyles(colors);

  // onVisibleDateChange는 useState setter로 안정적이지만,
  // onViewableItemsChanged ref 생성 시 최신 참조를 확보하기 위해 ref로 래핑
  const onVisibleDateChangeRef = useRef(onVisibleDateChange);
  onVisibleDateChangeRef.current = onVisibleDateChange;

  // 외부에 현재 보이는 날짜 전파 (투두 시트 날짜 동기화)
  const onDateChangeRef = useRef(onDateChange);
  onDateChangeRef.current = onDateChange;
  useEffect(() => {
    onDateChangeRef.current?.(visibleDate);
  }, [visibleDate]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.item) {
        onVisibleDateChangeRef.current(first.item as Date);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // 초기 스크롤: 현재 시각(오늘) 또는 오전 8시(다른 날) 기준
  useEffect(() => {
    const now = new Date();
    const isToday = now.toDateString() === initialDate.toDateString();
    const startHour = isToday ? Math.max(0, now.getHours() - 1) : 7;
    const offset =
      initialIndex * DAY_ITEM_HEIGHT +
      DATE_HEADER_HEIGHT +
      ALL_DAY_SECTION_HEIGHT +
      startHour * HOUR_HEIGHT;

    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: Math.max(0, offset), animated: false });
    }, 0);

    return () => clearTimeout(id);
  }, [initialIndex, initialDate]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: DAY_ITEM_HEIGHT,
      offset: DAY_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Date }) => (
      <DayTimelineItem date={item} onEventPress={onEventPress} colors={colors} />
    ),
    [onEventPress, colors],
  );

  const keyExtractor = useCallback((date: Date) => date.toISOString(), []);

  return (
    <View style={s.container} testID="day-view">
      <FlatList<Date>
        ref={listRef}
        data={dates}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 72 }}
        testID="day-list"
      />
    </View>
  );
}

// ── DayTimelineItem ───────────────────────────────────────────────────────────

interface DayTimelineItemProps {
  date: Date;
  onEventPress?: (event: Event) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}

const DayTimelineItem = React.memo(function DayTimelineItem({
  date,
  onEventPress,
  colors,
}: DayTimelineItemProps) {
  const { events, categories, isLoading } = useDayItems(date);
  const s = makeStyles(colors);

  // 카테고리 색상 조회 (없으면 accent.primary)
  const categoryColorMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c.color])),
    [categories],
  );
  const getCategoryColor = useCallback(
    (categoryId: string | null | undefined): string =>
      (categoryId ? categoryColorMap.get(categoryId) : undefined) ?? colors.accent.primary,
    [categoryColorMap, colors.accent.primary],
  );

  const allDayEvents = useMemo(() => events.filter((e) => e.isAllDay), [events]);
  const timedLayout = useMemo(
    () => layoutTimedEvents(events.filter((e) => !e.isAllDay)),
    [events],
  );

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const currentTimeTop = isToday
    ? (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
    : null;

  return (
    <View style={[s.dayItem, { borderBottomColor: colors.border.default }]} testID={`day-item-${date.toDateString()}`}>
      {/* 날짜 레이블 */}
      <View style={[s.dateHeader, { borderBottomColor: colors.border.default }]}>
        <Text style={s.dateHeaderText}>{formatDayDateLabel(date)}</Text>
      </View>

      {/* 종일 이벤트 */}
      <View style={[s.allDaySection, { borderBottomColor: colors.border.default }]}>
        <Text style={s.allDayLabel}>종일</Text>
        <View style={s.allDayEvents}>
          {allDayEvents.map((e) => (
            <AllDayEventBar
              key={e.id}
              event={e}
              color={getCategoryColor(e.categoryId)}
              colors={colors}
              onPress={onEventPress}
            />
          ))}
        </View>
      </View>

      {/* 시간 그리드 */}
      <View style={s.hourGrid}>
        {/* 시간 레이블 + 가로 구분선 */}
        {HOURS.map((h) => (
          <View key={h} style={[s.hourRow, { top: h * HOUR_HEIGHT }]}>
            <Text style={s.hourLabel}>{h === 0 ? "" : `${h}`}</Text>
            <View style={[s.hourLine, { backgroundColor: colors.border.default }]} />
          </View>
        ))}

        {/* 현재 시각 표시선 */}
        {currentTimeTop !== null && (
          <View style={[s.currentTimeLine, { top: currentTimeTop, backgroundColor: colors.status.error }]}>
            <View style={[s.currentTimeDot, { backgroundColor: colors.status.error }]} />
          </View>
        )}

        {/* 시간 이벤트 블록 (겹침 컬럼 배치) */}
        {!isLoading && (
          <View style={s.eventArea}>
            {timedLayout.map(({ event, colIndex, colCount }) => (
              <EventBlock
                key={event.id}
                event={event}
                colIndex={colIndex}
                colCount={colCount}
                color={getCategoryColor(event.categoryId)}
                colors={colors}
                onPress={onEventPress}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

// ── AllDayEventBar ────────────────────────────────────────────────────────────

function AllDayEventBar({
  event,
  color,
  colors,
  onPress,
}: {
  event: Event;
  color: string;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress?: (event: Event) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(event)}
      style={{
        borderRadius: 3,
        overflow: "hidden",
        marginRight: 4,
        marginBottom: 2,
      }}
      accessibilityLabel={event.title}
      accessibilityRole="button"
    >
      {/* 배경(불투명도) — 글씨는 불투명 유지 */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color, opacity: EVENT_OPACITY }]} />
      <Text
        style={{
          fontSize: 11,
          color: colors.text.primary,
          fontWeight: "600",
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
        numberOfLines={1}
      >
        {event.title}
      </Text>
    </Pressable>
  );
}

// ── EventBlock ────────────────────────────────────────────────────────────────

function EventBlock({
  event,
  colIndex,
  colCount,
  color,
  colors,
  onPress,
}: {
  event: Event;
  colIndex: number;
  colCount: number;
  color: string;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress?: (event: Event) => void;
}) {
  const startMinutes = event.startsAt.getHours() * 60 + event.startsAt.getMinutes();
  const endMinutes = event.endsAt.getHours() * 60 + event.endsAt.getMinutes();
  const durationMinutes = Math.max(30, endMinutes - startMinutes);

  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);

  const leftPct = (colIndex / colCount) * 100;
  const widthPct = (1 / colCount) * 100;

  return (
    <Pressable
      onPress={() => onPress?.(event)}
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        top,
        height,
      }}
      accessibilityLabel={event.title}
      accessibilityRole="button"
    >
      <View style={{ flex: 1, marginRight: COLUMN_GAP, borderRadius: 4, overflow: "hidden" }}>
        {/* 배경(불투명도) — 글씨는 불투명 유지 */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color, opacity: EVENT_OPACITY }]} />
        <View style={{ padding: 4 }}>
          <Text
            style={{ fontSize: 11, fontWeight: "600", color: colors.text.primary }}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {height >= 34 && (
            <Text style={{ fontSize: 10, color: colors.text.secondary }} numberOfLines={1}>
              {formatTime(event.startsAt)}–{formatTime(event.endsAt)}
            </Text>
          )}
        </View>
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
    dayItem: {
      height: DAY_ITEM_HEIGHT,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dateHeader: {
      height: DATE_HEADER_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dateHeaderText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text.primary,
    },
    allDaySection: {
      height: ALL_DAY_SECTION_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    allDayLabel: {
      width: TIME_LABEL_WIDTH - 8,
      fontSize: 10,
      color: colors.text.secondary,
      textAlign: "right",
    },
    allDayEvents: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      marginLeft: 8,
    },
    hourGrid: {
      height: HOUR_HEIGHT * 24,
      position: "relative",
    },
    eventArea: {
      position: "absolute",
      left: EVENT_AREA_LEFT,
      right: EVENT_AREA_RIGHT,
      top: 0,
      bottom: 0,
    },
    hourRow: {
      position: "absolute",
      left: 0,
      right: 0,
      height: HOUR_HEIGHT,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    hourLabel: {
      width: TIME_LABEL_WIDTH - 8,
      textAlign: "right",
      fontSize: 10,
      color: colors.text.secondary,
      marginTop: -7,
      paddingRight: 4,
    },
    hourLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    currentTimeLine: {
      position: "absolute",
      left: TIME_LABEL_WIDTH,
      right: 0,
      height: 2,
      zIndex: 10,
    },
    currentTimeDot: {
      position: "absolute",
      left: -4,
      top: -3,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
