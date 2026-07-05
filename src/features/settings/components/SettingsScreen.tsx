import { useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { CategoryManager } from "@/features/category/components/CategoryManager";
import { ACCENT_PRESETS, useTheme } from "@/theme";
import type { ThemeMode } from "@/theme";

const MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "시스템", value: "system" },
  { label: "라이트", value: "light" },
  { label: "다크", value: "dark" },
];

export function SettingsScreen() {
  const { colors, mode, setMode, accentColor, setAccentColor } = useTheme();
  const { user, isLoading: authLoading, signIn, signOut } = useAuth();
  const [catManagerVisible, setCatManagerVisible] = useState(false);
  const s = makeStyles(colors);

  async function handleSignIn() {
    try {
      await signIn();
    } catch {
      Alert.alert("오류", "로그인에 실패했습니다.");
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert("오류", "로그아웃에 실패했습니다.");
    }
  }

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>설정</Text>

      {/* ── 계정 ────────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>계정</Text>
      <View style={[s.card, { backgroundColor: colors.surface.default }]}>
        {authLoading ? (
          <Text style={[s.catName, { color: colors.text.disabled, paddingVertical: 12 }]}>
            불러오는 중…
          </Text>
        ) : user ? (
          <View style={s.accountRow}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: colors.accent.primaryLight }]}>
                <Text style={[s.avatarInitial, { color: colors.accent.primary }]}>
                  {(user.displayName ?? user.email ?? "?")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {user.displayName ? (
                <Text style={[s.catName, { color: colors.text.primary }]}>{user.displayName}</Text>
              ) : null}
              <Text style={[s.infoText, { color: colors.text.secondary }]}>{user.email}</Text>
            </View>
            <Pressable onPress={handleSignOut} style={s.signOutBtn}>
              <Text style={[s.signOutText, { color: colors.status.error }]}>로그아웃</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.signInRow} onPress={handleSignIn}>
            <Text style={[s.signInText, { color: colors.accent.primary }]}>
              Google로 로그인
            </Text>
          </Pressable>
        )}
      </View>

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

      {/* ── 카테고리 관리 ───────────────────────────────────── */}
      <Text style={s.sectionTitle}>카테고리</Text>
      <View style={[s.card, { backgroundColor: colors.surface.default }]}>
        <Pressable style={s.catRow} onPress={() => setCatManagerVisible(true)}>
          <Text style={[s.catName, { color: colors.text.primary }]}>카테고리 관리</Text>
          <Text style={[s.catChevron, { color: colors.text.disabled }]}>›</Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>

    <Modal
      visible={catManagerVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setCatManagerVisible(false)}
    >
      <CategoryManager onClose={() => setCatManagerVisible(false)} />
    </Modal>
    </>
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
    catName: {
      flex: 1,
      fontSize: 16,
    },
    catChevron: {
      fontSize: 18,
      color: colors.text.disabled,
    },

    // 계정
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 18,
      fontWeight: "700",
    },
    infoText: {
      fontSize: 13,
      marginTop: 2,
    },
    signOutBtn: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    signOutText: {
      fontSize: 14,
      fontWeight: "500",
    },
    signInRow: {
      minHeight: 44,
      justifyContent: "center",
    },
    signInText: {
      fontSize: 16,
      fontWeight: "500",
    },
  });
