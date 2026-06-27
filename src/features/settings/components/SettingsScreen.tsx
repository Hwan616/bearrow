import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getCategories, updateCategory } from "@/features/category/api/categories";
import { CATEGORY_COLORS } from "@/features/category/types";
import type { Category } from "@/features/category/types";
import { ACCENT_PRESETS, useTheme } from "@/theme";
import type { ThemeMode } from "@/theme";

const MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "시스템", value: "system" },
  { label: "라이트", value: "light" },
  { label: "다크", value: "dark" },
];

export function SettingsScreen() {
  const { colors, mode, setMode, accentColor, setAccentColor } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const s = makeStyles(colors);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  async function handleCategoryColor(cat: Category, color: string) {
    try {
      const updated = await updateCategory(cat.id, { color });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, color: updated.color } : c)));
      setExpandedCatId(null);
    } catch {
      Alert.alert("오류", "색상 변경에 실패했습니다.");
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>설정</Text>

      {/* ── 화면 모드 ────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>화면 모드</Text>
      <View style={[s.card, { backgroundColor: colors.surface.default }]}>
        <View style={s.chipRow}>
          {MODE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[s.chip, mode === opt.value && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary }]}
              onPress={() => setMode(opt.value)}
            >
              <Text style={[s.chipText, mode === opt.value && { color: colors.text.inverse }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── 강조색 ──────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>강조색</Text>
      <View style={[s.card, { backgroundColor: colors.surface.default }]}>
        <View style={s.swatchRow}>
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = accentColor === preset.color;
            return (
              <Pressable
                key={preset.color}
                style={[s.swatch, { backgroundColor: preset.color }, isSelected && s.swatchSelected]}
                onPress={() => setAccentColor(preset.color)}
                accessibilityLabel={preset.label}
              >
                {isSelected && <Text style={s.swatchCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── 카테고리 색상 ───────────────────────────────────── */}
      {categories.length > 0 && (
        <>
          <Text style={s.sectionTitle}>카테고리 색상</Text>
          <View style={[s.card, { backgroundColor: colors.surface.default }]}>
            {categories.map((cat, idx) => (
              <View key={cat.id}>
                {idx > 0 && <View style={[s.divider, { backgroundColor: colors.border.default }]} />}
                <Pressable
                  style={s.catRow}
                  onPress={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)}
                >
                  <View style={[s.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[s.catName, { color: colors.text.primary }]}>{cat.name}</Text>
                  <Text style={[s.catChevron, { color: colors.text.disabled }]}>
                    {expandedCatId === cat.id ? "∧" : "∨"}
                  </Text>
                </Pressable>

                {expandedCatId === cat.id && (
                  <View style={s.colorPalette}>
                    {CATEGORY_COLORS.map((color) => (
                      <Pressable
                        key={color}
                        style={[
                          s.paletteDot,
                          { backgroundColor: color },
                          cat.color === color && s.paletteDotSelected,
                        ]}
                        onPress={() => handleCategoryColor(cat, color)}
                        accessibilityLabel={color}
                      >
                        {cat.color === color && <Text style={s.swatchCheck}>✓</Text>}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    content: {
      padding: 16,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text.primary,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 20,
    },
    card: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    // 화면 모드 칩
    chipRow: {
      flexDirection: "row",
      gap: 8,
    },
    chip: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    chipText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text.primary,
    },

    // 강조색 스와치
    swatchRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap",
    },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: colors.border.strong,
    },
    swatchCheck: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },

    // 카테고리 행
    catRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      gap: 12,
    },
    catDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    catName: {
      flex: 1,
      fontSize: 16,
    },
    catChevron: {
      fontSize: 14,
    },
    colorPalette: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      paddingVertical: 12,
      paddingLeft: 26,
    },
    paletteDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    paletteDotSelected: {
      borderWidth: 2.5,
      borderColor: colors.border.strong,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
    },
  });
