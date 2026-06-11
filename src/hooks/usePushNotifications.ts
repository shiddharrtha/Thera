import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import type { Screen } from '../types/navigation';
import {
  clearExpoPushToken,
  configureNotificationHandler,
  isPushSupported,
  parseScanReportNotificationData,
  syncPushTokenForUser,
} from '../services/pushNotifications';

type NavigateFn = (screen: Screen) => void;

export function usePushNotifications(onNavigate: NavigateFn): void {
  const { user } = useAuth();
  const {
    data,
    setSelectedReportId,
    setSelectedScanId,
    setSelectedFieldId,
  } = useAppData();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  const previousUserIdRef = useRef<string | undefined>();

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = user?.uid;

    if (previousUserId && previousUserId !== user?.uid) {
      void clearExpoPushToken(previousUserId);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !isPushSupported()) return;
    if (!data.settings.scanCompletedNotifications) return;

    void syncPushTokenForUser(user.uid);
  }, [user, data.settings.scanCompletedNotifications]);

  useEffect(() => {
    if (!isPushSupported()) return;

    function openReportFromNotification(notification: Notifications.Notification) {
      const payload = parseScanReportNotificationData(
        notification.request.content.data as Record<string, unknown>,
      );
      if (!payload) return;

      let reportId = payload.reportId;
      if (!reportId && payload.scanId) {
        reportId = data.reports.find((report) => report.scanId === payload.scanId)?.id;
      }
      if (!reportId) return;

      setSelectedReportId(reportId);
      if (payload.scanId) setSelectedScanId(payload.scanId);
      if (payload.fieldId) setSelectedFieldId(payload.fieldId);
      onNavigate('report');
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      openReportFromNotification(lastResponse.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openReportFromNotification(response.notification);
    });

    return () => subscription.remove();
  }, [
    data.reports,
    onNavigate,
    setSelectedFieldId,
    setSelectedReportId,
    setSelectedScanId,
  ]);
}
