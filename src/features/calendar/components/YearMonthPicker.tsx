import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

const MONTHS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
] as const;

const CELL_CONTENT_WIDTH = 240; // panel width(280) - padding(20*2)
const CELL_GAP = 6;
const CELL_WIDTH = (CELL_CONTENT_WIDTH - 3 * CELL_GAP) / 4; // ≈ 55.5

interface Props {
  year: number;
  month: number; // 0-indexed
  visible: boolean;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

export function YearMonthPicker({ year, month, visible, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const [pickerYear, setPickerYear] = useState(year);
  const s = makeStyles(colors);

  useEffect(() => {
    if (visible) setPickerYear(year);
  }, [visible, year]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {/* inner Pressable prevents backdrop close when tapping inside */}
        <Pressable style={[s.panel, { backgroundColor: colors.surface.raised }]}>
          {/* 연도 내비 */}
          <View style={s.yearRow}>
            <Pressable
              style={s.yearBtn}
              onPress={() => setPickerYear((y) => y - 1)}
              hitSlop={12}
              accessibilityLabel="이전 연도"
            >
              <Text style={[s.yearArrow, { color: colors.text.primary }]}>‹</Text>
            </Pressable>
            <Text style={[s.yearText, { color: colors.text.primary }]}>{pickerYear}년</Text>
            <Pressable
              style={s.yearBtn}
              onPress={() => setPickerYear((y) => y + 1)}
              hitSlop={12}
              accessibilityLabel="다음 연도"
            >
              <Text style={[s.yearArrow, { color: colors.text.primary }]}>›</Text>
            </Pressable>
          </View>

          {/* 월 그리드 4×3 */}
          <View style={s.monthGrid}>
            {MONTHS.map((name, idx) => {
              const isSelected = pickerYear === year && idx === month;
              const isCurrentMonth =
                pickerYear === new Date().getFullYear() && idx === new Date().getMonth();
              return (
                <Pressable
                  key={idx}
                  style={[
                    s.monthCell,
                    { width: CELL_WIDTH, backgroundColor: isSelected ? colors.accent.primary : colors.background.secondary },
                    !isSelected && isCurrentMonth && { borderColor: colors.accent.primary, borderWidth: 1.5 },
                  ]}
                  onPress={() => { onSelect(pickerYear, idx); onClose(); }}
                  accessibilityLabel={`${pickerYear}년 ${name}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      s.monthText,
                      { color: isSelected ? colors.text.inverse : colors.text.primary },
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },
    panel: {
      width: 280,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    yearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    yearBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    yearArrow: {
      fontSize: 28,
      lineHeight: 32,
    },
    yearText: {
      fontSize: 18,
      fontWeight: "700",
    },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: CELL_GAP,
    },
    monthCell: {
      height: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    monthText: {
      fontSize: 14,
      fontWeight: "500",
    },
  });
}
