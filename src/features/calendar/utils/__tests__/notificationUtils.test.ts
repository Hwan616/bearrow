import {
  REMINDER_OPTIONS,
  buildNotificationContent,
  getNotificationDate,
  getReminderLabel,
  shouldScheduleNotification,
} from "../notificationUtils";

// ── REMINDER_OPTIONS ──────────────────────────────────────────────────────

describe("REMINDER_OPTIONS", () => {
  it("첫 번째 옵션은 '없음'(minutes=null)", () => {
    expect(REMINDER_OPTIONS[0]).toEqual({ label: "없음", minutes: null });
  });

  it("모든 minutes 값이 null이거나 0 이상의 정수", () => {
    for (const opt of REMINDER_OPTIONS) {
      if (opt.minutes !== null) {
        expect(opt.minutes).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(opt.minutes)).toBe(true);
      }
    }
  });
});

// ── buildNotificationContent ──────────────────────────────────────────────

describe("buildNotificationContent", () => {
  it("제목은 이벤트 제목과 동일", () => {
    const { title } = buildNotificationContent("팀 회의", 15);
    expect(title).toBe("팀 회의");
  });

  it("minutes=0이면 '지금 시작합니다.'", () => {
    const { body } = buildNotificationContent("점심", 0);
    expect(body).toBe("지금 시작합니다.");
  });

  it("minutes=5이면 '5분 후 시작합니다.'", () => {
    const { body } = buildNotificationContent("스탠드업", 5);
    expect(body).toBe("5분 후 시작합니다.");
  });

  it("minutes=60이면 '60분 후 시작합니다.'", () => {
    const { body } = buildNotificationContent("발표", 60);
    expect(body).toBe("60분 후 시작합니다.");
  });
});

// ── getNotificationDate ───────────────────────────────────────────────────

describe("getNotificationDate", () => {
  const startsAt = new Date(2026, 5, 27, 14, 0, 0); // 14:00

  it("minutes=0이면 시작 시각과 동일", () => {
    expect(getNotificationDate(startsAt, 0).getTime()).toBe(startsAt.getTime());
  });

  it("minutes=30이면 30분 전", () => {
    const expected = new Date(2026, 5, 27, 13, 30, 0);
    expect(getNotificationDate(startsAt, 30).getTime()).toBe(expected.getTime());
  });

  it("minutes=60이면 1시간 전", () => {
    const expected = new Date(2026, 5, 27, 13, 0, 0);
    expect(getNotificationDate(startsAt, 60).getTime()).toBe(expected.getTime());
  });

  it("원본 Date를 변경하지 않는다 (불변)", () => {
    const orig = new Date(startsAt);
    getNotificationDate(startsAt, 15);
    expect(startsAt.getTime()).toBe(orig.getTime());
  });
});

// ── shouldScheduleNotification ────────────────────────────────────────────

describe("shouldScheduleNotification", () => {
  const now = new Date(2026, 5, 27, 9, 0, 0); // 기준 시각

  it("reminderMinutes=null이면 false", () => {
    const futureStart = new Date(2026, 5, 27, 10, 0);
    expect(shouldScheduleNotification(futureStart, null, now)).toBe(false);
  });

  it("알림 시각이 미래이면 true", () => {
    const futureStart = new Date(2026, 5, 27, 10, 0); // 10:00 - 30분 = 9:30 > 9:00 now
    expect(shouldScheduleNotification(futureStart, 30, now)).toBe(true);
  });

  it("알림 시각이 과거이면 false", () => {
    const pastStart = new Date(2026, 5, 27, 8, 30); // 8:30 - 0분 = 8:30 < 9:00 now
    expect(shouldScheduleNotification(pastStart, 0, now)).toBe(false);
  });

  it("알림 시각이 정확히 현재이면 false (초과 조건)", () => {
    const exactStart = new Date(2026, 5, 27, 9, 5); // 9:05 - 5분 = 9:00 === now
    expect(shouldScheduleNotification(exactStart, 5, now)).toBe(false);
  });
});

// ── getReminderLabel ──────────────────────────────────────────────────────

describe("getReminderLabel", () => {
  it("null → '없음'", () => {
    expect(getReminderLabel(null)).toBe("없음");
  });

  it("0 → '정시'", () => {
    expect(getReminderLabel(0)).toBe("정시");
  });

  it("15 → '15분 전'", () => {
    expect(getReminderLabel(15)).toBe("15분 전");
  });

  it("60 → '1시간 전'", () => {
    expect(getReminderLabel(60)).toBe("1시간 전");
  });

  it("정의되지 않은 값 → '없음' (기본값)", () => {
    expect(getReminderLabel(99)).toBe("없음");
  });
});
