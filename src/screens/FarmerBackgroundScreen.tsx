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
import { FarmerBackgroundFields } from '../components/FarmerBackgroundFields';
import type { CropOption } from '../constants/farmFormOptions';
import {
  type FarmRoleOption,
} from '../constants/farmerBackgroundOptions';
import { validateFarmerBackgroundInput } from '../utils/farmerBackgroundForm';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

export function FarmerBackgroundScreen({ onNavigate, onBack }: ScreenProps) {
  const { completeFarmerOnboarding } = useAppData();
  const [yearsFarming, setYearsFarming] = useState('');
  const [birthday, setBirthday] = useState('');
  const [age, setAge] = useState('');
  const [fieldCount, setFieldCount] = useState('');
  const [cropSelection, setCropSelection] = useState<CropOption>('Soybean');
  const [otherCropType, setOtherCropType] = useState('');
  const [pesticideBrand, setPesticideBrand] = useState('');
  const [farmRole, setFarmRole] = useState<FarmRoleOption>('Farm owner / operator');
  const [otherRole, setOtherRole] = useState('');
  const [primaryGoals, setPrimaryGoals] = useState<string[]>(['Weed scouting']);
  const [busy, setBusy] = useState(false);

  const toggleGoal = (goal: string) => {
    setPrimaryGoals((current) =>
      current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal],
    );
  };

  const finishSetup = async () => {
    const result = validateFarmerBackgroundInput({
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

    if (!result.ok) {
      Alert.alert('Missing information', result.message);
      return;
    }

    setBusy(true);
    try {
      await completeFarmerOnboarding(result.value);
      onNavigate('home', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your profile.';
      Alert.alert('Could not save', message);
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
            <Text style={styles.stepLabel}>Step 2 of 2 · Farmer Background</Text>
            <Text style={styles.title}>Tell us about you</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          This helps Thera tailor scan insights and recommendations to your experience.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  stepLabel: { fontSize: 11, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '900', color: colors.gray900 },
  subtitle: { fontSize: 13, color: colors.gray500, lineHeight: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  footer: { padding: 20, gap: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  nextWrap: { borderRadius: 14, overflow: 'hidden' },
  nextBtn: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
