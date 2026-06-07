import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HealthRing } from '../components/HealthRing';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import { formatOptionalDisplayDateTime, formatScanTimestamp, parseApiTimestamp } from '../utils/timestamps';
import {
  formatPercent,
  getLatestCompletedScan,
  pressureColor,
  pressureLabel,
  severityBadgeColors,
  severityLabel,
} from '../utils/scanMetrics';
import type { Report, Scan } from '../types/models';

type Tab = 'overview' | 'map' | 'timeline' | 'reports';

const STATUS_LABELS = {
  unscanned: { label: 'Not Scanned', bg: colors.gray100, text: colors.gray600 },
  healthy: { label: 'Healthy', bg: colors.accent, text: '#15803D' },
  warning: { label: 'Warning', bg: colors.warningBg, text: colors.warningText },
  critical: { label: 'Critical', bg: '#FEE2E2', text: '#DC2626' },
};

export function FieldDetailScreen({ onNavigate, onBack }: ScreenProps) {
  const { selectedFieldId, getField, getReportsForField, getScansForField, setSelectedReportId } = useAppData();
  const [tab, setTab] = useState<Tab>('overview');
  const field = selectedFieldId ? getField(selectedFieldId) : undefined;
  const reports = field ? getReportsForField(field.id) : [];
  const scans = field ? getScansForField(field.id) : [];
  const scanById = useMemo(
    () => new Map(scans.map((scan) => [scan.id, scan])),
    [scans],
  );
  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        const aMs = a.recordedAtMs ?? parseApiTimestamp(a.createdAt);
        const bMs = b.recordedAtMs ?? parseApiTimestamp(b.createdAt);
        return bMs - aMs;
      }),
    [reports],
  );

  if (!field) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="leaf-outline"
          title="Field not found"
          message="This field may have been removed."
          actionLabel="Back to Fields"
          onAction={onBack}
        />
      </View>
    );
  }

  const st = STATUS_LABELS[field.status];
  const latestScan = getLatestCompletedScan(scans);
  const hasScan = field.status !== 'unscanned';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'map', label: 'Map' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{field.name}</Text>
          <Text style={styles.subtitle}>{field.cropType} · {field.acreage} ac</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.tabActive]} onPress={() => setTab(t.id)}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'overview' && (
          <>
            <View style={styles.summaryCard}>
              {hasScan ? (
                <HealthRing score={field.healthScore ?? 0} />
              ) : (
                <View style={styles.noScore}>
                  <Text style={styles.noScoreText}>—</Text>
                </View>
              )}
              <View style={styles.summaryMetrics}>
                <Metric label="Last scanned" value={formatOptionalDisplayDateTime(field.lastScanDate)} />
                <Metric
                  label="Weed pressure"
                  value={hasScan ? `${pressureLabel(latestScan?.weedCoverage)} (${formatPercent(latestScan?.weedCoverage)})` : '—'}
                  valueColor={hasScan ? pressureColor(latestScan?.weedCoverage) : undefined}
                />
                <Metric
                  label="Crop stress"
                  value={hasScan ? `${pressureLabel(latestScan?.stressCoverage)} (${formatPercent(latestScan?.stressCoverage)})` : '—'}
                  valueColor={hasScan ? pressureColor(latestScan?.stressCoverage) : undefined}
                />
                <Metric label="Open issues" value={String(field.openIssues)} />
                <Metric label="Savings" value={`$${field.totalSavings}`} highlight />
              </View>
            </View>

            {!hasScan ? (
              <TouchableOpacity onPress={() => onNavigate('scan')}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.scanBtn}>
                  <Ionicons name="camera" size={18} color={colors.white} />
                  <Text style={styles.scanBtnText}>Start First Scan</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('scan')}>
                  <Text style={styles.actionBtnText}>Start Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => {
                    if (sortedReports[0]) {
                      setSelectedReportId(sortedReports[0].id);
                      onNavigate('report');
                    }
                  }}
                >
                  <Text style={styles.actionBtnOutlineText}>View Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {tab === 'map' && (
          <EmptyState
            icon="map-outline"
            title={field.hasBoundary ? 'Map ready' : 'No boundary yet'}
            message={
              hasScan
                ? 'Open the interactive field map to view weed, stress, and spray zones.'
                : 'Add a boundary and complete a scan to see AI overlays on the map.'
            }
            actionLabel={hasScan ? 'Open Map' : 'Start First Scan'}
            onAction={() => onNavigate(hasScan ? 'field-map' : 'scan')}
          />
        )}

        {tab === 'timeline' && (
          <EmptyState
            icon="time-outline"
            title={scans.length === 0 ? 'No Scan History Yet' : `${scans.length} scan${scans.length === 1 ? '' : 's'} recorded`}
            message={
              scans.length <= 1
                ? 'Complete a second scan to unlock before/after comparisons and trend charts.'
                : 'View scan history and crop health trends over time.'
            }
            actionLabel={scans.length === 0 ? 'Start First Scan' : 'View Timeline'}
            onAction={() => onNavigate(scans.length === 0 ? 'scan' : 'timeline')}
          />
        )}

        {tab === 'reports' && (
          sortedReports.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No reports yet"
              message="Complete a scan to generate your first field report."
              actionLabel="Start First Scan"
              onAction={() => onNavigate('scan')}
            />
          ) : (
            <>
              <View style={styles.reportsHeader}>
                <Text style={styles.reportsTitle}>Field Reports</Text>
                <Text style={styles.reportsSubtitle}>
                  {sortedReports.length} report{sortedReports.length === 1 ? '' : 's'} · newest first
                </Text>
              </View>
              {sortedReports.map((report) => (
                <FieldReportCard
                  key={report.id}
                  report={report}
                  scan={scanById.get(report.scanId)}
                  onPress={() => {
                    setSelectedReportId(report.id);
                    onNavigate('report');
                  }}
                />
              ))}
            </>
          )
        )}
      </ScrollView>
    </View>
  );
}

