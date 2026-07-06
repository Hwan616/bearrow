import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppBottomSheet } from "@/ui/AppBottomSheet";
import { AppSidePanel } from "@/ui/AppSidePanel";
import { useTheme } from "@/theme";
import { SettingsScreen } from "./SettingsScreen";

export interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  isWide: boolean;
}

export function SettingsSheet({ visible, onClose, isWide }: SettingsSheetProps) {
  const { colors } = useTheme();

  const content = (
    <View testID="settings-sheet-content" style={styles.content}>
      {isWide && (
        <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>설정</Text>
          <Pressable
            testID="btn-settings-close"
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="닫기"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtnText, { color: colors.accent.primary }]}>닫기</Text>
          </Pressable>
        </View>
      )}
      <SettingsScreen />
    </View>
  );

  if (isWide) {
    return (
      <AppSidePanel visible={visible} onClose={onClose}>
        {content}
      </AppSidePanel>
    );
  }

  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      {content}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
