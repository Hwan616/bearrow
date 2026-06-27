import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCategories } from "@/features/category/api/categories";
import type { Category } from "@/features/category/types";
import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { formatDueDate } from "../utils/todoDateUtils";

// DateTimePicker — 네이티브 전용 조건부 require
const DateTimePicker =
  Platform.OS !== "web"
    ? (require("@react-native-community/datetimepicker") as { default: React.ComponentType<Record<string, unknown>> }).default
    : null;

type FormValues = {
  title: string;
  note: string;
  categoryId: string | null;
  dueDate: Date | null;
};

interface Props {
  onSave: (title: string, categoryId: string | null, note?: string, dueDate?: Date | null) => Promise<void>;
  onCancel: () => void;
}

export function TodoForm({ onSave, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { title: "", note: "", categoryId: null, dueDate: null },
  });

  async function onSubmit(values: FormValues) {
    await onSave(values.title, values.categoryId, values.note || undefined, values.dueDate);
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
        <Text style={styles.headerTitle}>새 할일</Text>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>추가</Text>
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
                placeholder="할일 제목"
                placeholderTextColor={colors.text.disabled}
                value={field.value}
                onChangeText={field.onChange}
                returnKeyType="done"
                autoFocus
              />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
        </View>

        {/* 카테고리 */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <CategoryPicker
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                  colors={colors}
                />
              )}
            />
          </View>
        )}

        {/* 마감일 */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="dueDate"
            render={({ field }) => (
              <DueDateField value={field.value} onChange={field.onChange} colors={colors} />
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
                placeholder="메모 (선택)"
                placeholderTextColor={colors.text.disabled}
                value={field.value}
                onChangeText={field.onChange}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── CategoryPicker ──────────────────────────────────────────────────────────

interface CategoryPickerProps {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  colors: ColorTokens;
}

function CategoryPicker({ categories, value, onChange, colors }: CategoryPickerProps) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.categoryRow}>
      <Text style={styles.label}>카테고리</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {/* 없음 */}
        <Pressable
          style={[styles.chip, value === null && { borderColor: colors.accent.primary }]}
          onPress={() => onChange(null)}
        >
          <Text style={[styles.chipText, value === null && { color: colors.accent.primary }]}>
            없음
          </Text>
        </Pressable>

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

// ── DueDateField ────────────────────────────────────────────────────────────

interface DueDateFieldProps {
  value: Date | null;
  onChange: (d: Date | null) => void;
  colors: ColorTokens;
}

function DueDateField({ value, onChange, colors }: DueDateFieldProps) {
  const styles = makeStyles(colors);
  const [androidShow, setAndroidShow] = useState(false);

  // 웹 — 텍스트 표시만
  if (Platform.OS === "web" || !DateTimePicker) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>마감일</Text>
        <Pressable onPress={() => onChange(value ? null : new Date())}>
          <Text style={{ color: colors.accent.primary, fontSize: 15 }}>
            {value ? formatDueDate(value) : "없음"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // iOS — compact 인라인
  if (Platform.OS === "ios") {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>마감일</Text>
        <View style={styles.dueDateRight}>
          {value ? (
            <>
              <DateTimePicker
                value={value}
                mode="date"
                display="compact"
                onChange={(_: unknown, selected?: Date) => { if (selected) onChange(selected); }}
              />
              <Pressable onPress={() => onChange(null)} accessibilityLabel="마감일 지우기">
                <Text style={{ color: colors.text.disabled, fontSize: 18, paddingLeft: 8 }}>✕</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => onChange(new Date())}>
              <Text style={{ color: colors.accent.primary, fontSize: 15 }}>추가</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Android — 버튼 탭 → 날짜 다이얼로그
  function handleAndroidChange(event: { type: string }, selected?: Date) {
    setAndroidShow(false);
    if (event.type !== "dismissed" && selected) onChange(selected);
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>마감일</Text>
      <View style={styles.dueDateRight}>
        <Pressable onPress={() => setAndroidShow(true)}>
          <Text style={{ color: colors.accent.primary, fontSize: 15 }}>
            {value ? formatDueDate(value) : "추가"}
          </Text>
        </Pressable>
        {value && (
          <Pressable onPress={() => onChange(null)} accessibilityLabel="마감일 지우기">
            <Text style={{ color: colors.text.disabled, fontSize: 18, paddingLeft: 8 }}>✕</Text>
          </Pressable>
        )}
      </View>
      {androidShow && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
        />
      )}
    </View>
  );
}

// ── 스타일 ──────────────────────────────────────────────────────────────────

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
    dueDateRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    label: {
      fontSize: 16,
      color: colors.text.primary,
      minHeight: 44,
      textAlignVertical: "center",
      lineHeight: 44,
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
      minHeight: 72,
    },
    errorText: {
      fontSize: 13,
      color: colors.status.error,
      paddingBottom: 4,
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
