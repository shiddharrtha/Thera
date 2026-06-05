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
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { getProfileSaveErrorMessage } from '../services/profile';
import { FloatingInput } from '../components/FloatingInput';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { Units } from '../types/models';

const CROPS = ['Soybean', 'Corn', 'Wheat', 'Cotton', 'Other'];
const REGIONS = ['Iowa', 'Illinois', 'Nebraska', 'Minnesota', 'Indiana', 'Other'];

export function FarmSetupScreen({ onNavigate }: ScreenProps) {
  const { completeOnboarding } = useAppData();
  const [farmName, setFarmName] = useState('');
  const [region, setRegion] = useState('Iowa');
  const [defaultCrop, setDefaultCrop] = useState('Soybean');
  const [units, setUnits] = useState<Units>('imperial');
  const [approxAcres, setApproxAcres] = useState('');
  const [busy, setBusy] = useState(false);

  const finishSetup = async () => {
    setBusy(true);
    try {
      await completeOnboarding({
        farmName: farmName.trim() || 'My Farm',
        region,
        defaultCrop,
        units,
        approximateAcres: Number(approxAcres) || 0,
      });
      onNavigate('home');
    } catch (error) {
      const message = getProfileSaveErrorMessage(error);
      if (message.includes('db:migrate-farm-profile') || message.includes('columns are missing')) {
        Alert.alert(
          'Saved on this device',
          `${message}\n\nYour farm profile is saved locally. After running the migration, reopen the app to sync to Supabase.`,
          [{ text: 'Continue', onPress: () => onNavigate('home') }],
        );
        return;
      }
      Alert.alert('Could not save farm profile', message);
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
        <Text style={styles.stepLabel}>Farm Profile</Text>
        <Text style={styles.title}>Set up your farm</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FloatingInput label="Farm or operation name" value={farmName} onChange={setFarmName} />
        <Text style={styles.fieldLabel}>Primary region</Text>
        <View style={styles.chipRow}>
          {REGIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, region === r && styles.chipActive]}
              onPress={() => setRegion(r)}
            >
              <Text style={[styles.chipText, region === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Default crop</Text>
        <View style={styles.chipRow}>
          {CROPS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, defaultCrop === c && styles.chipActive]}
              onPress={() => setDefaultCrop(c)}
            >
              <Text style={[styles.chipText, defaultCrop === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
            <Text style={styles.nextBtnText}>{busy ? 'Saving…' : 'Continue'}</Text>
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
