import type { FieldStatus, Scan } from '../types/models';
import { colors } from '../theme/colors';

export function formatPercent(value?: number | string | null, digits = 1): string {
  const parsed = parseOptionalMetric(value);
  if (parsed === undefined) return '—';
  return `${Number(parsed.toFixed(digits))}%`;
}

function parseOptionalMetric(value?: number | string | null): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function pressureLabel(coverage?: number | string | null): string {
  const parsed = typeof coverage === 'string' || typeof coverage === 'number'
    ? Number(coverage)
    : undefined;
  if (parsed === undefined || Number.isNaN(parsed)) return '—';
  if (parsed < 5) return 'Low';
  if (parsed < 15) return 'Medium';
  if (parsed < 25) return 'High';
  return 'Very High';
}

export function pressureColor(coverage?: number | string | null): string {
  const parsed = typeof coverage === 'string' || typeof coverage === 'number'
    ? Number(coverage)
    : undefined;
  if (parsed === undefined || Number.isNaN(parsed)) return colors.gray500;
  if (parsed < 5) return colors.success;
  if (parsed < 15) return colors.warning;
  return colors.destructive;
}

const SEVERITY_LABELS: Record<FieldStatus, string> = {
  unscanned: 'Not Scanned',
  healthy: 'Healthy',
  warning: 'Needs Attention',
  critical: 'Critical',
};

export function severityLabel(status: FieldStatus): string {
  return SEVERITY_LABELS[status];
}

export function overallStatusText(severity: FieldStatus, scan?: Scan): string {
  const weed = scan?.weedCoverage ?? 0;
  const stress = scan?.stressCoverage ?? 0;

  if (severity === 'healthy') return 'Overall Status: Healthy';
  if (severity === 'critical') return 'Overall Status: Critical';
  if (stress >= 15 && stress >= weed) return 'Overall Status: Elevated Crop Stress';
  if (weed >= 8) return 'Overall Status: Elevated Weed Pressure';
  return `Overall Status: ${SEVERITY_LABELS[severity]}`;
}

export function severityBadgeColors(severity: FieldStatus): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case 'healthy':
      return { bg: colors.accent, text: '#15803D', icon: colors.success };
    case 'warning':
      return { bg: colors.warningBg, text: colors.warningText, icon: colors.warning };
    case 'critical':
      return { bg: '#FEE2E2', text: '#DC2626', icon: colors.destructive };
    default:
      return { bg: colors.gray100, text: colors.gray600, icon: colors.gray500 };
  }
}

export function formatCoverageDelta(current?: number, previous?: number): string {
  if (current === undefined) return 'No comparison data';
  if (previous === undefined) return 'First scan for this field';
  const delta = Number((current - previous).toFixed(1));
  if (Math.abs(delta) < 0.5) return 'No major change from last scan';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}% from last scan`;
}

export function coverageDeltaColor(current?: number, previous?: number): string {
  if (current === undefined || previous === undefined) return colors.gray500;
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return colors.gray500;
  return delta > 0 ? colors.destructive : colors.success;
}

export function averageIssueConfidence(issues: { confidence: number }[]): number {
  if (issues.length === 0) return 0;
  return Math.round(
    (issues.reduce((sum, issue) => sum + issue.confidence, 0) / issues.length) * 100,
  );
}

export function getLatestCompletedScan(scans: Scan[]): Scan | undefined {
  return scans
    .filter((scan) => scan.status === 'completed')
    .sort((a, b) => {
      const aMs = a.recordedAtMs ?? Date.parse(a.createdAt);
      const bMs = b.recordedAtMs ?? Date.parse(b.createdAt);
      return bMs - aMs;
    })[0];
}

export function getPreviousCompletedScan(scans: Scan[], currentScanId: string): Scan | undefined {
  const completed = scans
    .filter((scan) => scan.status === 'completed')
    .sort((a, b) => {
      const aMs = a.recordedAtMs ?? Date.parse(a.createdAt);
      const bMs = b.recordedAtMs ?? Date.parse(b.createdAt);
      return bMs - aMs;
    });

  const currentIndex = completed.findIndex((scan) => scan.id === currentScanId);
  if (currentIndex === -1 || currentIndex === completed.length - 1) return undefined;
  return completed[currentIndex + 1];
}
