import { largeSecureStore } from "../largeSecureStore";

// ── in-memory SecureStore mock ──────────────────────────────────────────────

const mockStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

beforeEach(() => mockStore.clear());

// ── setItem ──────────────────────────────────────────────────────────────────

describe("setItem", () => {
  it("짧은 값은 청크 없이 직접 저장한다", async () => {
    await largeSecureStore.setItem("token", "short-value");

    expect(mockStore.get("token")).toBe("short-value");
    expect(mockStore.has("token_cnt")).toBe(false);
  });

  it("1900 바이트 경계값은 직접 저장한다", async () => {
    const value = "a".repeat(1900);
    await largeSecureStore.setItem("token", value);

    expect(mockStore.get("token")).toBe(value);
    expect(mockStore.has("token_cnt")).toBe(false);
  });

  it("1901 바이트 이상은 청크로 분산 저장한다", async () => {
    const value = "a".repeat(1901);
    await largeSecureStore.setItem("token", value);

    expect(mockStore.get("token_cnt")).toBe("2");
    expect(mockStore.get("token_0")).toBe("a".repeat(1900));
    expect(mockStore.get("token_1")).toBe("a");
    expect(mockStore.has("token")).toBe(false);
  });

  it("값이 클수록 청크 수가 늘어난다", async () => {
    const value = "x".repeat(3800);
    await largeSecureStore.setItem("k", value);

    expect(mockStore.get("k_cnt")).toBe("2");
    expect(mockStore.get("k_0")).toHaveLength(1900);
    expect(mockStore.get("k_1")).toHaveLength(1900);
  });
});

// ── getItem ──────────────────────────────────────────────────────────────────

describe("getItem", () => {
  it("청크 없이 저장된 값을 반환한다", async () => {
    mockStore.set("token", "hello");

    const result = await largeSecureStore.getItem("token");
    expect(result).toBe("hello");
  });

  it("청크 키가 있으면 조합해서 반환한다", async () => {
    mockStore.set("token_cnt", "2");
    mockStore.set("token_0", "foo");
    mockStore.set("token_1", "bar");

    const result = await largeSecureStore.getItem("token");
    expect(result).toBe("foobar");
  });

  it("청크 중 하나라도 없으면 null을 반환한다", async () => {
    mockStore.set("token_cnt", "2");
    mockStore.set("token_0", "foo");
    // token_1 없음

    const result = await largeSecureStore.getItem("token");
    expect(result).toBeNull();
  });

  it("키 자체가 없으면 null을 반환한다", async () => {
    const result = await largeSecureStore.getItem("missing");
    expect(result).toBeNull();
  });

  it("setItem → getItem 왕복이 원본 값을 보존한다", async () => {
    const original = "z".repeat(5000);
    await largeSecureStore.setItem("big", original);
    const restored = await largeSecureStore.getItem("big");
    expect(restored).toBe(original);
  });
});

// ── removeItem ───────────────────────────────────────────────────────────────

describe("removeItem", () => {
  it("단일 키를 삭제한다", async () => {
    mockStore.set("token", "value");

    await largeSecureStore.removeItem("token");
    expect(mockStore.has("token")).toBe(false);
  });

  it("청크가 있으면 모든 청크 키도 삭제한다", async () => {
    mockStore.set("token_cnt", "3");
    mockStore.set("token_0", "a");
    mockStore.set("token_1", "b");
    mockStore.set("token_2", "c");

    await largeSecureStore.removeItem("token");

    expect(mockStore.has("token_cnt")).toBe(false);
    expect(mockStore.has("token_0")).toBe(false);
    expect(mockStore.has("token_1")).toBe(false);
    expect(mockStore.has("token_2")).toBe(false);
  });

  it("존재하지 않는 키 삭제는 에러 없이 완료된다", async () => {
    await expect(largeSecureStore.removeItem("ghost")).resolves.toBeUndefined();
  });
});
