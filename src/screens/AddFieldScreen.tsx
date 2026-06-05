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
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const CROPS = ['Soybean', 'Corn', 'Wheat', 'Cotton', 'Other'];

export function AddFieldScreen({ onNavigate, onBack }: ScreenProps) {
  const { addField, data, setSelectedFieldId } = useAppData();
  const [name, setName] = useState('');
  const [cropType, setCropType] = useState(data.farmProfile?.defaultCrop ?? 'Soybean');
  const [acreage, setAcreage] = useState('');
  const [location, setLocation] = useState(data.farmProfile?.region ?? '');
  const [plantingDate, setPlantingDate] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !acreage) {
      Alert.alert('Missing information', 'Please enter a field name and acreage.');
      return;
    }
    setBusy(true);
    try {
      const field = await addField({
        name: name.trim(),
        cropType,
        acreage: Number(acreage),
        location: location.trim() || undefined,
        plantingDate: plantingDate.trim() || undefined,
        hasBoundary: false,
      });
      setSelectedFieldId(field.id);
      onNavigate('field-detail');
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
          {CROPS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, cropType === c && styles.chipActive]}
              onPress={() => setCropType(c)}
            >
              <Text style={[styles.chipText, cropType === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FloatingInput label="Acreage" value={acreage} onChange={setAcreage} keyboardType="numeric" />
        <FloatingInput label="Location (optional)" value={location} onChange={setLocation} />
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
