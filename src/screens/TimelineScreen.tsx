import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const TIMELINE_EVENTS = [
  { date: 'May 25', label: 'Weed pressure increased to 18%', type: 'warning' },
  { date: 'May 21', label: 'Mild stress detected', type: 'mild' },
  { date: 'May 18', label: 'Healthy scan', type: 'healthy' },
  { date: 'May 14', label: 'First scan baseline established', type: 'info' },
];

const CHART_DATA = [
  { date: 'May 14', weed: 5, stress: 2, spray: 8 },
  { date: 'May 18', weed: 8, stress: 3, spray: 12 },
  { date: 'May 21', weed: 12, stress: 5, spray: 18 },
  { date: 'May 25', weed: 18, stress: 7, spray: 22 },
];

const EVENT_COLORS: Record<string, string> = {
  warning: colors.destructive,
  mild: colors.warning,
  healthy: colors.success,
  info: colors.info,
};

function MiniChart({ dataKey, color, label }: { dataKey: keyof (typeof CHART_DATA)[0]; color: string; label: string }) {
  const values = CHART_DATA.map((d) => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const width = 280;
  const height = 56;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');
  const lastValue = values[values.length - 1];

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
        <Path d={`M0,${height} L${points.split(' ').map((p, i) => (i === 0 ? p : `L${p}`)).join(' ')} L${width},${height} Z`} fill={`url(#grad-${dataKey})`} />
        <Path d={`M${points.split(' ').join(' L')}`} stroke={color} strokeWidth="2" fill="none" />
        {values.map((v, i) => {
          const x = (i / (values.length - 1)) * width;
          const y = height - (v / max) * (height - 8);
          return <Circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
      </Svg>
    </View>
  );
}

export function TimelineScreen({ onBack }: ScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>North Soybean Field</Text>
            <Text style={styles.subtitle}>Scan Timeline</Text>
          </View>
        </View>
        <View style={styles.trendRow}>
          <Ionicons name="trending-up" size={13} color={colors.warning} />
          <Text style={styles.trendText}>Weed pressure increased over the last 7 days</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SCAN COMPARISON</Text>
          <View style={styles.comparison}>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>Last Scan</Text>
              <Text style={styles.comparisonValue}>12%</Text>
              <Text style={styles.comparisonSub}>weed pressure</Text>
            </View>
            <View style={styles.comparisonCol}>
              <View style={styles.changeBadge}>
                <Text style={styles.changeText}>+6%</Text>
              </View>
              <Text style={styles.comparisonSub}>change</Text>
            </View>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>Current</Text>
              <Text style={[styles.comparisonValue, { color: colors.destructive }]}>18%</Text>
              <Text style={styles.comparisonSub}>weed pressure</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SCAN HISTORY</Text>
          {TIMELINE_EVENTS.map((event, i) => (
            <View key={event.date} style={styles.eventRow}>
              <View style={styles.eventIndicator}>
                <View style={[styles.eventDot, { backgroundColor: EVENT_COLORS[event.type] }]} />
                {i < TIMELINE_EVENTS.length - 1 && <View style={styles.eventLine} />}
              </View>
              <View style={styles.eventContent}>
                <Text style={[styles.eventDate, { color: EVENT_COLORS[event.type] }]}>{event.date}</Text>
                <Text style={styles.eventLabel}>{event.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>TREND CHARTS</Text>
        <MiniChart dataKey="weed" color={colors.destructive} label="Weed Pressure %" />
        <MiniChart dataKey="stress" color={colors.warning} label="Crop Stress %" />
        <MiniChart dataKey="spray" color={colors.info} label="Estimated Spray Area %" />

        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>AI INSIGHT</Text>
          <Text style={styles.insightText}>
            "The northwest section shows the biggest increase in weed pressure. Inspect this area before the next spray decision."
          </Text>
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
  comparison: { flexDirection: 'row', justifyContent: 'space-between' },
  comparisonCol: { flex: 1, alignItems: 'center' },
  comparisonLabel: { fontSize: 10, color: colors.gray400, marginBottom: 4 },
  comparisonValue: { fontSize: 24, fontWeight: '900', color: colors.gray900 },
  comparisonSub: { fontSize: 10, color: colors.gray400, marginTop: 4 },
  changeBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  changeText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventIndicator: { alignItems: 'center', width: 14 },
  eventDot: { width: 14, height: 14, borderRadius: 7, marginTop: 2 },
  eventLine: { width: 2, height: 36, backgroundColor: colors.gray200, marginTop: 4 },
  eventContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  eventDate: { fontSize: 10, fontWeight: '700' },
  eventLabel: { fontSize: 14, fontWeight: '500', color: colors.gray700, marginTop: 2 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, paddingHorizontal: 4 },
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
  insightCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  insightLabel: { fontSize: 10, fontWeight: '700', color: colors.info, letterSpacing: 1, marginBottom: 8 },
  insightText: { fontSize: 14, color: '#1E3A5F', lineHeight: 20 },
});
