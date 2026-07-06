import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";

import { AppBottomSheet } from "@/ui/AppBottomSheet";
import { AppSidePanel } from "@/ui/AppSidePanel";
import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import type { Todo } from "../types";
import type { TodoSection } from "../utils/todoListUtils";
import { TodoList } from "./TodoList";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TodoSheetProps {
  visible: boolean;
  onClose: () => void;
  isWide: boolean;
  selectedDate: Date;
  sections: TodoSection[];
  allTodos: Todo[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onAddTodo: () => void;
  onReorder: (orderedIds: string[]) => Promise<void>;
}

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────────

const DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatSheetDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAYS[date.getDay()]})`;
}

// ── TodoSheet ─────────────────────────────────────────────────────────────────

export function TodoSheet({
  visible,
  onClose,
  isWide,
  selectedDate,
  sections,
  allTodos,
  onToggle,
  onDelete,
  onEdit,
  onAddTodo,
  onReorder,
}: TodoSheetProps) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [isReordering, setIsReordering] = useState(false);

  // 시트가 닫힐 때 정렬 모드 자동 해제
  useEffect(() => {
    if (!visible) setIsReordering(false);
  }, [visible]);

  const content = (
    <View style={s.container} testID="todo-sheet-content">
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: colors.border.default }]}>
        <Text style={[s.dateLabel, { color: colors.text.primary }]}>
          {formatSheetDate(selectedDate)}
        </Text>
        <View style={s.headerActions}>
          <Pressable
            testID="btn-reorder-toggle"
            onPress={() => setIsReordering((v) => !v)}
            style={s.headerBtn}
            accessibilityLabel={isReordering ? "정렬 완료" : "순서 변경"}
            accessibilityRole="button"
          >
            <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>
              {isReordering ? "완료" : "정렬"}
            </Text>
          </Pressable>
          {isWide && (
            <Pressable
              testID="btn-sheet-close"
              onPress={onClose}
              style={s.headerBtn}
              accessibilityLabel="닫기"
              accessibilityRole="button"
            >
              <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 투두 목록 */}
      <View style={s.listContainer}>
        {isReordering ? (
          <ReorderableList
            todos={allTodos}
            onReorder={onReorder}
            colors={colors}
          />
        ) : (
          <TodoList
            sections={sections}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        )}
      </View>

      {/* 새 할일 추가 버튼 */}
      <Pressable
        testID="btn-add-todo-sheet"
        style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
        onPress={onAddTodo}
        accessibilityLabel="새 할일 추가"
        accessibilityRole="button"
      >
        <Text style={s.addBtnText}>＋  새 할일</Text>
      </Pressable>
    </View>
  );

  if (isWide) {
    return (
      <AppSidePanel visible={visible} onClose={onClose} width={320}>
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

// ── ReorderableList ───────────────────────────────────────────────────────────
// 정렬 모드: 미완료 할일을 sortOrder 순으로 나열, ↑↓ 버튼으로 순서 변경

interface ReorderableListProps {
  todos: Todo[];
  onReorder: (orderedIds: string[]) => Promise<void>;
  colors: ColorTokens;
}

function ReorderableList({ todos, onReorder, colors }: ReorderableListProps) {
  const incomplete = todos.filter((t) => !t.isCompleted);
  const [localOrder, setLocalOrder] = useState<Todo[]>(incomplete);
  const localOrderRef = useRef(localOrder);

  // allTodos 변경 시(외부 refresh 후) 로컬 순서 동기화
  useEffect(() => {
    const newIncomplete = todos.filter((t) => !t.isCompleted);
    setLocalOrder(newIncomplete);
    localOrderRef.current = newIncomplete;
  }, [todos]);

  function move(id: string, direction: "up" | "down") {
    const idx = localOrderRef.current.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const newOrder = [...localOrderRef.current];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    const temp = newOrder[idx]!;
    newOrder[idx] = newOrder[swapIdx]!;
    newOrder[swapIdx] = temp;
    localOrderRef.current = newOrder;
    setLocalOrder(newOrder);
    void onReorder(newOrder.map((t) => t.id));
  }

  const s = reorderStyles(colors);

  const renderItem = ({ item, index }: ListRenderItemInfo<Todo>) => (
    <View style={s.row} testID={`reorder-item-${item.id}`}>
      <Text style={s.rowTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={s.arrows}>
        <Pressable
          testID={`btn-move-up-${item.id}`}
          onPress={() => move(item.id, "up")}
          style={[s.arrowBtn, index === 0 && s.arrowBtnDisabled]}
          disabled={index === 0}
          accessibilityLabel="위로 이동"
          accessibilityRole="button"
        >
          <Text style={[s.arrowText, index === 0 && s.arrowTextDisabled]}>↑</Text>
        </Pressable>
        <Pressable
          testID={`btn-move-down-${item.id}`}
          onPress={() => move(item.id, "down")}
          style={[s.arrowBtn, index === localOrder.length - 1 && s.arrowBtnDisabled]}
          disabled={index === localOrder.length - 1}
          accessibilityLabel="아래로 이동"
          accessibilityRole="button"
        >
          <Text style={[s.arrowText, index === localOrder.length - 1 && s.arrowTextDisabled]}>↓</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <FlatList<Todo>
      data={localOrder}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      testID="reorder-list"
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={{ color: colors.text.disabled }}>미완료 할일 없음</Text>
        </View>
      }
    />
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dateLabel: {
      fontSize: 16,
      fontWeight: "600",
    },
    headerActions: {
      flexDirection: "row",
      gap: 4,
    },
    headerBtn: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      minHeight: 44,
      justifyContent: "center",
    },
    headerBtnText: {
      fontSize: 15,
      fontWeight: "500",
    },
    listContainer: { flex: 1 },
    addBtn: {
      margin: 16,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

function reorderStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.default,
      backgroundColor: colors.surface.default,
    },
    rowTitle: {
      flex: 1,
      fontSize: 15,
      color: colors.text.primary,
    },
    arrows: {
      flexDirection: "row",
      gap: 4,
    },
    arrowBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.background.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowBtnDisabled: {
      opacity: 0.3,
    },
    arrowText: {
      fontSize: 18,
      color: colors.accent.primary,
      fontWeight: "600",
    },
    arrowTextDisabled: {
      color: colors.text.disabled,
    },
    empty: {
      paddingVertical: 40,
      alignItems: "center",
    },
  });
}
