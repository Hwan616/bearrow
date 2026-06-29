import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { supabaseConfig } from "@/config/env";

// SecureStore 값 한도(2048 bytes)를 넘는 JWT를 청크로 분산 저장한다 (NFR-SEC-001)
const CHUNK_SIZE = 1900;

const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}_cnt`);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count === 0) return SecureStore.getItemAsync(key); // 청크 없이 저장된 경우
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`)),
    );
    return chunks.some((c) => c === null) ? null : chunks.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}_cnt`, String(chunks.length));
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)));
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}_cnt`);
    const count = countStr ? parseInt(countStr, 10) : 0;
    await SecureStore.deleteItemAsync(key);
    if (count > 0) {
      await SecureStore.deleteItemAsync(`${key}_cnt`);
      await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)),
      );
    }
  },
};

// Supabase URL/Key 가 환경변수에 없으면 미연결 상태로 취급한다
export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

// URL이 없을 때도 createClient 자체는 유효한 값이 필요하다.
// 미설정 시 autoRefreshToken/persistSession 을 모두 끄면 네트워크 호출이 발생하지 않는다.
const url = supabaseConfig.url || "https://placeholder.supabase.co";
const anonKey = supabaseConfig.anonKey || "placeholder";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: isSupabaseConfigured ? LargeSecureStore : undefined,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: false,
  },
});
