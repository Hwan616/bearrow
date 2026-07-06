import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppBottomSheet } from "@/ui/AppBottomSheet";
import { AppSidePanel } from "@/ui/AppSidePanel";
import { useTheme } from "@/theme";
import { EventForm } from "./EventForm";
import { TodoForm } from "@/features/todo/components/TodoForm";

export type AddSheetSegment = "event" | "todo";

export interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  isWide: boolean;
  initialDate?: Date;
  initialSegment?: AddSheetSegment;
  onEventSave: () => void;
  onTodoSave: (title: string, categoryId: string, note?: string, dueDate?: Date | null) => Promise<void>;
}

export function AddSheet({
  visible,
  onClose,
  isWide,
  initialDate,
  initialSegment = "event",
  onEventSave,
  onTodoSave,
}: AddSheetProps) {
  const { colors } = useTheme();
  const [segment, setSegment] = useState<AddSheetSegment>(initialSegment);

  useEffect(() => {
    if (visible) setSegment(initialSegment);
  }, [visible, initialSegment]);

  const content = (
    <View testID="add-sheet-content" style={styles.content}>
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        {/* 닫기(좌, wide만) */}
        {isWide ? (
          <Pressable
            testID="btn-add-sheet-close"
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="닫기"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtnText, { color: colors.accent.primary }]}>닫기</Text>
          </Pressable>
        ) : null}
        {/* 세그먼트 (중앙) */}
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
            <Text
              style={[
                styles.segmentText,
                { color: segment === "event" ? colors.text.inverse : colors.text.primary },
              ]}
            >
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
            <Text
              style={[
                styles.segmentText,
                { color: segment === "todo" ? colors.text.inverse : colors.text.primary },
              ]}
            >
              할 일
            </Text>
          </Pressable>
        </View>
        {/* 우측 spacer (wide 모드에서 세그먼트 중앙 정렬 유지) */}
        {isWide ? <View style={styles.closeBtn} /> : null}
      </View>

      <View style={styles.form}>
        {segment === "event" && (
          <EventForm
            initialDate={initialDate}
            onSave={onEventSave}
            onCancel={onClose}
          />
        )}
        {segment === "todo" && (
          <TodoForm
            onSave={onTodoSave}
            onCancel={onClose}
          />
        )}
      </View>
    </View>
  );

  if (isWide) {
    return (
      <AppSidePanel visible={visible} onClose={onClose}>
        {content}
      </AppSidePanel>
    );
  }

  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      {content}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  form: { flex: 1 },
});
