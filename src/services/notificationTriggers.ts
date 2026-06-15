import type { AppDataState, Report, Scan, UserSettings } from '../types/models';
import { formatPercent, pressureLabel } from '../utils/scanMetrics';
import { deliverNotification, type NotificationPayload } from './pushNotifications';

const WEED_ALERT_THRESHOLD = 15;
const STRESS_ALERT_THRESHOLD = 15;

export function fieldNeedsAlert(report: Report, scan: Scan): boolean {
  const weed = scan.weedCoverage ?? 0;
  const stress = scan.stressCoverage ?? 0;
  return (
    weed >= WEED_ALERT_THRESHOLD ||
    stress >= STRESS_ALERT_THRESHOLD ||
    report.severity === 'warning' ||
    report.severity === 'critical' ||
    report.findingsCount > 0
  );
}

function fieldAlertBody(report: Report, scan: Scan, fieldName: string): string {
  const parts: string[] = [];
  const weed = scan.weedCoverage ?? 0;
  const stress = scan.stressCoverage ?? 0;

  if (weed >= WEED_ALERT_THRESHOLD) {
    parts.push(`weed pressure ${pressureLabel(weed).toLowerCase()} (${formatPercent(weed)})`);
  }
  if (stress >= STRESS_ALERT_THRESHOLD) {
    parts.push(`crop stress ${pressureLabel(stress).toLowerCase()} (${formatPercent(stress)})`);
  }
  if (report.findingsCount > 0 && parts.length === 0) {
    parts.push(`${report.findingsCount} issue${report.findingsCount === 1 ? '' : 's'} detected`);
  }
  if (parts.length === 0) {
    parts.push(`status: ${report.severity}`);
  }

  return `${fieldName}: ${parts.join(' and ')}. Review your field report.`;
}

export async function notifyScanCompleted(
  settings: UserSettings,
  options: {
    fieldName: string;
    reportId: string;
    scanId: string;
    fieldId: string;
    skipWhenAnalysisApi?: boolean;
  },
): Promise<void> {
  if (!settings.scanCompletedNotifications) return;
  if (options.skipWhenAnalysisApi) return;

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

export async function notifyFieldAlert(
  settings: UserSettings,
  options: {
    fieldName: string;
    report: Report;
    scan: Scan;
    fieldId: string;
  },
): Promise<void> {
  if (!settings.fieldAlerts) return;
  if (!fieldNeedsAlert(options.report, options.scan)) return;

  await deliverNotification({
    title: 'Field alert',
    body: fieldAlertBody(options.report, options.scan, options.fieldName),
    tag: `field-alert-${options.scan.id}`,
    data: {
      type: 'field_alert',
      reportId: options.report.id,
      scanId: options.scan.id,
      fieldId: options.fieldId,
    },
  });
}

export function buildWeeklyDigest(data: AppDataState): { title: string; body: string } | null {
  const fields = data.fields;
  if (fields.length === 0) return null;

  const completedScans = data.scans.filter((scan) => scan.status === 'completed');
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const scansThisWeek = completedScans.filter((scan) => {
    const ms = scan.recordedAtMs ?? Date.parse(scan.createdAt);
    return ms >= weekAgo;
  });

  const attentionFields = fields.filter(
    (field) => field.status === 'warning' || field.status === 'critical',
  );

  const healthScores = fields
    .map((field) => field.healthScore)
    .filter((score): score is number => typeof score === 'number');
  const avgHealth =
    healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length)
      : null;

  const bodyParts = [
    `${fields.length} field${fields.length === 1 ? '' : 's'} tracked`,
    `${scansThisWeek.length} scan${scansThisWeek.length === 1 ? '' : 's'} this week`,
  ];

  if (avgHealth !== null) {
    bodyParts.push(`avg health ${avgHealth}%`);
  }
  if (attentionFields.length > 0) {
    bodyParts.push(
      `${attentionFields.length} need${attentionFields.length === 1 ? 's' : ''} attention`,
    );
  }

  return {
    title: 'Weekly field digest',
    body: bodyParts.join(' · '),
  };
}

export async function notifyWeeklyDigest(settings: UserSettings, data: AppDataState): Promise<void> {
  if (!settings.weeklyDigest) return;

  const digest = buildWeeklyDigest(data);
  if (!digest) return;

  await deliverNotification({
    title: digest.title,
    body: digest.body,
    tag: 'weekly-digest',
    data: { type: 'weekly_digest' },
  });
}

export async function notifyTip(settings: UserSettings, tip: string): Promise<void> {
  if (!settings.tipsAndBestPractices) return;

  await deliverNotification({
    title: 'Thera tip',
    body: tip,
    tag: 'thera-tip',
    data: { type: 'tip' },
  });
}

export async function notifyAfterScanComplete(
  settings: UserSettings,
  options: {
    fieldName: string;
    report: Report;
    scan: Scan;
    fieldId: string;
    skipScanCompleteWhenAnalysisApi?: boolean;
  },
): Promise<void> {
  await notifyScanCompleted(settings, {
    fieldName: options.fieldName,
    reportId: options.report.id,
    scanId: options.scan.id,
    fieldId: options.fieldId,
    skipWhenAnalysisApi: options.skipScanCompleteWhenAnalysisApi,
  });

  await notifyFieldAlert(settings, {
    fieldName: options.fieldName,
    report: options.report,
    scan: options.scan,
    fieldId: options.fieldId,
  });
}

export type { NotificationPayload };
