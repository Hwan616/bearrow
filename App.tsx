import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
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
import { SettingsScreen } from "@/features/settings/components/SettingsScreen";
import { TodoForm } from "@/features/todo/components/TodoForm";
import { TodoList } from "@/features/todo/components/TodoList";
import { useTodos } from "@/features/todo/hooks/useTodos";
import { Sentry } from "@/lib/sentry";
import { ThemeProvider, useTheme } from "@/theme";

// DateTimePicker — 마감일 편집 모달용 (네이티브 전용)
const DateTimePicker =
  Platform.OS !== "web"
    ? (require("@react-native-community/datetimepicker") as { default: React.ComponentType<Record<string, unknown>> }).default
    : null;

type Tab = "calendar" | "todo" | "settings";

export default function App() {
  return (
    <Sentry.ErrorBoundary>
      <ThemeProvider>
        <AppContent />
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
  const { sections, handleToggle, handleDelete, handleCreate, handleUpdateDueDate } = useTodos();

  // 이벤트 상세 상태
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // 마감일 편집 상태
  const [dueDateTodoId, setDueDateTodoId] = useState<string | null>(null);
  const [dueDateValue, setDueDateValue] = useState(new Date());

  useEffect(() => {
    setupNotificationHandler();
    runMigrations(sqliteDb).then(async () => {
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
    categoryId: string | null,
    note?: string,
    dueDate?: Date | null,
  ) {
    await handleCreate(title, categoryId, note, dueDate);
    setTodoFormVisible(false);
    if (dueDate) setCalendarKey((k) => k + 1); // 캘린더 연동 반영
  }

  function handleEditDueDate(id: string, current: Date | null) {
    setDueDateTodoId(id);
    setDueDateValue(current ?? new Date());
  }

  async function handleDueDateSave() {
    if (!dueDateTodoId) return;
    await handleUpdateDueDate(dueDateTodoId, dueDateValue);
    setDueDateTodoId(null);
    setCalendarKey((k) => k + 1); // 캘린더 연동 반영
  }

  async function handleDueDateClear() {
    if (!dueDateTodoId) return;
    await handleUpdateDueDate(dueDateTodoId, null);
    setDueDateTodoId(null);
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
          <View style={{ flex: 1 }}>
            <MonthView key={calendarKey} onDayPress={(date) => setSelectedDate(date)} />
            <DayDetailPanel
              key={`${selectedDate.toDateString()}-${calendarKey}`}
              date={selectedDate}
              onEventPress={(event) => setSelectedEvent(event)}
            />
          </View>
        )}
        {activeTab === "todo" && (
          <TodoList
            sections={sections}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEditDueDate={handleEditDueDate}
          />
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
              onTodoCreated={() => {
                setSelectedEvent(null);
                setCalendarKey((k) => k + 1);
              }}
            />
          )}
        </Modal>

        {/* 마감일 편집 모달 */}
        <Modal
          visible={dueDateTodoId !== null}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setDueDateTodoId(null)}
        >
          <SafeAreaView style={[styles.dueDateModal, { backgroundColor: colors.background.primary }]}>
            <View style={[styles.dueDateHeader, { borderBottomColor: colors.border.default }]}>
              <Pressable onPress={() => setDueDateTodoId(null)} style={styles.headerBtn}>
                <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>취소</Text>
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>마감일</Text>
              <Pressable onPress={handleDueDateSave} style={styles.headerBtn}>
                <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>완료</Text>
              </Pressable>
            </View>

            {DateTimePicker ? (
              <DateTimePicker
                value={dueDateValue}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_: unknown, d?: Date) => { if (d) setDueDateValue(d); }}
              />
            ) : (
              <Text style={{ padding: 16, color: colors.text.secondary }}>
                {dueDateValue.toLocaleDateString("ko-KR")}
              </Text>
            )}

            <Pressable onPress={handleDueDateClear} style={styles.clearDueDateBtn}>
              <Text style={{ color: colors.status.error, fontSize: 16 }}>마감일 없음</Text>
            </Pressable>
          </SafeAreaView>
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
  dueDateModal: {
    flex: 1,
  },
  dueDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  headerBtnText: {
    fontSize: 17,
  },
  clearDueDateBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
});
