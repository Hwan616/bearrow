import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { sqliteDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import {
  requestNotificationPermission,
  setupNotificationHandler,
} from "@/features/calendar/api/notifications";
import { AddSheet } from "@/features/calendar/components/AddSheet";
import type { AddSheetSegment } from "@/features/calendar/components/AddSheet";
import { DayView, formatDayHeaderTitle } from "@/features/calendar/components/DayView";
import { EventDetailSheet } from "@/features/calendar/components/EventDetailSheet";
import { MonthView } from "@/features/calendar/components/MonthView";
import type { MonthViewHandle } from "@/features/calendar/components/MonthView";
import { YearView } from "@/features/calendar/components/YearView";
import { YearMonthPicker } from "@/features/calendar/components/YearMonthPicker";
import type { Event } from "@/features/calendar/types";
import { ensureDefaultCategoriesExist } from "@/features/category/api/categories";
import { AppSettingsProvider } from "@/features/settings/AppSettingsContext";
import { SettingsSheet } from "@/features/settings/components/SettingsSheet";
import { TodoForm } from "@/features/todo/components/TodoForm";
import { TodoSheet } from "@/features/todo/components/TodoSheet";
import { useTodos } from "@/features/todo/hooks/useTodos";
import type { Todo } from "@/features/todo/types";
import { Sentry } from "@/lib/sentry";
import { ThemeProvider, useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

// ── 아이콘 컴포넌트 ────────────────────────────────────────────────────────────

function GearIcon({ size = 18, color }: { size?: number; color: string }) {
  const r = size / 2;
  const bodyR = r * 0.62;
  const toothW = r * 0.38;
  const toothH = r * 0.50;
  // 치아 중심까지의 거리 (body 반경 + 치아 높이의 일부)
  const offset = bodyR + toothH * 0.28;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            width: toothW,
            height: toothH,
            left: (size - toothW) / 2,
            top: (size - toothH) / 2,
            backgroundColor: color,
            borderRadius: toothW / 2,
            transform: [
              { translateY: -offset },
              { rotate: `${i * 45}deg` },
            ],
          }}
        />
      ))}
      {/* 중앙 원형 몸체 */}
      <View style={{
        position: "absolute",
        width: bodyR * 2,
        height: bodyR * 2,
        borderRadius: bodyR,
        backgroundColor: color,
      }} />
    </View>
  );
}

function PlusIcon({ size = 18, color }: { size?: number; color: string }) {
  const bar = Math.max(2, Math.round(size * 0.13));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: Math.round(size * 0.75), height: bar, backgroundColor: color, borderRadius: bar / 2 }} />
      <View style={{ position: "absolute", height: Math.round(size * 0.75), width: bar, backgroundColor: color, borderRadius: bar / 2 }} />
    </View>
  );
}

function ChevronLeft({ size = 12, color }: { size?: number; color: string }) {
  const stroke = Math.max(1.5, size * 0.14);
  const halfH = size / 2;
  // 팁 각도 ≈ 95°: 각 팔이 수평에서 47.5° 기울어짐
  const angleDeg = 47.5;
  const armW = halfH / Math.tan((angleDeg * Math.PI) / 180);
  const armLen = Math.sqrt(armW * armW + halfH * halfH);
  const pad = Math.ceil(Math.max(0, armLen / 2 - armW / 2));
  const containerW = Math.ceil(armW + pad);
  const armLeft = pad + armW / 2 - armLen / 2;

  return (
    <View style={{ width: containerW, height: size }}>
      <View style={{
        position: "absolute",
        left: armLeft,
        top: size / 4 - stroke / 2,
        width: armLen,
        height: stroke,
        backgroundColor: color,
        borderRadius: stroke / 2,
        transform: [{ rotate: `${angleDeg}deg` }],
      }} />
      <View style={{
        position: "absolute",
        left: armLeft,
        top: 3 * size / 4 - stroke / 2,
        width: armLen,
        height: stroke,
        backgroundColor: color,
        borderRadius: stroke / 2,
        transform: [{ rotate: `-${angleDeg}deg` }],
      }} />
    </View>
  );
}

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** Year / Month / Day 계층 뷰 */
type CalendarView = "year" | "month" | "day";

/** 768pt 이상: 컨텍스트 사이드바를 보여주는 와이드 레이아웃 (iPad · Mac) */
const WIDE_BREAKPOINT = 768;

