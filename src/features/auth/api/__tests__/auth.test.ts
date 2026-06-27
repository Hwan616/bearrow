import { mapUser, signOut, getSession } from "../auth";

// ── mocks ──────────────────────────────────────────────────────────────────

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
      getSession: () => mockGetSession(),
      signInWithOAuth: (opts: unknown) => mockSignInWithOAuth(opts),
      exchangeCodeForSession: (code: unknown) => mockExchangeCodeForSession(code),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
  },
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn((path: string) => `bearrow://${path}`),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

// ── 픽스처 ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  user_metadata: { full_name: "홍길동", avatar_url: "https://example.com/avatar.jpg" },
};

const mockSession = { user: mockUser, access_token: "tok", refresh_token: "ref" };

beforeEach(() => jest.clearAllMocks());

// ── mapUser ─────────────────────────────────────────────────────────────────

describe("mapUser", () => {
  it("Supabase User를 AuthUser로 변환한다", () => {
    const result = mapUser(mockUser as never);
    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      displayName: "홍길동",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("null 입력이면 null을 반환한다", () => {
    expect(mapUser(null)).toBeNull();
  });

  it("user_metadata 없어도 null 필드로 안전하게 처리한다", () => {
    const result = mapUser({ id: "u1", email: "a@b.com", user_metadata: {} } as never);
    expect(result?.displayName).toBeNull();
    expect(result?.avatarUrl).toBeNull();
  });
});

// ── signOut ─────────────────────────────────────────────────────────────────

describe("signOut", () => {
  it("supabase.auth.signOut을 호출한다", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("에러가 있으면 던진다", async () => {
    mockSignOut.mockResolvedValue({ error: new Error("로그아웃 실패") });
    await expect(signOut()).rejects.toThrow("로그아웃 실패");
  });
});

// ── getSession ───────────────────────────────────────────────────────────────

describe("getSession", () => {
  it("세션이 있으면 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    const result = await getSession();
    expect(result).toEqual(mockSession);
  });

  it("세션이 없으면 null을 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("에러가 있으면 던진다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: new Error("세션 조회 실패") });
    await expect(getSession()).rejects.toThrow("세션 조회 실패");
  });
});
