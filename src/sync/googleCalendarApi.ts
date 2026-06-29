const CALENDAR_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface GoogleEventItem {
  id: string;
  summary?: string;
  description?: string;
  status: "confirmed" | "cancelled" | "tentative";
  updated: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface GoogleEventsListResponse {
  nextSyncToken?: string;
  nextPageToken?: string;
  items?: GoogleEventItem[];
}

// Google Calendar API 가 syncToken 만료 시 반환하는 410 을 나타내는 전용 에러
export class GoogleSyncTokenExpiredError extends Error {
  constructor() {
    super("Google Calendar syncToken 만료 (410 Gone) — 전체 동기화가 필요합니다.");
  }
}

async function apiFetch<T>(
  url: string,
  accessToken: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (res.status === 410) throw new GoogleSyncTokenExpiredError();
  if (!res.ok) throw new Error(`Google Calendar API 오류: ${res.status}`);
  return res.json() as Promise<T>;
}

// 이벤트 목록 조회 — syncToken 있으면 증분, 없으면 전체
export async function googleFetchEvents(
  accessToken: string,
  syncToken?: string | null,
  pageToken?: string | null,
): Promise<GoogleEventsListResponse> {
  const params = new URLSearchParams({ maxResults: "250" });
  if (syncToken) params.set("syncToken", syncToken);
  if (pageToken) params.set("pageToken", pageToken);

  return apiFetch<GoogleEventsListResponse>(
    `${CALENDAR_BASE}?${params.toString()}`,
    accessToken,
  );
}

// 이벤트 생성 → 생성된 Google 이벤트 ID 반환
export async function googleCreateEvent(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<string> {
  const data = await apiFetch<{ id: string }>(CALENDAR_BASE, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.id;
}

// 이벤트 수정
export async function googleUpdateEvent(
  accessToken: string,
  googleEventId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await apiFetch(`${CALENDAR_BASE}/${googleEventId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// 이벤트 삭제 — 이미 없는 경우(404/410)는 성공으로 처리
export async function googleDeleteEvent(
  accessToken: string,
  googleEventId: string,
): Promise<void> {
  const res = await fetch(`${CALENDAR_BASE}/${googleEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404 || res.status === 410) return;
  if (!res.ok) throw new Error(`Google Calendar API 오류: ${res.status}`);
}
