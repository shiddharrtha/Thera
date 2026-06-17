import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  parseNavigableNotificationData,
  parseScanReportNotificationData,
  SCAN_REPORTS_CHANNEL_ID,
  type NotificationPayload,
  type ScanReportNotificationData,
} from './notificationShared';

export {
  parseNavigableNotificationData,
  parseScanReportNotificationData,
  SCAN_REPORTS_CHANNEL_ID,
};
export type { NotificationPayload, ScanReportNotificationData };

let handlerConfigured = false;

export function isNativePushSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function isPushSupported(): boolean {
  return isNativePushSupported();
}

export function isNotificationsSupported(): boolean {
  return isNativePushSupported();
}

export function isWebNotificationsSupported(): boolean {
  return false;
}

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(SCAN_REPORTS_CHANNEL_ID, {
    name: 'Scan reports',
    description: 'Alerts when a field scan report is ready',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B6B38',
  });
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return status === 'granted';
}

export async function deliverNotification(options: {
  title: string;
  body: string;
  tag?: string;
  data?: NotificationPayload;
}): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: options.title,
      body: options.body,
      sound: true,
      data: options.data,
    },
    trigger: null,
  });
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

export function getLastNotificationResponse(): Notifications.NotificationResponse | null {
  return Notifications.getLastNotificationResponse();
}

export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void,
): { remove: () => void } {
  return Notifications.addNotificationResponseReceivedListener(listener);
}
