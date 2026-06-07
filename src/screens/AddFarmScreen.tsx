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
import { getFarmSaveErrorMessage } from '../services/farm';
import { FloatingInput } from '../components/FloatingInput';
import {
  CROP_OPTIONS,
  REGION_OPTIONS,
  resolveChipValue,
  type CropOption,
  type RegionOption,
} from '../constants/farmFormOptions';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { Units } from '../types/models';

export function AddFarmScreen({ onNavigate, onBack }: ScreenProps) {
  const { addFarm } = useAppData();
  const [farmName, setFarmName] = useState('');
  const [regionSelection, setRegionSelection] = useState<RegionOption>('Iowa');
  const [otherRegion, setOtherRegion] = useState('');
  const [cropSelection, setCropSelection] = useState<CropOption>('Soybean');
  const [otherCropType, setOtherCropType] = useState('');
  const [units, setUnits] = useState<Units>('imperial');
  const [approxAcres, setApproxAcres] = useState('');
  const [busy, setBusy] = useState(false);

  const finishSetup = async () => {
    const region = resolveChipValue(regionSelection, otherRegion);
    const defaultCrop = resolveChipValue(cropSelection, otherCropType);

    if (regionSelection === 'Other' && !region) {
      Alert.alert('Missing information', 'Please enter your primary region.');
      return;
    }
    if (cropSelection === 'Other' && !defaultCrop) {
      Alert.alert('Missing information', 'Please enter your default crop.');
      return;
    }

    setBusy(true);
    try {
      await addFarm({
        farmName: farmName.trim() || 'My Farm',
        region,
        defaultCrop,
        units,
        approximateAcres: Number(approxAcres) || 0,
      });
      onNavigate('home', { replace: true });
    } catch (error) {
      Alert.alert('Could not add farm', getFarmSaveErrorMessage(error));
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
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <View>
            <Text style={styles.stepLabel}>New Farm</Text>
            <Text style={styles.title}>Set up your farm</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FloatingInput label="Farm or operation name" value={farmName} onChange={setFarmName} />
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
              <Text style={[styles.chipText, regionSelection === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {regionSelection === 'Other' && (
          <FloatingInput
            label="Specify primary region"
            value={otherRegion}
            onChange={setOtherRegion}
            placeholder="e.g. Kansas, Ontario"
            autoCapitalize="words"
          />
        )}
        <Text style={styles.fieldLabel}>Default crop</Text>
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
            label="Specify default crop"
            value={otherCropType}
            onChange={setOtherCropType}
            placeholder="e.g. Alfalfa, Rice, Sorghum"
            autoCapitalize="words"
          />
        )}
        <Text style={styles.fieldLabel}>Preferred units</Text>
        <View style={styles.chipRow}>
          {(['imperial', 'metric'] as Units[]).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.chip, units === u && styles.chipActive]}
              onPress={() => setUnits(u)}
            >
              <Text style={[styles.chipText, units === u && styles.chipTextActive]}>
                {u === 'imperial' ? 'Imperial (ac, ft)' : 'Metric (ha, m)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <FloatingInput
          label="Approximate total acreage"
          value={approxAcres}
          onChange={setApproxAcres}
          keyboardType="numeric"
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextWrap} onPress={finishSetup} disabled={busy}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>{busy ? 'Creating…' : 'Create Farm'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  stepLabel: { fontSize: 11, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '900', color: colors.gray900 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 14, paddingBottom: 32 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginTop: 4 },
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
  footer: { padding: 20, gap: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  nextWrap: { borderRadius: 14, overflow: 'hidden' },
  nextBtn: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
