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

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    storage: LargeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
