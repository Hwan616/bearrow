import React from "react";
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

import { SettingsScreen } from "./SettingsScreen";

export interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  isWide: boolean;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* 헤더: 닫기(좌) — 설정(중) — spacer(우) */}
        <View style={[styles.header, { borderBottomColor: colors.border.default, backgroundColor: colors.surface.default }]}>
          <Pressable
            testID="btn-settings-close"
            onPress={onClose}
            style={styles.headerBtn}
            accessibilityLabel="닫기"
            accessibilityRole="button"
          >
            <Text style={[styles.headerBtnText, { color: colors.accent.primary }]}>닫기</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>설정</Text>
          <View style={styles.headerBtn} />
        </View>
        <View testID="settings-sheet-content" style={{ flex: 1 }}>
          <SettingsScreen />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
    minHeight: 44,
    justifyContent: "center",
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
});
