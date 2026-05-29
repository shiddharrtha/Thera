import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';

const FREE_FEATURES = [
  '3 scans per month',
  'Basic weed detection',
  'Single field',
  '7-day report history',
  'Mobile app access',
];

const PRO_FEATURES = [
  'Unlimited scans',
  'Advanced AI weed & stress detection',
  'Unlimited fields',
  'Full report history & timeline',
  'PDF export & agronomist sharing',
  'Before/after comparison',
  'Season savings analytics',
  'Team member access',
  'Priority support',
];

const USAGE_ITEMS = [
  { label: 'Scans', used: 11, limit: 'Unlimited', pct: 35, color: colors.primary },
  { label: 'Fields', used: 4, limit: 'Unlimited', pct: 55, color: colors.info },
  { label: 'Reports Generated', used: 12, limit: 'Unlimited', pct: 70, color: colors.warning },
];

export function BillingScreen({ onBack }: ScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>Billing & Plans</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="flash" size={20} color={colors.primary} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Pro Plan — Active</Text>
            <Text style={styles.statusSub}>$49/month · Renews Jun 1, 2026</Text>
          </View>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>USAGE THIS MONTH</Text>
          {USAGE_ITEMS.map((u) => (
            <View key={u.label} style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <Text style={styles.usageLabel}>{u.label}</Text>
                <Text style={styles.usageValue}>
                  <Text style={styles.usageBold}>{u.used}</Text> / {u.limit}
                </Text>
              </View>
              <View style={styles.usageTrack}>
                <View style={[styles.usageFill, { width: `${u.pct}%`, backgroundColor: u.color }]} />
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>AVAILABLE PLANS</Text>

        <View style={[styles.planCard, styles.freePlan]}>
          <View style={styles.planHeader}>
            <View>
              <View style={styles.planTitleRow}>
                <Ionicons name="leaf" size={16} color={colors.gray400} />
                <Text style={styles.planName}>Free Basic</Text>
              </View>
              <Text style={styles.planDesc}>For individuals getting started</Text>
            </View>
            <View style={styles.planPrice}>
              <Text style={styles.priceAmount}>$0</Text>
              <Text style={styles.pricePeriod}>forever</Text>
            </View>
          </View>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark" size={13} color={colors.gray400} />
              <Text style={styles.featureTextMuted}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.downgradeBtn}>
            <Text style={styles.downgradeText}>Downgrade to Free</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.planCard, styles.proPlan]}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>CURRENT PLAN</Text>
          </View>
          <View style={styles.planTitleRow}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={[styles.planName, { color: colors.primary }]}>Pro</Text>
          </View>
          <Text style={styles.planDesc}>Full precision agriculture suite</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLarge}>$49</Text>
            <Text style={styles.pricePeriod}>/month</Text>
            <Text style={styles.priceAlt}>or $299/yr</Text>
          </View>
          {PRO_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={10} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.activeBtn}>
            <Text style={styles.activeBtnText}>✓ Active — Manage Subscription</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.enterpriseCard}>
          <Text style={styles.enterpriseTitle}>Enterprise</Text>
          <Text style={styles.enterpriseDesc}>
            Custom pricing for operations managing 500+ acres, multi-user teams, and API access.
          </Text>
          <TouchableOpacity style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>Contact Sales</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  title: { fontWeight: '700', fontSize: 18, color: colors.gray900 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  statusIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1 },
  statusTitle: { fontWeight: '700', fontSize: 14, color: colors.gray900 },
  statusSub: { fontSize: 12, color: colors.gray400 },
  currentBadge: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, marginBottom: 12 },
  usageItem: { marginBottom: 12 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  usageValue: { fontSize: 12, color: colors.gray400 },
  usageBold: { fontWeight: '700', color: colors.gray700 },
  usageTrack: { height: 8, borderRadius: 4, backgroundColor: colors.gray100, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, paddingHorizontal: 4 },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  freePlan: { borderWidth: 1, borderColor: colors.gray200 },
  proPlan: { borderWidth: 2, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 16, overflow: 'hidden' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planName: { fontWeight: '700', fontSize: 16, color: colors.gray700 },
  planDesc: { fontSize: 12, color: colors.gray400 },
  planPrice: { alignItems: 'flex-end' },
  priceAmount: { fontSize: 24, fontWeight: '900', color: colors.gray900 },
  pricePeriod: { fontSize: 10, color: colors.gray400 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  priceLarge: { fontSize: 28, fontWeight: '900', color: colors.gray900 },
  priceAlt: { fontSize: 12, color: colors.gray400, marginLeft: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureTextMuted: { fontSize: 12, color: colors.gray500 },
  featureText: { fontSize: 12, color: colors.gray700, fontWeight: '500' },
  checkCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  downgradeBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.gray100, alignItems: 'center' },
  downgradeText: { fontSize: 14, fontWeight: '700', color: colors.gray500 },
  proBadge: { position: 'absolute', top: 16, right: 0, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  proBadgeText: { fontSize: 10, fontWeight: '900', color: colors.white },
  activeBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  activeBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  enterpriseCard: { backgroundColor: colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB' },
  enterpriseTitle: { fontWeight: '700', fontSize: 14, color: colors.gray700, marginBottom: 4 },
  enterpriseDesc: { fontSize: 12, color: colors.gray400, marginBottom: 12 },
  contactBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  contactBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
