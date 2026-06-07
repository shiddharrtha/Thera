import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

export function SavingsScreen({ onNavigate }: ScreenProps) {
  const { data, getSavingsSummary, hasCompletedScans, getSelectedFarm } = useAppData();
  const savings = getSavingsSummary();
  const selectedFarm = getSelectedFarm();

  if (!hasCompletedScans) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Savings Dashboard</Text>
        </View>
        <EmptyState
          icon="cash-outline"
          title="No savings data yet"
          message="Complete a scan to see estimated chemical savings, spray area reduction, and season totals."
          actionLabel="Start First Scan"
          onAction={() => onNavigate('scan')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Savings Dashboard</Text>
        <Text style={styles.subtitle}>
          {selectedFarm?.name ?? 'Your farm'} · {new Date().getFullYear()} Season
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="cash" size={26} color={colors.white} />
          </View>
          <Text style={styles.heroLabel}>TOTAL ESTIMATED SAVINGS</Text>
          <Text style={styles.heroAmount}>${savings.totalSavings}</Text>
          <Text style={styles.heroSub}>
            {savings.reportCount === 1 ? 'from 1 field report' : `from ${savings.reportCount} field reports`} this season
          </Text>
          {savings.totalSavings === 0 && savings.reportCount > 0 && (
            <Text style={styles.heroHint}>
              Savings estimates appear after your report includes spray reduction data.
            </Text>
          )}
          {savings.avgReduction !== null && (
            <View style={styles.heroRow}>
              <Ionicons name="trending-down" size={14} color={colors.green300} />
              <Text style={styles.heroRowText}>
                {savings.avgReduction}% spray area reduced across all fields
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(savings.sprayAreaAvoided)} ac</Text>
            <Text style={styles.statLabel}>Spray Area Avoided</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{savings.avgReduction !== null ? `${savings.avgReduction}%` : '—'}</Text>
            <Text style={styles.statLabel}>Avg Spray Reduction</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{savings.costReduction !== null ? `${savings.costReduction}%` : '—'}</Text>
            <Text style={styles.statLabel}>Cost Reduction</Text>
          </View>
        </View>

        {!data.costAssumptions ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HOW SAVINGS ARE CALCULATED</Text>
            <Text style={styles.cardBody}>
              Thera compares traditional full-field spray coverage to AI-targeted treatment zones.
              Add your chemical cost, application rate, and optional labor costs for personalized estimates.
            </Text>
            <TouchableOpacity style={styles.assumptionsBtn}>
              <Text style={styles.assumptionsBtnText}>Add Cost Assumptions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>COST ASSUMPTIONS</Text>
            <Text style={styles.cardBody}>
              Chemical: ${data.costAssumptions.chemicalCostPerUnit}/unit · Rate: {data.costAssumptions.applicationRatePerAcre} ac/unit
            </Text>
          </View>
        )}

        {hasCompletedScans && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SPRAY AREA COMPARISON</Text>
            <Text style={styles.cardSub}>
              Traditional 100% → Thera targeted →{' '}
              <Text style={styles.highlight}>{savings.avgReduction ?? 0}% reduction</Text>
            </Text>
          </View>
        )}
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
  heroSub: { fontSize: 14, color: colors.green300, marginTop: 8, textAlign: 'center' },
  heroHint: { fontSize: 12, color: colors.greenLight, marginTop: 10, textAlign: 'center', paddingHorizontal: 8 },
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
  statValue: { fontSize: 16, fontWeight: '900', color: colors.gray900 },
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
  cardLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, marginBottom: 8 },
  cardBody: { fontSize: 13, color: colors.gray500, lineHeight: 20 },
  cardSub: { fontSize: 12, color: colors.gray400 },
  highlight: { color: colors.success, fontWeight: '700' },
  assumptionsBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  assumptionsBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
