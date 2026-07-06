import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";

export interface AppSidePanelProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export function AppSidePanel({ visible, children, width = 320 }: AppSidePanelProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View
      testID="side-panel"
      style={[
        styles.container,
        {
          width,
          backgroundColor: colors.surface.raised,
          borderLeftColor: colors.border.default,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
