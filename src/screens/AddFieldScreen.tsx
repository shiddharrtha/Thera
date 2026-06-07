import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { FloatingInput } from '../components/FloatingInput';
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

export function AddFieldScreen({ onNavigate, onBack }: ScreenProps) {
  const { addField, setSelectedFieldId, getSelectedFarm } = useAppData();
  const selectedFarm = getSelectedFarm();
  const initialCrop = resolveChipSelection(CROP_OPTIONS, selectedFarm?.defaultCrop, 'Soybean');
  const initialRegion = resolveChipSelection(REGION_OPTIONS, selectedFarm?.region, 'Iowa');
  const [name, setName] = useState('');
  const [cropSelection, setCropSelection] = useState<CropOption>(initialCrop.selection);
  const [otherCropType, setOtherCropType] = useState(initialCrop.other);
  const [regionSelection, setRegionSelection] = useState<RegionOption>(initialRegion.selection);
  const [otherRegion, setOtherRegion] = useState(initialRegion.other);
  const [acreage, setAcreage] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    const cropType = resolveChipValue(cropSelection, otherCropType);
    const location = resolveChipValue(regionSelection, otherRegion);

    if (!name.trim() || !acreage) {
      Alert.alert('Missing information', 'Please enter a field name and acreage.');
      return;
    }
    if (cropSelection === 'Other' && !cropType) {
      Alert.alert('Missing information', 'Please enter the crop type.');
      return;
    }
    if (regionSelection === 'Other' && !location) {
      Alert.alert('Missing information', 'Please enter the location.');
      return;
    }
    setBusy(true);
    try {
      const field = await addField({
        name: name.trim(),
        cropType,
        acreage: Number(acreage),
        location: location || undefined,
        plantingDate: plantingDate.trim() || undefined,
        hasBoundary: false,
      });
      setSelectedFieldId(field.id);
      onNavigate('field-detail', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Field</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FloatingInput label="Field name" value={name} onChange={setName} />
        <Text style={styles.label}>Crop type</Text>
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
              <Text style={[styles.chipText, cropSelection === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {cropSelection === 'Other' && (
          <FloatingInput
            label="Specify crop type"
            value={otherCropType}
            onChange={setOtherCropType}
            placeholder="e.g. Alfalfa, Rice, Sorghum"
            autoCapitalize="words"
          />
        )}
        <Text style={styles.label}>Location</Text>
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
              <Text style={[styles.chipText, regionSelection === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {regionSelection === 'Other' && (
          <FloatingInput
            label="Specify location"
            value={otherRegion}
            onChange={setOtherRegion}
            placeholder="e.g. Kansas, Ontario"
            autoCapitalize="words"
          />
        )}
        <FloatingInput label="Acreage" value={acreage} onChange={setAcreage} keyboardType="numeric" />
        <FloatingInput
          label="Planting date (optional)"
          value={plantingDate}
          onChange={setPlantingDate}
          placeholder="e.g. May 1, 2026"
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} disabled={busy}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{busy ? 'Saving…' : 'Save Field'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles({
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
  scrollContent: { padding: 20, gap: 14 },
  label: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  chipTextActive: { color: colors.primary },
  footer: { padding: 20, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
