import { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { CategoryManager } from "@/features/category/components/CategoryManager";
import { useGoogleCalendarSync } from "../hooks/useGoogleCalendarSync";
import { useICloudSync } from "../hooks/useICloudSync";
import { ICloudConnectSheet } from "./ICloudConnectSheet";
import { useAppSettings } from "../AppSettingsContext";
import { useTheme } from "@/theme";
import type { ThemeMode } from "@/theme";

const MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "시스템", value: "system" },
  { label: "라이트", value: "light" },
  { label: "다크", value: "dark" },
];

export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, isLoading: authLoading, signIn, signOut } = useAuth();
  const { showHolidays, setShowHolidays } = useAppSettings();
  const [catManagerVisible, setCatManagerVisible] = useState(false);
  const [icloudSheetVisible, setIcloudSheetVisible] = useState(false);
  const icloud = useICloudSync();
  const googleSync = useGoogleCalendarSync();
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

      {/* ── 캘린더 ─────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>캘린더</Text>
      <View style={[s.card, { backgroundColor: colors.surface.default }]}>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.catName, { color: colors.text.primary }]}>공휴일 표시</Text>
            <Text style={[s.infoText, { color: colors.text.secondary }]}>한국 공휴일을 캘린더에 표시합니다</Text>
          </View>
          <Switch
            value={showHolidays}
            onValueChange={(v) => void setShowHolidays(v)}
            trackColor={{ false: colors.border.default, true: colors.accent.primary }}
            thumbColor={colors.surface.default}
          />
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

      {/* ── Google 캘린더 동기화 ────────────────────────────── */}
      {user && (
        <>
          <Text style={s.sectionTitle}>Google 캘린더</Text>
          <View style={[s.card, { backgroundColor: colors.surface.default }]}>
            <Pressable
              style={s.syncRow}
              onPress={() => void googleSync.sync()}
              disabled={googleSync.isSyncing}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.catName, { color: colors.text.primary }]}>
                  지금 동기화
                </Text>
                {googleSync.lastResult ? (
                  <Text style={[s.infoText, { color: colors.text.secondary }]}>
                    {`가져옴 ${googleSync.lastResult.pulled}개 · 올림 ${googleSync.lastResult.pushed}개`}
                  </Text>
                ) : null}
                {googleSync.error ? (
                  <Text style={[s.infoText, { color: colors.status.error }]}>
                    {googleSync.error}
                  </Text>
                ) : null}
              </View>
              {googleSync.isSyncing ? (
                <ActivityIndicator color={colors.accent.primary} />
              ) : (
                <Text style={[s.catChevron, { color: colors.text.disabled }]}>↻</Text>
              )}
            </Pressable>
          </View>
        </>
      )}

      {/* ── iCloud 캘린더 ──────────────────────────────────── */}
      <Text style={s.sectionTitle}>iCloud 캘린더</Text>
      <View style={[s.card, { backgroundColor: colors.surface.default }]}>
        {icloud.isLoading ? (
          <Text style={[s.catName, { color: colors.text.disabled, paddingVertical: 12 }]}>
            불러오는 중…
          </Text>
        ) : icloud.isConnected ? (
          <>
            <View style={s.syncRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.catName, { color: colors.text.primary }]}>
                  {icloud.email}
                </Text>
                {icloud.lastResult ? (
                  <Text style={[s.infoText, { color: colors.text.secondary }]}>
                    {`${icloud.lastResult.imported}개 일정을 가져왔습니다`}
                  </Text>
                ) : null}
                {icloud.error ? (
                  <Text style={[s.infoText, { color: colors.status.error }]}>
                    {icloud.error}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => void icloud.sync()}
                disabled={icloud.isSyncing}
                style={s.syncIconBtn}
                hitSlop={8}
              >
                {icloud.isSyncing ? (
                  <ActivityIndicator color={colors.accent.primary} />
                ) : (
                  <Text style={[s.syncIcon, { color: colors.accent.primary }]}>↻</Text>
                )}
              </Pressable>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border.default }]} />
            <Pressable
              style={s.catRow}
              onPress={() =>
                Alert.alert("iCloud 연결 해제", "연결을 해제하시겠습니까?", [
                  { text: "취소", style: "cancel" },
                  {
                    text: "해제",
                    style: "destructive",
                    onPress: () => void icloud.disconnect(),
                  },
                ])
              }
            >
              <Text style={[s.catName, { color: colors.status.error }]}>연결 해제</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={s.catRow} onPress={() => setIcloudSheetVisible(true)}>
            <Text style={[s.catName, { color: colors.accent.primary }]}>
              iCloud 연결하기
            </Text>
            <Text style={[s.catChevron, { color: colors.text.disabled }]}>›</Text>
          </Pressable>
        )}
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

    <ICloudConnectSheet
      visible={icloudSheetVisible}
      onClose={() => setIcloudSheetVisible(false)}
      onConnect={async (email, password) => {
        const ok = await icloud.connect(email, password);
        if (ok) setIcloudSheetVisible(false);
        return ok;
      }}
      connectError={icloud.error}
    />
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

    // 설정 행 (토글 등)
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      gap: 12,
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

    // 동기화 행
    syncRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      gap: 12,
    },
    syncIconBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    syncIcon: { fontSize: 22 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  });
