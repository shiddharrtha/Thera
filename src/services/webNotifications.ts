import { Platform } from 'react-native';

export type WebNotificationPayload = {
  type: string;
  reportId?: string;
  scanId?: string;
  fieldId?: string;
};

type NotificationClickHandler = (payload: WebNotificationPayload) => void;

let clickHandler: NotificationClickHandler | null = null;

export function isWebNotificationsSupported(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;
}

export function registerWebNotificationClickHandler(handler: NotificationClickHandler | null): void {
  clickHandler = handler;
}

export async function getWebNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isWebNotificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestWebNotificationPermission(): Promise<boolean> {
  if (!isWebNotificationsSupported()) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showWebNotification(
  title: string,
  body: string,
  data?: WebNotificationPayload,
  tag?: string,
): void {
  if (!isWebNotificationsSupported() || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      data,
      icon: '/favicon.ico',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (data?.type && clickHandler) {
        clickHandler(data);
      }
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[webNotifications] Could not show notification', error);
    }
  }
}
