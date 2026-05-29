import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface HealthBarProps {
  pct: number;
  color: string;
}

export function HealthBar({ pct, color }: HealthBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray100,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
