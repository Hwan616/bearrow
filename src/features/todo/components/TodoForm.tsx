import React, { useEffect, useImperativeHandle, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
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

import type { Todo } from "../types";

type FormValues = {
  title: string;
  note: string;
  categoryId: string;
};

export interface TodoFormHandle {
  submit(): void;
}

interface Props {
  initial?: Todo;
  hideHeader?: boolean;
  onSave: (title: string, categoryId: string, note?: string) => Promise<void>;
  onCancel: () => void;
}

export const TodoForm = React.forwardRef<TodoFormHandle, Props>(
function TodoForm({ initial, hideHeader = false, onSave, onCancel }, ref) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [categories, setCategories] = useState<Category[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: initial?.title ?? "",
      note: initial?.note ?? "",
      categoryId: initial?.categoryId ?? "",
    },
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // 생성 모드에서만: 카테고리 로드 후 첫 번째를 기본값으로 설정
  useEffect(() => {
    if (!initial && categories.length > 0 && categories[0]) {
      setValue("categoryId", categories[0].id);
    }
  }, [categories, initial, setValue]);

  async function onSubmit(values: FormValues) {
    await onSave(values.title, values.categoryId, values.note || undefined);
  }

  useImperativeHandle(ref, () => ({
    submit: () => { void handleSubmit(onSubmit)(); },
  }));

  const isEdit = !!initial;

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
          <Text style={styles.headerTitle}>{isEdit ? "할일 편집" : "새 할일"}</Text>
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={styles.headerBtn}
          >
            <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>{isEdit ? "저장" : "추가"}</Text>
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

  if (hideHeader) return inner;
  return <SafeAreaView style={styles.container}>{inner}</SafeAreaView>;
});

// ── CategoryPicker ──────────────────────────────────────────────────────────

interface CategoryPickerProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  colors: ColorTokens;
}

function CategoryPicker({ categories, value, onChange, colors }: CategoryPickerProps) {
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