function FieldReportCard({
  report,
  scan,
  onPress,
}: {
  report: Report;
  scan?: Scan;
  onPress: () => void;
}) {
  const badge = severityBadgeColors(report.severity);

  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.reportCardTop}>
        <HealthRing score={Math.round(report.healthScore)} size={52} />
        <View style={styles.reportCardMain}>
          <View style={styles.reportCardHeader}>
            <Text style={styles.reportDate}>{formatScanTimestamp(report)}</Text>
            <View style={[styles.reportSeverityBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.reportSeverityText, { color: badge.text }]}>
                {severityLabel(report.severity)}
              </Text>
            </View>
          </View>
          <View style={styles.reportMetricsRow}>
            <ReportMetric
              label="Weed"
              value={formatPercent(scan?.weedCoverage)}
              tone={pressureColor(scan?.weedCoverage)}
              caption={pressureLabel(scan?.weedCoverage)}
            />
            <ReportMetric
              label="Stress"
              value={formatPercent(scan?.stressCoverage)}
              tone={pressureColor(scan?.stressCoverage)}
              caption={pressureLabel(scan?.stressCoverage)}
            />
            <ReportMetric
              label="Issues"
              value={String(report.findingsCount)}
              tone={report.findingsCount > 0 ? colors.warning : colors.success}
            />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray400} style={styles.reportChevron} />
      </View>

      <Text style={styles.reportSummary} numberOfLines={3}>
        {report.summary}
      </Text>

      <View style={styles.reportFooter}>
        <View style={styles.reportFooterStat}>
          <Ionicons name="water-outline" size={14} color={colors.primary} />
          <Text style={styles.reportFooterText}>
            {report.recommendedSprayAcres.toLocaleString()} ac spray
          </Text>
        </View>
        <View style={styles.reportFooterStat}>
          <Ionicons name="leaf-outline" size={14} color={colors.success} />
          <Text style={styles.reportFooterText}>
            {Math.round(report.chemicalReductionPercent)}% chemical reduction
          </Text>
        </View>
        <Text style={styles.reportSavings}>
          ${report.estimatedSavings.toLocaleString()} saved
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ReportMetric({
  label,
  value,
  tone,
  caption,
}: {
  label: string;
  value: string;
  tone: string;
  caption?: string;
}) {
  return (
    <View style={styles.reportMetric}>
      <Text style={styles.reportMetricLabel}>{label}</Text>
      <Text style={[styles.reportMetricValue, { color: tone }]}>{value}</Text>
      {caption ? <Text style={styles.reportMetricCaption}>{caption}</Text> : null}
    </View>
  );
}

function Metric({
  label,
  value,
  highlight,
  valueColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, highlight && { color: colors.primary }, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  headerInfo: { flex: 1 },
  title: { fontWeight: '700', fontSize: 16, color: colors.gray900 },
  subtitle: { fontSize: 11, color: colors.gray400, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.gray400 },
  tabTextActive: { color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  summaryCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  noScore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noScoreText: { fontSize: 24, fontWeight: '700', color: colors.gray400 },
  summaryMetrics: { flex: 1, gap: 6 },
  metric: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { fontSize: 11, color: colors.gray400 },
  metricValue: { fontSize: 11, fontWeight: '700', color: colors.gray800 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  scanBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  actionBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  actionBtnOutlineText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  reportsHeader: { marginBottom: 2 },
  reportsTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900 },
  reportsSubtitle: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  reportCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reportCardMain: { flex: 1, minWidth: 0, gap: 10 },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportDate: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.gray900 },
  reportSeverityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  reportSeverityText: { fontSize: 10, fontWeight: '700' },
  reportMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reportMetric: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  reportMetricLabel: { fontSize: 10, color: colors.gray400, fontWeight: '600' },
  reportMetricValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  reportMetricCaption: { fontSize: 9, color: colors.gray500, marginTop: 1 },
  reportChevron: { marginTop: 14 },
  reportSummary: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.gray600,
  },
  reportFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reportFooterStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportFooterText: { fontSize: 11, color: colors.gray500, fontWeight: '600' },
  reportSavings: {
    marginLeft: 'auto',
    fontWeight: '800',
    fontSize: 13,
    color: colors.primary,
  },
});
