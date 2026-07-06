// CalDAV HTTP 클라이언트 — iCloud CalDAV 연동에 특화된 최소 구현

import {
  extractCalendarDataBlocks,
  extractHrefInTag,
  extractResponseHrefs,
} from "./icalParser";

const WELL_KNOWN = "https://caldav.icloud.com/.well-known/caldav";

export interface CalendarInfo {
  url: string;
  displayName: string;
}

function basicAuth(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function calDAVRequest(
  method: string,
  url: string,
  auth: string,
  depth: string,
  body: string,
): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    headers: {
      Authorization: auth,
      "Content-Type": "application/xml; charset=utf-8",
      Depth: depth,
    },
    body,
  });
}

// GET .well-known/caldav → 리디렉션 완료 후 최종 서버 origin 반환
async function discoverServerOrigin(auth: string): Promise<string> {
  const res = await fetch(WELL_KNOWN, {
    method: "GET",
    redirect: "follow",
    headers: { Authorization: auth },
  });
  // 리디렉션 후 최종 URL의 origin (e.g. https://p01-caldav.icloud.com)
  try {
    const u = new URL(res.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://caldav.icloud.com";
  }
}

// current-user-principal href 추출
async function getPrincipalUrl(serverOrigin: string, auth: string): Promise<string> {
  const res = await calDAVRequest(
    "PROPFIND",
    `${serverOrigin}/`,
    auth,
    "0",
    `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:current-user-principal/></D:prop>
</D:propfind>`,
  );
  const xml = await res.text();
  const href = extractHrefInTag(xml, "current-user-principal");
  if (!href) throw new Error("CalDAV: current-user-principal를 찾을 수 없습니다.");
  return href.startsWith("http") ? href : `${serverOrigin}${href}`;
}

// calendar-home-set href 추출
async function getCalendarHomeUrl(principalUrl: string, auth: string): Promise<string> {
  const res = await calDAVRequest(
    "PROPFIND",
    principalUrl,
    auth,
    "0",
    `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><C:calendar-home-set/></D:prop>
</D:propfind>`,
  );
  const xml = await res.text();
  const href = extractHrefInTag(xml, "calendar-home-set");
  if (!href) throw new Error("CalDAV: calendar-home-set를 찾을 수 없습니다.");
  const origin = new URL(principalUrl).origin;
  return href.startsWith("http") ? href : `${origin}${href}`;
}

export class CalDAVClient {
  private auth: string;

  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {
    this.auth = basicAuth(username, password);
  }

  // 자격 증명 확인 — 200/207 반환이면 유효
  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(WELL_KNOWN, {
        method: "GET",
        redirect: "follow",
        headers: { Authorization: this.auth },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  // 캘린더 목록 반환 (discovery 포함)
  async listCalendars(): Promise<CalendarInfo[]> {
    const origin = await discoverServerOrigin(this.auth);
    const principalUrl = await getPrincipalUrl(origin, this.auth);
    const homeUrl = await getCalendarHomeUrl(principalUrl, this.auth);

    const res = await calDAVRequest(
      "PROPFIND",
      homeUrl,
      this.auth,
      "1",
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
    );
    const xml = await res.text();
    const entries = extractResponseHrefs(xml);

    const homeHref = new URL(homeUrl).pathname;
    return entries
      .filter((e) => e.isCalendar && e.href !== homeHref && e.href !== homeUrl)
      .map((e) => ({
        url: e.href.startsWith("http")
          ? e.href
          : `${new URL(homeUrl).origin}${e.href}`,
        displayName: e.displayName || e.href.split("/").filter(Boolean).pop() || "캘린더",
      }));
  }

  // 캘린더 URL에서 이벤트 ics 블록 목록 반환 (±1년 범위)
  async fetchEventBlocks(calendarUrl: string): Promise<string[]> {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() + 2, 0, 1);
    const fmt = (d: Date) => d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

    const res = await calDAVRequest(
      "REPORT",
      calendarUrl,
      this.auth,
      "1",
      `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${fmt(start)}" end="${fmt(end)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`,
    );
    const xml = await res.text();
    return extractCalendarDataBlocks(xml);
  }
}
