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
  CROP_OPTIONS,
  REGION_OPTIONS,
  resolveChipSelection,
  resolveChipValue,
  type CropOption,
  type RegionOption,
} from '../constants/farmFormOptions';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { FarmProfile } from '../types/models';

export type FarmProfileEditField = 'crop' | 'region' | 'acreage';

interface FarmProfileFieldModalProps {
  visible: boolean;
  field: FarmProfileEditField | null;
  farm: FarmProfile;
  onClose: () => void;
  onSave: (patch: Partial<FarmProfile>) => Promise<void>;
}

const FIELD_COPY: Record<
  FarmProfileEditField,
  { title: string; subtitle: string }
> = {
  crop: {
    title: 'Default Crop Type',
    subtitle: 'Used when adding new fields',
  },
  region: {
    title: 'Primary Region',
    subtitle: 'Affects weather and alerts',
  },
  acreage: {
    title: 'Approximate Acreage',
    subtitle: 'Total farm acreage',
  },
};

export function FarmProfileFieldModal({
  visible,
  field,
  farm,
  onClose,
  onSave,
}: FarmProfileFieldModalProps) {
  const [cropSelection, setCropSelection] = useState<CropOption>('Soybean');
  const [otherCropType, setOtherCropType] = useState('');
  const [regionSelection, setRegionSelection] = useState<RegionOption>('Iowa');
  const [otherRegion, setOtherRegion] = useState('');
  const [acreage, setAcreage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !field) return;

    const crop = resolveChipSelection(CROP_OPTIONS, farm.defaultCrop, 'Soybean');
    setCropSelection(crop.selection);
    setOtherCropType(crop.other);

    const region = resolveChipSelection(REGION_OPTIONS, farm.region, 'Iowa');
    setRegionSelection(region.selection);
    setOtherRegion(region.other);

    setAcreage(farm.approximateAcres > 0 ? String(farm.approximateAcres) : '');
  }, [visible, field, farm]);

  const handleSave = async () => {
    if (!field) return;

    let patch: Partial<FarmProfile> | null = null;

    if (field === 'crop') {
      const defaultCrop = resolveChipValue(cropSelection, otherCropType);
      if (cropSelection === 'Other' && !defaultCrop) {
        Alert.alert('Missing information', 'Please enter the crop type.');
        return;
      }
      patch = { defaultCrop };
    }

    if (field === 'region') {
      const region = resolveChipValue(regionSelection, otherRegion);
      if (regionSelection === 'Other' && !region) {
        Alert.alert('Missing information', 'Please enter the region.');
        return;
      }
      patch = { region };
    }

    if (field === 'acreage') {
      const parsed = Number(acreage);
      if (!acreage.trim() || !Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert('Missing information', 'Please enter a valid acreage.');
        return;
      }
      patch = { approximateAcres: parsed };
    }

    if (!patch) return;

    setBusy(true);
    try {
      await onSave(patch);
      onClose();
    } catch {
      Alert.alert('Could not save', 'Your farm profile could not be updated. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!field) return null;

  const copy = FIELD_COPY[field];

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
              <Text style={styles.sheetTitle}>{copy.title}</Text>
              <Text style={styles.sheetSubtitle}>{copy.subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {field === 'crop' && (
              <>
                <View style={styles.chipRow}>
                  {CROP_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, cropSelection === c && styles.chipActive]}
                      onPress={() => {
                        setCropSelection(c);
                        if (c !== 'Other') setOtherCropType('');
                      }}
                    >
                      <Text style={[styles.chipText, cropSelection === c && styles.chipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {cropSelection === 'Other' && (
                  <FloatingInput
                    label="Specify crop type"
                    value={otherCropType}
                    onChange={setOtherCropType}
                    placeholder="e.g. Potato, Alfalfa"
                    autoCapitalize="words"
                  />
                )}
              </>
            )}

            {field === 'region' && (
              <>
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
              </>
            )}

            {field === 'acreage' && (
              <FloatingInput
                label="Total acreage"
                value={acreage}
                onChange={setAcreage}
                keyboardType="numeric"
                placeholder="e.g. 640"
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
    maxHeight: '80%',
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
  sheetBody: { maxHeight: 360, marginBottom: 16 },
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
