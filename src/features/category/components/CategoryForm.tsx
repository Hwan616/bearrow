import React, { useState } from "react";
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

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

import { CATEGORY_COLORS } from "../types";
import type { Category } from "../types";

interface Props {
  initial?: Category;
  onSave: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}

export function CategoryForm({ initial, onSave, onCancel }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(name.trim() || "카테고리", color);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { borderBottomColor: colors.border.default }]}>
        <Pressable onPress={onCancel} style={s.headerBtn}>
          <Text style={[s.headerBtnText, { color: colors.accent.primary }]}>취소</Text>
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text.primary }]}>
          {initial ? "카테고리 편집" : "새 카테고리"}
        </Text>
        <Pressable onPress={handleSave} disabled={saving} style={s.headerBtn}>
          <Text style={[s.headerBtnText, { color: saving ? colors.text.disabled : colors.accent.primary }]}>
            저장
          </Text>
        </Pressable>
      </View>

      <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
        {/* 이름 */}
        <View style={[s.section, { backgroundColor: colors.surface.default }]}>
          <TextInput
            style={[s.nameInput, { color: colors.text.primary }]}
            placeholder="카테고리"
            placeholderTextColor={colors.text.disabled}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            autoFocus
            maxLength={30}
          />
        </View>

        {/* 색상 선택 */}
        <Text style={[s.sectionLabel, { color: colors.text.secondary }]}>색상</Text>
        <View style={[s.section, { backgroundColor: colors.surface.default }]}>
          <View style={s.colorGrid}>
            {CATEGORY_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[s.colorDot, { backgroundColor: c }, color === c && s.colorDotSelected]}
                onPress={() => setColor(c)}
                accessibilityLabel={c}
              >
                {color === c && <Text style={s.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>

        {/* 미리보기 */}
        <Text style={[s.sectionLabel, { color: colors.text.secondary }]}>미리보기</Text>
        <View style={[s.section, s.preview, { backgroundColor: colors.surface.default }]}>
          <View style={[s.previewDot, { backgroundColor: color }]} />
          <Text style={[s.previewText, { color: colors.text.primary }]}>
            {name.trim() || "카테고리"}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    body: { flex: 1 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 8,
      marginHorizontal: 16,
    },
    section: {
      marginHorizontal: 16,
      borderRadius: 12,
      paddingHorizontal: 16,
    },
    nameInput: {
      fontSize: 18,
      fontWeight: "500",
      paddingVertical: 14,
      minHeight: 44,
    },
    colorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
      paddingVertical: 16,
    },
    colorDot: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    colorDotSelected: { borderWidth: 3, borderColor: colors.border.strong },
    check: { color: "#fff", fontWeight: "700", fontSize: 15 },
    preview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 16,
    },
    previewDot: { width: 12, height: 12, borderRadius: 6 },
    previewText: { fontSize: 16, fontWeight: "600" },
  });
}
