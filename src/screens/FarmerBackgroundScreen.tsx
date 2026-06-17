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
  FARM_ROLE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  type FarmRoleOption,
} from '../constants/farmerBackgroundOptions';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

export function FarmerBackgroundScreen({ onNavigate, onBack }: ScreenProps) {
  const { completeFarmerOnboarding } = useAppData();
  const [yearsFarming, setYearsFarming] = useState('');
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
    const resolvedRole = farmRole === 'Other' ? otherRole.trim() : farmRole;
    const years = Number(yearsFarming.trim());

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
      await completeFarmerOnboarding({
        yearsFarming: String(Math.round(years)),
        farmRole: resolvedRole,
        primaryGoals,
      });
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
  scrollContent: { padding: 20, gap: 14, paddingBottom: 32 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginTop: 4 },
  fieldHint: { fontSize: 11, color: colors.gray400, marginTop: -6 },
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
