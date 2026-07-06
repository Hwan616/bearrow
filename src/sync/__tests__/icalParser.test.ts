import {
  extractCalendarDataBlocks,
  extractHrefInTag,
  parseVCalendar,
} from "../icalParser";

// ── parseVCalendar ────────────────────────────────────────────────────────────

describe("parseVCalendar", () => {
  it("UTC datetime 이벤트를 파싱한다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:test-uid-001@icloud.com",
      "SUMMARY:팀 회의",
      "DTSTART:20260705T090000Z",
      "DTEND:20260705T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.uid).toBe("test-uid-001@icloud.com");
    expect(e.title).toBe("팀 회의");
    expect(e.isAllDay).toBe(false);
    expect(e.startsAt.toISOString()).toBe("2026-07-05T09:00:00.000Z");
    expect(e.endsAt.toISOString()).toBe("2026-07-05T10:00:00.000Z");
    expect(e.rrule).toBeNull();
    expect(e.note).toBeNull();
  });

  it("종일(DATE) 이벤트를 파싱한다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:allday-001",
      "SUMMARY:휴가",
      "DTSTART;VALUE=DATE:20260801",
      "DTEND;VALUE=DATE:20260802",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseVCalendar(ical);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.isAllDay).toBe(true);
    expect(e.startsAt.getDate()).toBe(1);
    expect(e.startsAt.getMonth()).toBe(7); // August = index 7
  });

  it("DESCRIPTION을 note로 변환한다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:note-001",
      "SUMMARY:메모 테스트",
      "DTSTART:20260705T090000Z",
      "DTEND:20260705T100000Z",
      "DESCRIPTION:첫 번째 줄\\n두 번째 줄",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    expect(events[0]?.note).toBe("첫 번째 줄\n두 번째 줄");
  });

  it("RRULE을 그대로 반환한다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:recurring-001",
      "SUMMARY:매주 미팅",
      "DTSTART:20260707T100000Z",
      "DTEND:20260707T110000Z",
      "RRULE:FREQ=WEEKLY;BYDAY=MO",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    expect(events[0]?.rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
  });

  it("STATUS=CANCELLED 이벤트를 건너뛴다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:cancelled-001",
      "SUMMARY:취소된 일정",
      "DTSTART:20260705T090000Z",
      "DTEND:20260705T100000Z",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    expect(parseVCalendar(ical)).toHaveLength(0);
  });

  it("UID 없는 VEVENT를 건너뛴다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:UID 없음",
      "DTSTART:20260705T090000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    expect(parseVCalendar(ical)).toHaveLength(0);
  });

  it("여러 VEVENT를 모두 파싱한다", () => {
    const makeEvent = (uid: string, title: string) =>
      [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `SUMMARY:${title}`,
        "DTSTART:20260705T090000Z",
        "DTEND:20260705T100000Z",
        "END:VEVENT",
      ].join("\r\n");

    const ical = [
      "BEGIN:VCALENDAR",
      makeEvent("uid-A", "A"),
      makeEvent("uid-B", "B"),
      makeEvent("uid-C", "C"),
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.uid)).toEqual(["uid-A", "uid-B", "uid-C"]);
  });

  it("RFC 5545 줄 이어쓰기(line folding)를 처리한다", () => {
    // SUMMARY가 두 줄로 접힌 경우
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:fold-001",
      "SUMMARY:긴 제목이라서\r\n 접혀서 들어온 경우",
      "DTSTART:20260705T090000Z",
      "DTEND:20260705T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    expect(events[0]?.title).toBe("긴 제목이라서접혀서 들어온 경우");
  });

  it("DTEND 없으면 DTSTART + 1시간을 endsAt으로 설정한다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:noend-001",
      "SUMMARY:종료 없음",
      "DTSTART:20260705T090000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    const e = events[0]!;
    expect(e.endsAt.getTime() - e.startsAt.getTime()).toBe(3600000);
  });

  it("LAST-MODIFIED를 lastModified ms로 반환한다", () => {
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:lm-001",
      "SUMMARY:수정 시각 테스트",
      "DTSTART:20260705T090000Z",
      "DTEND:20260705T100000Z",
      "LAST-MODIFIED:20260705T120000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseVCalendar(ical);
    expect(events[0]?.lastModified).toBe(new Date("2026-07-05T12:00:00Z").getTime());
  });
});

// ── extractCalendarDataBlocks ──────────────────────────────────────────────────

describe("extractCalendarDataBlocks", () => {
  it("CalDAV multistatus XML에서 calendar-data 블록을 추출한다", () => {
    const ical = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/calendars/user/home/event1.ics</D:href>
    <D:propstat>
      <D:prop>
        <C:calendar-data>${ical}</C:calendar-data>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

    const blocks = extractCalendarDataBlocks(xml);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("BEGIN:VCALENDAR");
  });

  it("XML 엔티티를 디코딩한다", () => {
    const xml = `<C:calendar-data>BEGIN:VCALENDAR&amp;extra</C:calendar-data>`;
    const blocks = extractCalendarDataBlocks(xml);
    expect(blocks[0]).toContain("BEGIN:VCALENDAR&extra");
  });

  it("빈 XML이면 빈 배열을 반환한다", () => {
    expect(extractCalendarDataBlocks("<D:multistatus/>")).toHaveLength(0);
  });
});

// ── extractHrefInTag ──────────────────────────────────────────────────────────

describe("extractHrefInTag", () => {
  it("지정 태그 내부의 href를 반환한다", () => {
    const xml = `<D:propstat>
  <D:prop>
    <D:current-user-principal>
      <D:href>/principals/user123/</D:href>
    </D:current-user-principal>
  </D:prop>
</D:propstat>`;

    expect(extractHrefInTag(xml, "current-user-principal")).toBe("/principals/user123/");
  });

  it("태그가 없으면 null을 반환한다", () => {
    expect(extractHrefInTag("<D:multistatus/>", "current-user-principal")).toBeNull();
  });
});
