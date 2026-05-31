import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const STEPS = [
  'Uploading video',
  'Extracting frames',
  'Detecting weeds',
  'Checking crop stress',
  'Comparing previous scans',
  'Generating report',
];

export function ProcessingScreen({ onNavigate }: ScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= STEPS.length - 1) {
          clearInterval(t);
          setTimeout(() => setDone(true), 600);
          return s;
        }
        return s + 1;
      });
    }, 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setScanLine((s) => (s + 1) % 100), 20);
    return () => clearInterval(t);
  }, []);

  const progress = done ? 100 : Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={[colors.primary, colors.success]} style={styles.iconBox}>
          <Ionicons name="leaf" size={36} color={colors.white} />
          <View style={[styles.scanLine, { top: `${scanLine}%` }]} />
        </LinearGradient>
        <Text style={styles.title}>Generating Field Report</Text>
        <Text style={styles.subtitle}>AI is analyzing your crop scan</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>

      <ScrollView style={styles.steps}>
        {STEPS.map((step, i) => {
          const completed = i < currentStep || done;
          const active = i === currentStep && !done;
          return (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View
                  style={[
                    styles.stepDot,
                    completed && styles.stepDotDone,
                    active && styles.stepDotActive,
                  ]}
                >
                  {completed ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.white} />
                  ) : active ? (
                    <View style={styles.stepPulse} />
                  ) : (
                    <View style={styles.stepPending} />
                  )}
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, completed && styles.stepLineDone]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    completed && styles.stepLabelDone,
                    active && styles.stepLabelActive,
                  ]}
                >
                  {step}
                </Text>
                {active && <Text style={styles.stepProcessing}>Processing...</Text>}
                {completed && <Text style={styles.stepComplete}>Complete</Text>}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {done ? (
          <TouchableOpacity onPress={() => onNavigate('report')}>
            <View style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>View Field Report →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitCard}>
            <Text style={styles.waitText}>We'll notify you when your report is ready.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.white, padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  title: { fontSize: 20, fontWeight: '900', color: colors.gray900, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.gray400 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, width: '100%' },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray100,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  steps: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepIndicatorCol: { alignItems: 'center', width: 28 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.primary },
  stepDotActive: { backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary },
  stepPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  stepPending: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  stepLine: { width: 2, height: 32, backgroundColor: colors.gray200, marginTop: 4 },
  stepLineDone: { backgroundColor: colors.primary },
  stepContent: { flex: 1, paddingBottom: 24, paddingLeft: 16 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: colors.gray400 },
  stepLabelDone: { color: colors.primary },
  stepLabelActive: { color: colors.gray900 },
  stepProcessing: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  stepComplete: { fontSize: 12, color: colors.success, marginTop: 2 },
  footer: { marginTop: 16 },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  doneBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  waitCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  waitText: { fontSize: 14, color: colors.gray500 },
});
