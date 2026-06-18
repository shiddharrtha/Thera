import { View, Text, TouchableOpacity } from 'react-native';
import { FloatingInput } from './FloatingInput';
import {
  CROP_OPTIONS,
  type CropOption,
} from '../constants/farmFormOptions';
import {
  FARM_ROLE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  type FarmRoleOption,
} from '../constants/farmerBackgroundOptions';
import { calculateAgeFromBirthday } from '../utils/farmerBackgroundForm';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

type FarmerBackgroundFieldsProps = {
  yearsFarming: string;
  onYearsFarmingChange: (value: string) => void;
  birthday: string;
  onBirthdayChange: (value: string) => void;
  age: string;
  onAgeChange: (value: string) => void;
  fieldCount: string;
  onFieldCountChange: (value: string) => void;
  cropSelection: CropOption;
  onCropSelectionChange: (value: CropOption) => void;
  otherCropType: string;
  onOtherCropTypeChange: (value: string) => void;
  pesticideBrand: string;
  onPesticideBrandChange: (value: string) => void;
  farmRole: FarmRoleOption;
  onFarmRoleChange: (value: FarmRoleOption) => void;
  otherRole: string;
  onOtherRoleChange: (value: string) => void;
  primaryGoals: string[];
  onToggleGoal: (goal: string) => void;
};

export function FarmerBackgroundFields({
  yearsFarming,
  onYearsFarmingChange,
  birthday,
  onBirthdayChange,
  age,
  onAgeChange,
  fieldCount,
  onFieldCountChange,
  cropSelection,
  onCropSelectionChange,
  otherCropType,
  onOtherCropTypeChange,
  pesticideBrand,
  onPesticideBrandChange,
  farmRole,
  onFarmRoleChange,
  otherRole,
  onOtherRoleChange,
  primaryGoals,
  onToggleGoal,
}: FarmerBackgroundFieldsProps) {
  const handleBirthdayChange = (value: string) => {
    onBirthdayChange(value);
    const computed = calculateAgeFromBirthday(value);
    if (computed !== null) {
      onAgeChange(String(computed));
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>Birthday</Text>
      <FloatingInput
        label="Birthday"
        value={birthday}
        onChange={handleBirthdayChange}
        placeholder="YYYY-MM-DD or MM/DD/YYYY"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>How old are you?</Text>
      <FloatingInput
        label="Age"
        value={age}
        onChange={onAgeChange}
        keyboardType="numeric"
        placeholder="e.g. 42"
      />

      <Text style={styles.fieldLabel}>How many years have you been farming?</Text>
      <FloatingInput
        label="Years farming"
        value={yearsFarming}
        onChange={onYearsFarmingChange}
        keyboardType="numeric"
        placeholder="e.g. 12"
      />

      <Text style={styles.fieldLabel}>How many fields do you have?</Text>
      <FloatingInput
        label="Number of fields"
        value={fieldCount}
        onChange={onFieldCountChange}
        keyboardType="numeric"
        placeholder="e.g. 3"
      />

      <Text style={styles.fieldLabel}>What is your main crop?</Text>
      <View style={styles.chipRow}>
        {CROP_OPTIONS.map((crop) => (
          <TouchableOpacity
            key={crop}
            style={[styles.chip, cropSelection === crop && styles.chipActive]}
            onPress={() => {
              onCropSelectionChange(crop);
              if (crop !== 'Other') onOtherCropTypeChange('');
            }}
          >
            <Text style={[styles.chipText, cropSelection === crop && styles.chipTextActive]}>
              {crop}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {cropSelection === 'Other' && (
        <FloatingInput
          label="Specify main crop"
          value={otherCropType}
          onChange={onOtherCropTypeChange}
          placeholder="e.g. Alfalfa, Rice, Sorghum"
          autoCapitalize="words"
        />
      )}

      <Text style={styles.fieldLabel}>What brand of pesticide do you use?</Text>
      <FloatingInput
        label="Pesticide brand"
        value={pesticideBrand}
        onChange={onPesticideBrandChange}
        placeholder="e.g. Roundup, Liberty, Enlist Duo"
        autoCapitalize="words"
      />

      <Text style={styles.fieldLabel}>What's your role?</Text>
      <View style={styles.chipRow}>
        {FARM_ROLE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.chip, farmRole === option && styles.chipActive]}
            onPress={() => {
              onFarmRoleChange(option);
              if (option !== 'Other') onOtherRoleChange('');
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
          onChange={onOtherRoleChange}
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
              onPress={() => onToggleGoal(goal)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{goal}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = createStyles({
  wrap: { gap: 14 },
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
});
