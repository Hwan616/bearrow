import * as Notifications from "expo-notifications";

import {
  buildNotificationContent,
  getNotificationDate,
  shouldScheduleNotification,
} from "../utils/notificationUtils";

// 앱 시작 시 한 번 호출 — 알림 수신 핸들러 설정
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// iOS 알림 권한 요청 (Android는 SDK 33+ 이하에서 자동 허용)
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// 이벤트 알림 예약 — 이미 있으면 취소 후 재예약
export async function scheduleEventNotification(event: {
  id: string;
  title: string;
  startsAt: Date;
  reminderMinutes: number | null;
}): Promise<void> {
  await cancelEventNotification(event.id);

  if (!shouldScheduleNotification(event.startsAt, event.reminderMinutes)) return;

  const minutesBefore = event.reminderMinutes!;
  const triggerDate = getNotificationDate(event.startsAt, minutesBefore);
  const content = buildNotificationContent(event.title, minutesBefore);

  await Notifications.scheduleNotificationAsync({
    identifier: event.id,
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

// 이벤트 알림 취소
export async function cancelEventNotification(eventId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(eventId);
}
