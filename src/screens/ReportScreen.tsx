import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Rect, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { formatScanTimestamp, formatOptionalDisplayDateTime } from '../utils/timestamps';
import {
  averageIssueConfidence,
  coverageDeltaColor,
  formatCoverageDelta,
  formatPercent,
  getPreviousCompletedScan,
  overallStatusText,
  severityBadgeColors,
} from '../utils/scanMetrics';
import type { DetectedIssue, Field, Report, Scan } from '../types/models';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

function ScanPathMap({ scan }: { scan?: Scan }) {
  const points = scan?.gpsTrack ?? [];

  if (points.length < 2) {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>
          {points.length === 1
            ? 'GPS captured · walk a longer path on your next scan for a route map'
            : 'Scan path map will appear when GPS track data is available'}
        </Text>
      </View>
    );
  }

  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.00005);
  const lonSpan = Math.max(maxLon - minLon, 0.00005);
  const padding = 16;
  const width = 280;
  const height = 150;

  const projected = points.map((point) => {
    const x = padding + ((point.longitude - minLon) / lonSpan) * (width - padding * 2);
    const y = height - padding - ((point.latitude - minLat) / latSpan) * (height - padding * 2);
    return `${x},${y}`;
  });

  const [startX, startY] = projected[0].split(',');
  const [endX, endY] = projected[projected.length - 1].split(',');

  return (
    <View>
      <Svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <Rect x="0" y="0" width={width} height={height} fill={colors.background} rx="8" />
        <Polyline
          points={projected.join(' ')}
          stroke={colors.info}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={startX} cy={startY} r="4" fill={colors.success} />
        <Circle cx={endX} cy={endY} r="4" fill={colors.destructive} />
      </Svg>
      <Text style={styles.mapCaption}>
        {points.length} GPS points
        {scan?.videoDurationSeconds ? ` · ${scan.videoDurationSeconds}s scan` : ''}
      </Text>
    </View>
  );
}

type FindingCard = {
  key: string;
  title: string;
  value: string;
  change: string;
  changeColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  border: string;
  iconColor: string;
};

function buildFindings(
  report: Report,
  scan: Scan | undefined,
  field: Field | undefined,
  previousScan?: Scan,
): FindingCard[] {
  const weed = scan?.weedCoverage;
  const stress = scan?.stressCoverage;
  const sprayPct = field && field.acreage > 0
    ? Math.round((report.recommendedSprayAcres / field.acreage) * 100)
    : 0;

  const weedHigh = (weed ?? 0) >= 15;
  const stressHigh = (stress ?? 0) >= 15;

  return [
    {
      key: 'weeds',
      title: 'Weeds Detected',
      value: `${formatPercent(weed)} of scanned area`,
      change: formatCoverageDelta(weed, previousScan?.weedCoverage),
      changeColor: coverageDeltaColor(weed, previousScan?.weedCoverage),
      icon: 'warning',
      bg: weedHigh ? '#FEF2F2' : '#F0FDF4',
      border: weedHigh ? '#FECACA' : '#BBF7D0',
      iconColor: weedHigh ? colors.destructive : colors.success,
    },
    {
      key: 'stress',
      title: 'Crop Stress',
      value: `${formatPercent(stress)} affected`,
      change: formatCoverageDelta(stress, previousScan?.stressCoverage),
      changeColor: coverageDeltaColor(stress, previousScan?.stressCoverage),
      icon: 'leaf',
      bg: stressHigh ? '#FFFBEB' : '#F0FDF4',
      border: stressHigh ? '#FDE68A' : '#BBF7D0',
      iconColor: stressHigh ? colors.warning : colors.success,
    },
    {
      key: 'treatment',
      title: 'Suggested Treatment Area',
      value: `${sprayPct}% of field (${report.recommendedSprayAcres} ac)`,
      change: `Estimated spray reduction: ${report.chemicalReductionPercent}%`,
      changeColor: colors.primary,
      icon: 'water',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      iconColor: colors.info,
    },
  ];
}

function IssueCard({ issue }: { issue: DetectedIssue }) {
  const severityColors = {
    low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    medium: { bg: '#FFFBEB', border: '#FDE68A', text: colors.warningText },
    high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  }[issue.severity];

  return (
    <View style={[styles.issueCard, { backgroundColor: severityColors.bg, borderColor: severityColors.border }]}>
      <View style={styles.issueHeader}>
        <Text style={[styles.issueSeverity, { color: severityColors.text }]}>
          {issue.severity.toUpperCase()}
        </Text>
        <Text style={styles.issueConfidence}>{Math.round(issue.confidence * 100)}% confidence</Text>
      </View>
      <Text style={styles.issueTitle}>{issue.title}</Text>
      <Text style={styles.issueMeta}>{issue.acres} acres affected</Text>
      <Text style={styles.issueAction}>{issue.action}</Text>
    </View>
  );
}

