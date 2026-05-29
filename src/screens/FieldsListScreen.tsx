import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthRing } from '../components/HealthRing';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';

const FIELDS = [
  { id: 1, name: 'North 40', crop: 'Soybean', acres: 40, lastScan: 'May 25, 2026', health: 82, issues: 2, savings: '$340', status: 'warning' as const },
  { id: 2, name: 'Henderson Tract', crop: 'Soybean', acres: 58, lastScan: 'May 23, 2026', health: 91, issues: 0, savings: '$210', status: 'healthy' as const },
  { id: 3, name: 'South Soybean Field', crop: 'Soybean', acres: 32, lastScan: 'May 21, 2026', health: 74, issues: 3, savings: '$480', status: 'warning' as const },
  { id: 4, name: 'West Parcel', crop: 'Corn', acres: 25, lastScan: 'May 18, 2026', health: 67, issues: 4, savings: '$210', status: 'critical' as const },
];

const STATUS_CONFIG = {
  healthy: { label: 'Healthy', bg: colors.accent, text: '#15803D' },
  warning: { label: 'Warning', bg: colors.warningBg, text: colors.warningText },
  critical: { label: 'Critical', bg: '#FEE2E2', text: '#DC2626' },
};

type SortKey = 'name' | 'health' | 'acres' | 'issues';

export function FieldsListScreen({ onNavigate, onBack }: ScreenProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('health');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc((a) => !a);
    else { setSortBy(key); setSortAsc(true); }
  };

  const filtered = FIELDS
    .filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.crop.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.title}>All Fields</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Field</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={13} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search fields or crop type..."
            placeholderTextColor={colors.gray400}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>SORT BY</Text>
        {(['name', 'health', 'acres', 'issues'] as SortKey[]).map((col) => (
          <TouchableOpacity key={col} onPress={() => toggleSort(col)}>
            <Text style={[styles.sortBtn, sortBy === col && styles.sortBtnActive]}>
              {col.charAt(0).toUpperCase() + col.slice(1)}
              {sortBy === col ? (sortAsc ? ' ↑' : ' ↓') : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.summary}>
        <Text style={styles.summaryBold}>{filtered.length}</Text> fields ·{' '}
        <Text style={styles.summaryBold}>155</Text> total acres
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map((field) => {
          const st = STATUS_CONFIG[field.status];
          return (
            <View key={field.id} style={styles.fieldCard}>
              <View style={styles.fieldTop}>
                <HealthRing score={field.health} />
                <View style={styles.fieldInfo}>
                  <View style={styles.fieldHeader}>
                    <View>
                      <Text style={styles.fieldName}>{field.name}</Text>
                      <Text style={styles.fieldMeta}>{field.crop} · {field.acres} ac</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={styles.fieldStats}>
                    <Text style={styles.fieldStat}>Last scan: {field.lastScan}</Text>
                    {field.issues > 0 && (
                      <View style={styles.issuesRow}>
                        <Ionicons name="warning" size={10} color={colors.warning} />
                        <Text style={styles.issues}>{field.issues} issues</Text>
                      </View>
                    )}
                    <Text style={styles.savings}>{field.savings} saved</Text>
                  </View>
                </View>
              </View>
              <View style={styles.fieldActions}>
                <TouchableOpacity style={styles.reportBtn} onPress={() => onNavigate('report')}>
                  <Text style={styles.reportBtnText}>View Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapBtn} onPress={() => onNavigate('field-map')}>
                  <Ionicons name="location" size={11} color={colors.primary} />
                  <Text style={styles.mapBtnText}>Open Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timelineBtn} onPress={() => onNavigate('timeline')}>
                  <Ionicons name="chevron-forward" size={14} color={colors.gray500} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  title: { flex: 1, fontWeight: '700', fontSize: 18, color: colors.gray900 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 32,
    paddingRight: 12,
    fontSize: 12,
    color: colors.gray900,
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  sortLabel: { fontSize: 9, color: colors.gray400, fontWeight: '600', marginRight: 4 },
  sortBtn: { fontSize: 9, fontWeight: '700', color: colors.gray400 },
  sortBtnActive: { color: colors.primary },
  summary: { fontSize: 10, color: colors.gray500, paddingHorizontal: 20, paddingVertical: 8 },
  summaryBold: { fontWeight: '700', color: colors.gray700 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12, paddingBottom: 24 },
  fieldCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldTop: { flexDirection: 'row', gap: 12 },
  fieldInfo: { flex: 1 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  fieldName: { fontWeight: '700', fontSize: 14, color: colors.gray900 },
  fieldMeta: { fontSize: 10, color: colors.gray400, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  fieldStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  fieldStat: { fontSize: 10, color: colors.gray400 },
  issuesRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  issues: { fontSize: 10, fontWeight: '600', color: colors.warning },
  savings: { fontSize: 10, fontWeight: '600', color: colors.primary },
  fieldActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reportBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  reportBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.primary },
  mapBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  timelineBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.background },
});
