import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  getWebNotificationPermission,
  isWebNotificationsSupported,
  requestWebNotificationPermission,
  showWebNotification,
  type WebNotificationPayload,
} from './webNotifications';

export const SCAN_REPORTS_CHANNEL_ID = 'scan-reports';

export type NotificationPayload = WebNotificationPayload;

export type ScanReportNotificationData = {
  type: 'scan_complete';
  reportId?: string;
  scanId?: string;
  fieldId?: string;
};

let handlerConfigured = false;

export function isNativePushSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function isPushSupported(): boolean {
  return isNativePushSupported();
}

export function isNotificationsSupported(): boolean {
  return isNativePushSupported() || isWebNotificationsSupported();
}

export function configureNotificationHandler(): void {
  if (!isNativePushSupported() || handlerConfigured) return;

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

function getEasProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return projectId?.trim() || null;
}

export async function getNotificationPermissionStatus(): Promise<string> {
  if (isWebNotificationsSupported()) {
    const permission = await getWebNotificationPermission();
    return permission === 'unsupported' ? 'undetermined' : permission;
  }
  if (!isNativePushSupported()) return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Request OS / browser permission. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isWebNotificationsSupported()) {
    return requestWebNotificationPermission();
  }
  if (!isNativePushSupported()) return false;

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

/** Show a notification on web (browser) or native (local). */
export async function deliverNotification(options: {
  title: string;
  body: string;
  tag?: string;
  data?: NotificationPayload;
}): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  if (isWebNotificationsSupported()) {
    showWebNotification(options.title, options.body, options.data, options.tag);
    return;
  }

  if (!isNativePushSupported()) return;

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

/** Register for Expo push notifications on a physical device. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!isNativePushSupported()) return null;
  if (!Device.isDevice) {
    if (__DEV__) {
      console.warn('[push] Push tokens require a physical device.');
    }
    return null;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const projectId = getEasProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn('[push] Set EXPO_PUBLIC_EAS_PROJECT_ID (run: npx eas init).');
    }
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] Could not get Expo push token', error);
    }
    return null;
  }
}

export async function saveExpoPushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error && __DEV__) {
    console.warn('[push] Could not save push token', error);
  }
}

export async function clearExpoPushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('id', userId);

  if (error && __DEV__) {
    console.warn('[push] Could not clear push token', error);
  }
}

export async function syncPushTokenForUser(userId: string): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (token) {
    await saveExpoPushToken(userId, token);
  }
  return token;
}

export function parseScanReportNotificationData(
  data: Record<string, unknown> | undefined,
): ScanReportNotificationData | null {
  if (!data || data.type !== 'scan_complete') return null;
  return {
    type: 'scan_complete',
    reportId: typeof data.reportId === 'string' ? data.reportId : undefined,
    scanId: typeof data.scanId === 'string' ? data.scanId : undefined,
    fieldId: typeof data.fieldId === 'string' ? data.fieldId : undefined,
  };
}

function parseNavigableNotificationData(
  data: Record<string, unknown> | undefined,
): ScanReportNotificationData | null {
  if (!data) return null;
  if (data.type === 'scan_complete' || data.type === 'field_alert') {
    return {
      type: 'scan_complete',
      reportId: typeof data.reportId === 'string' ? data.reportId : undefined,
      scanId: typeof data.scanId === 'string' ? data.scanId : undefined,
      fieldId: typeof data.fieldId === 'string' ? data.fieldId : undefined,
    };
  }
  return null;
}

export { parseNavigableNotificationData };

/** @deprecated Use deliverNotification via notificationTriggers */
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
