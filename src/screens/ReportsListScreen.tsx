import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthRing } from '../components/HealthRing';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { FieldStatus } from '../types/models';
import { formatFromEpochMs, parseApiTimestamp } from '../utils/timestamps';

const STATUS_CONFIG: Record<FieldStatus, { label: string; bg: string; text: string }> = {
  unscanned: { label: 'Not Scanned', bg: colors.gray100, text: colors.gray600 },
  healthy: { label: 'Healthy', bg: colors.accent, text: '#15803D' },
  warning: { label: 'Warning', bg: colors.warningBg, text: colors.warningText },
  critical: { label: 'Critical', bg: '#FEE2E2', text: '#DC2626' },
};

export function ReportsListScreen({ onNavigate }: ScreenProps) {
  const { data, getField, setSelectedReportId } = useAppData();
  const reports = [...data.reports].sort(
    (a, b) => parseApiTimestamp(b.createdAt) - parseApiTimestamp(a.createdAt),
  );

  if (reports.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports</Text>
        </View>
        <EmptyState
          icon="document-text-outline"
          title="No Reports Yet"
          message="Complete a scan to generate your first field report."
          actionLabel="Start First Scan"
          onAction={() => onNavigate('scan')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>{reports.length} report{reports.length === 1 ? '' : 's'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {reports.map((report) => {
          const field = getField(report.fieldId);
          const st = STATUS_CONFIG[report.severity];
          return (
            <TouchableOpacity
              key={report.id}
              style={styles.card}
              onPress={() => {
                setSelectedReportId(report.id);
                onNavigate('report');
              }}
            >
              <HealthRing score={report.healthScore} size={48} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.fieldName}>{field?.name ?? 'Unknown field'}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.date}>{formatFromEpochMs(parseApiTimestamp(report.createdAt))}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.stat}>{report.findingsCount} findings</Text>
                  <Text style={styles.savings}>${report.estimatedSavings} saved</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '900', color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  fieldName: { fontWeight: '700', fontSize: 14, color: colors.gray900, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  date: { fontSize: 10, color: colors.gray400, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  stat: { fontSize: 10, color: colors.gray500 },
  savings: { fontSize: 10, fontWeight: '700', color: colors.primary },
});
