// iCalendar (.ics) 형식 파서 — CalDAV 응답에서 VEVENT 데이터를 추출한다

export interface ParsedVEvent {
  uid: string;
  title: string;
  note: string | null;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  rrule: string | null;
  lastModified: number | null; // ms
}

// RFC 5545 줄 이어쓰기(CRLF + 공백) 풀기
function unfoldLines(ical: string): string {
  return ical.replace(/\r?\n[ \t]/g, "");
}

// 이스케이프 문자 복원: \n → 줄바꿈, \, \; \\
function unescape(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// iCalendar 날짜/시간 문자열 → Date
function parseDateTime(value: string, tzid?: string): Date {
  // 종일: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    return new Date(
      parseInt(value.slice(0, 4), 10),
      parseInt(value.slice(4, 6), 10) - 1,
      parseInt(value.slice(6, 8), 10),
    );
  }
  // UTC: YYYYMMDDTHHmmssZ
  if (value.endsWith("Z")) {
    const d = value.slice(0, -1);
    return new Date(
      `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}Z`,
    );
  }
  // 로컬 시간 (TZID 무시 — 서버가 UTC 또는 로컬 ISO 문자열로 제공한다고 가정)
  void tzid; // 향후 tz 변환 확장 지점
  return new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`,
  );
}

// 단일 VEVENT 블록 파싱 — null 반환 시 skip
function parseVEvent(block: string): ParsedVEvent | null {
  const lines = unfoldLines(block).split(/\r?\n/);

  const props: Record<string, string> = {};
  const params: Record<string, Record<string, string>> = {};

  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const parts = head.split(";");
    const name = (parts[0] ?? "").toUpperCase();
    const paramMap: Record<string, string> = {};
    for (let i = 1; i < parts.length; i++) {
      const eq = (parts[i] ?? "").indexOf("=");
      if (eq >= 0) {
        paramMap[(parts[i] ?? "").slice(0, eq).toUpperCase()] =
          (parts[i] ?? "").slice(eq + 1);
      }
    }
    props[name] = value;
    params[name] = paramMap;
  }

  const uid = props["UID"];
  if (!uid) return null;

  // 취소·삭제된 이벤트 건너뜀
  if (props["STATUS"] === "CANCELLED") return null;

  const dtstart = props["DTSTART"];
  if (!dtstart) return null;

  const isAllDay =
    params["DTSTART"]?.["VALUE"] === "DATE" || /^\d{8}$/.test(dtstart);

  const startsAt = parseDateTime(dtstart, params["DTSTART"]?.["TZID"]);
  const dtend = props["DTEND"];
  const endsAt = dtend
    ? parseDateTime(dtend, params["DTEND"]?.["TZID"])
    : new Date(startsAt.getTime() + (isAllDay ? 86400000 : 3600000));

  const title = unescape(props["SUMMARY"] ?? "").trim() || "(제목 없음)";
  const noteRaw = props["DESCRIPTION"];
  const note = noteRaw ? unescape(noteRaw).trim() || null : null;
  const rrule = props["RRULE"] ?? null;

  const lastModifiedRaw = props["LAST-MODIFIED"];
  const lastModified = lastModifiedRaw
    ? parseDateTime(lastModifiedRaw).getTime()
    : null;

  return { uid, title, note, startsAt, endsAt, isAllDay, rrule, lastModified };
}

// VCALENDAR 문자열 → ParsedVEvent 배열
export function parseVCalendar(ical: string): ParsedVEvent[] {
  const unfolded = unfoldLines(ical);
  const results: ParsedVEvent[] = [];

  for (const match of unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
    const event = parseVEvent(match[0] ?? "");
    if (event) results.push(event);
  }

  return results;
}

// XML 엔티티 디코딩 (CalDAV 응답에서 calendar-data가 이스케이프된 경우)
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// CalDAV REPORT 응답 XML에서 calendar-data 블록 목록 추출
export function extractCalendarDataBlocks(xml: string): string[] {
  const blocks: string[] = [];
  for (const m of xml.matchAll(
    /<(?:[A-Za-z]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[A-Za-z]+:)?calendar-data>/g,
  )) {
    const raw = (m[1] ?? "").trim();
    if (raw) blocks.push(decodeXmlEntities(raw));
  }
  return blocks;
}

// CalDAV PROPFIND 응답 XML에서 특정 태그 내 href 추출
export function extractHrefInTag(xml: string, parentTag: string): string | null {
  const tagRe = new RegExp(
    `<(?:[A-Za-z]+:)?${parentTag}[^>]*>[\\s\\S]*?<(?:[A-Za-z]+:)?href[^>]*>([^<]+)<\\/(?:[A-Za-z]+:)?href>[\\s\\S]*?<\\/(?:[A-Za-z]+:)?${parentTag}>`,
    "i",
  );
  return xml.match(tagRe)?.[1]?.trim() ?? null;
}

// CalDAV PROPFIND(Depth:1) 응답에서 [href, displayname] 목록 추출
export function extractResponseHrefs(
  xml: string,
): { href: string; displayName: string; isCalendar: boolean }[] {
  const results: { href: string; displayName: string; isCalendar: boolean }[] = [];
  for (const rm of xml.matchAll(
    /<(?:[A-Za-z]+:)?response[^>]*>([\s\S]*?)<\/(?:[A-Za-z]+:)?response>/g,
  )) {
    const block = rm[1] ?? "";
    const hrefM = block.match(/<(?:[A-Za-z]+:)?href[^>]*>([^<]+)<\/(?:[A-Za-z]+:)?href>/);
    const nameM = block.match(
      /<(?:[A-Za-z]+:)?displayname[^>]*>([^<]*)<\/(?:[A-Za-z]+:)?displayname>/,
    );
    const isCalendar = block.includes("calendar") && !block.includes("calendar-proxy");
    if (hrefM) {
      results.push({
        href: hrefM[1]?.trim() ?? "",
        displayName: nameM?.[1]?.trim() ?? "",
        isCalendar,
      });
    }
  }
  return results;
}
