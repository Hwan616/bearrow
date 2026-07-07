import { View } from "react-native";

export function PlusIcon({ size = 18, color }: { size?: number; color: string }) {
  const bar = Math.max(2, Math.round(size * 0.13));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: Math.round(size * 0.75),
          height: bar,
          backgroundColor: color,
          borderRadius: bar / 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          height: Math.round(size * 0.75),
          width: bar,
          backgroundColor: color,
          borderRadius: bar / 2,
        }}
      />
    </View>
  );
}
