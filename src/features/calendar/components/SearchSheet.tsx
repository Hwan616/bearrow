import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppBottomSheet } from "@/ui/AppBottomSheet";
import { AppSidePanel } from "@/ui/AppSidePanel";
import { useTheme } from "@/theme";
import { searchAll } from "../api/search";
import type { SearchResult } from "../api/search";

export interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
  isWide: boolean;
  onNavigate: (date: Date) => void;
}

export function SearchSheet({ visible, onClose, isWide, onNavigate }: SearchSheetProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const found = await searchAll(text);
      setResults(found);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleResultPress(item: SearchResult) {
    if (item.date) {
      onNavigate(item.date);
    }
    onClose();
  }

  function formatDate(date: Date | null): string {
    if (!date) return "날짜 없음";
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  const content = (
    <View testID="search-sheet-content" style={styles.content}>
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background.secondary, borderColor: colors.border.default }]}>
          <Text style={[styles.searchIcon, { color: colors.text.disabled }]}>🔍</Text>
          <TextInput
            testID="search-input"
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="일정·할일 검색"
            placeholderTextColor={colors.text.disabled}
            value={query}
            onChangeText={(text) => void handleSearch(text)}
            autoFocus={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              testID="btn-search-clear"
              onPress={() => { setQuery(""); setResults([]); }}
              hitSlop={8}
            >
              <Text style={[styles.clearIcon, { color: colors.text.disabled }]}>✕</Text>
            </Pressable>
          )}
        </View>
        {isWide && (
          <Pressable
            testID="btn-search-close"
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="닫기"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtnText, { color: colors.accent.primary }]}>닫기</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator
          testID="search-loading"
          style={styles.loading}
          color={colors.accent.primary}
        />
      ) : results.length === 0 && query.trim().length > 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>검색 결과가 없습니다</Text>
        </View>
      ) : (
        <FlatList
          testID="search-results"
          data={results}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={({ item }) => (
            <Pressable
              testID={`search-result-${item.id}`}
              style={[styles.resultRow, { borderBottomColor: colors.border.default }]}
              onPress={() => handleResultPress(item)}
            >
              <View style={styles.resultKindBadge}>
                <Text style={[styles.resultKindText, { color: item.kind === "event" ? colors.accent.primary : colors.text.secondary }]}>
                  {item.kind === "event" ? "일정" : "할일"}
                </Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultTitle, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.resultDate, { color: colors.text.secondary }]}>
                  {formatDate(item.date)}
                </Text>
              </View>
            </Pressable>
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearIcon: { fontSize: 14, fontWeight: "600" },
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
  loading: { marginTop: 32 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  emptyText: { fontSize: 15 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resultKindBadge: { minWidth: 36, alignItems: "center" },
  resultKindText: { fontSize: 12, fontWeight: "600" },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: "500" },
  resultDate: { fontSize: 13, marginTop: 2 },
});
