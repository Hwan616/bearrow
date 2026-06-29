import * as SecureStore from "expo-secure-store";

// expo-secure-store 의 2048 바이트 한도를 넘는 값(JWT 등)을 청크로 분산 저장한다.
// key_cnt: 청크 수, key_0 / key_1 ...: 각 청크 (NFR-SEC-001)
const CHUNK_SIZE = 1900;

export const largeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}_cnt`);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count === 0) return SecureStore.getItemAsync(key);
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
