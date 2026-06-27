import { RRule } from "rrule";

import type { Event } from "../types";

export type RecurrenceOption = "none" | "daily" | "weekly" | "monthly";

// ── RRULE 문자열 생성 ──────────────────────────────────────────────────────

export function buildRRuleString(
  recurrence: Exclude<RecurrenceOption, "none">,
  startsAt: Date,
): string {
  switch (recurrence) {
    case "daily":
      return "FREQ=DAILY";
    case "weekly": {
      const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][startsAt.getDay()]!;
      return `FREQ=WEEKLY;BYDAY=${BYDAY}`;
    }
    case "monthly":
      return `FREQ=MONTHLY;BYMONTHDAY=${startsAt.getDate()}`;
  }
}

// ── 사람이 읽기 쉬운 반복 설명 ────────────────────────────────────────────

const DAY_KO: Record<string, string> = {
  MO: "월", TU: "화", WE: "수", TH: "목", FR: "금", SA: "토", SU: "일",
};

export function parseRRuleDescription(rrule: string): string {
  if (rrule.includes("FREQ=DAILY")) return "매일";
  if (rrule.includes("FREQ=WEEKLY")) {
    const match = /BYDAY=([A-Z,]+)/.exec(rrule);
    if (!match) return "매주";
    const days = match[1]!.split(",").map((d) => DAY_KO[d] ?? d).join("·");
    return `매주 ${days}`;
  }
  if (rrule.includes("FREQ=MONTHLY")) {
    const match = /BYMONTHDAY=(\d+)/.exec(rrule);
    return match ? `매월 ${match[1]}일` : "매월";
  }
  return rrule;
}

// ── 날짜 동일 여부 (시각 무시) ─────────────────────────────────────────────

export function isSameDateKey(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── 반복 이벤트 전개 ──────────────────────────────────────────────────────
//
// master: rrule이 있는 원본 이벤트
// from/to: 표시 기간
// exceptions: 해당 master의 예외 이벤트 (삭제·수정된 인스턴스)
//
// 반환: 기간 내 인스턴스 배열
//   - 삭제 예외 → 제외
//   - 수정 예외 → 수정된 버전으로 대체
//   - 일반 인스턴스 → id = `${master.id}:${utcMs}` (가상 ID)

export function expandRecurringEvent(
  master: Event,
  from: Date,
  to: Date,
  exceptions: Event[],
): Event[] {
  if (!master.rrule) return [];

  // RRule은 UTC 자정 기준으로 날짜를 처리 — 로컬 날짜를 UTC로 변환
  const dtstart = new Date(
    Date.UTC(
      master.startsAt.getFullYear(),
      master.startsAt.getMonth(),
      master.startsAt.getDate(),
    ),
  );

  const options = RRule.parseString(master.rrule);
  const rule = new RRule({ ...options, dtstart });

  const fromUtc = new Date(
    Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()),
  );
  const toUtc = new Date(
    Date.UTC(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59),
  );

  const instanceDates = rule.between(fromUtc, toUtc, true);
  const duration = master.endsAt.getTime() - master.startsAt.getTime();
  const results: Event[] = [];

  for (const utcDate of instanceDates) {
    // UTC 날짜 → 로컬 날짜 (시각은 마스터의 시각 유지)
    const instanceLocalDate = new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
    );

    // 삭제 예외 확인
    const deleted = exceptions.find(
      (ex) =>
        ex.isDeleted &&
        ex.exceptionDate !== null &&
        isSameDateKey(ex.exceptionDate, instanceLocalDate),
    );
    if (deleted) continue;

    // 수정 예외 확인
    const modified = exceptions.find(
      (ex) =>
        !ex.isDeleted &&
        ex.exceptionDate !== null &&
        isSameDateKey(ex.exceptionDate, instanceLocalDate),
    );
    if (modified) {
      results.push(modified);
      continue;
    }

    // 일반 인스턴스 생성
    const localStart = new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      master.startsAt.getHours(),
      master.startsAt.getMinutes(),
      0,
      0,
    );

    results.push({
      ...master,
      id: `${master.id}:${utcDate.getTime()}`,
      startsAt: localStart,
      endsAt: new Date(localStart.getTime() + duration),
    });
  }

  return results;
}
