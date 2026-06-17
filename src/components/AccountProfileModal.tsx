import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingInput } from './FloatingInput';
import {
  REGION_OPTIONS,
  resolveChipSelection,
  resolveChipValue,
  type RegionOption,
} from '../constants/farmFormOptions';
import {
  FARM_ROLE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  resolveFarmRoleSelection,
  type FarmRoleOption,
} from '../constants/farmerBackgroundOptions';
import { getProfileSaveErrorMessage } from '../services/profile';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { FarmProfile, FarmerBackground } from '../types/models';

export interface AccountProfileFormValues {
  fullName: string;
  farmName: string;
  region: string;
  yearsFarming: string;
  farmRole: string;
  primaryGoals: string[];
}

interface AccountProfileModalProps {
  visible: boolean;
  fullName: string;
  email: string;
  farm: FarmProfile | null;
  farmerBackground: FarmerBackground | null;
  onClose: () => void;
  onSave: (values: AccountProfileFormValues) => Promise<void>;
}

export function AccountProfileModal({
  visible,
  fullName,
  email,
  farm,
  farmerBackground,
  onClose,
  onSave,
}: AccountProfileModalProps) {
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [regionSelection, setRegionSelection] = useState<RegionOption>('Iowa');
  const [otherRegion, setOtherRegion] = useState('');
  const [yearsFarming, setYearsFarming] = useState('');
  const [farmRole, setFarmRole] = useState<FarmRoleOption>('Farm owner / operator');
  const [otherRole, setOtherRole] = useState('');
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggleGoal = (goal: string) => {
    setPrimaryGoals((current) =>
      current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal],
    );
  };

  useEffect(() => {
    if (!visible) return;

    setName(fullName);
    setFarmName(farm?.farmName ?? '');

    const region = resolveChipSelection(REGION_OPTIONS, farm?.region, 'Iowa');
    setRegionSelection(region.selection);
    setOtherRegion(region.other);

    setYearsFarming(farmerBackground?.yearsFarming ?? '');

    const role = resolveFarmRoleSelection(farmerBackground?.farmRole);
    setFarmRole(role.selection);
    setOtherRole(role.other);

    setPrimaryGoals(farmerBackground?.primaryGoals ?? []);
  }, [visible, fullName, farm, farmerBackground]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedFarmName = farmName.trim();
    const region = resolveChipValue(regionSelection, otherRegion);
    const resolvedRole = farmRole === 'Other' ? otherRole.trim() : farmRole;
    const years = Number(yearsFarming.trim());

    if (!trimmedName) {
      Alert.alert('Missing information', 'Please enter your name.');
      return;
    }
    if (!trimmedFarmName) {
      Alert.alert('Missing information', 'Please enter your farm or operation name.');
      return;
    }
    if (regionSelection === 'Other' && !region) {
      Alert.alert('Missing information', 'Please enter your region.');
      return;
    }
    if (!yearsFarming.trim() || !Number.isFinite(years) || years < 0) {
      Alert.alert('Missing information', 'Please enter how many years you have been farming.');
      return;
    }
    if (years > 100) {
      Alert.alert('Invalid entry', 'Please enter a realistic number of years farming.');
      return;
    }
    if (farmRole === 'Other' && !resolvedRole) {
      Alert.alert('Missing information', 'Please describe your role on the farm.');
      return;
    }
    if (primaryGoals.length === 0) {
      Alert.alert('Missing information', 'Select at least one goal for using Thera.');
      return;
    }

    setBusy(true);
    try {
      await onSave({
        fullName: trimmedName,
        farmName: trimmedFarmName,
        region,
        yearsFarming: String(Math.round(years)),
        farmRole: resolvedRole,
        primaryGoals,
      });
      onClose();
    } catch (error) {
      Alert.alert('Could not save', getProfileSaveErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <Text style={styles.sheetSubtitle}>Update your account details</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <FloatingInput label="Name" value={name} onChange={setName} autoCapitalize="words" />
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{email || 'Not available'}</Text>
              <Text style={styles.readOnlyHint}>Email cannot be changed here</Text>
            </View>
            <FloatingInput
              label="Farm or operation name"
              value={farmName}
              onChange={setFarmName}
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Primary region</Text>
            <View style={styles.chipRow}>
              {REGION_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, regionSelection === r && styles.chipActive]}
                  onPress={() => {
                    setRegionSelection(r);
                    if (r !== 'Other') setOtherRegion('');
                  }}
                >
                  <Text style={[styles.chipText, regionSelection === r && styles.chipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {regionSelection === 'Other' && (
              <FloatingInput
                label="Specify region"
                value={otherRegion}
                onChange={setOtherRegion}
                placeholder="e.g. Washington, Kansas"
                autoCapitalize="words"
              />
            )}

            <Text style={styles.sectionLabel}>Farmer background</Text>

            <Text style={styles.fieldLabel}>How many years have you been farming?</Text>
            <FloatingInput
              label="Years farming"
              value={yearsFarming}
              onChange={setYearsFarming}
              keyboardType="numeric"
              placeholder="e.g. 12"
            />

            <Text style={styles.fieldLabel}>What's your role?</Text>
            <View style={styles.chipRow}>
              {FARM_ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, farmRole === option && styles.chipActive]}
                  onPress={() => {
                    setFarmRole(option);
                    if (option !== 'Other') setOtherRole('');
                  }}
                >
                  <Text style={[styles.chipText, farmRole === option && styles.chipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {farmRole === 'Other' && (
              <FloatingInput
                label="Describe your role"
                value={otherRole}
                onChange={setOtherRole}
                placeholder="e.g. Custom applicator, crop scout"
                autoCapitalize="words"
              />
            )}

            <Text style={styles.fieldLabel}>What do you want Thera to help with?</Text>
            <Text style={styles.fieldHint}>Select all that apply</Text>
            <View style={styles.chipRow}>
              {PRIMARY_GOAL_OPTIONS.map((goal) => {
                const selected = primaryGoals.includes(goal);
                return (
                  <TouchableOpacity
                    key={goal}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => toggleGoal(goal)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{goal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity onPress={() => void handleSave()} disabled={busy}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{busy ? 'Saving…' : 'Save'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = createStyles({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  sheetSubtitle: { fontSize: 12, color: colors.gray400, marginTop: 4 },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  sheetBody: { maxHeight: 520, marginBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.gray900,
    marginTop: 12,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 8, marginTop: 4 },
  fieldHint: { fontSize: 11, color: colors.gray400, marginTop: -4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  chipTextActive: { color: colors.primary },
  readOnlyField: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray100,
  },
  readOnlyLabel: { fontSize: 12, fontWeight: '600', color: colors.gray900, marginBottom: 6 },
  readOnlyValue: { fontSize: 13, color: colors.gray700 },
  readOnlyHint: { fontSize: 11, color: colors.gray400, marginTop: 6 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
