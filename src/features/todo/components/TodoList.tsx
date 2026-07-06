import React from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import type { Todo } from "../types";
import type { TodoSection } from "../utils/todoListUtils";
import { TodoItem } from "./TodoItem";

interface Props {
  sections: TodoSection[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}

type ListSection = TodoSection & { data: Todo[] };

export function TodoList({ sections, onToggle, onDelete, onEdit }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const listSections: ListSection[] = sections.map((s) => ({ ...s, data: s.todos }));

  return (
    <SectionList
      sections={listSections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={[styles.colorDot, { backgroundColor: section.categoryColor }]} />
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>
            {section.categoryName}
          </Text>
        </View>
      )}
      renderItem={({ item, index, section }) => {
        const isFirst = index === 0;
        const isLast = index === section.data.length - 1;
        return (
          <View
            style={[
              styles.itemWrapper,
              { backgroundColor: colors.surface.default },
              isFirst && styles.itemFirst,
              isLast && styles.itemLast,
            ]}
          >
            <TodoItem
              todo={item}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </View>
        );
      }}
      ItemSeparatorComponent={() => (
        <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
      )}
      SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
            할일이 없습니다
          </Text>
          <Text style={styles.emptyHint} maxFontSizeMultiplier={1.5}>
            ＋ 버튼으로 새 할일을 추가하세요
          </Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    content: {
      paddingBottom: 100,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      marginHorizontal: 16,
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
    itemWrapper: {
      marginHorizontal: 16,
    },
    itemFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: "hidden",
    },
    itemLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      overflow: "hidden",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 16,
      marginLeft: 50 + 16, // 체크박스 너비 + gap + 섹션 margin
    },
    sectionGap: {
      height: 0,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
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
