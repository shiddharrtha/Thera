import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { createStyles } from '../theme/createStyles';

interface HealthRingProps {
  score: number;
  size?: number;
}

export function HealthRing({ score, size = 50 }: HealthRingProps) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 85 ? '#22C55E' : score >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color }]}>{score}</Text>
      </View>
    </View>
  );
}

const styles = createStyles({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 11,
    fontWeight: '900',
  },
});
