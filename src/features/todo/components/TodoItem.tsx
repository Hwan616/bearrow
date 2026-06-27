import React, { useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import type { Todo } from "../types";

interface Props {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const swipeRef = useRef<Swipeable>(null);

  function handleDelete() {
    onDelete(todo.id);
  }

  function renderDeleteAction() {
    return (
      <Pressable style={styles.deleteAction} onPress={handleDelete} accessibilityLabel="삭제">
        <Text style={styles.deleteText}>삭제</Text>
      </Pressable>
    );
  }

  const content = (
    <Pressable
      style={styles.row}
      onPress={() => onToggle(todo.id, !todo.isCompleted)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: todo.isCompleted }}
    >
      {/* 체크박스 */}
      <View style={[styles.checkbox, todo.isCompleted && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary }]}>
        {todo.isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* 텍스트 */}
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.title,
            todo.isCompleted && styles.titleCompleted,
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        {todo.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {todo.note}
          </Text>
        ) : null}
      </View>

      {/* 웹: 항상 삭제 버튼 노출 (스와이프 불가) */}
      {Platform.OS === "web" && (
        <Pressable onPress={handleDelete} style={styles.webDeleteBtn} accessibilityLabel="삭제">
          <Text style={{ color: colors.status.error, fontSize: 16 }}>✕</Text>
        </Pressable>
      )}
    </Pressable>
  );

  if (Platform.OS === "web") {
    return content;
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderDeleteAction} overshootRight={false}>
      {content}
    </Swipeable>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface.default,
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border.default,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    checkmark: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 16,
    },
    textBlock: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      color: colors.text.primary,
    },
    titleCompleted: {
      textDecorationLine: "line-through",
      color: colors.text.disabled,
    },
    note: {
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 2,
    },
    deleteAction: {
      backgroundColor: colors.status.error,
      justifyContent: "center",
      alignItems: "center",
      width: 72,
    },
    deleteText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    webDeleteBtn: {
      padding: 8,
    },
  });
}
