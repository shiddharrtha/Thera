import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HealthBar } from '../components/HealthBar';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const FIELDS = [
  {
    name: 'North Soybean Field',
    health: 82,
    weedPressure: 'Medium',
    weedColor: colors.warning,
    cropStress: 'Low',
    lastScan: '2 days ago',
    healthColor: colors.warning,
    acres: 45,
  },
  {
    name: 'South Soybean Field',
    health: 91,
    weedPressure: 'Low',
    weedColor: colors.success,
    cropStress: 'Low',
    lastScan: '4 days ago',
    healthColor: colors.success,
    acres: 32,
  },
];

export function HomeScreen({ onNavigate }: ScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.name}>Alex</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications" size={18} color={colors.gray500} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => onNavigate('settings')}>
              <Text style={styles.avatarText}>A</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.alertRow}>
          <Ionicons name="warning" size={12} color={colors.warning} />
          <Text style={styles.alertText}>3 fields need attention today</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => onNavigate('scan')}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.scanBtn}>
            <Ionicons name="camera" size={20} color={colors.white} />
            <Text style={styles.scanBtnText}>Start New Scan</Text>
          </LinearGradient>
        </TouchableOpacity>

        {FIELDS.map((f) => (
          <View key={f.name} style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View>
                <Text style={styles.fieldName}>{f.name}</Text>
                <Text style={styles.fieldMeta}>
                  {f.acres} acres · Last scan: {f.lastScan}
                </Text>
              </View>
              <View style={styles.healthScore}>
                <Text style={[styles.healthValue, { color: f.healthColor }]}>{f.health}%</Text>
                <Text style={styles.healthLabel}>Health</Text>
              </View>
            </View>
            <HealthBar pct={f.health} color={f.healthColor} />
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Weed Pressure</Text>
                <Text style={[styles.statValue, { color: f.weedColor }]}>{f.weedPressure}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Crop Stress</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{f.cropStress}</Text>
              </View>
            </View>
            <View style={styles.fieldActions}>
              <TouchableOpacity style={styles.viewReportBtn} onPress={() => onNavigate('report')}>
                <Text style={styles.viewReportText}>View Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapBtn} onPress={() => onNavigate('field-map')}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.mapBtnText}>Open Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={16} color={colors.white} />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>New weed growth detected in North Field</Text>
            <Text style={styles.warningSub}>+12% increase since last scan</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Needs Attention</Text>
            </View>
          </View>
        </View>

        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.savingsCard}>
          <Text style={styles.savingsLabel}>ESTIMATED SEASON SAVINGS</Text>
          <Text style={styles.savingsAmount}>$1,240</Text>
          <View style={styles.savingsRow}>
            <Ionicons name="trending-down" size={14} color={colors.green300} />
            <Text style={styles.savingsSub}>66% spray area reduced this season</Text>
          </View>
          <TouchableOpacity style={styles.savingsBtn} onPress={() => onNavigate('savings')}>
            <Text style={styles.savingsBtnText}>View Savings Dashboard →</Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 12, color: colors.gray400 },
  name: { fontSize: 24, fontWeight: '900', color: colors.gray900 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  alertText: { fontSize: 12, fontWeight: '500', color: colors.warningText },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 24 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  scanBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  fieldCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldName: { fontWeight: '700', fontSize: 14, color: colors.gray900 },
  fieldMeta: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  healthScore: { alignItems: 'flex-end' },
  healthValue: { fontSize: 18, fontWeight: '900' },
  healthLabel: { fontSize: 10, color: colors.gray400 },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 16 },
  stat: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, color: colors.gray500 },
  statValue: { fontSize: 12, fontWeight: '600' },
  fieldActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  viewReportBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  viewReportText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  mapBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.warningBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: { flex: 1 },
  warningTitle: { fontWeight: '700', fontSize: 14, color: '#78350F' },
  warningSub: { fontSize: 12, color: colors.warningText, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warning,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  savingsCard: { borderRadius: 16, padding: 20 },
  savingsLabel: { fontSize: 10, fontWeight: '700', color: colors.green300, letterSpacing: 1 },
  savingsAmount: { fontSize: 36, fontWeight: '900', color: colors.white, marginTop: 4 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  savingsSub: { fontSize: 12, color: colors.green300 },
  savingsBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
  },
  savingsBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
});