export function ReportScreen({ onNavigate, onBack }: ScreenProps) {
  const { selectedReportId, getReport, getField, getScan, getScansForField } = useAppData();
  const report = selectedReportId ? getReport(selectedReportId) : undefined;
  const field = report ? getField(report.fieldId) : undefined;
  const scan = report ? getScan(report.scanId) : undefined;
  const scanTimestamp = scan ? formatScanTimestamp(scan) : report ? formatOptionalDisplayDateTime(report.createdAt) : null;

  if (!report) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <Text style={styles.emptyTitle}>Report not found</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.emptyLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fieldScans = getScansForField(report.fieldId);
  const previousScan = scan ? getPreviousCompletedScan(fieldScans, scan.id) : undefined;
  const findings = buildFindings(report, scan, field, previousScan);
  const badge = severityBadgeColors(report.severity);
  const confidence = report.issues.length > 0
    ? averageIssueConfidence(report.issues)
    : Math.round(report.healthScore);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{field?.name ?? 'Field Report'}</Text>
            <Text style={styles.subtitle}>
              {scanTimestamp ? `Scan: ${scanTimestamp}` : 'Scan date unavailable'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Ionicons name="analytics" size={12} color={badge.icon} />
          <Text style={[styles.statusText, { color: badge.text }]}>
            {overallStatusText(report.severity, scan)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>AI RECOMMENDATION</Text>
          <Text style={styles.recommendation}>{report.summary}</Text>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceTrack}>
              <View style={[styles.confidenceFill, { width: `${Math.min(confidence, 100)}%` }]} />
            </View>
            <Text style={styles.confidenceText}>{confidence}% confidence</Text>
          </View>
          <Text style={styles.healthScoreText}>
            Field health score: {Math.round(report.healthScore)}/100
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Scan Path</Text>
            <TouchableOpacity onPress={() => onNavigate('field-map')}>
              <Text style={styles.mapLink}>Full Map →</Text>
            </TouchableOpacity>
          </View>
          <ScanPathMap scan={scan} />
          <View style={styles.legend}>
            {[
              { color: colors.success, label: 'Start' },
              { color: colors.destructive, label: 'End' },
              { color: colors.info, label: 'Walk path' },
            ].map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {findings.map((f) => (
          <View key={f.key} style={[styles.findingCard, { backgroundColor: f.bg, borderColor: f.border }]}>
            <View style={[styles.findingIcon, { backgroundColor: f.border }]}>
              <Ionicons name={f.icon} size={16} color={f.iconColor} />
            </View>
            <View style={styles.findingContent}>
              <Text style={styles.findingTitle}>{f.title}</Text>
              <Text style={styles.findingValue}>{f.value}</Text>
              <Text style={[styles.findingChange, { color: f.changeColor }]}>{f.change}</Text>
            </View>
          </View>
        ))}

        {report.issues.length > 0 && (
          <View style={styles.issuesSection}>
            <Text style={styles.issuesHeading}>Detected Issues ({report.findingsCount})</Text>
            {report.issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </View>
        )}

        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.savingsCard}>
          <Text style={styles.savingsLabel}>ESTIMATED CHEMICAL SAVINGS</Text>
          <Text style={styles.savingsAmount}>${report.estimatedSavings}</Text>
          <Text style={styles.savingsSub}>
            this treatment cycle · Spray area reduced: {report.chemicalReductionPercent}%
          </Text>
        </LinearGradient>

        {[
          { label: 'Download Report', icon: 'download' as const, primary: true, action: null },
          { label: 'Share with Agronomist', icon: 'share-social' as const, primary: false, action: null },
          { label: 'Compare Previous Scan', icon: 'bar-chart' as const, primary: false, action: 'timeline' as const },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={[styles.actionBtn, btn.primary ? styles.actionBtnPrimary : styles.actionBtnSecondary]}
            onPress={() => btn.action && onNavigate(btn.action)}
          >
            <Ionicons name={btn.icon} size={16} color={btn.primary ? colors.white : colors.primary} />
            <Text style={[styles.actionBtnText, btn.primary && styles.actionBtnTextPrimary]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.background },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900, marginBottom: 8 },
  emptyLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  title: { fontWeight: '700', fontSize: 16, color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray400 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, marginBottom: 8 },
  recommendation: { fontSize: 14, fontWeight: '600', color: colors.gray900, lineHeight: 20 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  confidenceTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.gray100, overflow: 'hidden' },
  confidenceFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  confidenceText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  healthScoreText: { fontSize: 12, color: colors.gray500, marginTop: 8 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mapTitle: { fontWeight: '700', fontSize: 14, color: colors.gray700 },
  mapLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  mapPlaceholder: {
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  mapPlaceholderText: { fontSize: 12, color: colors.gray500, textAlign: 'center', lineHeight: 18 },
  mapCaption: { fontSize: 10, color: colors.gray400, marginTop: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: colors.gray500 },
  findingCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  findingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingContent: { flex: 1 },
  findingTitle: { fontSize: 10, fontWeight: '700', color: colors.gray500 },
  findingValue: { fontSize: 16, fontWeight: '700', color: colors.gray900, marginTop: 2 },
  findingChange: { fontSize: 12, marginTop: 2 },
  issuesSection: { gap: 10 },
  issuesHeading: { fontSize: 12, fontWeight: '700', color: colors.gray700 },
  issueCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  issueSeverity: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  issueConfidence: { fontSize: 10, color: colors.gray500, fontWeight: '600' },
  issueTitle: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  issueMeta: { fontSize: 12, color: colors.gray500 },
  issueAction: { fontSize: 12, color: colors.gray700, marginTop: 4 },
  savingsCard: { borderRadius: 16, padding: 20 },
  savingsLabel: { fontSize: 10, fontWeight: '700', color: colors.green300, letterSpacing: 1 },
  savingsAmount: { fontSize: 36, fontWeight: '900', color: colors.white, marginTop: 4 },
  savingsSub: { fontSize: 12, color: colors.green300, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnSecondary: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  actionBtnTextPrimary: { color: colors.white },
});
