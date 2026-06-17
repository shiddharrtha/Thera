import { useEffect, useRef } from 'react';
import { useAppData } from '../context/AppDataContext';
import type { Screen } from '../types/navigation';
import {
  addNotificationResponseListener,
  configureNotificationHandler,
  getLastNotificationResponse,
  isNativePushSupported,
  isWebNotificationsSupported,
  parseNavigableNotificationData,
} from '../services/pushNotifications';
import {
  registerWebNotificationClickHandler,
  type WebNotificationPayload,
} from '../services/webNotifications';
import { useNotificationScheduler } from './useNotificationScheduler';

type NavigateFn = (screen: Screen) => void;

export function usePushNotifications(onNavigate: NavigateFn): void {
  const {
    data,
    setSelectedReportId,
    setSelectedScanId,
    setSelectedFieldId,
  } = useAppData();

  useNotificationScheduler();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  const reportsRef = useRef(data.reports);
  reportsRef.current = data.reports;

  useEffect(() => {
    function openReportFromPayload(payload: WebNotificationPayload) {
      const navigable = parseNavigableNotificationData(payload as Record<string, unknown>);
      if (!navigable) return;

      let reportId = navigable.reportId;
      if (!reportId && navigable.scanId) {
        reportId = reportsRef.current.find((report) => report.scanId === navigable.scanId)?.id;
      }
      if (!reportId) return;

      setSelectedReportId(reportId);
      if (navigable.scanId) setSelectedScanId(navigable.scanId);
      if (navigable.fieldId) setSelectedFieldId(navigable.fieldId);
      onNavigate('report');
    }

    if (isWebNotificationsSupported()) {
      registerWebNotificationClickHandler((payload) => {
        if (payload.type === 'weekly_digest' || payload.type === 'tip') {
          onNavigate('home');
          return;
        }
        openReportFromPayload(payload);
      });

      return () => registerWebNotificationClickHandler(null);
    }

    if (!isNativePushSupported()) return;

    function openReportFromNotification(
      notification: import('expo-notifications').Notification,
    ) {
      openReportFromPayload(
        notification.request.content.data as Record<string, unknown> as WebNotificationPayload,
      );
    }

    const lastResponse = getLastNotificationResponse();
    if (lastResponse?.notification) {
      openReportFromNotification(lastResponse.notification);
    }

    const subscription = addNotificationResponseListener((response) => {
      openReportFromNotification(response.notification);
    });

    return () => subscription.remove();
  }, [onNavigate, setSelectedFieldId, setSelectedReportId, setSelectedScanId]);
}
