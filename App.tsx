import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
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
import { DayDetailPanel } from "@/features/calendar/components/DayDetailPanel";
import { EventDetailSheet } from "@/features/calendar/components/EventDetailSheet";
import { EventForm } from "@/features/calendar/components/EventForm";
import { MonthView } from "@/features/calendar/components/MonthView";
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

type Tab = "calendar" | "todo" | "settings";

/** 768pt 이상: 사이드바가 있는 와이드 레이아웃 (iPad · Mac) */
const WIDE_BREAKPOINT = 768;

const NAV_ITEMS = [
  { id: "calendar" as const, icon: "📅", label: "캘린더" },
  { id: "todo" as const, icon: "✅", label: "할일" },
  { id: "settings" as const, icon: "⚙️", label: "설정" },
];

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
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  // 캘린더 상태
  const [calendarKey, setCalendarKey] = useState(0);
  const [eventFormVisible, setEventFormVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 투두 상태
  const [todoFormVisible, setTodoFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [reschedulingTodo, setReschedulingTodo] = useState<Todo | null>(null);
  const { sections, handleToggle, handleDelete, handleCreate, handleUpdate } = useTodos();
  const allTodos = sections.flatMap((ss) => ss.todos);

  // 이벤트 상세 상태
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    setupNotificationHandler();
    runMigrations(sqliteDb).then(async () => {
      await ensureDefaultCategory();
      await requestNotificationPermission();
      setReady(true);
    });
  }, []);

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

  // ── 투두 탭 (컴팩트·와이드 공용) ─────────────────────────────────────────────

  const todoTabContent = (
    <View style={{ flex: 1 }}>
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
          onEdit={setEditingTodo}
          onReschedule={setReschedulingTodo}
        />
      </View>
    </View>
  );

  // ── 모달 (컴팩트·와이드 공용) ─────────────────────────────────────────────────

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
    </>
  );

  // ── 와이드 레이아웃 (iPad · Mac · 데스크톱) ───────────────────────────────────

  if (isWide) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[s.container, { backgroundColor: colors.background.primary }]}>
          <StatusBar style="auto" />
          <View style={s.wideRoot}>
            {/* 사이드바 */}
            <View
              style={[
                s.sidebar,
                {
                  backgroundColor: colors.surface.default,
                  borderRightColor: colors.border.default,
                },
              ]}
            >
              {/* 앱 이름 */}
              <View
                style={[s.sidebarHeader, { borderBottomColor: colors.border.default }]}
              >
                <Text style={[s.appName, { color: colors.text.primary }]}>BeArrow</Text>
              </View>

              {/* 월 캘린더 */}
              <MonthView
                key={calendarKey}
                onDayPress={(date) => {
                  setSelectedDate(date);
                  setActiveTab("calendar");
                }}
              />

              {/* 내비게이션 */}
              <View style={s.sidebarNav}>
                {NAV_ITEMS.map(({ id, icon, label }) => (
                  <Pressable
                    key={id}
                    testID={`tab-${id}`}
                    style={({ pressed }) => [
                      s.sidebarNavItem,
                      activeTab === id && {
                        backgroundColor: colors.accent.primaryLight,
                      },
                      pressed && s.pressed,
                    ]}
                    onPress={() => setActiveTab(id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === id }}
                    android_ripple={{ color: colors.accent.primaryLight }}
                  >
                    <Text style={s.sidebarNavIcon}>{icon}</Text>
                    <Text
                      style={[
                        s.sidebarNavLabel,
                        {
                          color:
                            activeTab === id
                              ? colors.accent.primary
                              : colors.text.secondary,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 탄력 여백 — 추가 버튼을 하단으로 밀어냄 */}
              <View style={{ flex: 1 }} />

              {/* 추가 버튼 */}
              {activeTab !== "settings" && (
                <Pressable
                  testID={activeTab === "calendar" ? "fab-add-event" : "fab-add-todo"}
                  style={[s.sidebarAddBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={() =>
                    activeTab === "calendar"
                      ? setEventFormVisible(true)
                      : setTodoFormVisible(true)
                  }
                  accessibilityLabel={
                    activeTab === "calendar" ? "새 일정 추가" : "새 할일 추가"
                  }
                  android_ripple={{ color: "rgba(255,255,255,0.25)" }}
                >
                  <Text style={s.sidebarAddBtnText}>
                    {activeTab === "calendar" ? "＋  새 일정" : "＋  새 할일"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* 메인 콘텐츠 */}
            <View style={[s.wideMain, { backgroundColor: colors.background.primary }]}>
              {activeTab === "calendar" && (
                <DayDetailPanel
                  key={`${selectedDate.toDateString()}-${calendarKey}`}
                  date={selectedDate}
                  onEventPress={(event) => setSelectedEvent(event)}
                  onEditTodo={setEditingTodo}
                />
              )}
              {activeTab === "todo" && todoTabContent}
              {activeTab === "settings" && <SettingsScreen />}
            </View>
          </View>

          {modals}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // ── 컴팩트 레이아웃 (스마트폰) ────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="auto" />

        {/* 탭 콘텐츠 */}
        {activeTab === "calendar" && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <MonthView key={calendarKey} onDayPress={(date) => setSelectedDate(date)} />
            <DayDetailPanel
              key={`${selectedDate.toDateString()}-${calendarKey}`}
              date={selectedDate}
              onEventPress={(event) => setSelectedEvent(event)}
              onEditTodo={setEditingTodo}
              embedded
            />
          </ScrollView>
        )}
        {activeTab === "todo" && todoTabContent}
        {activeTab === "settings" && <SettingsScreen />}

        {/* 플로팅 액션 버튼 */}
        {activeTab !== "settings" && (
          <Pressable
            testID={activeTab === "calendar" ? "fab-add-event" : "fab-add-todo"}
            style={[s.fab, { backgroundColor: colors.accent.primary }]}
            onPress={() =>
              activeTab === "calendar"
                ? setEventFormVisible(true)
                : setTodoFormVisible(true)
            }
            accessibilityLabel={activeTab === "calendar" ? "새 일정 추가" : "새 할일 추가"}
            android_ripple={{ color: "rgba(255,255,255,0.3)", radius: 28 }}
          >
            <Text style={s.fabIcon}>＋</Text>
          </Pressable>
        )}

        {/* 하단 탭 바 */}
        <View
          style={[
            s.tabBar,
            {
              backgroundColor: colors.surface.default,
              borderTopColor: colors.border.default,
            },
          ]}
        >
          {NAV_ITEMS.map(({ id, icon, label }) => (
            <Pressable
              key={id}
              testID={`tab-${id}`}
              style={s.tab}
              onPress={() => setActiveTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === id }}
              android_ripple={{ color: colors.accent.primaryLight }}
            >
              <Text
                style={[s.tabIcon, activeTab === id && { color: colors.accent.primary }]}
              >
                {icon}
              </Text>
              <Text
                style={[
                  s.tabLabel,
                  {
                    color:
                      activeTab === id ? colors.accent.primary : colors.text.secondary,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {modals}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },

    // 와이드 레이아웃
    wideRoot: {
      flex: 1,
      flexDirection: "row",
    },
    sidebar: {
      width: 280,
      borderRightWidth: StyleSheet.hairlineWidth,
    },
    sidebarHeader: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    appName: {
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    sidebarNav: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      gap: 2,
    },
    sidebarNavItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      minHeight: 44,
    },
    sidebarNavIcon: { fontSize: 18 },
    sidebarNavLabel: { fontSize: 15, fontWeight: "500" },
    sidebarAddBtn: {
      margin: 12,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 4,
    },
    sidebarAddBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
    wideMain: { flex: 1 },

    // 컴팩트 레이아웃
    fab: {
      position: "absolute",
      bottom: 80,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    fabIcon: { color: "#fff", fontSize: 28, lineHeight: 32 },
    tabBar: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingBottom: Platform.OS === "ios" ? 0 : 4,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 2,
      minHeight: 44,
    },
    tabIcon: { fontSize: 22, color: colors.text.secondary },
    tabLabel: { fontSize: 11, fontWeight: "500" },

    // 공통
    pressed: { opacity: 0.65 },
  });
}
