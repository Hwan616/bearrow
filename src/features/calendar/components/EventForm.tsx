import * as Crypto from "expo-crypto";
import React, { useEffect, useImperativeHandle, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
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

import {
  createEvent,
  createExceptionEvent,
  deleteAllRecurring,
  deleteEvent,
  deleteExceptionInstance,
  deleteThisAndFollowing,
  editAllRecurring,
  splitAndEditThisAndFollowing,
  updateEvent,
} from "../api/events";
import type { Event } from "../types";
import { cancelEventNotification, scheduleEventNotification } from "../api/notifications";
import {
  type EventFormValues,
  type RecurrenceEnd,
  type RecurrenceOption,
  buildNewEvent,
  formatDateTimeLabel,
  makeDefaultValues,
  normalizeAllDayTimes,
  validateEventTimes,
} from "../utils/eventFormUtils";
import {
  REMINDER_OPTIONS,
  getReminderLabel,
  shouldScheduleNotification,
} from "../utils/notificationUtils";

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
  onDelete?: () => void;
  onCancel: () => void;
}

export const EventForm = React.forwardRef<EventFormHandle, Props>(
function EventForm({ initialEvent, initialDate, hideHeader = false, onSave, onDelete, onCancel }, ref) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [categories, setCategories] = useState<Category[]>([]);

  // 반복 인스턴스 감지
  // - 가상 인스턴스: id = "masterId:utcMs" (DB에 없는 전개 결과)
  // - 실제 예외: recurringEventId가 있는 DB row
  const isVirtualInstance = (initialEvent?.id ?? "").includes(":");
  const isRealException = !isVirtualInstance && (initialEvent?.recurringEventId ?? null) !== null;
  const isRecurring = isVirtualInstance || isRealException;

  const masterId = isVirtualInstance
    ? (initialEvent!.id.split(":")[0] ?? null)
    : (initialEvent?.recurringEventId ?? null);

  const instanceDate: Date | null = (() => {
    if (isVirtualInstance && initialEvent) {
      const utcMs = parseInt(initialEvent.id.split(":")[1] ?? "0", 10);
      const utcDate = new Date(utcMs);
      return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
    }
    if (isRealException) return initialEvent?.exceptionDate ?? null;
    return null;
  })();

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
  const recurrenceEnd = watch("recurrenceEnd");

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

  async function handleNotification(data: {
    id: string;
    title: string;
    startsAt: Date;
    reminderMinutes?: number | null;
  }) {
    const reminderMinutes = data.reminderMinutes ?? null;
    await cancelEventNotification(data.id);
    if (shouldScheduleNotification(data.startsAt, reminderMinutes)) {
      await scheduleEventNotification({
        id: data.id,
        title: data.title,
        startsAt: data.startsAt,
        reminderMinutes,
      });
    }
  }

  type SaveScope = "create" | "update" | "thisOnly" | "thisAndFollowing" | "all";

  async function performSave(values: EventFormValues, scope: SaveScope) {
    const { startsAt, endsAt } = values.isAllDay
      ? normalizeAllDayTimes(values.startsAt, values.endsAt)
      : { startsAt: values.startsAt, endsAt: values.endsAt };
    const finalValues = { ...values, startsAt, endsAt };

    try {
      if (scope === "create") {
        const data = buildNewEvent(Crypto.randomUUID(), finalValues);
        await createEvent(data);
        await handleNotification(data);
      } else if (scope === "update") {
        const data = buildNewEvent(initialEvent!.id, finalValues);
        await updateEvent(initialEvent!.id, data);
        await handleNotification(data);
      } else if (scope === "thisOnly") {
        const data = buildNewEvent(Crypto.randomUUID(), finalValues);
        await createExceptionEvent(masterId!, instanceDate!, data);
        await handleNotification(data);
      } else if (scope === "thisAndFollowing") {
        const data = buildNewEvent(Crypto.randomUUID(), finalValues);
        await splitAndEditThisAndFollowing(masterId!, instanceDate!, data);
        await handleNotification(data);
      } else if (scope === "all") {
        const data = buildNewEvent(masterId!, finalValues);
        await editAllRecurring(masterId!, data);
        await handleNotification(data);
      }
      onSave();
    } catch {
      setSaveError("저장 중 오류가 발생했습니다.");
    }
  }

  async function onSubmit(values: EventFormValues) {
    const timeError = validateEventTimes(values.startsAt, values.endsAt);
    if (timeError) {
      setSaveError(timeError);
      return;
    }
    setSaveError(null);

    if (!initialEvent) {
      await performSave(values, "create");
      return;
    }

    if (isRecurring) {
      Alert.alert("반복 일정 편집", "변경 범위를 선택하세요.", [
        { text: "이 이벤트만", onPress: () => { void performSave(values, "thisOnly"); } },
        { text: "이 이벤트 및 이후 이벤트", onPress: () => { void performSave(values, "thisAndFollowing"); } },
        { text: "모든 이벤트", onPress: () => { void performSave(values, "all"); } },
        { text: "취소", style: "cancel" },
      ]);
    } else {
      await performSave(values, "update");
    }
  }

  function handleDelete() {
    if (!initialEvent) return;

    if (isRecurring) {
      Alert.alert("반복 일정 삭제", "삭제 범위를 선택하세요.", [
        {
          text: "이 이벤트만",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteExceptionInstance(masterId!, instanceDate!);
                onDelete?.();
              } catch {
                Alert.alert("오류", "삭제에 실패했습니다.");
              }
            })();
          },
        },
        {
          text: "이 이벤트 및 이후 이벤트",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteThisAndFollowing(masterId!, instanceDate!);
                onDelete?.();
              } catch {
                Alert.alert("오류", "삭제에 실패했습니다.");
              }
            })();
          },
        },
        {
          text: "모든 이벤트",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteAllRecurring(masterId!);
                onDelete?.();
              } catch {
                Alert.alert("오류", "삭제에 실패했습니다.");
              }
            })();
          },
        },
        { text: "취소", style: "cancel" },
      ]);
    } else {
      Alert.alert("일정 삭제", `"${initialEvent.title}" 일정을 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteEvent(initialEvent.id);
                onDelete?.();
              } catch {
                Alert.alert("오류", "삭제에 실패했습니다.");
              }
            })();
          },
        },
      ]);
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
                isDark={isDark}
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
                isDark={isDark}
              />
            )}
          />
        </View>

        {/* 알림 */}
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
        </View>

        {/* 반복 */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="recurrence"
            render={({ field }) => (
              <RecurrencePicker
                value={field.value}
                onChange={field.onChange}
                end={recurrenceEnd}
                onEndChange={(e) => setValue("recurrenceEnd", e)}
                colors={colors}
                isDark={isDark}
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

        {/* 삭제 버튼 (편집 시에만) */}
        {initialEvent && (
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>일정 삭제</Text>
          </Pressable>
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
  isDark: boolean;
}

function DateTimeField({ label, value, onChange, isAllDay, colors, isDark }: DateTimeFieldProps) {
  const styles = makeStyles(colors);
  const [showAndroid, setShowAndroid] = useState(false);
  const [androidPhase, setAndroidPhase] = useState<"date" | "time">("date");
  const themeVariant = isDark ? "dark" : "light";

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
          themeVariant={themeVariant}
          accentColor={colors.accent.primary}
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
          themeVariant={themeVariant}
          onChange={handleAndroidChange}
        />
      )}
    </View>
  );
}

// ── RecurrencePicker ───────────────────────────────────────────────────────

const RECURRENCE_OPTIONS: { value: RecurrenceOption; label: string }[] = [
  { value: "none", label: "반복 없음" },
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "biweekly", label: "2주마다" },
  { value: "monthly", label: "매월" },
  { value: "yearly", label: "매년" },
];

interface RecurrencePickerProps {
  value: RecurrenceOption;
  onChange: (v: RecurrenceOption) => void;
  end: RecurrenceEnd;
  onEndChange: (e: RecurrenceEnd) => void;
  colors: ColorTokens;
  isDark: boolean;
}

function RecurrencePicker({ value, onChange, end, onEndChange, colors, isDark }: RecurrencePickerProps) {
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const selectedLabel = RECURRENCE_OPTIONS.find((o) => o.value === value)?.label ?? "반복 없음";

  return (
    <View>
      <Pressable style={styles.row} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.label}>반복</Text>
        <Text style={[styles.dateLabel, { color: colors.accent.primary }]}>{selectedLabel}</Text>
      </Pressable>

      {expanded &&
        RECURRENCE_OPTIONS.map((opt) => (
          <View key={opt.value}>
            <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
            <Pressable
              style={styles.row}
              onPress={() => { onChange(opt.value); setExpanded(false); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === opt.value }}
            >
              <Text style={[styles.label, { fontSize: 15 }]}>{opt.label}</Text>
              {value === opt.value && (
                <Text style={{ color: colors.accent.primary, fontSize: 18 }}>✓</Text>
              )}
            </Pressable>
          </View>
        ))}

      {value !== "none" && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <RecurrenceEndPicker value={end} onChange={onEndChange} colors={colors} isDark={isDark} />
        </>
      )}
    </View>
  );
}

// ── RecurrenceEndPicker ────────────────────────────────────────────────────

interface RecurrenceEndPickerProps {
  value: RecurrenceEnd;
  onChange: (e: RecurrenceEnd) => void;
  colors: ColorTokens;
  isDark: boolean;
}

function RecurrenceEndPicker({ value, onChange, colors, isDark }: RecurrenceEndPickerProps) {
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const endLabel =
    value.type === "never"
      ? "종료 안 함"
      : value.type === "count"
        ? `${value.count}회 후 종료`
        : `${value.date.getFullYear()}년 ${value.date.getMonth() + 1}월 ${value.date.getDate()}일`;

  return (
    <View>
      <Pressable style={styles.row} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.label}>종료</Text>
        <Text style={[styles.dateLabel, { color: colors.accent.primary }]}>{endLabel}</Text>
      </Pressable>

      {expanded && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <Pressable
            style={styles.row}
            onPress={() => { onChange({ type: "never" }); setExpanded(false); }}
          >
            <Text style={[styles.label, { fontSize: 15 }]}>종료 안 함</Text>
            {value.type === "never" && (
              <Text style={{ color: colors.accent.primary, fontSize: 18 }}>✓</Text>
            )}
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 15 }]}>횟수 후 종료</Text>
            <TextInput
              style={[styles.dateLabel, { color: colors.accent.primary, minWidth: 40, textAlign: "right" }]}
              keyboardType="number-pad"
              value={value.type === "count" ? String(value.count) : ""}
              placeholder="N"
              placeholderTextColor={colors.text.disabled}
              onFocus={() => {
                if (value.type !== "count") onChange({ type: "count", count: 10 });
              }}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                if (!isNaN(n) && n > 0) onChange({ type: "count", count: n });
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <Pressable
            style={styles.row}
            onPress={() => {
              if (value.type !== "until") onChange({ type: "until", date: new Date() });
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.label, { fontSize: 15 }]}>날짜 지정</Text>
            {value.type === "until" && (
              <Text style={[styles.dateLabel, { color: colors.accent.primary }]}>
                {value.date.getFullYear()}년 {value.date.getMonth() + 1}월 {value.date.getDate()}일
              </Text>
            )}
          </Pressable>

          {showDatePicker && DateTimePicker && (
            <DateTimePicker
              value={value.type === "until" ? value.date : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              themeVariant={isDark ? "dark" : "light"}
              onChange={(_: unknown, selected?: Date) => {
                if (selected) onChange({ type: "until", date: selected });
                if (Platform.OS !== "ios") setShowDatePicker(false);
              }}
            />
          )}
        </>
      )}
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
    deleteBtn: {
      marginTop: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.background.tertiary,
    },
    deleteBtnText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.status.error,
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
