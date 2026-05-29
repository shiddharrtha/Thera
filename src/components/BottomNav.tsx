import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { NavTab } from '../types/navigation';

const LEFT_TABS: { id: NavTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'fields', label: 'Fields', icon: 'list' },
];

const RIGHT_TABS: { id: NavTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'savings', label: 'Savings', icon: 'trending-up' },
  { id: 'reports', label: 'Reports', icon: 'document-text' },
];

interface BottomNavProps {
  active: NavTab;
  onTab: (tab: NavTab) => void;
}

export function BottomNav({ active, onTab }: BottomNavProps) {
  const renderTab = (tab: (typeof LEFT_TABS)[0]) => {
    const isActive = active === tab.id;
    return (
      <TouchableOpacity key={tab.id} style={styles.tab} onPress={() => onTab(tab.id)}>
        <Ionicons name={tab.icon} size={20} color={isActive ? colors.primary : colors.gray400} />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {LEFT_TABS.map(renderTab)}
      <TouchableOpacity style={styles.scanTab} onPress={() => onTab('scan')}>
        <View style={[styles.scanButton, active === 'scan' && styles.scanButtonActive]}>
          <Ionicons name="camera" size={24} color={colors.white} />
        </View>
        <Text style={[styles.tabLabel, active === 'scan' && styles.tabLabelActive]}>Scan</Text>
      </TouchableOpacity>
      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    height: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scanTab: {
    flex: 1,
    alignItems: 'center',
    marginTop: -24,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  scanButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.gray400,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
