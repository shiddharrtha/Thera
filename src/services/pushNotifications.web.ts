import {
  clearExpoPushToken,
  parseNavigableNotificationData,
  parseScanReportNotificationData,
  saveExpoPushToken,
  SCAN_REPORTS_CHANNEL_ID,
  type NotificationPayload,
  type ScanReportNotificationData,
} from './notificationShared';
import {
  getWebNotificationPermission,
  isWebNotificationsSupported,
  requestWebNotificationPermission,
  showWebNotification,
} from './webNotifications';

export {
  clearExpoPushToken,
  parseNavigableNotificationData,
  parseScanReportNotificationData,
  saveExpoPushToken,
  SCAN_REPORTS_CHANNEL_ID,
};
export type { NotificationPayload, ScanReportNotificationData };

export function isNativePushSupported(): boolean {
  return false;
}

export function isPushSupported(): boolean {
  return false;
}

export function isNotificationsSupported(): boolean {
  return isWebNotificationsSupported();
}

export function configureNotificationHandler(): void {
  // Web uses the browser Notification API — no Expo handler.
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const permission = await getWebNotificationPermission();
  return permission === 'unsupported' ? 'undetermined' : permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return requestWebNotificationPermission();
}

export async function deliverNotification(options: {
  title: string;
  body: string;
  tag?: string;
  data?: NotificationPayload;
}): Promise<void> {
  if (!isWebNotificationsSupported()) return;

  const granted = await requestWebNotificationPermission();
  if (!granted) return;

  showWebNotification(options.title, options.body, options.data, options.tag);
}

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function syncPushTokenForUser(_userId: string): Promise<string | null> {
  return null;
}

export async function notifyScanReportReady(options: {
  fieldName: string;
  reportId: string;
  scanId: string;
  fieldId: string;
}): Promise<void> {
  await deliverNotification({
    title: 'Field report ready',
    body: `Your ${options.fieldName} scan has been analyzed.`,
    tag: `scan-complete-${options.scanId}`,
    data: {
      type: 'scan_complete',
      reportId: options.reportId,
      scanId: options.scanId,
      fieldId: options.fieldId,
    },
  });
}

export function getLastNotificationResponse(): null {
  return null;
}

export function addNotificationResponseListener(
  _listener: (response: never) => void,
): { remove: () => void } {
  return { remove: () => {} };
}
