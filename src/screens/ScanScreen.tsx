import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

export function ScanScreen({ onNavigate, onBack }: ScreenProps) {
  const { data, selectedFieldId, setSelectedFieldId, startScan, hasCompletedScans } = useAppData();
  const fields = data.fields;

  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    selectedFieldId ?? (fields.length === 1 ? fields[0]?.id ?? null : null),
  );
  const [confirmed, setConfirmed] = useState(fields.length === 1);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showTutorial, setShowTutorial] = useState(!hasCompletedScans);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeField = activeFieldId ? fields.find((f) => f.id === activeFieldId) : undefined;

  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording, paused]);

  if (fields.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyHeader}>
          <TouchableOpacity style={styles.backBtnLight} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="leaf-outline"
          title="Add a Field Before Scanning"
          message="You need at least one field to start a crop scan."
          actionLabel="Add Your First Field"
          onAction={() => onNavigate('add-field')}
        />
      </View>
    );
  }

  if (fields.length > 1 && !activeFieldId) {
    return (
      <View style={styles.selectorContainer}>
        <View style={styles.selectorHeader}>
          <TouchableOpacity style={styles.backBtnDark} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.selectorTitle}>Select a Field</Text>
        </View>
        <ScrollView contentContainerStyle={styles.selectorList}>
          {fields.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={styles.selectorCard}
              onPress={() => {
                setActiveFieldId(f.id);
                setSelectedFieldId(f.id);
                setConfirmed(false);
              }}
            >
              <Text style={styles.selectorName}>{f.name}</Text>
              <Text style={styles.selectorMeta}>{f.cropType} · {f.acreage} ac</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!confirmed && activeField) {
    return (
      <View style={styles.selectorContainer}>
        <View style={styles.selectorHeader}>
          <TouchableOpacity
            style={styles.backBtnDark}
            onPress={() => (fields.length > 1 ? setActiveFieldId(null) : onBack())}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.selectorTitle}>Confirm Field</Text>
        </View>
        <View style={styles.confirmBody}>
          <Text style={styles.confirmName}>{activeField.name}</Text>
          <Text style={styles.confirmMeta}>{activeField.cropType} · {activeField.acreage} acres</Text>
          {showTutorial && (
            <View style={styles.tutorialCard}>
              <Text style={styles.tutorialTitle}>First scan tips</Text>
              {[
                'Hold phone 2–3 feet above the crop',
                'Walk slowly between rows',
                'Keep crop rows aligned in frame',
                'Allow location access for GPS tracking',
              ].map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setConfirmed(true)}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.confirmBtn}>
              <Ionicons name="camera" size={18} color={colors.white} />
              <Text style={styles.confirmBtnText}>Open Camera</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progress = Math.min(100, Math.round(seconds * 1.6));
  const currentRow = Math.min(5, Math.floor(seconds / 12) + 1);

  const indicators = [
    { label: 'GPS', value: 'Good', ok: true, icon: 'location' as const },
    { label: 'Lighting', value: 'Good', ok: true, icon: 'sunny' as const },
    { label: 'Crop Rows', value: recording ? 'Visible' : 'Ready', ok: true, icon: 'menu' as const },
  ];

  const handleStop = async () => {
    if (!activeFieldId) return;
    const scan = await startScan(activeFieldId);
    setSelectedFieldId(activeFieldId);
    onNavigate('processing');
    void scan;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#040C06', '#081A0C', '#0D2510', '#0A1C0D', '#050D07']}
        style={StyleSheet.absoluteFill}
      />
      {Array.from({ length: 14 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rowLine,
            {
              left: `${((i + 0.5) / 14) * 100}%`,
              width: i % 2 === 0 ? 2 : 1,
              opacity: i % 2 === 0 ? 0.1 : 0.05,
            },
          ]}
        />
      ))}

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtnLight} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Scan {activeField?.name ?? 'Field'}</Text>
            {recording && (
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                  {String(seconds % 60).padStart(2, '0')} RECORDING
                </Text>
              </View>
            )}
          </View>
        </View>

        {!recording && (
          <View style={styles.instructions}>
            {['Walk slowly between rows', 'Keep camera 2–3 feet above crop', 'Move in a straight line'].map((t) => (
              <View key={t} style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.instructionText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.indicators}>
          {indicators.map((ind) => (
            <View key={ind.label} style={styles.indicator}>
              <View style={styles.indicatorValue}>
                <Ionicons name={ind.icon} size={11} color={ind.ok ? '#4ADE80' : colors.destructive} />
                <Text style={[styles.indicatorValueText, { color: ind.ok ? '#4ADE80' : colors.destructive }]}>
                  {ind.value}
                </Text>
              </View>
              <Text style={styles.indicatorLabel}>{ind.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {recording && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Row {currentRow} of 5</Text>
            <Text style={styles.progressPct}>{progress}% complete</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.spacer} />

      <View style={styles.controls}>
        <Text style={styles.hint}>
          {recording
            ? paused
              ? 'Paused — tap to resume'
              : 'Keep going · Walk slowly'
            : 'Tap the button to start scanning'}
        </Text>
        <View style={styles.controlRow}>
          {recording && (
            <TouchableOpacity style={styles.sideBtn} onPress={() => setPaused((p) => !p)}>
              <Ionicons name="pause" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: recording ? colors.destructive : colors.success }]}
            onPress={() => {
              if (recording) handleStop();
              else {
                setRecording(true);
                setPaused(false);
                setShowTutorial(false);
              }
            }}
          >
            <Ionicons name={recording ? 'stop' : 'play'} size={28} color={colors.white} />
          </TouchableOpacity>
          {!recording && (
            <TouchableOpacity style={styles.sideBtn}>
              <Ionicons name="location" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.scanDark },
  emptyHeader: { paddingHorizontal: 20, paddingTop: 12 },
  selectorContainer: { flex: 1, backgroundColor: colors.background },
  selectorHeader: {
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
  selectorTitle: { fontWeight: '700', fontSize: 18, color: colors.gray900 },
  selectorList: { padding: 16, gap: 10 },
  selectorCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorName: { fontWeight: '700', fontSize: 14, color: colors.gray900 },
  selectorMeta: { fontSize: 11, color: colors.gray400, marginTop: 4 },
  confirmBody: { padding: 20, gap: 16 },
  confirmName: { fontSize: 22, fontWeight: '900', color: colors.gray900 },
  confirmMeta: { fontSize: 13, color: colors.gray500 },
  tutorialCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  tutorialTitle: { fontWeight: '700', fontSize: 14, color: colors.gray900, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  tipText: { fontSize: 12, color: colors.gray600 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  confirmBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  backBtnLight: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  backBtnDark: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  rowLine: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#4ADE80' },
  header: { paddingHorizontal: 20, paddingTop: 12, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerText: { flex: 1 },
  title: { color: colors.white, fontWeight: '700', fontSize: 14 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recordingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.destructive },
  recordingText: { color: '#F87171', fontSize: 10, fontWeight: '700' },
  instructions: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 14, marginBottom: 12 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  instructionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4ADE80' },
  instructionText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  indicators: { flexDirection: 'row', gap: 8 },
  indicator: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  indicatorValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  indicatorValueText: { fontSize: 10, fontWeight: '700' },
  indicatorLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
  progressCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 16,
    zIndex: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTitle: { color: colors.white, fontSize: 12, fontWeight: '700' },
  progressPct: { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4ADE80', borderRadius: 4 },
  spacer: { flex: 1 },
  controls: { paddingHorizontal: 20, paddingBottom: 32, zIndex: 10 },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 24 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