export default function App() {
  return (
    <Sentry.ErrorBoundary>
      <ThemeProvider>
        <AppSettingsProvider>
          <AppContent />
        </AppSettingsProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const s = makeStyles(colors);

  const [ready, setReady] = useState(false);
  const [activeView, setActiveView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);

  // Month View: 스크롤 중인 월 추적 (back 레이블 + 서브타이틀용)
  const [visibleMonthYear, setVisibleMonthYear] = useState(new Date().getFullYear());
  const [visibleMonthMonth, setVisibleMonthMonth] = useState(new Date().getMonth());
  // Day View: 스크롤 중인 날짜 추적 (헤더 타이틀용, selectedDate와 분리)
  const [visibleDayDate, setVisibleDayDate] = useState(new Date());
  // Month YearMonthPicker 제어
  const [pickerVisible, setPickerVisible] = useState(false);
  const monthViewRef = useRef<MonthViewHandle>(null);

  // 시트 가시성
  const [todoSheetVisible, setTodoSheetVisible] = useState(false);
  const [settingsSheetVisible, setSettingsSheetVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [addSheetSegment, setAddSheetSegment] = useState<AddSheetSegment>("event");

  // 폼 모달
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { sections, allTodos, handleToggle, handleDelete, handleCreate, handleUpdate, handleReorder } = useTodos(selectedDate);

  useEffect(() => {
    setupNotificationHandler();
    runMigrations(sqliteDb).then(async () => {
      await ensureDefaultCategoriesExist();
      await requestNotificationPermission();
      setReady(true);
    });
  }, []);

  // ── 내비게이션 ──────────────────────────────────────────────────────────────────

  function goBack() {
    if (activeView === "day") {
      setSelectedDate(visibleDayDate); // Day 뷰에서 벗어날 때 보이던 날짜를 기억
      setActiveView("month");
    } else if (activeView === "month") {
      setActiveView("year");
    }
  }

  function goToToday() {
    const today = new Date();
    setSelectedDate(today);
    if (activeView === "year") {
      setVisibleMonthYear(today.getFullYear());
      setVisibleMonthMonth(today.getMonth());
      setActiveView("month");
      setCalendarKey((k) => k + 1);
    } else if (activeView === "month") {
      setVisibleMonthYear(today.getFullYear());
      setVisibleMonthMonth(today.getMonth());
      setCalendarKey((k) => k + 1);
    } else {
      // Day 뷰: visibleDayDate를 오늘로 맞추면 DayView가 key 재생성으로 이동
      setVisibleDayDate(today);
    }
  }

  function getBackLabel(): string | null {
    if (activeView === "day") return `${visibleDayDate.getMonth() + 1}월`;
    if (activeView === "month") return `${visibleMonthYear}년`;
    return null;
  }

  // ── 이벤트·투두 핸들러 ─────────────────────────────────────────────────────────

  function handleEventSave() {
    setAddSheetVisible(false);
    setCalendarKey((k) => k + 1);
  }

  async function handleTodoCreate(title: string, categoryId: string, note?: string) {
    await handleCreate(title, categoryId, note);
    setAddSheetVisible(false);
  }

  async function handleTodoUpdate(title: string, categoryId: string, note?: string) {
    if (!editingTodo) return;
    await handleUpdate(editingTodo.id, title, categoryId, note);
    setEditingTodo(null);
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <StatusBar style="auto" />
      </View>
    );
  }

  const backLabel = getBackLabel();

  // ── 공통 헤더 ──────────────────────────────────────────────────────────────────
  // 모든 뷰: [뒤로/앱타이틀] ——— [검색] [설정]

  const appHeader = (
    <View style={[s.header, { borderBottomColor: colors.border.default, backgroundColor: colors.background.primary }]}>
      <View style={s.headerLeft}>
        {backLabel !== null ? (
          <Pressable
            testID="btn-back"
            onPress={goBack}
            style={s.headerBtn}
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <ChevronLeft size={13} color={colors.accent.primary} />
              </View>
              <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>{backLabel}</Text>
            </View>
          </Pressable>
        ) : (
          <Text style={[s.appTitle, { color: colors.text.primary }]}>BeArrow</Text>
        )}
      </View>
      <View style={s.headerRight}>
        <Pressable
          testID="btn-settings-sheet"
          style={s.headerBtn}
          onPress={() => setSettingsSheetVisible(true)}
          accessibilityLabel="설정"
          accessibilityRole="button"
        >
          <GearIcon size={22} color={colors.text.secondary} />
        </Pressable>
      </View>
    </View>
  );

  // ── 공통 푸터 ──────────────────────────────────────────────────────────────────
  // 투명 배경 + 회색 pill 버튼
  // Year: [오늘] ———
  // Month/Day: [오늘] ——— [할 일] [＋]

  // 투명 오버레이 푸터 — 캘린더 컨텐츠 위에 띄움 (position: absolute)
  // box-none: 버튼 바깥 투명 영역은 터치를 아래 컨텐츠로 통과시킴
  const appFooter = (
    <View style={s.footer} pointerEvents="box-none">
      <Pressable
        testID="btn-today"
        style={s.pillBtn}
        onPress={goToToday}
        accessibilityLabel="오늘"
        accessibilityRole="button"
      >
        <Text style={s.pillBtnText}>오늘</Text>
      </Pressable>
      <View style={{ flex: 1 }} pointerEvents="none" />
      {activeView !== "year" && (
        <>
          <Pressable
            testID="btn-todo-sheet"
            style={s.pillBtn}
            onPress={() => setTodoSheetVisible(true)}
            accessibilityLabel="ToDo"
            accessibilityRole="button"
          >
            <Text style={s.pillBtnText}>ToDo</Text>
          </Pressable>
          <Pressable
            testID="btn-add"
            style={[s.pillBtn, { marginLeft: 8 }]}
            onPress={() => { setAddSheetSegment("event"); setAddSheetVisible(true); }}
            accessibilityLabel="추가"
            accessibilityRole="button"
          >
            <PlusIcon size={18} color={colors.text.primary} />
          </Pressable>
        </>
      )}
    </View>
  );

  // ── 캘린더 뷰 ──────────────────────────────────────────────────────────────────

  const calendarView = (
    <>
      {activeView === "year" && (
        <View testID="view-year" style={{ flex: 1 }}>
          <YearView
            initialYear={selectedDate.getFullYear()}
            onMonthPress={(yr, mo) => {
              setSelectedDate(new Date(yr, mo, 1));
              setVisibleMonthYear(yr);
              setVisibleMonthMonth(mo);
              setActiveView("month");
            }}
          />
        </View>
      )}
      {activeView === "month" && (
        <View testID="view-month" style={{ flex: 1 }}>
          {/* 서브타이틀: 현재 보이는 월 */}
          <Pressable
            style={s.monthSubtitleRow}
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="연월 선택"
          >
            <Text style={[s.monthSubtitle, { color: colors.text.primary }]}>
              {visibleMonthMonth + 1}월
            </Text>
          </Pressable>
          {/* 고정 요일 바 */}
          <View style={s.weekdayBar}>
            {DAYS_OF_WEEK.map((d) => (
              <Text
                key={d}
                style={[
                  s.weekdayLabel,
                  { color: colors.text.secondary },
                  d === "일" && { color: "#D93535" },
                  d === "토" && { color: "#2E5AAC" },
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
          <MonthView
            ref={monthViewRef}
            key={calendarKey}
            initialDate={selectedDate}
            onDayPress={(date) => {
              setSelectedDate(date);
              setVisibleDayDate(date);
              if (!todoSheetVisible) setActiveView("day");
            }}
            onVisibleMonthChange={(yr, mo) => {
              setVisibleMonthYear(yr);
              setVisibleMonthMonth(mo);
            }}
          />
          <YearMonthPicker
            year={visibleMonthYear}
            month={visibleMonthMonth}
            visible={pickerVisible}
            onSelect={(y, m) => {
              setPickerVisible(false);
              setVisibleMonthYear(y);
              setVisibleMonthMonth(m);
              monthViewRef.current?.scrollToMonth(y, m);
            }}
            onClose={() => setPickerVisible(false)}
          />
        </View>
      )}
      {activeView === "day" && (
        <View testID="view-day" style={{ flex: 1 }}>
          {/* 날짜 헤더 타이틀 */}
          <Text style={[s.dayHeaderTitle, { color: colors.text.primary }]} testID="day-header-title">
            {formatDayHeaderTitle(visibleDayDate)}
          </Text>
          <DayView
            key={`${selectedDate.toDateString()}-${calendarKey}`}
            initialDate={selectedDate}
            onEventPress={(event) => setSelectedEvent(event)}
            onDateChange={(date) => {
              setVisibleDayDate(date); // 헤더 타이틀 갱신
              if (todoSheetVisible) setSelectedDate(date); // 투두 시트 날짜 동기화
            }}
          />
        </View>
      )}
    </>
  );

  // ── 모달 ───────────────────────────────────────────────────────────────────────

  const modals = (
    <>
      <Modal
        visible={selectedEvent !== null}
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <EventDetailSheet
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onSaved={() => setCalendarKey((k) => k + 1)}
            onDeleted={() => setCalendarKey((k) => k + 1)}
            onTodoCreated={() => {
              setSelectedEvent(null);
              setCalendarKey((k) => k + 1);
            }}
          />
        )}
      </Modal>

      <Modal
        visible={editingTodo !== null}
        animationType="slide"
        onRequestClose={() => setEditingTodo(null)}
      >
        {editingTodo && (
          <TodoForm
            initial={editingTodo}
            onSave={handleTodoUpdate}
            onCancel={() => setEditingTodo(null)}
          />
        )}
      </Modal>

      {/* 추가 시트 — AppBottomSheet(컴팩트) / AppSidePanel(와이드) */}
      <AddSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        isWide={isWide}
        initialDate={selectedDate}
        initialSegment={addSheetSegment}
        onEventSave={handleEventSave}
        onTodoSave={handleTodoCreate}
      />

      {/* 투두 시트 — AppBottomSheet(컴팩트) / AppSidePanel(와이드) */}
      <TodoSheet
        visible={todoSheetVisible}
        onClose={() => {
          setTodoSheetVisible(false);
          monthViewRef.current?.clearSelection();
        }}
        isWide={isWide}
        selectedDate={selectedDate}
        sections={sections}
        allTodos={allTodos}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={(todo) => {
          setTodoSheetVisible(false);
          setEditingTodo(todo);
        }}
        onAddTodo={() => {
          setTodoSheetVisible(false);
          setAddSheetSegment("todo");
          setAddSheetVisible(true);
        }}
        onReorder={handleReorder}
      />

      {/* 설정 시트 — AppBottomSheet(컴팩트) / AppSidePanel(와이드) */}
      <SettingsSheet
        visible={settingsSheetVisible}
        onClose={() => setSettingsSheetVisible(false)}
        isWide={isWide}
      />
    </>
  );

  // ── 와이드 레이아웃 — Day 뷰에서 컨텍스트 사이드바 표시 ────────────────────────────

  if (isWide && activeView === "day") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[s.container, { backgroundColor: colors.background.primary }]}>
          <StatusBar style="auto" />
          {appHeader}
          <View style={s.wideRoot}>
            <View
              style={[
                s.sidebar,
                {
                  backgroundColor: colors.surface.default,
                  borderRightColor: colors.border.default,
                },
              ]}
            >
              <MonthView
                key={calendarKey}
                onDayPress={(date) => setSelectedDate(date)}
              />
            </View>
            <View style={[s.wideMain, { backgroundColor: colors.background.primary }]}>
              {calendarView}
            </View>
          </View>
          {appFooter}
          {modals}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // ── 기본 레이아웃 (컴팩트 + 와이드 Year/Month 뷰) ─────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="auto" />
        {appHeader}
        <View style={{ flex: 1 }}>
          {calendarView}
        </View>
        {appFooter}
        {modals}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },

    // 헤더 네비게이션 바
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      minHeight: 52,
    },
    headerLeft: {
      flex: 1,
      alignItems: "flex-start",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    headerBtn: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      minHeight: 44,
      justifyContent: "center",
    },
    headerBtnText: {
      fontSize: 15,
      fontWeight: "500",
    },
    headerIcon: {
      fontSize: 22,
    },
    appTitle: {
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.3,
    },

    // Month View: 서브타이틀 + 요일 바
    monthSubtitleRow: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    monthSubtitle: {
      fontSize: 26,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    weekdayBar: {
      flexDirection: "row",
      paddingHorizontal: 4,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.default,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "500",
    },

    // Day View: 날짜 헤더 타이틀
    dayHeaderTitle: {
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.default,
      backgroundColor: colors.surface.default,
    },

    // 캘린더 위에 떠 있는 투명 오버레이 푸터
    footer: {
      position: "absolute",
      bottom: 20,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: "transparent",
    },
    // 모든 pill 버튼은 동일 크기 (minWidth) + 텍스트 중앙 정렬
    pillBtn: {
      backgroundColor: colors.background.tertiary,
      borderRadius: 18,
      minWidth: 72,
      height: 38,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    pillBtnText: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text.primary,
      textAlign: "center",
    },

    // 와이드 레이아웃
    wideRoot: {
      flex: 1,
      flexDirection: "row",
    },
    sidebar: {
      width: 280,
      borderRightWidth: StyleSheet.hairlineWidth,
    },
    wideMain: { flex: 1 },
  });
}
