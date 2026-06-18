import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { getAuthErrorMessage } from '../services/auth';
import { getFirstName, getNameInitial } from '../lib/userName';
import { AccountProfileModal } from '../components/AccountProfileModal';
import { FarmProfileFieldModal, type FarmProfileEditField } from '../components/FarmProfileFieldModal';
import { farmToProfile } from '../utils/farmHelpers';
import type { UserSettings } from '../types/models';
import {
  isNotificationsSupported,
  requestNotificationPermission,
} from '../services/pushNotifications';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <View style={[styles.toggle, { backgroundColor: enabled ? colors.primary : '#D1D5DB' }]}>
      <View style={[styles.toggleKnob, { left: enabled ? 22 : 2 }]} />
    </View>
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
      onPress={toggle ? () => void toggle.onToggle() : onPress}
      disabled={!toggle && !onPress}
      activeOpacity={toggle || onPress ? 0.7 : 1}
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
        <Toggle enabled={toggle.enabled} />
      ) : (
        !danger && onPress && <Ionicons name="chevron-forward" size={15} color="#D1D5DB" />
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
  const { user, displayName, signOut, updateDisplayName, updateAccountEmail } = useAuth();
  const { data, updateSettings, updateFarmProfile, updateFarmerBackground, getSelectedFarm, switchFarm } = useAppData();
  const settings = data.settings;
  const selectedFarm = getSelectedFarm();
  const farm = selectedFarm ? farmToProfile(selectedFarm) : null;
  const planLabel = data.subscription.planId === 'free' ? 'Free Basic' : data.subscription.planId === 'pro' ? 'Pro Plan' : 'Enterprise';
  const [signingOut, setSigningOut] = useState(false);
  const [editField, setEditField] = useState<FarmProfileEditField | null>(null);
  const [accountEditorOpen, setAccountEditorOpen] = useState(false);

  const handleNotificationToggle = async (
    key: keyof Pick<
      UserSettings,
      'scanCompletedNotifications' | 'fieldAlerts' | 'weeklyDigest' | 'tipsAndBestPractices'
    >,
  ) => {
    const nextEnabled = !settings[key];

    if (nextEnabled) {
      if (!isNotificationsSupported()) {
        Alert.alert(
          'Notifications unavailable',
          'This browser does not support notifications. Try Chrome, Safari, or Firefox.',
        );
        return;
      }

      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications disabled',
          'Allow notifications in your browser or device settings to receive Thera alerts.',
        );
        return;
      }
    }

    await updateSettings({ [key]: nextEnabled });
  };

  const openFarmEditor = (field: FarmProfileEditField) => {
    if (!farm) {
      Alert.alert('Farm profile unavailable', 'Complete farm setup before editing these settings.');
      return;
    }
    setEditField(field);
  };

  const formatAcreage = (acres?: number) => {
    if (!acres || acres <= 0) return 'Not set';
    return `${acres.toLocaleString()} ac`;
  };

  const resolvedName = displayName || getFirstName(null, user?.email) || 'Thera User';
  const email = user?.email ?? '';
  const avatarInitial = getNameInitial(displayName, user?.email);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Sign out failed', getAuthErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  };

  const handleSaveAccountProfile = async (values: {
    fullName: string;
    email: string;
    currentPassword?: string;
    farmName: string;
    region: string;
    yearsFarming: string;
    birthday: string;
    age: string;
    fieldCount: string;
    mainCrop: string;
    pesticideBrand: string;
    farmRole: string;
    primaryGoals: string[];
  }) => {
    const currentEmail = (user?.email ?? '').trim().toLowerCase();
    const nextEmail = values.email.trim().toLowerCase();

    if (nextEmail !== currentEmail) {
      if (!values.currentPassword) {
        throw new Error('Enter your current password to change your email.');
      }
      await updateAccountEmail(values.email, values.currentPassword);
    }

    await updateDisplayName(values.fullName);
    await updateFarmProfile({
      farmName: values.farmName,
      region: values.region,
    });
    await updateFarmerBackground({
      yearsFarming: values.yearsFarming,
      birthday: values.birthday,
      age: values.age,
      fieldCount: values.fieldCount,
      mainCrop: values.mainCrop,
      pesticideBrand: values.pesticideBrand,
      farmRole: values.farmRole,
      primaryGoals: values.primaryGoals,
    });
  };

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
        <TouchableOpacity style={styles.profileCard} onPress={() => setAccountEditorOpen(true)}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{resolvedName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
            <View style={styles.profileBadge}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>{planLabel}</Text>
              </View>
              <Text style={styles.farmName}>
                {farm?.farmName ?? 'Farm profile incomplete'}
                {farm?.region ? ` · ${farm.region}` : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </TouchableOpacity>

        <Section title="FARMS">
          {data.farms.map((item) => {
            const isActive = item.id === data.selectedFarmId;
            return (
              <SettingsRow
                key={item.id}
                icon="business"
                iconBg="#F5F3FF"
                iconColor="#7C3AED"
                label={item.name}
                sub={`${item.region} · ${item.defaultCrop}`}
                value={isActive ? 'Active' : undefined}
                onPress={
                  isActive
                    ? undefined
                    : () => {
                        void switchFarm(item.id).then(() => onNavigate('home', { replace: true }));
                      }
                }
                last={false}
              />
            );
          })}
          <SettingsRow
            icon="add-circle"
            iconBg="#ECFDF5"
            iconColor="#059669"
            label="Add Farm"
            sub="Set up a new farm profile"
            onPress={() => onNavigate('add-farm')}
            last
          />
        </Section>

        <Section title="FARM & CROPS">
          <SettingsRow
            icon="leaf"
            label="Default Crop Type"
            sub="Used for new field reports"
            value={farm?.defaultCrop ?? 'Not set'}
            onPress={() => openFarmEditor('crop')}
          />
          <SettingsRow
            icon="location"
            iconBg="#FEF3C7"
            iconColor="#D97706"
            label="Primary Region"
            sub="Affects weather & alerts"
            value={farm?.region ?? 'Not set'}
            onPress={() => openFarmEditor('region')}
          />
          <SettingsRow
            icon="resize"
            iconBg="#ECFDF5"
            iconColor="#059669"
            label="Acreage"
            sub="Total farm acreage"
            value={formatAcreage(farm?.approximateAcres)}
            onPress={() => openFarmEditor('acreage')}
          />
          <SettingsRow
            icon="globe"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Units"
            sub="Measurement system"
            value={farm?.units === 'metric' ? 'Metric (ha, m)' : 'Imperial (ac, ft)'}
            onPress={() => {
              if (!farm) return;
              void updateFarmProfile({
                units: farm.units === 'metric' ? 'imperial' : 'metric',
              });
            }}
            last
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <SettingsRow icon="notifications" iconBg="#FEF3C7" iconColor="#D97706" label="Scan completed" sub="When a new AI report is ready" toggle={{ enabled: settings.scanCompletedNotifications, onToggle: () => void handleNotificationToggle('scanCompletedNotifications') }} />
          <SettingsRow icon="notifications" iconBg="#FEE2E2" iconColor="#DC2626" label="Field alerts" sub="Weed & stress threshold alerts" toggle={{ enabled: settings.fieldAlerts, onToggle: () => void handleNotificationToggle('fieldAlerts') }} />
          <SettingsRow icon="notifications" iconBg="#EFF6FF" iconColor="#3B82F6" label="Weekly digest" sub="Field summary every Monday" toggle={{ enabled: settings.weeklyDigest, onToggle: () => void handleNotificationToggle('weeklyDigest') }} />
          <SettingsRow icon="notifications" label="Tips & best practices" sub="Agronomy advice from Thera" toggle={{ enabled: settings.tipsAndBestPractices, onToggle: () => void handleNotificationToggle('tipsAndBestPractices') }} last />
        </Section>

        <Section title="PLAN & BILLING">
          <SettingsRow icon="flash" iconBg={colors.accent} label="Billing & Plans" sub={`${planLabel}${data.subscription.planId === 'pro' ? ' · $49/mo' : ''}`} onPress={() => onNavigate('billing')} />
          <SettingsRow icon="document-text" iconBg={colors.background} iconColor={colors.gray500} label="Invoices & Receipts" sub="Download past invoices" last />
        </Section>

        <Section title="SUPPORT">
          <SettingsRow icon="help-circle" iconBg="#EFF6FF" iconColor="#3B82F6" label="Help Center" sub="Guides, FAQs, how-to videos" />
          <SettingsRow icon="chatbubble" iconBg="#F0FDF4" iconColor="#16A34A" label="Contact Support" sub="Chat or email our team" />
          <SettingsRow icon="star" iconBg="#FEF3C7" iconColor="#D97706" label="Rate Thera" sub="Share feedback on the App Store" last />
        </Section>

        <Section>
          <SettingsRow
            icon="log-out"
            label={signingOut ? 'Signing out…' : 'Sign Out'}
            danger
            onPress={signingOut ? undefined : handleSignOut}
            last
          />
        </Section>

        <Text style={styles.version}>Thera · Version 1.4.2 · Build 2026.05</Text>
      </ScrollView>

      {farm && (
        <FarmProfileFieldModal
          visible={editField !== null}
          field={editField}
          farm={farm}
          onClose={() => setEditField(null)}
          onSave={updateFarmProfile}
        />
      )}

      <AccountProfileModal
        visible={accountEditorOpen}
        fullName={resolvedName}
        email={email}
        farm={farm}
        farmerBackground={data.farmerBackground ?? null}
        onClose={() => setAccountEditorOpen(false)}
        onSave={handleSaveAccountProfile}
      />
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
