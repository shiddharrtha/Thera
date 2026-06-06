import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import { formatScanTimestamp, formatDateFromEpochMs, getScanRecordedAtMs } from '../utils/timestamps';

type ChartPoint = { date: string; weed: number; stress: number; spray: number };

function MiniChart({
  dataKey,
  color,
  label,
  data,
}: {
  dataKey: keyof ChartPoint;
  color: string;
  label: string;
  data: ChartPoint[];
}) {
  const values = data.map((d) => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const width = 280;
  const height = 56;
  const denom = Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = (i / denom) * width;
      const y = height - (v / max) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');
  const lastValue = values[values.length - 1] ?? 0;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartLabel}>{label}</Text>
        <Text style={[styles.chartValue, { color }]}>{lastValue}%</Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0,${height} L${points.split(' ').map((p, i) => (i === 0 ? p : `L${p}`)).join(' ')} L${width},${height} Z`}
          fill={`url(#grad-${dataKey})`}
        />
        <Path d={`M${points.split(' ').join(' L')}`} stroke={color} strokeWidth="2" fill="none" />
        {values.map((v, i) => {
          const x = (i / denom) * width;
          const y = height - (v / max) * (height - 8);
          return <Circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
      </Svg>
    </View>
  );
}

export function TimelineScreen({ onBack, onNavigate }: ScreenProps) {
  const { selectedFieldId, getField, getScansForField } = useAppData();
  const field = selectedFieldId ? getField(selectedFieldId) : undefined;
  const scans = selectedFieldId
    ? getScansForField(selectedFieldId).filter((s) => s.status === 'completed')
    : [];

  if (scans.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.title}>{field?.name ?? 'Field'} Timeline</Text>
        </View>
        <EmptyState
          icon="time-outline"
          title="No Scan History Yet"
          message="Complete your first scan to start building a timeline of crop health and weed pressure."
          actionLabel="Start First Scan"
          onAction={() => onNavigate('scan')}
        />
      </View>
    );
  }

  const isBaseline = scans.length === 1;
  const chartData: ChartPoint[] = scans.map((s) => ({
    date: formatDateFromEpochMs(getScanRecordedAtMs(s)),
    weed: s.weedCoverage ?? 0,
    stress: s.stressCoverage ?? 0,
    spray: s.weedCoverage ? Math.round(s.weedCoverage * 1.2) : 0,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{field?.name ?? 'Field'}</Text>
            <Text style={styles.subtitle}>Scan Timeline{isBaseline ? ' · Baseline established' : ''}</Text>
          </View>
        </View>
        {!isBaseline && (
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={13} color={colors.warning} />
            <Text style={styles.trendText}>Comparing {scans.length} scans over time</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isBaseline ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>BASELINE SCAN</Text>
            <Text style={styles.baselineText}>
              This is your first scan for {field?.name}. Complete a second scan to unlock before/after comparisons and change percentages.
            </Text>
          </View>
        ) : (
          <>
            <MiniChart dataKey="weed" color={colors.destructive} label="Weed Pressure" data={chartData} />
            <MiniChart dataKey="stress" color={colors.warning} label="Crop Stress" data={chartData} />
            <MiniChart dataKey="spray" color={colors.primary} label="Spray Area" data={chartData} />
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SCAN HISTORY</Text>
          {[...scans].reverse().map((scan, i) => (
            <View key={scan.id} style={styles.eventRow}>
              <View style={styles.eventIndicator}>
                <View style={[styles.eventDot, { backgroundColor: i === 0 ? colors.primary : colors.info }]} />
                {i < scans.length - 1 && <View style={styles.eventLine} />}
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventDate}>
                  {formatScanTimestamp(scan)}
                </Text>
                <Text style={styles.eventLabel}>
                  {i === scans.length - 1
                    ? 'First scan baseline established'
                    : `Health score: ${scan.healthScore}%`}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  title: { fontWeight: '700', fontSize: 16, color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray400 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  trendText: { fontSize: 12, fontWeight: '500', color: colors.warningText },
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
  cardLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, marginBottom: 12 },
  baselineText: { fontSize: 13, color: colors.gray600, lineHeight: 20 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventIndicator: { alignItems: 'center', width: 14 },
  eventDot: { width: 14, height: 14, borderRadius: 7, marginTop: 2 },
  eventLine: { width: 2, height: 36, backgroundColor: colors.gray200, marginTop: 4 },
  eventContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  eventDate: { fontSize: 10, fontWeight: '700', color: colors.primary },
  eventLabel: { fontSize: 14, fontWeight: '500', color: colors.gray700, marginTop: 2 },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  chartLabel: { fontSize: 12, fontWeight: '600', color: colors.gray500 },
  chartValue: { fontSize: 12, fontWeight: '700' },
});
