import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { config } from "@/config/env";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BeArrow</Text>
      <Text style={styles.subtitle}>캘린더 + 투두리스트</Text>
      <Text style={styles.env}>env: {config.env}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 8,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#2E5AAC" },
  subtitle: { fontSize: 16, color: "#444" },
  env: { fontSize: 12, color: "#999" },
});
