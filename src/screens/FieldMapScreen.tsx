import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';
import { fonts } from '../theme/typography';

const ALL_LAYERS = ['Weeds', 'Stress', 'Spray Zones', 'Scan Path'] as const;
type Layer = (typeof ALL_LAYERS)[number];

export function FieldMapScreen({ onNavigate, onBack }: ScreenProps) {
  const [active, setActive] = useState<Layer[]>(['Weeds', 'Stress', 'Scan Path']);
  const [sheetOpen, setSheetOpen] = useState(true);

  const toggle = (l: Layer) =>
    setActive((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const has = (l: Layer) => active.includes(l);

  return (
    <View style={styles.container}>
      <View style={styles.mapBg}>
        <Svg viewBox="0 0 375 560" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <Polygon points="55,95 320,88 326,430 50,438" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
          <Polygon points="55,275 326,268 326,430 50,438" fill="#22C55E" opacity="0.4" />
          {has('Stress') && (
            <Polygon points="195,88 320,88 326,268 195,275" fill="#F59E0B" opacity="0.45" />
          )}
          {has('Weeds') && (
            <Polygon points="55,95 155,90 150,195 52,200" fill="#EF4444" opacity="0.6" />
          )}
          {has('Spray Zones') && (
            <>
              <Polygon
                points="55,95 155,90 150,195 52,200"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeDasharray="8 4"
                opacity="0.9"
              />
              <Polygon
                points="200,88 320,88 326,240 200,245"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.8"
              />
            </>
          )}
          {has('Scan Path') && (
            <Polyline
              points="82,100 82,430 108,430 108,100 134,100 134,430 160,430 160,100 186,100 186,430 212,430 212,100 238,100 238,430 264,430 264,100 290,100 290,430 314,430 314,100"
              stroke="#3B82F6"
              strokeWidth="1.8"
              fill="none"
              strokeDasharray="6 3"
              opacity="0.65"
            />
          )}
          <Circle cx="103" cy="148" r="22" fill="rgba(239,68,68,0.18)" stroke="#EF4444" strokeWidth="2" />
          <SvgText x="103" y="143" fontSize="9" fill="#EF4444" fontWeight="800" fontFamily={fonts.extraBold} textAnchor="middle">
            Zone A
          </SvgText>
          <SvgText x="103" y="155" fontSize="7.5" fill="#EF4444" fontFamily={fonts.extraBold} textAnchor="middle">
            HIGH
          </SvgText>
          {has('Stress') && (
            <>
              <Circle cx="262" cy="170" r="18" fill="rgba(245,158,11,0.18)" stroke="#F59E0B" strokeWidth="2" />
              <SvgText x="262" y="165" fontSize="8.5" fill="#F59E0B" fontWeight="800" fontFamily={fonts.extraBold} textAnchor="middle">
                Zone B
              </SvgText>
            </>
          )}
          <SvgText x="190" y="370" fontSize="10" fill="#166534" fontWeight="700" fontFamily={fonts.extraBold} textAnchor="middle" opacity="0.8">
            ✓ Healthy
          </SvgText>
        </Svg>
      </View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>North Soybean Field</Text>
          <Text style={styles.subtitle}>Field boundary · 45 acres</Text>
        </View>
        <Ionicons name="layers" size={18} color={colors.gray500} />
      </View>

      <View style={styles.chips}>
        {ALL_LAYERS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.chip, has(l) && styles.chipActive]}
            onPress={() => toggle(l)}
          >
            <Text style={[styles.chipText, has(l) && styles.chipTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.legend}>
        {[
          { color: colors.success, label: 'Healthy' },
          { color: colors.warning, label: 'Moderate' },
          { color: colors.destructive, label: 'High issue' },
          { color: colors.info, label: 'Scan path' },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />

      <View style={styles.sheet}>
        <TouchableOpacity style={styles.sheetHandle} onPress={() => setSheetOpen((o) => !o)}>
          <View style={styles.handleBar} />
          <Ionicons name={sheetOpen ? 'chevron-down' : 'chevron-up'} size={16} color={colors.gray400} />
        </TouchableOpacity>
        {sheetOpen && (
          <View style={styles.sheetContent}>
            <Text style={styles.sheetLabel}>SELECTED ZONE</Text>
            <View style={styles.zoneHeader}>
              <Text style={styles.zoneName}>Zone A</Text>
              <View style={styles.zoneBadge}>
                <Text style={styles.zoneBadgeText}>Weed Pressure: High</Text>
              </View>
            </View>
            <Text style={styles.zoneDetail}>
              <Text style={styles.zoneDetailBold}>Suggested Action:</Text> Inspect within 48 hours
            </Text>
            <Text style={styles.zoneDetail}>
              <Text style={styles.zoneDetailBold}>Estimated Area:</Text> 1.2 acres
            </Text>
            <TouchableOpacity style={styles.reportBtn} onPress={() => onNavigate('report')}>
              <Text style={styles.reportBtnText}>View Full Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: '#D1D5DB' },
  mapBg: { ...StyleSheet.absoluteFill, backgroundColor: '#E5E7EB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: colors.background },
  headerText: { flex: 1 },
  title: { fontWeight: '700', fontSize: 14, color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray400 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  chipTextActive: { color: colors.white },
  legend: {
    position: 'absolute',
    right: 12,
    top: 140,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: colors.gray500, fontWeight: '500' },
  spacer: { flex: 1 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 20,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 6 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 24 },
  sheetLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 1, marginBottom: 12 },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  zoneName: { fontSize: 18, fontWeight: '900', color: colors.gray900 },
  zoneBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  zoneBadgeText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  zoneDetail: { fontSize: 14, color: colors.gray500, marginBottom: 6 },
  zoneDetailBold: { fontWeight: '600', color: colors.gray900 },
  reportBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
