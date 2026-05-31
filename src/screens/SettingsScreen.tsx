import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.toggle, { backgroundColor: enabled ? colors.primary : '#D1D5DB' }]}
    >
      <View style={[styles.toggleKnob, { left: enabled ? 22 : 2 }]} />
    </TouchableOpacity>
  );
}

function SettingsRow({
  icon,
  iconBg = colors.background,
  iconColor = colors.primary,
  label,
  sub,
  value,
  toggle,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  label: string;
  sub?: string;
  value?: string;
  toggle?: { enabled: boolean; onToggle: () => void };
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={toggle ? toggle.onToggle : onPress}
      disabled={!!toggle}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? '#FEE2E2' : iconBg }]}>
        <Ionicons name={icon} size={15} color={danger ? '#DC2626' : iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {value && !toggle && <Text style={styles.rowValue}>{value}</Text>}
      {toggle ? (
        <Toggle enabled={toggle.enabled} onToggle={toggle.onToggle} />
      ) : (
        !danger && <Ionicons name="chevron-forward" size={15} color="#D1D5DB" />
      )}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.section}>{children}</View>
    </View>
  );
}

export function SettingsScreen({ onNavigate, onBack }: ScreenProps) {
  const [notifScans, setNotifScans] = useState(true);
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifTips, setNotifTips] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
        <Text style={styles.subtitle}>Manage your account & preferences</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.profileCard}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Alex Johnson</Text>
            <Text style={styles.profileEmail}>alex@greenfarm.com</Text>
            <View style={styles.profileBadge}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Pro Plan</Text>
              </View>
              <Text style={styles.farmName}>Green Family Farm · Iowa</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </TouchableOpacity>

        <Section title="ACCOUNT">
          <SettingsRow icon="person" label="Personal Info" sub="Name, email, profile photo" />
          <SettingsRow icon="people" iconBg="#EFF6FF" iconColor="#3B82F6" label="Team Members" sub="2 members on your farm" value="Manage" />
          <SettingsRow icon="shield-checkmark" iconBg="#F5F3FF" iconColor="#7C3AED" label="Security" sub="Password, two-factor authentication" last />
        </Section>

        <Section title="FARM & CROPS">
          <SettingsRow icon="leaf" label="Default Crop Type" sub="Used for new field reports" value="Soybean" />
          <SettingsRow icon="location" iconBg="#FEF3C7" iconColor="#D97706" label="Primary Region" sub="Affects weather & alerts" value="Iowa" />
          <SettingsRow
            icon="globe"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Units"
            sub="Measurement system"
            value={units === 'imperial' ? 'Imperial (ac, ft)' : 'Metric (ha, m)'}
            onPress={() => setUnits((u) => (u === 'imperial' ? 'metric' : 'imperial'))}
            last
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <SettingsRow icon="notifications" iconBg="#FEF3C7" iconColor="#D97706" label="Scan completed" sub="When a new AI report is ready" toggle={{ enabled: notifScans, onToggle: () => setNotifScans((v) => !v) }} />
          <SettingsRow icon="notifications" iconBg="#FEE2E2" iconColor="#DC2626" label="Field alerts" sub="Weed & stress threshold alerts" toggle={{ enabled: notifAlerts, onToggle: () => setNotifAlerts((v) => !v) }} />
          <SettingsRow icon="notifications" iconBg="#EFF6FF" iconColor="#3B82F6" label="Weekly digest" sub="Field summary every Monday" toggle={{ enabled: notifWeekly, onToggle: () => setNotifWeekly((v) => !v) }} />
          <SettingsRow icon="notifications" label="Tips & best practices" sub="Agronomy advice from Thera" toggle={{ enabled: notifTips, onToggle: () => setNotifTips((v) => !v) }} last />
        </Section>

        <Section title="APPEARANCE">
          <SettingsRow icon="moon" iconBg="#F5F3FF" iconColor="#7C3AED" label="Dark Mode" sub="Easy on the eyes at night" toggle={{ enabled: darkMode, onToggle: () => setDarkMode((v) => !v) }} last />
        </Section>

        <Section title="PLAN & BILLING">
          <SettingsRow icon="flash" iconBg={colors.accent} label="Billing & Plans" sub="Pro Plan · $49/mo · Renews Jun 1" onPress={() => onNavigate('billing')} />
          <SettingsRow icon="document-text" iconBg={colors.background} iconColor={colors.gray500} label="Invoices & Receipts" sub="Download past invoices" last />
        </Section>

        <Section title="SUPPORT">
          <SettingsRow icon="help-circle" iconBg="#EFF6FF" iconColor="#3B82F6" label="Help Center" sub="Guides, FAQs, how-to videos" />
          <SettingsRow icon="chatbubble" iconBg="#F0FDF4" iconColor="#16A34A" label="Contact Support" sub="Chat or email our team" />
          <SettingsRow icon="star" iconBg="#FEF3C7" iconColor="#D97706" label="Rate Thera" sub="Share feedback on the App Store" last />
        </Section>

        <Section>
          <SettingsRow icon="log-out" label="Sign Out" danger onPress={() => onNavigate('splash')} last />
        </Section>

        <Text style={styles.version}>Thera · Version 1.4.2 · Build 2026.05</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '900', color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray400, marginTop: 4, paddingLeft: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 20 },
  profileInfo: { flex: 1 },
  profileName: { fontWeight: '700', fontSize: 16, color: colors.gray900 },
  profileEmail: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  proBadge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  proBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  farmName: { fontSize: 10, color: colors.gray400 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 2, marginBottom: 6, paddingHorizontal: 4 },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  rowIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  rowLabelDanger: { color: '#DC2626' },
  rowSub: { fontSize: 10, color: colors.gray400, marginTop: 2 },
  rowValue: { fontSize: 12, color: colors.gray400, marginRight: 4 },
  toggle: { width: 44, height: 24, borderRadius: 12, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  version: { textAlign: 'center', fontSize: 10, color: '#D1D5DB', marginTop: 8 },
});
