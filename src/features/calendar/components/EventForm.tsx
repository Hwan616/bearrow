import * as Crypto from "expo-crypto";
import React, { useEffect, useImperativeHandle, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCategoriesByScope } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";
import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { createEvent, updateEvent } from "../api/events";
import type { Event } from "../types";
import { cancelEventNotification, scheduleEventNotification } from "../api/notifications";
import {
  type EventFormValues,
  type RecurrenceOption,
  buildNewEvent,
  formatDateTimeLabel,
  makeDefaultValues,
  validateEventTimes,
} from "../utils/eventFormUtils";
import {
  REMINDER_OPTIONS,
  getReminderLabel,
  shouldScheduleNotification,
} from "../utils/notificationUtils";
const RECURRENCE_OPTIONS: { value: RecurrenceOption; label: string }[] = [
  { value: "none", label: "반복 없음" },
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
];

// DateTimePicker는 웹에서 사용 불가 — 플랫폼별 조건부 require
const DateTimePicker =
  Platform.OS !== "web"
    ? (require("@react-native-community/datetimepicker") as { default: React.ComponentType<Record<string, unknown>> }).default
    : null;

export interface EventFormHandle {
  submit(): void;
}

interface Props {
  initialEvent?: Event;
  initialDate?: Date;
  hideHeader?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const EventForm = React.forwardRef<EventFormHandle, Props>(
function EventForm({ initialEvent, initialDate, hideHeader = false, onSave, onCancel }, ref) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [categories, setCategories] = useState<Category[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues: makeDefaultValues(initialEvent, initialDate ?? new Date()),
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const isAllDay = watch("isAllDay");

  useEffect(() => {
    getCategoriesByScope("event").then(setCategories);
  }, []);

  // 카테고리 로드 후 기본값 설정: 신규이거나 기존 categoryId가 이 scope에 없으면 첫 번째로
  useEffect(() => {
    if (categories.length === 0 || !categories[0]) return;
    const currentId = initialEvent?.categoryId ?? "";
    const isValid = categories.some((c) => c.id === currentId);
    if (!initialEvent || !isValid) {
      setValue("categoryId", categories[0].id);
    }
  }, [categories, initialEvent, setValue]);

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
      await cancelEventNotification(id);
      if (shouldScheduleNotification(data.startsAt, data.reminderMinutes ?? null)) {
        await scheduleEventNotification({
          id: data.id,
          title: data.title,
          startsAt: data.startsAt,
          reminderMinutes: data.reminderMinutes ?? null,
        });
      }
      onSave();
    } catch {
      setSaveError("저장 중 오류가 발생했습니다.");
    }
  }

  useImperativeHandle(ref, () => ({
    submit: () => { void handleSubmit(onSubmit)(); },
  }));

  const inner = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {!hideHeader && (
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
      )}

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

        {/* 카테고리 */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <EventCategoryPicker
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                  colors={colors}
                />
              )}
            />
          </View>
        )}

        {/* 종일 · 시작 · 종료 */}
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
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
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

        {/* 알림 · 반복 */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="reminderMinutes"
            render={({ field }) => (
              <ReminderPicker
                value={field.value}
                onChange={field.onChange}
                colors={colors}
              />
            )}
          />
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <Controller
            control={control}
            name="recurrence"
            render={({ field }) => (
              <RecurrencePicker
                value={field.value}
                onChange={field.onChange}
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

  if (hideHeader) return inner;
  return <SafeAreaView style={styles.container}>{inner}</SafeAreaView>;
});

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

// ── RecurrencePicker ───────────────────────────────────────────────────────

interface RecurrencePickerProps {
  value: RecurrenceOption;
  onChange: (v: RecurrenceOption) => void;
  colors: ColorTokens;
}

function RecurrencePicker({ value, onChange, colors }: RecurrencePickerProps) {
  const styles = makeStyles(colors);
  return (
    <View>
      {RECURRENCE_OPTIONS.map((opt, idx) => (
        <View key={opt.value}>
          <Pressable
            style={styles.row}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === opt.value }}
          >
            <Text style={styles.label}>{opt.label}</Text>
            {value === opt.value && (
              <Text style={{ color: colors.accent.primary, fontSize: 18 }}>✓</Text>
            )}
          </Pressable>
          {idx < RECURRENCE_OPTIONS.length - 1 && (
            <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          )}
        </View>
      ))}
    </View>
  );
}

// ── EventCategoryPicker ────────────────────────────────────────────────────

interface EventCategoryPickerProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  colors: ColorTokens;
}

function EventCategoryPicker({ categories, value, onChange, colors }: EventCategoryPickerProps) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.categoryRow}>
      <Text style={styles.label}>카테고리</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.chip,
              value === cat.id && { borderColor: cat.color, backgroundColor: cat.color + "22" },
            ]}
            onPress={() => onChange(cat.id)}
          >
            <View style={[styles.chipDot, { backgroundColor: cat.color }]} />
            <Text
              style={[styles.chipText, value === cat.id && { color: cat.color, fontWeight: "600" }]}
            >
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ── ReminderPicker ─────────────────────────────────────────────────────────

interface ReminderPickerProps {
  value: number | null;
  onChange: (v: number | null) => void;
  colors: ColorTokens;
}

function ReminderPicker({ value, onChange, colors }: ReminderPickerProps) {
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <Pressable style={styles.row} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.label}>알림</Text>
        <Text style={[styles.dateLabel, { color: colors.accent.primary }]}>
          {getReminderLabel(value)}
        </Text>
      </Pressable>
      {expanded &&
        REMINDER_OPTIONS.map((opt, idx) => (
          <View key={String(opt.minutes)}>
            <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
            <Pressable
              style={styles.row}
              onPress={() => {
                onChange(opt.minutes);
                setExpanded(false);
              }}
              accessibilityRole="menuitem"
            >
              <Text style={[styles.label, { fontSize: 15 }]}>{opt.label}</Text>
              {value === opt.minutes && (
                <Text style={{ color: colors.accent.primary, fontSize: 18 }}>✓</Text>
              )}
            </Pressable>
          </View>
        ))}
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
      backgroundColor: colors.background.tertiary,
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
    categoryRow: {
      paddingVertical: 4,
    },
    chipScroll: {
      marginTop: 4,
      marginBottom: 8,
      marginHorizontal: -4,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginHorizontal: 4,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    chipText: {
      fontSize: 14,
      color: colors.text.secondary,
    },
  });
}
