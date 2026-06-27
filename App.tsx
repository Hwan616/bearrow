import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { sqliteDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { EventForm } from "@/features/calendar/components/EventForm";
import { MonthView } from "@/features/calendar/components/MonthView";
import { useTheme } from "@/theme";

export default function App() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    runMigrations(sqliteDb).then(() => setReady(true));
  }, []);

  function handleSave() {
    setFormVisible(false);
    setCalendarKey((k) => k + 1); // MonthView 재조회
  }

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar style="auto" />

      <MonthView
        key={calendarKey}
        onDayPress={(date) => setSelectedDate(date)}
      />

      {/* 새 일정 FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => setFormVisible(true)}
        accessibilityLabel="새 일정 추가"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </Pressable>

      {/* 일정 생성 폼 모달 */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisible(false)}
      >
        <EventForm
          initialDate={selectedDate}
          onSave={handleSave}
          onCancel={() => setFormVisible(false)}
        />
      </Modal>
    </SafeAreaView>
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
    bottom: 32,
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
});
