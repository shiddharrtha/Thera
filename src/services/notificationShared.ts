export const SCAN_REPORTS_CHANNEL_ID = 'scan-reports';

export type NotificationPayload = {
  type: string;
  reportId?: string;
  scanId?: string;
  fieldId?: string;
};

export type ScanReportNotificationData = {
  type: 'scan_complete';
  reportId?: string;
  scanId?: string;
  fieldId?: string;
};

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

export function parseNavigableNotificationData(
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
