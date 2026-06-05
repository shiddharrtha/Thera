import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { HealthBar } from '../components/HealthBar';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(displayName?: string | null) {
  if (!displayName?.trim()) return 'there';
  return displayName.trim().split(/\s+/)[0];
}

export function HomeScreen({ onNavigate }: ScreenProps) {
  const { user } = useAuth();
  const { data, hasCompletedScans, getSavingsSummary, setSelectedFieldId } = useAppData();

  const firstName = getFirstName(user?.displayName);
  const avatarInitial = firstName.charAt(0).toUpperCase();
  const fields = data.fields;
  const hasFields = fields.length > 0;
  const savings = getSavingsSummary();
  const totalAcres = fields.reduce((sum, f) => sum + f.acreage, 0);
  const completedScans = data.scans.filter((s) => s.status === 'completed').length;
  const attentionFields = fields.filter((f) => f.status === 'warning' || f.status === 'critical');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={18} color={colors.gray500} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => onNavigate('settings')}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {attentionFields.length > 0 && (
          <View style={styles.alertRow}>
            <Ionicons name="warning" size={12} color={colors.warning} />
            <Text style={styles.alertText}>
              {attentionFields.length} field{attentionFields.length === 1 ? '' : 's'} need attention today
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {!hasFields ? (
          <>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome to Thera</Text>
              <Text style={styles.welcomeBody}>
                Add your first field and perform a crop scan to begin tracking crop health, weed pressure, and treatment savings.
              </Text>
              <TouchableOpacity onPress={() => onNavigate('add-field')}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.welcomeBtn}>
                  <Text style={styles.welcomeBtnText}>Add Your First Field</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Fields" value="0" />
              <MetricCard label="Acres monitored" value="0" />
              <MetricCard label="Completed scans" value="0" />
              <MetricCard label="Est. savings" value="$0" />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => onNavigate('scan')}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.scanBtn}>
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.scanBtnText}>
                  {hasCompletedScans ? 'Start New Scan' : 'Start First Scan'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.metricsRow}>
              <MetricCard label="Fields" value={String(fields.length)} />
              <MetricCard label="Acres monitored" value={String(totalAcres)} />
              <MetricCard label="Completed scans" value={String(completedScans)} />
              <MetricCard label="Est. savings" value={`$${savings.totalSavings}`} />
            </View>

            {fields.map((f) => {
              const unscanned = f.status === 'unscanned';
              const healthColor = unscanned
                ? colors.gray400
                : (f.healthScore ?? 0) >= 85
                ? colors.success
                : (f.healthScore ?? 0) >= 70
                ? colors.warning
                : colors.destructive;

              return (
                <TouchableOpacity
                  key={f.id}
                  style={styles.fieldCard}
                  onPress={() => {
                    setSelectedFieldId(f.id);
                    onNavigate('field-detail');
                  }}
                >
                  <View style={styles.fieldHeader}>
                    <View>
                      <Text style={styles.fieldName}>{f.name}</Text>
                      <Text style={styles.fieldMeta}>
                        {f.acreage} acres · Last scan: {f.lastScanDate ?? 'No scans yet'}
                      </Text>
                    </View>
                    <View style={styles.healthScore}>
                      <Text style={[styles.healthValue, { color: healthColor }]}>
                        {unscanned ? '—' : `${f.healthScore}%`}
                      </Text>
                      <Text style={styles.healthLabel}>
                        {unscanned ? 'Not Scanned Yet' : 'Health'}
                      </Text>
                    </View>
                  </View>
                  {!unscanned && f.healthScore !== undefined && (
                    <>
                      <HealthBar pct={f.healthScore} color={healthColor} />
                      <View style={styles.statsRow}>
                        <View style={styles.stat}>
                          <Text style={styles.statLabel}>Weed Pressure</Text>
                          <Text style={[styles.statValue, { color: colors.warning }]}>Medium</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={styles.statLabel}>Crop Stress</Text>
                          <Text style={[styles.statValue, { color: colors.success }]}>Low</Text>
                        </View>
                      </View>
                    </>
                  )}
                  <View style={styles.fieldActions}>
                    {unscanned ? (
                      <TouchableOpacity
                        style={styles.viewReportBtn}
                        onPress={() => {
                          setSelectedFieldId(f.id);
                          onNavigate('scan');
                        }}
                      >
                        <Text style={styles.viewReportText}>Start First Scan</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.viewReportBtn}
                          onPress={() => {
                            setSelectedFieldId(f.id);
                            onNavigate('field-detail');
                          }}
                        >
                          <Text style={styles.viewReportText}>View Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.mapBtn}
                          onPress={() => {
                            setSelectedFieldId(f.id);
                            onNavigate('field-map');
                          }}
                        >
                          <Ionicons name="location" size={12} color={colors.primary} />
                          <Text style={styles.mapBtnText}>Open Map</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {hasCompletedScans && savings.totalSavings > 0 && (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.savingsCard}>
                <Text style={styles.savingsLabel}>ESTIMATED SEASON SAVINGS</Text>
                <Text style={styles.savingsAmount}>${savings.totalSavings}</Text>
                {savings.avgReduction !== null && (
                  <View style={styles.savingsRow}>
                    <Ionicons name="trending-down" size={14} color={colors.green300} />
                    <Text style={styles.savingsSub}>
                      {savings.avgReduction}% spray area reduced this season
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.savingsBtn} onPress={() => onNavigate('savings')}>
                  <Text style={styles.savingsBtnText}>View Savings Dashboard →</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  bellBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.background },
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
  welcomeCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeTitle: { fontWeight: '900', fontSize: 18, color: colors.gray900 },
  welcomeBody: { fontSize: 13, color: colors.gray500, lineHeight: 20 },
  welcomeBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  welcomeBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: { fontSize: 18, fontWeight: '900', color: colors.gray900 },
  metricLabel: { fontSize: 10, color: colors.gray400, textAlign: 'center', marginTop: 4 },
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
