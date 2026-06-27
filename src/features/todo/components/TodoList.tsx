import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import type { TodoSection } from "../utils/todoListUtils";
import { TodoItem } from "./TodoItem";

interface Props {
  sections: TodoSection[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEditDueDate?: (id: string, current: Date | null) => void;
}

export function TodoList({ sections, onToggle, onDelete, onEditDueDate }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>할일이 없습니다</Text>
        <Text style={styles.emptyHint}>＋ 버튼으로 새 할일을 추가하세요</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sections.map((section, sectionIdx) => (
        <View key={section.categoryId ?? "uncategorized"} style={styles.section}>
          {/* 섹션 헤더 */}
          <View style={styles.sectionHeader}>
            <View style={[styles.colorDot, { backgroundColor: section.categoryColor }]} />
            <Text style={styles.sectionTitle}>{section.categoryName}</Text>
          </View>

          {/* 할일 목록 */}
          <View style={styles.card}>
            {section.todos.map((todo, idx) => (
              <View key={todo.id}>
                <TodoItem todo={todo} onToggle={onToggle} onDelete={onDelete} onEditDueDate={onEditDueDate} />
                {idx < section.todos.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: 100,
    },
    section: {
      marginTop: 16,
      marginHorizontal: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text.secondary,
      letterSpacing: 0.5,
    },
    card: {
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface.default,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 50, // 체크박스 너비 + gap 만큼 들여쓰기
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyText: {
      fontSize: 17,
      fontWeight: "500",
      color: colors.text.secondary,
    },
    emptyHint: {
      fontSize: 14,
      color: colors.text.disabled,
    },
  });
}
