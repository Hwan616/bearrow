import React, { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";
import { PlusIcon } from "@/ui/Icons";

import { useCategories } from "../hooks/useCategories";
import type { Category, CategoryScope } from "../types";
import { CategoryForm } from "./CategoryForm";

interface Props {
  onClose: () => void;
}

export function CategoryManager({ onClose }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [scope, setScope] = useState<CategoryScope>("event");
  const { categories, handleCreate, handleUpdate, handleDelete } = useCategories(scope);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());
  const openSwipeId = useRef<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEdit(cat: Category) {
    swipeRefs.current.get(cat.id)?.close();
    setEditing(cat);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditing(null);
  }

  async function handleSave(name: string, color: string) {
    if (editing) {
      await handleUpdate(editing.id, name, color);
    } else {
      await handleCreate(name, color);
    }
    closeForm();
  }

  function confirmDelete(cat: Category) {
    if (categories.length <= 1) {
      Alert.alert("삭제 불가", "마지막 카테고리는 삭제할 수 없습니다.");
      return;
    }
    Alert.alert(
      "카테고리 삭제",
      `"${cat.name}" 카테고리를 삭제하시겠습니까?\n이 카테고리의 ${scope === "event" ? "일정" : "할일"}은 다른 카테고리로 자동 이동합니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () =>
            void handleDelete(cat.id).catch(() =>
              Alert.alert("오류", "카테고리 삭제에 실패했습니다."),
            ),
        },
      ],
    );
  }

  function confirmDeleteFromForm() {
    if (!editing) return;
    const cat = editing;
    if (categories.length <= 1) {
      Alert.alert("삭제 불가", "마지막 카테고리는 삭제할 수 없습니다.");
      return;
    }
    Alert.alert(
      "카테고리 삭제",
      `"${cat.name}" 카테고리를 삭제하시겠습니까?\n이 카테고리의 ${scope === "event" ? "일정" : "할일"}은 다른 카테고리로 자동 이동합니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () =>
            void handleDelete(cat.id)
              .then(() => closeForm())
              .catch(() => Alert.alert("오류", "카테고리 삭제에 실패했습니다.")),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background.primary }]}>
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: colors.border.default }]}>
        <Pressable onPress={onClose} style={s.headerBtn}>
          <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text.primary }]}>카테고리 관리</Text>
        <Pressable onPress={openCreate} style={s.headerBtn} accessibilityLabel="카테고리 추가">
          <PlusIcon size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* 탭: 일정 / ToDo */}
      <View style={[s.tabRow, { borderBottomColor: colors.border.default }]}>
        <Pressable
          style={[s.tab, scope === "event" && { borderBottomColor: colors.accent.primary }]}
          onPress={() => setScope("event")}
        >
          <Text style={[s.tabText, { color: scope === "event" ? colors.accent.primary : colors.text.secondary }]}>
            일정
          </Text>
        </Pressable>
        <Pressable
          style={[s.tab, scope === "todo" && { borderBottomColor: colors.accent.primary }]}
          onPress={() => setScope("todo")}
        >
          <Text style={[s.tabText, { color: scope === "todo" ? colors.accent.primary : colors.text.secondary }]}>
            ToDo
          </Text>
        </Pressable>
      </View>

      {/* 목록 */}
      <ScrollView contentContainerStyle={s.list}>
        <View style={[s.card, { backgroundColor: colors.surface.default }]}>
          {categories.map((cat, idx) => (
            <View key={cat.id}>
              {idx > 0 && (
                <View style={[s.divider, { backgroundColor: colors.border.default }]} />
              )}
              <Swipeable
                ref={(ref) => {
                  if (ref) swipeRefs.current.set(cat.id, ref);
                  else swipeRefs.current.delete(cat.id);
                }}
                renderRightActions={() =>
                  categories.length > 1 ? (
                    <Pressable
                      style={[s.swipeDeleteBtn, { backgroundColor: colors.status.error }]}
                      onPress={() => {
                        swipeRefs.current.get(cat.id)?.close();
                        confirmDelete(cat);
                      }}
                    >
                      <Text style={s.swipeDeleteText}>삭제</Text>
                    </Pressable>
                  ) : null
                }
                overshootRight={false}
                onSwipeableOpen={() => {
                  if (openSwipeId.current && openSwipeId.current !== cat.id) {
                    swipeRefs.current.get(openSwipeId.current)?.close();
                  }
                  openSwipeId.current = cat.id;
                }}
                onSwipeableClose={() => {
                  if (openSwipeId.current === cat.id) openSwipeId.current = null;
                }}
              >
                <Pressable
                  style={[s.row, { backgroundColor: colors.surface.default }]}
                  onPress={() => openEdit(cat)}
                  accessibilityLabel={`${cat.name} 편집`}
                >
                  <View style={[s.dot, { backgroundColor: cat.color }]} />
                  <Text style={[s.name, { color: colors.text.primary }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </Pressable>
              </Swipeable>
            </View>
          ))}
        </View>

        {categories.length <= 1 && (
          <Text style={[s.hint, { color: colors.text.disabled }]}>
            카테고리가 1개일 때는 삭제할 수 없습니다.
          </Text>
        )}
      </ScrollView>

      {/* 카테고리 생성·편집 모달 */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <CategoryForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={closeForm}
          onDelete={editing ? confirmDeleteFromForm : undefined}
        />
      </Modal>
    </SafeAreaView>
  );
}

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
    headerTitle: { fontSize: 17, fontWeight: "600" },
    headerBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
    headerBtnText: { fontSize: 17 },
    tabRow: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabText: { fontSize: 15, fontWeight: "600" },
    list: { padding: 16, gap: 8 },
    card: { borderRadius: 12, overflow: "hidden" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      gap: 12,
      paddingHorizontal: 16,
    },
    dot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
    name: { flex: 1, fontSize: 16 },
    swipeDeleteBtn: {
      width: 80,
      justifyContent: "center",
      alignItems: "center",
    },
    swipeDeleteText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
    divider: { height: StyleSheet.hairlineWidth },
    hint: { fontSize: 13, textAlign: "center", paddingTop: 8 },
  });
}
