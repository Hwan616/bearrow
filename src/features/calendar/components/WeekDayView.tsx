import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/theme";

import { useWeekEvents } from "../hooks/useWeekEvents";
import { type Event } from "../types";
import {
  buildWeekDays,
  durationToHeight,
  formatHour,
  formatWeekDayHeader,
  getAllDayEvents,
  getTimedEvents,
  HOUR_HEIGHT,
  HOURS,
  TIME_LABEL_WIDTH,
} from "../utils/timeGridUtils";

type ViewMode = "week" | "day";
const SHORT_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

interface WeekDayViewProps {
  initialDate?: Date;
  onEventPress?: (event: Event) => void;
  onDayPress?: (date: Date) => void;
}

export function WeekDayView({
  initialDate,
  onEventPress,
  onDayPress,
}: WeekDayViewProps) {
  const [mode, setMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(initialDate ?? new Date());
  const scrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const { events } = useWeekEvents(anchorDate);
  const today = useMemo(() => new Date(), []);

  const weekDays = useMemo(() => buildWeekDays(anchorDate, today), [anchorDate, today]);
  const displayDays = mode === "week" ? weekDays : [{ date: anchorDate, isToday: false }];

  // 현재 시각으로 스크롤
  const handleScrollReady = () => {
    const hour = new Date().getHours();
    scrollRef.current?.scrollTo({
      y: Math.max(0, (hour - 1) * HOUR_HEIGHT),
      animated: false,
    });
  };

  const shiftDate = (delta: number) => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + delta);
    setAnchorDate(d);
  };

  const goToPrev = () => shiftDate(mode === "week" ? -7 : -1);
  const goToNext = () => shiftDate(mode === "week" ? 7 : 1);

  const navTitle =
    mode === "week"
      ? `${weekDays[0]!.date.getMonth() + 1}월 ${weekDays[0]!.date.getDate()}일 — ${weekDays[6]!.date.getMonth() + 1}월 ${weekDays[6]!.date.getDate()}일`
      : `${anchorDate.getFullYear()}년 ${anchorDate.getMonth() + 1}월 ${anchorDate.getDate()}일 (${SHORT_DAYS[anchorDate.getDay()]})`;

  const s = makeStyles(colors);

  // 현재 시각 표시선 위치
  const now = new Date();
  const nowOffset = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;

  return (
    <View style={s.container}>
      {/* 뷰 전환 토글 */}
      <View style={s.toggleRow}>
        {(["week", "day"] as ViewMode[]).map((m) => (
          <Pressable
            key={m}
            style={[s.toggleBtn, mode === m && s.toggleBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>
              {m === "week" ? "주" : "일"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 탐색 헤더 */}
      <View style={s.navRow}>
        <Pressable onPress={goToPrev} style={s.navBtn} hitSlop={12}>
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Text style={s.navTitle}>{navTitle}</Text>
        <Pressable onPress={goToNext} style={s.navBtn} hitSlop={12}>
          <Text style={s.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* 날짜 컬럼 헤더 */}
      <View style={s.dayHeaderRow}>
        <View style={{ width: TIME_LABEL_WIDTH }} />
        {displayDays.map(({ date, isToday }) => {
          const { short, date: dateNum } = formatWeekDayHeader(date);
          const isSun = date.getDay() === 0;
          const isSat = date.getDay() === 6;
          return (
            <Pressable
              key={date.toISOString()}
              style={s.dayHeaderCell}
              onPress={() => onDayPress?.(date)}
            >
              <Text style={[s.dayShort, isSun && s.sunday, isSat && s.saturday]}>
                {short}
              </Text>
              <View style={[s.dayCircle, isToday && { backgroundColor: colors.accent.primary }]}>
                <Text style={[s.dayNum, isToday && s.dayNumToday]}>
                  {dateNum}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 종일 이벤트 행 */}
      <View style={s.allDayRow}>
        <View style={[s.allDayLabel, { width: TIME_LABEL_WIDTH }]}>
          <Text style={s.allDayLabelText}>종일</Text>
        </View>
        {displayDays.map(({ date }) => {
          const dayAllDay = getAllDayEvents(events, date);
          return (
            <View key={date.toISOString()} style={s.allDayCell}>
              {dayAllDay.slice(0, 2).map((e) => (
                <Pressable
                  key={e.id}
                  style={s.allDayChip}
                  onPress={() => onEventPress?.(e)}
                >
                  <Text style={s.allDayChipText} numberOfLines={1}>
                    {e.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </View>

      {/* 타임 그리드 */}
      <ScrollView
        ref={scrollRef}
        onLayout={handleScrollReady}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", height: 24 * HOUR_HEIGHT }}>
          {/* 시간 레이블 */}
          <View style={{ width: TIME_LABEL_WIDTH }}>
            {HOURS.map((h) => (
              <View key={h} style={[s.hourRow, { height: HOUR_HEIGHT }]}>
                {h > 0 && (
                  <Text style={s.hourLabel}>{formatHour(h)}</Text>
                )}
              </View>
            ))}
          </View>

          {/* 날짜 컬럼들 */}
          <View style={{ flex: 1, flexDirection: "row" }}>
            {displayDays.map(({ date }, colIdx) => {
              const timedEvts = getTimedEvents(events, date);
              return (
                <View key={date.toISOString()} style={s.dayColumn}>
                  {/* 시간 구분선 */}
                  {HOURS.map((h) => (
                    <View
                      key={h}
                      style={[
                        s.hourLine,
                        { top: h * HOUR_HEIGHT },
                        colIdx > 0 && h === 0 && s.columnDivider,
                      ]}
                    />
                  ))}

                  {/* 이벤트 블록 */}
                  {timedEvts.map((e) => {
                    const top = (e.startsAt.getHours() + e.startsAt.getMinutes() / 60) * HOUR_HEIGHT;
                    const height = durationToHeight(e.startsAt, e.endsAt);
                    return (
                      <Pressable
                        key={e.id}
                        style={[
                          s.eventBlock,
                          {
                            top,
                            height,
                            backgroundColor: colors.accent.primaryLight,
                            borderLeftColor: colors.accent.primary,
                          },
                        ]}
                        onPress={() => onEventPress?.(e)}
                      >
                        <Text style={s.eventTitle} numberOfLines={2}>
                          {e.title}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {/* 현재 시각 표시선 (오늘 컬럼만) */}
                  {displayDays[colIdx]?.isToday && (
                    <View style={[s.nowLine, { top: nowOffset }]}>
                      <View style={s.nowDot} />
                      <View style={s.nowLineBar} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },

    // 토글
    toggleRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    toggleBtn: {
      paddingHorizontal: 20,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    toggleBtnActive: {
      backgroundColor: colors.accent.primary,
      borderColor: colors.accent.primary,
    },
    toggleText: { fontSize: 14, color: colors.text.secondary },
    toggleTextActive: { color: colors.text.inverse, fontWeight: "600" },

    // 탐색
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    navBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
    navArrow: { fontSize: 28, color: colors.text.primary, lineHeight: 32 },
    navTitle: { fontSize: 14, fontWeight: "600", color: colors.text.primary },

    // 날짜 헤더
    dayHeaderRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: colors.border.default,
      paddingBottom: 4,
    },
    dayHeaderCell: { flex: 1, alignItems: "center", minHeight: 44, justifyContent: "center" },
    dayShort: { fontSize: 11, color: colors.text.secondary },
    sunday: { color: colors.status.error },
    saturday: { color: "#2E5AAC" },
    dayCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    dayNum: { fontSize: 14, color: colors.text.primary },
    dayNumToday: { color: colors.text.inverse, fontWeight: "700" },

    // 종일 행
    allDayRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: colors.border.default,
      minHeight: 24,
    },
    allDayLabel: { justifyContent: "center", alignItems: "center" },
    allDayLabelText: { fontSize: 10, color: colors.text.disabled },
    allDayCell: { flex: 1, paddingVertical: 2, gap: 2 },
    allDayChip: {
      backgroundColor: colors.accent.primaryLight,
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    allDayChipText: { fontSize: 10, color: colors.accent.primaryDark },

    // 타임 그리드
    hourRow: { justifyContent: "flex-start" },
    hourLabel: {
      fontSize: 10,
      color: colors.text.disabled,
      textAlign: "right",
      paddingRight: 6,
      marginTop: -6,
    },
    dayColumn: { flex: 1, position: "relative" },
    hourLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.border.default,
    },
    columnDivider: { borderLeftWidth: 1, borderLeftColor: colors.border.default },

    // 이벤트 블록
    eventBlock: {
      position: "absolute",
      left: 2,
      right: 2,
      borderRadius: 4,
      borderLeftWidth: 3,
      paddingHorizontal: 4,
      paddingVertical: 2,
      overflow: "hidden",
    },
    eventTitle: { fontSize: 11, color: colors.accent.primaryDark, fontWeight: "500" },

    // 현재 시각선
    nowLine: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
    },
    nowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.status.error,
    },
    nowLineBar: { flex: 1, height: 1.5, backgroundColor: colors.status.error },
  });
