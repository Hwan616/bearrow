import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "@/theme";
import type { ColorTokens } from "@/theme/tokens";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConnect: (email: string, password: string) => Promise<boolean>;
  connectError: string | null;
}

export function ICloudConnectSheet({ visible, onClose, onConnect, connectError }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleConnect() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("입력 필요", "Apple ID와 앱 전용 암호를 모두 입력해 주세요.");
      return;
    }
    setIsLoading(true);
    const ok = await onConnect(email.trim(), password.trim());
    setIsLoading(false);
    if (ok) {
      setEmail("");
      setPassword("");
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background.primary }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text.primary }]}>iCloud 캘린더 연결</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[s.cancelText, { color: colors.accent.primary }]}>취소</Text>
          </Pressable>
        </View>

        {/* 안내 카드 */}
        <View style={[s.noticeCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[s.noticeTitle, { color: colors.text.primary }]}>
            앱 전용 암호 필요
          </Text>
          <Text style={[s.noticeBody, { color: colors.text.secondary }]}>
            Apple은 보안상 일반 Apple ID 암호 대신 앱 전용 암호를 사용해야 합니다.
            {"\n"}Apple ID 관리 페이지에서 발급 후 입력해 주세요.
          </Text>
          <Pressable
            onPress={() => void Linking.openURL("https://appleid.apple.com")}
            style={s.linkRow}
          >
            <Text style={[s.linkText, { color: colors.accent.primary }]}>
              appleid.apple.com에서 발급하기 →
            </Text>
          </Pressable>
        </View>

        {/* Apple ID 입력 */}
        <Text style={[s.label, { color: colors.text.secondary }]}>Apple ID</Text>
        <TextInput
          style={[
            s.input,
            {
              backgroundColor: colors.surface.default,
              color: colors.text.primary,
              borderColor: colors.border.default,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="example@icloud.com"
          placeholderTextColor={colors.text.disabled}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
        />

        {/* 앱 전용 암호 입력 */}
        <Text style={[s.label, { color: colors.text.secondary }]}>앱 전용 암호</Text>
        <TextInput
          style={[
            s.input,
            {
              backgroundColor: colors.surface.default,
              color: colors.text.primary,
              borderColor: colors.border.default,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          placeholderTextColor={colors.text.disabled}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 에러 메시지 */}
        {connectError ? (
          <Text style={[s.errorText, { color: colors.status.error }]}>{connectError}</Text>
        ) : null}

        {/* 연결 버튼 */}
        <Pressable
          style={[s.connectBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => void handleConnect()}
          disabled={isLoading}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.connectBtnText}>연결하기</Text>
          )}
        </Pressable>

        {/* 보안 안내 */}
        <Text style={[s.footnote, { color: colors.text.disabled }]}>
          Apple ID와 앱 전용 암호는 기기에만 안전하게 저장되며{"\n"}
          외부 서버로 전송되지 않습니다.
        </Text>
      </ScrollView>
    </Modal>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 28,
    },
    title: { fontSize: 20, fontWeight: "700" },
    cancelText: { fontSize: 16 },
    noticeCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 28,
    },
    noticeTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
    noticeBody: { fontSize: 13, lineHeight: 20 },
    linkRow: { marginTop: 12 },
    linkText: { fontSize: 14, fontWeight: "500" },
    label: {
      fontSize: 13,
      fontWeight: "500",
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    errorText: { fontSize: 13, marginTop: 10 },
    connectBtn: {
      marginTop: 32,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    connectBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    footnote: {
      fontSize: 12,
      textAlign: "center",
      marginTop: 20,
      lineHeight: 18,
    },
  });
}
