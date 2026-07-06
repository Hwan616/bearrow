import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";
import { TodoForm } from "@/features/todo/components/TodoForm";
import type { TodoFormHandle } from "@/features/todo/components/TodoForm";

import { EventForm } from "./EventForm";
import type { EventFormHandle } from "./EventForm";

export type AddSheetSegment = "event" | "todo";

export interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  isWide: boolean;
  initialDate?: Date;
  initialSegment?: AddSheetSegment;
  onEventSave: () => void;
  onTodoSave: (title: string, categoryId: string, note?: string) => Promise<void>;
}

export function AddSheet({
  visible,
  onClose,
  initialDate,
  initialSegment = "event",
  onEventSave,
  onTodoSave,
}: AddSheetProps) {
  const { colors } = useTheme();
  const [segment, setSegment] = useState<AddSheetSegment>(initialSegment);
  const eventFormRef = useRef<EventFormHandle>(null);
  const todoFormRef = useRef<TodoFormHandle>(null);

  useEffect(() => {
    if (visible) setSegment(initialSegment);
  }, [visible, initialSegment]);

  function handleSave() {
    if (segment === "event") eventFormRef.current?.submit();
    else todoFormRef.current?.submit();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* 헤더: 닫기(좌) — 세그먼트(중) — 추가(우) */}
        <View style={[styles.header, { borderBottomColor: colors.border.default, backgroundColor: colors.surface.default }]}>
          <Pressable
            testID="btn-add-sheet-close"
            onPress={onClose}
            style={styles.headerBtn}
            accessibilityLabel="닫기"
            accessibilityRole="button"
          >
            <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
          </Pressable>

          <View style={styles.segmentRow}>
            <Pressable
              testID="btn-segment-event"
              style={[
                styles.segmentBtn,
                { borderColor: colors.border.default },
                segment === "event" && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
              ]}
              onPress={() => setSegment("event")}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, { color: segment === "event" ? colors.text.inverse : colors.text.primary }]}>
                일정
              </Text>
            </Pressable>
            <Pressable
              testID="btn-segment-todo"
              style={[
                styles.segmentBtn,
                { borderColor: colors.border.default },
                segment === "todo" && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
              ]}
              onPress={() => setSegment("todo")}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, { color: segment === "todo" ? colors.text.inverse : colors.text.primary }]}>
                ToDo
              </Text>
            </Pressable>
          </View>

          <Pressable
            testID="btn-add-sheet-save"
            onPress={handleSave}
            style={styles.headerBtn}
            accessibilityLabel="추가"
            accessibilityRole="button"
          >
            <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>추가</Text>
          </Pressable>
        </View>

        <View testID="add-sheet-content" style={{ flex: 1 }}>
          {segment === "event" && (
            <EventForm
              ref={eventFormRef}
              hideHeader
              initialDate={initialDate}
              onSave={onEventSave}
              onCancel={onClose}
            />
          )}
          {segment === "todo" && (
            <TodoForm
              ref={todoFormRef}
              hideHeader
              onSave={onTodoSave}
              onCancel={onClose}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
    minHeight: 44,
    justifyContent: "center",
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
