import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HealthRing } from '../components/HealthRing';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import { formatOptionalDisplayDateTime, formatFromEpochMs, parseApiTimestamp } from '../utils/timestamps';

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
  const reports = getReportsForField(field.id);
  const scans = getScansForField(field.id);
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
                <Metric label="Weed pressure" value={hasScan ? 'Medium' : '—'} />
                <Metric label="Crop stress" value={hasScan ? 'Low' : '—'} />
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
                    if (reports[0]) {
                      setSelectedReportId(reports[0].id);
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
          reports.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No reports yet"
              message="Complete a scan to generate your first field report."
              actionLabel="Start First Scan"
              onAction={() => onNavigate('scan')}
            />
          ) : (
            reports.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.reportCard}
                onPress={() => {
                  setSelectedReportId(r.id);
                  onNavigate('report');
                }}
              >
                <View>
                  <Text style={styles.reportDate}>{formatFromEpochMs(parseApiTimestamp(r.createdAt))}</Text>
                  <Text style={styles.reportSummary} numberOfLines={2}>{r.summary}</Text>
                </View>
                <View style={styles.reportMeta}>
                  <Text style={styles.reportSavings}>${r.estimatedSavings}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, highlight && { color: colors.primary }]}>{value}</Text>
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
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
  },
  reportDate: { fontSize: 10, color: colors.gray400 },
  reportSummary: { fontSize: 12, color: colors.gray700, marginTop: 4, flex: 1 },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportSavings: { fontWeight: '700', fontSize: 14, color: colors.primary },
});
