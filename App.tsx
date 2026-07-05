import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { sqliteDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import {
  requestNotificationPermission,
  setupNotificationHandler,
} from "@/features/calendar/api/notifications";
import { ensureDefaultCategory } from "@/features/category/api/categories";
import { AppSettingsProvider } from "@/features/settings/AppSettingsContext";
import { DayDetailPanel } from "@/features/calendar/components/DayDetailPanel";
import { EventDetailSheet } from "@/features/calendar/components/EventDetailSheet";
import { EventForm } from "@/features/calendar/components/EventForm";
import { MonthView } from "@/features/calendar/components/MonthView";
import type { Event } from "@/features/calendar/types";
import { SettingsScreen } from "@/features/settings/components/SettingsScreen";
import { TodoForm } from "@/features/todo/components/TodoForm";
import { TodoList } from "@/features/todo/components/TodoList";
import { TodoMiniCalendar } from "@/features/todo/components/TodoMiniCalendar";
import { useTodos } from "@/features/todo/hooks/useTodos";
import type { Todo } from "@/features/todo/types";
import { Sentry } from "@/lib/sentry";
import { ThemeProvider, useTheme } from "@/theme";

type Tab = "calendar" | "todo" | "settings";

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
  const allTodos = sections.flatMap((s) => s.todos);

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
      <View style={[styles.loading, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="auto" />

        {/* 탭 콘텐츠 */}
        {activeTab === "calendar" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
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
        {activeTab === "todo" && (
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
        )}
        {activeTab === "settings" && <SettingsScreen />}

        {/* 탭별 FAB — 설정 탭에는 FAB 없음 */}
        {activeTab === "calendar" && (
          <Pressable
            testID="fab-add-event"
            style={[styles.fab, { backgroundColor: colors.accent.primary }]}
            onPress={() => setEventFormVisible(true)}
            accessibilityLabel="새 일정 추가"
          >
            <Text style={styles.fabIcon}>＋</Text>
          </Pressable>
        )}
        {activeTab === "todo" && (
          <Pressable
            testID="fab-add-todo"
            style={[styles.fab, { backgroundColor: colors.accent.primary }]}
            onPress={() => setTodoFormVisible(true)}
            accessibilityLabel="새 할일 추가"
          >
            <Text style={styles.fabIcon}>＋</Text>
          </Pressable>
        )}

        {/* 하단 탭 바 */}
        <View
          style={[
            styles.tabBar,
            { backgroundColor: colors.surface.default, borderTopColor: colors.border.default },
          ]}
        >
          <Pressable
            testID="tab-calendar"
            style={styles.tab}
            onPress={() => setActiveTab("calendar")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "calendar" }}
          >
            <Text style={[styles.tabIcon, activeTab === "calendar" && { color: colors.accent.primary }]}>
              📅
            </Text>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === "calendar" ? colors.accent.primary : colors.text.secondary },
              ]}
            >
              캘린더
            </Text>
          </Pressable>

          <Pressable
            testID="tab-todo"
            style={styles.tab}
            onPress={() => setActiveTab("todo")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "todo" }}
          >
            <Text style={[styles.tabIcon, activeTab === "todo" && { color: colors.accent.primary }]}>
              ✅
            </Text>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === "todo" ? colors.accent.primary : colors.text.secondary },
              ]}
            >
              할일
            </Text>
          </Pressable>

          <Pressable
            testID="tab-settings"
            style={styles.tab}
            onPress={() => setActiveTab("settings")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "settings" }}
          >
            <Text style={[styles.tabIcon, activeTab === "settings" && { color: colors.accent.primary }]}>
              ⚙️
            </Text>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === "settings" ? colors.accent.primary : colors.text.secondary },
              ]}
            >
              설정
            </Text>
          </Pressable>
        </View>

        {/* 일정 생성 모달 */}
        <Modal
          visible={eventFormVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEventFormVisible(false)}
        >
          <EventForm
            initialDate={selectedDate}
            onSave={handleEventSave}
            onCancel={() => setEventFormVisible(false)}
          />
        </Modal>

        {/* 할일 생성 모달 */}
        <Modal
          visible={todoFormVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setTodoFormVisible(false)}
        >
          <TodoForm onSave={handleTodoCreate} onCancel={() => setTodoFormVisible(false)} />
        </Modal>

        {/* 이벤트 상세 / 할일 파생 모달 */}
        <Modal
          visible={selectedEvent !== null}
          animationType="slide"
          presentationStyle="pageSheet"
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

        {/* 할일 편집 모달 */}
        <Modal
          visible={editingTodo !== null}
          animationType="slide"
          presentationStyle="pageSheet"
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: 80, // 탭 바 위
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
  fabIcon: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 32,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 2,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
