import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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
import { DayView } from "@/features/calendar/components/DayView";
import { EventDetailSheet } from "@/features/calendar/components/EventDetailSheet";
import { EventForm } from "@/features/calendar/components/EventForm";
import { MonthView } from "@/features/calendar/components/MonthView";
import { YearView } from "@/features/calendar/components/YearView";
import type { Event } from "@/features/calendar/types";
import { ensureDefaultCategory } from "@/features/category/api/categories";
import { AppSettingsProvider } from "@/features/settings/AppSettingsContext";
import { SettingsScreen } from "@/features/settings/components/SettingsScreen";
import { TodoForm } from "@/features/todo/components/TodoForm";
import { TodoList } from "@/features/todo/components/TodoList";
import { TodoMiniCalendar } from "@/features/todo/components/TodoMiniCalendar";
import { useTodos } from "@/features/todo/hooks/useTodos";
import type { Todo } from "@/features/todo/types";
import { Sentry } from "@/lib/sentry";
import { ThemeProvider, useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

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

  // 시트 가시성 — 7.5~7.7에서 BottomSheet/SidePanel로 교체
  const [todoSheetVisible, setTodoSheetVisible] = useState(false);
  const [settingsSheetVisible, setSettingsSheetVisible] = useState(false);

  // 폼 모달
  const [eventFormVisible, setEventFormVisible] = useState(false);
  const [todoFormVisible, setTodoFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [reschedulingTodo, setReschedulingTodo] = useState<Todo | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { sections, handleToggle, handleDelete, handleCreate, handleUpdate } = useTodos();
  const allTodos = sections.flatMap((ss) => ss.todos);

  useEffect(() => {
    setupNotificationHandler();
    runMigrations(sqliteDb).then(async () => {
      await ensureDefaultCategory();
      await requestNotificationPermission();
      setReady(true);
    });
  }, []);

  // ── 내비게이션 ──────────────────────────────────────────────────────────────────

  function goBack() {
    if (activeView === "day") setActiveView("month");
    else if (activeView === "month") setActiveView("year");
  }

  function goToToday() {
    setSelectedDate(new Date());
    setActiveView("day");
  }

  function getBackLabel(): string | null {
    if (activeView === "day") return `< ${selectedDate.getMonth() + 1}월`;
    if (activeView === "month") return `< ${selectedDate.getFullYear()}년`;
    return null;
  }

  // ── 이벤트·투두 핸들러 ─────────────────────────────────────────────────────────

  function handleEventSave() {
    setEventFormVisible(false);
    setCalendarKey((k) => k + 1);
  }

  async function handleTodoCreate(
    title: string,
    categoryId: string,
    note?: string,
    dueDate?: Date | null,
  ) {
    await handleCreate(title, categoryId, note, dueDate);
    setTodoFormVisible(false);
    if (dueDate) setCalendarKey((k) => k + 1);
  }

  async function handleTodoUpdate(
    title: string,
    categoryId: string,
    note?: string,
    dueDate?: Date | null,
  ) {
    if (!editingTodo) return;
    await handleUpdate(editingTodo.id, title, categoryId, note, dueDate);
    setEditingTodo(null);
    if (dueDate !== editingTodo.dueDate) setCalendarKey((k) => k + 1);
  }

  async function handleReschedule(newDate: Date) {
    if (!reschedulingTodo) return;
    await handleUpdate(
      reschedulingTodo.id,
      reschedulingTodo.title,
      reschedulingTodo.categoryId ?? "",
      reschedulingTodo.note ?? undefined,
      newDate,
    );
    setReschedulingTodo(null);
    setCalendarKey((k) => k + 1);
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

  const appHeader = (
    <View
      style={[
        s.header,
        {
          borderBottomColor: colors.border.default,
          backgroundColor: colors.surface.default,
        },
      ]}
    >
      <View style={s.headerLeft}>
        {backLabel !== null ? (
          <Pressable
            testID="btn-back"
            onPress={goBack}
            style={s.headerBtn}
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
          >
            <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>{backLabel}</Text>
          </Pressable>
        ) : (
          <Text style={[s.appTitle, { color: colors.text.primary }]}>BeArrow</Text>
        )}
      </View>
      <View style={s.headerRight}>
        <Pressable
          testID="btn-search"
          style={s.headerBtn}
          accessibilityLabel="검색"
          accessibilityRole="button"
        >
          <Text style={s.headerIcon}>🔍</Text>
        </Pressable>
        <Pressable
          testID="btn-add"
          style={s.headerBtn}
          onPress={() => setEventFormVisible(true)}
          accessibilityLabel="추가"
          accessibilityRole="button"
        >
          <Text style={[s.headerIcon, { color: colors.accent.primary }]}>＋</Text>
        </Pressable>
      </View>
    </View>
  );

  // ── 공통 푸터 ──────────────────────────────────────────────────────────────────

  const appFooter = (
    <View
      style={[
        s.footer,
        {
          borderTopColor: colors.border.default,
          backgroundColor: colors.surface.default,
        },
      ]}
    >
      <Pressable
        testID="btn-today"
        style={s.footerBtn}
        onPress={goToToday}
        accessibilityLabel="오늘"
        accessibilityRole="button"
      >
        <Text style={[s.footerBtnText, { color: colors.accent.primary }]}>오늘</Text>
      </Pressable>
      <View style={s.footerRight}>
        {activeView !== "year" && (
          <Pressable
            testID="btn-todo-sheet"
            style={s.footerBtn}
            onPress={() => setTodoSheetVisible(true)}
            accessibilityLabel="할 일"
            accessibilityRole="button"
          >
            <Text
              style={[
                s.footerBtnText,
                todoSheetVisible && { color: colors.accent.primary },
              ]}
            >
              할 일
            </Text>
          </Pressable>
        )}
        <Pressable
          testID="btn-settings-sheet"
          style={s.footerBtn}
          onPress={() => setSettingsSheetVisible(true)}
          accessibilityLabel="설정"
          accessibilityRole="button"
        >
          <Text style={s.footerBtnText}>설정</Text>
        </Pressable>
      </View>
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
              setActiveView("month");
            }}
          />
        </View>
      )}
      {activeView === "month" && (
        <View testID="view-month" style={{ flex: 1 }}>
          <MonthView
            key={calendarKey}
            initialDate={selectedDate}
            onDayPress={(date) => {
              setSelectedDate(date);
              // 투두 시트 열림: 날짜만 전환 (시트 유지), 닫힘: Day 뷰로 진입
              if (!todoSheetVisible) {
                setActiveView("day");
              }
            }}
          />
        </View>
      )}
      {activeView === "day" && (
        <View testID="view-day" style={{ flex: 1 }}>
          <DayView
            key={`${selectedDate.toDateString()}-${calendarKey}`}
            initialDate={selectedDate}
            onEventPress={(event) => setSelectedEvent(event)}
          />
        </View>
      )}
    </>
  );

  // ── 모달 ───────────────────────────────────────────────────────────────────────

  const modals = (
    <>
      <Modal
        visible={eventFormVisible}
        animationType="slide"
        onRequestClose={() => setEventFormVisible(false)}
      >
        <EventForm
          initialDate={selectedDate}
          onSave={handleEventSave}
          onCancel={() => setEventFormVisible(false)}
        />
      </Modal>

      <Modal
        visible={todoFormVisible}
        animationType="slide"
        onRequestClose={() => setTodoFormVisible(false)}
      >
        <TodoForm onSave={handleTodoCreate} onCancel={() => setTodoFormVisible(false)} />
      </Modal>

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

      {/* 할일 시트 — 7.5/7.6에서 BottomSheet/SidePanel로 교체 */}
      <Modal
        visible={todoSheetVisible}
        animationType="slide"
        onRequestClose={() => setTodoSheetVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
          <View
            style={[s.sheetHeader, { borderBottomColor: colors.border.default }]}
          >
            <Text style={[s.sheetTitle, { color: colors.text.primary }]}>할 일</Text>
            <Pressable
              onPress={() => setTodoSheetVisible(false)}
              style={s.headerBtn}
              accessibilityLabel="닫기"
            >
              <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
            </Pressable>
          </View>
          <TodoMiniCalendar
            todos={allTodos}
            reschedulingTodo={reschedulingTodo}
            onDatePick={(date) => void handleReschedule(date)}
            onCancelReschedule={() => setReschedulingTodo(null)}
          />
          <View style={{ flex: 1 }}>
            <TodoList
              sections={sections}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={(todo) => {
                setTodoSheetVisible(false);
                setEditingTodo(todo);
              }}
              onReschedule={setReschedulingTodo}
            />
          </View>
          <Pressable
            testID="btn-add-todo"
            style={[s.sheetAddBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => {
              setTodoSheetVisible(false);
              setTodoFormVisible(true);
            }}
            accessibilityLabel="새 할일 추가"
          >
            <Text style={s.sheetAddBtnText}>＋  새 할일</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      {/* 설정 시트 — 7.7에서 BottomSheet/SidePanel로 교체 */}
      <Modal
        visible={settingsSheetVisible}
        animationType="slide"
        onRequestClose={() => setSettingsSheetVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
          <View
            style={[s.sheetHeader, { borderBottomColor: colors.border.default }]}
          >
            <Text style={[s.sheetTitle, { color: colors.text.primary }]}>설정</Text>
            <Pressable
              onPress={() => setSettingsSheetVisible(false)}
              style={s.headerBtn}
              accessibilityLabel="닫기"
            >
              <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
            </Pressable>
          </View>
          <SettingsScreen />
        </SafeAreaView>
      </Modal>
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

    // 헤더
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
      fontWeight: "600",
    },
    headerIcon: {
      fontSize: 22,
    },
    appTitle: {
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.3,
    },

    // 푸터
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      minHeight: 52,
    },
    footerBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 44,
      justifyContent: "center",
    },
    footerBtnText: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text.primary,
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    // 시트 헤더 (모달 내부 — 7.5~7.7에서 실제 시트로 교체)
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "600",
    },
    sheetAddBtn: {
      margin: 16,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetAddBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
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
