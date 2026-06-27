export type ReminderOption = { label: string; minutes: number | null };

export const REMINDER_OPTIONS: ReminderOption[] = [
  { label: "없음", minutes: null },
  { label: "정시", minutes: 0 },
  { label: "5분 전", minutes: 5 },
  { label: "10분 전", minutes: 10 },
  { label: "15분 전", minutes: 15 },
  { label: "30분 전", minutes: 30 },
  { label: "1시간 전", minutes: 60 },
];

// 알림 내용 생성 (제목 + 본문)
export function buildNotificationContent(
  title: string,
  reminderMinutes: number,
): { title: string; body: string } {
  return {
    title,
    body: reminderMinutes === 0 ? "지금 시작합니다." : `${reminderMinutes}분 후 시작합니다.`,
  };
}

// 알림 발송 시각 = 일정 시작 - N분
export function getNotificationDate(startsAt: Date, reminderMinutes: number): Date {
  return new Date(startsAt.getTime() - reminderMinutes * 60 * 1000);
}

// 알림을 예약해야 하는지 여부 (미래 일정이고 reminderMinutes가 설정된 경우)
export function shouldScheduleNotification(
  startsAt: Date,
  reminderMinutes: number | null,
  now: Date = new Date(),
): boolean {
  if (reminderMinutes === null) return false;
  return getNotificationDate(startsAt, reminderMinutes) > now;
}

// 선택된 알림 옵션의 레이블 반환
export function getReminderLabel(minutes: number | null): string {
  return REMINDER_OPTIONS.find((o) => o.minutes === minutes)?.label ?? "없음";
}
