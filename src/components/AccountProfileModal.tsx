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
import { getProfileSaveErrorMessage } from '../services/profile';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { FarmProfile } from '../types/models';

export interface AccountProfileFormValues {
  fullName: string;
  farmName: string;
  region: string;
}

interface AccountProfileModalProps {
  visible: boolean;
  fullName: string;
  email: string;
  farm: FarmProfile | null;
  onClose: () => void;
  onSave: (values: AccountProfileFormValues) => Promise<void>;
}

export function AccountProfileModal({
  visible,
  fullName,
  email,
  farm,
  onClose,
  onSave,
}: AccountProfileModalProps) {
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [regionSelection, setRegionSelection] = useState<RegionOption>('Iowa');
  const [otherRegion, setOtherRegion] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setName(fullName);
    setFarmName(farm?.farmName ?? '');

    const region = resolveChipSelection(REGION_OPTIONS, farm?.region, 'Iowa');
    setRegionSelection(region.selection);
    setOtherRegion(region.other);
  }, [visible, fullName, farm]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedFarmName = farmName.trim();
    const region = resolveChipValue(regionSelection, otherRegion);

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

    setBusy(true);
    try {
      await onSave({
        fullName: trimmedName,
        farmName: trimmedFarmName,
        region,
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
  sheetBody: { maxHeight: 420, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 8 },
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
