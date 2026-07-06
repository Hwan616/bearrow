import React, { useState } from "react";
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { createTodoFromEvent } from "@/features/todo/api/todos";
import { useTheme } from "@/theme";

import { deleteEvent } from "../api/events";
import type { Event } from "../types";
import { EventForm } from "./EventForm";

const SHORT_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatEventDatetime(event: Event): string {
  const d = event.startsAt;
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일 (${SHORT_DAYS[d.getDay()]})`;
  if (event.isAllDay) return `${base} 종일`;
  const fmt = (dt: Date) =>
    dt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${base}  ${fmt(event.startsAt)} – ${fmt(event.endsAt)}`;
}

interface Props {
  event: Event;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
  onTodoCreated?: () => void;
}

export function EventDetailSheet({ event, onClose, onSaved, onDeleted, onTodoCreated }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [editVisible, setEditVisible] = useState(false);

  async function handleCreateTodo() {
    try {
      await createTodoFromEvent(event);
      onTodoCreated?.();
      onClose();
    } catch {
      Alert.alert("오류", "할일 생성에 실패했습니다.");
    }
  }

  function handleEditSave() {
    setEditVisible(false);
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert(
      "일정 삭제",
      `"${event.title}" 일정을 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () =>
            void deleteEvent(event.id)
              .then(() => {
                onDeleted?.();
                onClose();
              })
              .catch(() => Alert.alert("오류", "삭제에 실패했습니다.")),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: colors.border.default }]}>
        <Pressable onPress={handleDelete} style={s.headerBtn} accessibilityLabel="일정 삭제">
          <Text style={[s.headerBtnText, { color: colors.status.error }]}>삭제</Text>
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>
          일정 상세
        </Text>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="닫기">
          <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
        </Pressable>
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
        {/* 제목 */}
        <View style={[s.card, { backgroundColor: colors.surface.default }]}>
          <View style={[s.colorBar, { backgroundColor: colors.accent.primary }]} />
          <Text style={s.title}>{event.title}</Text>
        </View>

        {/* 날짜·시간 */}
        <View style={[s.infoRow, { backgroundColor: colors.surface.default }]}>
          <Text style={s.infoLabel}>일시</Text>
          <Text style={s.infoValue}>{formatEventDatetime(event)}</Text>
        </View>

        {/* 메모 */}
        {event.note ? (
          <View style={[s.infoRow, { backgroundColor: colors.surface.default }]}>
            <Text style={s.infoLabel}>메모</Text>
            <Text style={s.infoValue}>{event.note}</Text>
          </View>
        ) : null}

        {/* 편집 버튼 */}
        <Pressable
          style={[s.actionBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => setEditVisible(true)}
        >
          <Text style={s.actionBtnText}>편집</Text>
        </Pressable>

        {/* 할일로 추가 버튼 */}
        <Pressable
          style={[s.actionBtn, { backgroundColor: colors.status.success }]}
          onPress={handleCreateTodo}
        >
          <Text style={s.actionBtnText}>✓ 할일로 추가</Text>
        </Pressable>

        <Text style={s.hint}>
          이 일정을 할일 목록에 추가합니다. 마감일은 이벤트 날짜로 설정됩니다.
        </Text>
      </ScrollView>

      {/* 일정 편집 모달 */}
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <EventForm
          initialEvent={event}
          onSave={handleEditSave}
          onCancel={() => setEditVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "600",
      color: colors.text.primary,
    },
    headerBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    headerBtnText: {
      fontSize: 17,
    },
    body: {
      flex: 1,
    },
    bodyContent: {
      padding: 16,
      gap: 12,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      overflow: "hidden",
      minHeight: 52,
    },
    colorBar: {
      width: 4,
      alignSelf: "stretch",
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text.primary,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    infoRow: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: "500",
    },
    infoValue: {
      fontSize: 15,
      color: colors.text.primary,
    },
    actionBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    actionBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    hint: {
      fontSize: 12,
      color: colors.text.disabled,
      textAlign: "center",
      marginTop: 4,
    },
  });
