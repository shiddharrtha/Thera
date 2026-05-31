import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const SPRAY_DATA = [
  { name: 'Traditional', value: 100, color: '#D1D5DB' },
  { name: 'Thera', value: 34, color: colors.primary },
];

const MONTHLY = [
  { month: 'May', saved: 220, target: 700 },
  { month: 'June', saved: 410, target: 700 },
  { month: 'July', saved: 610, target: 700 },
];

const STATS = [
  { label: 'Spray Area Avoided', value: '46 ac' },
  { label: 'Avg Spray Reduction', value: '66%' },
  { label: 'Cost Reduction', value: '31%' },
];

export function SavingsScreen(_props: ScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Savings Dashboard</Text>
        <Text style={styles.subtitle}>2026 Season · North Soybean Field</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="cash" size={26} color={colors.white} />
          </View>
          <Text style={styles.heroLabel}>TOTAL ESTIMATED SAVINGS</Text>
          <Text style={styles.heroAmount}>$1,240</Text>
          <Text style={styles.heroSub}>this season</Text>
          <View style={styles.heroRow}>
            <Ionicons name="trending-down" size={14} color={colors.green300} />
            <Text style={styles.heroRowText}>66% spray area reduced across all fields</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SPRAY AREA COMPARISON</Text>
          <Text style={styles.cardSub}>
            Traditional 100% → Thera 34% → <Text style={styles.highlight}>66% reduction</Text>
          </Text>
          <View style={styles.barChart}>
            {SPRAY_DATA.map((entry) => (
              <View key={entry.name} style={styles.barCol}>
                <Text style={[styles.barValue, { color: entry.color === '#D1D5DB' ? colors.gray400 : colors.primary }]}>
                  {entry.value}%
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: entry.value, backgroundColor: entry.color }]} />
                </View>
                <Text style={styles.barLabel}>{entry.name}</Text>
              </View>
            ))}
          </View>
          <View style={styles.reductionBanner}>
            <Ionicons name="trending-down" size={16} color="#15803D" />
            <Text style={styles.reductionText}>Estimated reduction: 66%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>MONTHLY SAVINGS</Text>
          {MONTHLY.map((m, i) => (
            <View key={m.month} style={[styles.monthRow, i < MONTHLY.length - 1 && styles.monthRowBorder]}>
              <View style={styles.monthIcon}>
                <Ionicons name="leaf" size={16} color={colors.primary} />
              </View>
              <View style={styles.monthContent}>
                <Text style={styles.monthName}>{m.month} 2026</Text>
                <View style={styles.monthTrack}>
                  <View style={[styles.monthFill, { width: `${(m.saved / m.target) * 100}%` }]} />
                </View>
              </View>
              <View style={styles.monthAmount}>
                <Text style={styles.monthSaved}>${m.saved}</Text>
                <Text style={styles.monthSavedLabel}>saved</Text>
              </View>
            </View>
          ))}
          <View style={styles.seasonTotal}>
            <View style={styles.seasonRow}>
              <Ionicons name="trophy" size={16} color={colors.primary} />
              <Text style={styles.seasonLabel}>Season Total</Text>
            </View>
            <Text style={styles.seasonAmount}>$1,240</Text>
          </View>
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
  title: { fontSize: 20, fontWeight: '900', color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 24 },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroLabel: { fontSize: 10, fontWeight: '700', color: colors.greenLight, letterSpacing: 2 },
  heroAmount: { fontSize: 48, fontWeight: '900', color: colors.white },
  heroSub: { fontSize: 14, color: colors.green300, marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  heroRowText: { fontSize: 12, color: colors.green300 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.gray900 },
  statLabel: { fontSize: 9, color: colors.gray400, textAlign: 'center', marginTop: 4 },
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
  cardLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, marginBottom: 4 },
  cardSub: { fontSize: 12, color: colors.gray400, marginBottom: 16 },
  highlight: { color: colors.success, fontWeight: '700' },
  barChart: { flexDirection: 'row', gap: 16, paddingHorizontal: 8 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  barTrack: { width: '100%', height: 100, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  barLabel: { fontSize: 10, color: colors.gray500, marginTop: 8, fontWeight: '500' },
  reductionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  reductionText: { fontSize: 14, fontWeight: '700', color: '#15803D' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  monthRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  monthIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthContent: { flex: 1 },
  monthName: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  monthTrack: { height: 6, borderRadius: 3, backgroundColor: colors.gray100, marginTop: 4, overflow: 'hidden' },
  monthFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  monthAmount: { alignItems: 'flex-end' },
  monthSaved: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  monthSavedLabel: { fontSize: 10, color: colors.gray400 },
  seasonTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seasonLabel: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  seasonAmount: { fontSize: 18, fontWeight: '900', color: colors.primary },
});
