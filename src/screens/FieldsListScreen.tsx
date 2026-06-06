import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthRing } from '../components/HealthRing';
import { EmptyState } from '../components/EmptyState';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import type { Field, FieldStatus } from '../types/models';
import { formatOptionalDisplayDateTime } from '../utils/timestamps';

const STATUS_CONFIG: Record<FieldStatus, { label: string; bg: string; text: string }> = {
  unscanned: { label: 'Not Scanned', bg: colors.gray100, text: colors.gray600 },
  healthy: { label: 'Healthy', bg: colors.accent, text: '#15803D' },
  warning: { label: 'Warning', bg: colors.warningBg, text: colors.warningText },
  critical: { label: 'Critical', bg: '#FEE2E2', text: '#DC2626' },
};

type SortKey = 'name' | 'health' | 'acres' | 'issues';

export function FieldsListScreen({ onNavigate, onBack }: ScreenProps) {
  const { data, setSelectedFieldId } = useAppData();
  const fields = data.fields;
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('health');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc((a) => !a);
    else { setSortBy(key); setSortAsc(true); }
  };

  const totalAcres = fields.reduce((sum, field) => sum + field.acreage, 0);

  const filtered = fields
    .filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.cropType.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = sortBy === 'name' ? a.name : sortBy === 'health' ? (a.healthScore ?? -1) : sortBy === 'acres' ? a.acreage : a.openIssues;
      const bv = sortBy === 'name' ? b.name : sortBy === 'health' ? (b.healthScore ?? -1) : sortBy === 'acres' ? b.acreage : b.openIssues;
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
          <TouchableOpacity style={styles.addBtn} onPress={() => onNavigate('add-field')}>
            <Text style={styles.addBtnText}>+ Add Field</Text>
          </TouchableOpacity>
        </View>

        {fields.length > 0 && (
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
        )}
      </View>

      {fields.length > 0 && (
        <>
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
            <Text style={styles.summaryBold}>{totalAcres}</Text> total acres
          </Text>
        </>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {fields.length === 0 ? (
          <EmptyState
            icon="map-outline"
            title="No fields added yet"
            message="Add a field to organize scans, monitor crop health, and calculate treatment savings."
            actionLabel="Add Your First Field"
            onAction={() => onNavigate('add-field')}
          />
        ) : (
          filtered.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              onNavigate={onNavigate}
              setSelectedFieldId={setSelectedFieldId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FieldCard({
  field,
  onNavigate,
  setSelectedFieldId,
}: {
  field: Field;
  onNavigate: ScreenProps['onNavigate'];
  setSelectedFieldId: (id: string) => void;
}) {
  const st = STATUS_CONFIG[field.status];
  const unscanned = field.status === 'unscanned';

  return (
    <View style={styles.fieldCard}>
      <TouchableOpacity
        onPress={() => {
          setSelectedFieldId(field.id);
          onNavigate('field-detail');
        }}
      >
        <View style={styles.fieldTop}>
          {unscanned ? (
            <View style={styles.noScoreRing}>
              <Text style={styles.noScoreText}>—</Text>
            </View>
          ) : (
            <HealthRing score={field.healthScore ?? 0} />
          )}
          <View style={styles.fieldInfo}>
            <View style={styles.fieldHeader}>
              <View>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldMeta}>{field.cropType} · {field.acreage} ac</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
              </View>
            </View>
            <View style={styles.fieldStats}>
              <Text style={styles.fieldStat}>Last scan: {formatOptionalDisplayDateTime(field.lastScanDate)}</Text>
              {field.openIssues > 0 && (
                <View style={styles.issuesRow}>
                  <Ionicons name="warning" size={10} color={colors.warning} />
                  <Text style={styles.issues}>{field.openIssues} issues</Text>
                </View>
              )}
              <Text style={styles.savings}>${field.totalSavings} saved</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.fieldActions}>
        {unscanned ? (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => {
              setSelectedFieldId(field.id);
              onNavigate('scan');
            }}
          >
            <Text style={styles.reportBtnText}>Start First Scan</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => {
                setSelectedFieldId(field.id);
                onNavigate('field-detail');
              }}
            >
              <Text style={styles.reportBtnText}>View Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => {
                setSelectedFieldId(field.id);
                onNavigate('field-map');
              }}
            >
              <Ionicons name="location" size={11} color={colors.primary} />
              <Text style={styles.mapBtnText}>Open Map</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.timelineBtn}
          onPress={() => {
            setSelectedFieldId(field.id);
            onNavigate('field-detail');
          }}
        >
          <Ionicons name="chevron-forward" size={14} color={colors.gray500} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = createStyles({
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
  listContent: { padding: 16, gap: 12, paddingBottom: 24, flexGrow: 1 },
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
  noScoreRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noScoreText: { fontSize: 16, fontWeight: '700', color: colors.gray400 },
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
