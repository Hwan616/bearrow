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
import { AddSheet } from "@/features/calendar/components/AddSheet";
import type { AddSheetSegment } from "@/features/calendar/components/AddSheet";
import { SearchSheet } from "@/features/calendar/components/SearchSheet";
import { DayView } from "@/features/calendar/components/DayView";
import { EventDetailSheet } from "@/features/calendar/components/EventDetailSheet";
import { MonthView } from "@/features/calendar/components/MonthView";
import { YearView } from "@/features/calendar/components/YearView";
import type { Event } from "@/features/calendar/types";
import { ensureDefaultCategory } from "@/features/category/api/categories";
import { AppSettingsProvider } from "@/features/settings/AppSettingsContext";
import { SettingsSheet } from "@/features/settings/components/SettingsSheet";
import { TodoForm } from "@/features/todo/components/TodoForm";
import { TodoSheet } from "@/features/todo/components/TodoSheet";
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

  // 시트 가시성
  const [todoSheetVisible, setTodoSheetVisible] = useState(false);
  const [settingsSheetVisible, setSettingsSheetVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [addSheetSegment, setAddSheetSegment] = useState<AddSheetSegment>("event");
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);

  // 폼 모달
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [reschedulingTodo, setReschedulingTodo] = useState<Todo | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { sections, allTodos, handleToggle, handleDelete, handleCreate, handleUpdate, handleReorder } = useTodos();

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
    setAddSheetVisible(false);
    setCalendarKey((k) => k + 1);
  }

  async function handleTodoCreate(
    title: string,
    categoryId: string,
    note?: string,
    dueDate?: Date | null,
  ) {
    await handleCreate(title, categoryId, note, dueDate);
    setAddSheetVisible(false);
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
          onPress={() => setSearchSheetVisible(true)}
          accessibilityLabel="검색"
          accessibilityRole="button"
        >
          <Text style={s.headerIcon}>🔍</Text>
        </Pressable>
        <Pressable
          testID="btn-add"
          style={s.headerBtn}
          onPress={() => { setAddSheetSegment("event"); setAddSheetVisible(true); }}
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
      {/* 투두 시트 열림 시: 설정 버튼만 표시 */}
      {todoSheetVisible ? (
        <View style={[s.footerRight, { flex: 1, justifyContent: "flex-end" }]}>
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
      ) : (
        <>
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
                <Text style={s.footerBtnText}>할 일</Text>
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
            onDateChange={(date) => {
              // 투두 시트 열림 상태에서 Day 뷰 스크롤 시 날짜 동기화
              if (todoSheetVisible) setSelectedDate(date);
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
        onClose={() => setTodoSheetVisible(false)}
        isWide={isWide}
        selectedDate={selectedDate}
        sections={sections}
        allTodos={allTodos}
        reschedulingTodo={reschedulingTodo}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={(todo) => {
          setTodoSheetVisible(false);
          setEditingTodo(todo);
        }}
        onReschedule={setReschedulingTodo}
        onCancelReschedule={() => setReschedulingTodo(null)}
        onDatePick={(date) => void handleReschedule(date)}
        onAddTodo={() => {
          setTodoSheetVisible(false);
          setAddSheetSegment("todo");
          setAddSheetVisible(true);
        }}
        onReorder={handleReorder}
      />

      {/* 검색 시트 — AppBottomSheet(컴팩트) / AppSidePanel(와이드) */}
      <SearchSheet
        visible={searchSheetVisible}
        onClose={() => setSearchSheetVisible(false)}
        isWide={isWide}
        onNavigate={(date) => {
          setSelectedDate(date);
          setActiveView("day");
          setSearchSheetVisible(false);
        }}
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
