import * as Crypto from "expo-crypto";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { createEvent, updateEvent } from "../api/events";
import type { Event } from "../types";
import {
  type EventFormValues,
  buildNewEvent,
  formatDateTimeLabel,
  makeDefaultValues,
  validateEventTimes,
} from "../utils/eventFormUtils";

// DateTimePicker는 웹에서 사용 불가 — 플랫폼별 조건부 require
const DateTimePicker =
  Platform.OS !== "web"
    ? (require("@react-native-community/datetimepicker") as { default: React.ComponentType<Record<string, unknown>> }).default
    : null;

interface Props {
  initialEvent?: Event;
  initialDate?: Date;
  onSave: () => void;
  onCancel: () => void;
}

export function EventForm({ initialEvent, initialDate, onSave, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues: makeDefaultValues(initialEvent, initialDate ?? new Date()),
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const isAllDay = watch("isAllDay");

  async function onSubmit(values: EventFormValues) {
    const timeError = validateEventTimes(values.startsAt, values.endsAt);
    if (timeError) {
      setSaveError(timeError);
      return;
    }
    setSaveError(null);
    try {
      const id = initialEvent?.id ?? Crypto.randomUUID();
      const data = buildNewEvent(id, values);
      if (initialEvent) {
        await updateEvent(id, data);
      } else {
        await createEvent(data);
      }
      onSave();
    } catch {
      setSaveError("저장 중 오류가 발생했습니다.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>취소</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {initialEvent ? "일정 편집" : "새 일정"}
        </Text>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>저장</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* 제목 */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="title"
            rules={{ required: "제목을 입력해주세요." }}
            render={({ field }) => (
              <TextInput
                style={[styles.titleInput, { color: colors.text.primary }]}
                placeholder="제목"
                placeholderTextColor={colors.text.disabled}
                value={field.value}
                onChangeText={field.onChange}
                returnKeyType="done"
              />
            )}
          />
          {errors.title && (
            <Text style={styles.errorText}>{errors.title.message}</Text>
          )}
        </View>

        {/* 종일 */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>종일</Text>
            <Controller
              control={control}
              name="isAllDay"
              render={({ field }) => (
                <Switch
                  value={field.value}
                  onValueChange={field.onChange}
                  trackColor={{ true: colors.accent.primary }}
                />
              )}
            />
          </View>
        </View>

        {/* 시작·종료 */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="startsAt"
            render={({ field }) => (
              <DateTimeField
                label="시작"
                value={field.value}
                onChange={field.onChange}
                isAllDay={isAllDay}
                colors={colors}
              />
            )}
          />
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <Controller
            control={control}
            name="endsAt"
            render={({ field }) => (
              <DateTimeField
                label="종료"
                value={field.value}
                onChange={field.onChange}
                isAllDay={isAllDay}
                colors={colors}
              />
            )}
          />
        </View>

        {/* 메모 */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <TextInput
                style={[styles.noteInput, { color: colors.text.primary }]}
                placeholder="메모"
                placeholderTextColor={colors.text.disabled}
                value={field.value}
                onChangeText={field.onChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
        </View>

        {saveError && (
          <Text style={styles.errorText}>{saveError}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── DateTimeField ──────────────────────────────────────────────────────────

interface DateTimeFieldProps {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  isAllDay: boolean;
  colors: ColorTokens;
}

function DateTimeField({ label, value, onChange, isAllDay, colors }: DateTimeFieldProps) {
  const styles = makeStyles(colors);
  const [showAndroid, setShowAndroid] = useState(false);
  const [androidPhase, setAndroidPhase] = useState<"date" | "time">("date");

  // 웹: DateTimePicker 없이 레이블만 표시
  if (Platform.OS === "web" || !DateTimePicker) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.dateLabel, { color: colors.accent.primary }]}>
          {formatDateTimeLabel(value, isAllDay)}
        </Text>
      </View>
    );
  }

  // iOS: compact 피커 인라인 표시
  if (Platform.OS === "ios") {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <DateTimePicker
          value={value}
          mode={isAllDay ? "date" : "datetime"}
          display="compact"
          onChange={(_: unknown, selected?: Date) => {
            if (selected) onChange(selected);
          }}
        />
      </View>
    );
  }

  // Android: 날짜 → (종일 아니면) 시각 다이얼로그
  function handleAndroidPress() {
    setAndroidPhase("date");
    setShowAndroid(true);
  }

  function handleAndroidChange(event: { type: string }, selected?: Date) {
    if (!selected || event.type === "dismissed") {
      setShowAndroid(false);
      setAndroidPhase("date");
      return;
    }
    if (androidPhase === "date") {
      const merged = new Date(value);
      merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(merged);
      if (isAllDay) {
        setShowAndroid(false);
      } else {
        setAndroidPhase("time");
        // key 변경으로 DateTimePicker 리마운트 → 시각 다이얼로그 자동 표시
      }
    } else {
      const merged = new Date(value);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(merged);
      setShowAndroid(false);
      setAndroidPhase("date");
    }
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={handleAndroidPress}>
        <Text style={[styles.dateLabel, { color: colors.accent.primary }]}>
          {formatDateTimeLabel(value, isAllDay)}
        </Text>
      </Pressable>
      {showAndroid && (
        <DateTimePicker
          key={androidPhase}
          value={value}
          mode={androidPhase}
          display="default"
          onChange={handleAndroidChange}
        />
      )}
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      borderBottomColor: colors.border.default,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text.primary,
    },
    headerBtn: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
    },
    headerBtnText: {
      fontSize: 17,
    },
    body: {
      flex: 1,
    },
    section: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor: colors.surface.default,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 44,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 0,
    },
    label: {
      fontSize: 16,
      color: colors.text.primary,
    },
    dateLabel: {
      fontSize: 15,
      flexShrink: 1,
      textAlign: "right",
    },
    titleInput: {
      fontSize: 18,
      fontWeight: "500",
      paddingVertical: 12,
      minHeight: 44,
    },
    noteInput: {
      fontSize: 15,
      paddingVertical: 12,
      minHeight: 88,
    },
    errorText: {
      fontSize: 13,
      color: colors.status.error,
      paddingVertical: 4,
    },
  });
}
