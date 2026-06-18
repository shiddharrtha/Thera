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
import { FarmerBackgroundFields } from './FarmerBackgroundFields';
import {
  REGION_OPTIONS,
  resolveChipSelection,
  resolveChipValue,
  type CropOption,
  type RegionOption,
} from '../constants/farmFormOptions';
import {
  resolveFarmRoleSelection,
  type FarmRoleOption,
} from '../constants/farmerBackgroundOptions';
import { getAuthErrorMessage } from '../services/auth';
import { getProfileSaveErrorMessage } from '../services/profile';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { FarmProfile, FarmerBackground } from '../types/models';
import { resolveMainCropSelection, validateFarmerBackgroundInput } from '../utils/farmerBackgroundForm';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export interface AccountProfileFormValues {
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
  const [emailAddress, setEmailAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [regionSelection, setRegionSelection] = useState<RegionOption>('Iowa');
  const [otherRegion, setOtherRegion] = useState('');
  const [yearsFarming, setYearsFarming] = useState('');
  const [birthday, setBirthday] = useState('');
  const [age, setAge] = useState('');
  const [fieldCount, setFieldCount] = useState('');
  const [cropSelection, setCropSelection] = useState<CropOption>('Soybean');
  const [otherCropType, setOtherCropType] = useState('');
  const [pesticideBrand, setPesticideBrand] = useState('');
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
    setEmailAddress(email);
    setCurrentPassword('');

    setFarmName(farm?.farmName ?? '');

    const region = resolveChipSelection(REGION_OPTIONS, farm?.region, 'Iowa');
    setRegionSelection(region.selection);
    setOtherRegion(region.other);

    setYearsFarming(farmerBackground?.yearsFarming ?? '');
    setBirthday(farmerBackground?.birthday ?? '');
    setAge(farmerBackground?.age ?? '');
    setFieldCount(farmerBackground?.fieldCount ?? '');

    const crop = resolveMainCropSelection(farmerBackground?.mainCrop);
    setCropSelection(crop.selection);
    setOtherCropType(crop.other);
    setPesticideBrand(farmerBackground?.pesticideBrand ?? '');

    const role = resolveFarmRoleSelection(farmerBackground?.farmRole);
    setFarmRole(role.selection);
    setOtherRole(role.other);

    setPrimaryGoals(farmerBackground?.primaryGoals ?? []);
  }, [visible, fullName, email, farm, farmerBackground]);

  const emailChanged =
    emailAddress.trim().toLowerCase() !== (email || '').trim().toLowerCase();

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = emailAddress.trim();
    const trimmedFarmName = farmName.trim();
    const region = resolveChipValue(regionSelection, otherRegion);

    if (!trimmedName) {
      Alert.alert('Missing information', 'Please enter your name.');
      return;
    }
    if (!trimmedEmail) {
      Alert.alert('Missing information', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (emailChanged && !currentPassword) {
      Alert.alert('Password required', 'Enter your current password to change your email.');
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

    const farmerResult = validateFarmerBackgroundInput({
      yearsFarming,
      birthday,
      age,
      fieldCount,
      cropSelection,
      otherCropType,
      pesticideBrand,
      farmRole,
      otherRole,
      primaryGoals,
    });

    if (!farmerResult.ok) {
      Alert.alert('Missing information', farmerResult.message);
      return;
    }

    setBusy(true);
    try {
      await onSave({
        fullName: trimmedName,
        email: trimmedEmail,
        ...(emailChanged ? { currentPassword } : {}),
        farmName: trimmedFarmName,
        region,
        ...farmerResult.value,
      });
      onClose();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message =
        code?.startsWith('auth/') || code?.startsWith('functions/')
          ? getAuthErrorMessage(error)
          : getProfileSaveErrorMessage(error);
      Alert.alert('Could not save', message);
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
            <FloatingInput
              label="Email"
              value={emailAddress}
              onChange={setEmailAddress}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            {emailChanged && (
              <>
                <FloatingInput
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  secureTextEntry
                  placeholder="Required to change email"
                  autoComplete="current-password"
                  textContentType="password"
                />
                <Text style={styles.fieldHint}>
                  Enter your current password to confirm this email change.
                </Text>
              </>
            )}
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

            <FarmerBackgroundFields
              yearsFarming={yearsFarming}
              onYearsFarmingChange={setYearsFarming}
              birthday={birthday}
              onBirthdayChange={setBirthday}
              age={age}
              onAgeChange={setAge}
              fieldCount={fieldCount}
              onFieldCountChange={setFieldCount}
              cropSelection={cropSelection}
              onCropSelectionChange={setCropSelection}
              otherCropType={otherCropType}
              onOtherCropTypeChange={setOtherCropType}
              pesticideBrand={pesticideBrand}
              onPesticideBrandChange={setPesticideBrand}
              farmRole={farmRole}
              onFarmRoleChange={setFarmRole}
              otherRole={otherRole}
              onOtherRoleChange={setOtherRole}
              primaryGoals={primaryGoals}
              onToggleGoal={toggleGoal}
            />
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
  sheetBody: { maxHeight: 580, marginBottom: 16 },
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
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
