import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';

function FieldZoneMap() {
  return (
    <Svg viewBox="0 0 280 160" width="100%" height={150}>
      <Rect x="0" y="0" width="280" height="160" fill={colors.background} />
      <Polygon points="20,15 260,12 264,148 16,152" fill="#DCFCE7" stroke="#15803D" strokeWidth="1.5" />
      <Polygon points="20,95 264,90 264,148 16,152" fill="#22C55E" opacity="0.45" />
      <Polygon points="155,12 260,12 264,90 155,95" fill="#F59E0B" opacity="0.5" />
      <Polygon points="20,15 100,13 98,72 18,75" fill="#EF4444" opacity="0.65" />
      <Polyline
        points="38,22 38,148 62,148 62,22 86,22 86,148 110,148 110,22 134,22 134,148 158,148 158,22 182,22 182,148 206,148 206,22 230,22 230,148 252,148 252,22"
        stroke="#3B82F6"
        strokeWidth="1.2"
        fill="none"
        strokeDasharray="4 2.5"
        opacity="0.65"
      />
      <Rect x="22" y="26" width="70" height="28" rx="4" fill="rgba(239,68,68,0.85)" />
      <SvgText x="57" y="36" fontSize="7" fill="white" fontWeight="800" textAnchor="middle">
        HIGH
      </SvgText>
      <SvgText x="57" y="47" fontSize="6.5" fill="white" textAnchor="middle">
        Weed Zone
      </SvgText>
      <SvgText x="210" y="45" fontSize="7" fill="#92400E" fontWeight="700" textAnchor="middle">
        Stress
      </SvgText>
      <SvgText x="140" y="135" fontSize="7" fill="#166534" fontWeight="700" textAnchor="middle">
        Healthy
      </SvgText>
    </Svg>
  );
}

const FINDINGS = [
  {
    title: 'Weeds Detected',
    value: '18% of scanned area',
    change: '+6% from last scan',
    changeColor: colors.destructive,
    icon: 'warning' as const,
    bg: '#FEF2F2',
    border: '#FECACA',
    iconColor: colors.destructive,
  },
  {
    title: 'Crop Stress',
    value: '7% affected',
    change: 'No major change',
    changeColor: colors.gray500,
    icon: 'leaf' as const,
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconColor: colors.warning,
  },
  {
    title: 'Suggested Treatment Area',
    value: '22% of field',
    change: 'Estimated spray reduction: 78%',
    changeColor: colors.primary,
    icon: 'water' as const,
    bg: '#EFF6FF',
    border: '#BFDBFE',
    iconColor: colors.info,
  },
];

export function ReportScreen({ onNavigate, onBack }: ScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>North Soybean Field</Text>
            <Text style={styles.subtitle}>Scan Date: May 25, 2026</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="warning" size={12} color={colors.warning} />
          <Text style={styles.statusText}>Overall Status: Moderate Weed Pressure</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>AI RECOMMENDATION</Text>
          <Text style={styles.recommendation}>Inspect northwest section within 48 hours.</Text>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceTrack}>
              <View style={[styles.confidenceFill, { width: '87%' }]} />
            </View>
            <Text style={styles.confidenceText}>87% confidence</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Problem Area Map</Text>
            <TouchableOpacity onPress={() => onNavigate('field-map')}>
              <Text style={styles.mapLink}>Full Map →</Text>
            </TouchableOpacity>
          </View>
          <FieldZoneMap />
          <View style={styles.legend}>
            {[
              { color: colors.success, label: 'Healthy' },
              { color: colors.warning, label: 'Mild stress' },
              { color: colors.destructive, label: 'High weed pressure' },
              { color: colors.info, label: 'Scan path' },
            ].map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {FINDINGS.map((f) => (
          <View key={f.title} style={[styles.findingCard, { backgroundColor: f.bg, borderColor: f.border }]}>
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

        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.savingsCard}>
          <Text style={styles.savingsLabel}>ESTIMATED CHEMICAL SAVINGS</Text>
          <Text style={styles.savingsAmount}>$340</Text>
          <Text style={styles.savingsSub}>this treatment cycle · Spray area reduced: 78%</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    backgroundColor: colors.warningBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.warningText },
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
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mapTitle: { fontWeight: '700', fontSize: 14, color: colors.gray700 },
  mapLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
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
