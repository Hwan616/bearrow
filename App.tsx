import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { sqliteDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { EventForm } from "@/features/calendar/components/EventForm";
import { MonthView } from "@/features/calendar/components/MonthView";
import {
  requestNotificationPermission,
  setupNotificationHandler,
} from "@/features/calendar/api/notifications";
import { TodoForm } from "@/features/todo/components/TodoForm";
import { TodoList } from "@/features/todo/components/TodoList";
import { useTodos } from "@/features/todo/hooks/useTodos";
import { useTheme } from "@/theme";

type Tab = "calendar" | "todo";

export default function App() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  // 캘린더 상태
  const [calendarKey, setCalendarKey] = useState(0);
  const [eventFormVisible, setEventFormVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 투두 상태
  const [todoFormVisible, setTodoFormVisible] = useState(false);
  const { sections, handleToggle, handleDelete, handleCreate } = useTodos();

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
  ) {
    await handleCreate(title, categoryId, note);
    setTodoFormVisible(false);
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
        {activeTab === "calendar" ? (
          <MonthView key={calendarKey} onDayPress={(date) => setSelectedDate(date)} />
        ) : (
          <TodoList
            sections={sections}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}

        {/* 탭별 FAB */}
        {activeTab === "calendar" ? (
          <Pressable
            style={[styles.fab, { backgroundColor: colors.accent.primary }]}
            onPress={() => setEventFormVisible(true)}
            accessibilityLabel="새 일정 추가"
          >
            <Text style={styles.fabIcon}>＋</Text>
          </Pressable>
        ) : (
          <Pressable
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
