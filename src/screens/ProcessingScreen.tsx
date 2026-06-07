import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { getScanVideoErrorMessage } from '../services/scanUpload';
import { getScanAnalysisErrorMessage } from '../services/scanAnalysis';
import type { ScanAnalysisResult } from '../services/scanAnalysis';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const STEPS = [
  'Uploading scan',
  'Validating scan quality',
  'Detecting weeds',
  'Assessing crop health',
  'Mapping problem areas',
  'Generating recommendations',
  'Preparing report',
];

const UPLOAD_PROGRESS_MAX = 30;
const ANALYSIS_PROGRESS_MAX = 99;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapAnalysisProgressToStep(analysisPercent: number): number {
  if (analysisPercent < 20) return 1;
  if (analysisPercent < 40) return 2;
  if (analysisPercent < 60) return 3;
  if (analysisPercent < 75) return 4;
  if (analysisPercent < 90) return 5;
  return 6;
}

function mapAnalysisPercentToOverall(analysisPercent: number): number {
  const span = ANALYSIS_PROGRESS_MAX - UPLOAD_PROGRESS_MAX;
  return UPLOAD_PROGRESS_MAX + Math.round((analysisPercent / 100) * span);
}

export function ProcessingScreen({ onNavigate }: ScreenProps) {
  const {
    selectedScanId,
    getScan,
    uploadScanVideo,
    analyzeScan,
    advanceScanProgress,
    completeScan,
    isAnalysisApiConfigured,
  } = useAppData();
  const scan = selectedScanId ? getScan(selectedScanId) : undefined;
  const isFirstScan = scan?.isFirstScan ?? false;

  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const pipelineScanIdRef = useRef<string | null>(null);
  const getScanRef = useRef(getScan);
  const uploadScanVideoRef = useRef(uploadScanVideo);
  const analyzeScanRef = useRef(analyzeScan);
  const advanceScanProgressRef = useRef(advanceScanProgress);
  const completeScanRef = useRef(completeScan);

  getScanRef.current = getScan;
  uploadScanVideoRef.current = uploadScanVideo;
  analyzeScanRef.current = analyzeScan;
  advanceScanProgressRef.current = advanceScanProgress;
  completeScanRef.current = completeScan;

  useEffect(() => {
    if (!selectedScanId || pipelineScanIdRef.current === selectedScanId) return;
    pipelineScanIdRef.current = selectedScanId;

    let cancelled = false;

    async function runMockAnalysis(scanId: string) {
      for (let step = 1; step < STEPS.length; step++) {
        if (cancelled) return;

        setCurrentStep(step);
        const analysisProgress =
          UPLOAD_PROGRESS_MAX +
          Math.round((step / (STEPS.length - 1)) * (ANALYSIS_PROGRESS_MAX - UPLOAD_PROGRESS_MAX));
        const clamped = Math.min(analysisProgress, ANALYSIS_PROGRESS_MAX);
        setOverallProgress(clamped);
        await advanceScanProgressRef.current(scanId, clamped, 'processing');
        await sleep(900);
      }
    }

    async function runPipeline() {
      const scanId = selectedScanId!;
      const initialScan = getScanRef.current(scanId);
      if (!initialScan) return;

      setCurrentStep(0);
      setUploadError(null);
      setAnalysisError(null);
      setDone(false);
      setOverallProgress(0);

      if (initialScan.videoUri && !initialScan.videoUrl) {
        try {
          await uploadScanVideoRef.current(scanId, (uploadPercent) => {
            if (cancelled) return;
            const progress = Math.round((uploadPercent / 100) * UPLOAD_PROGRESS_MAX);
            setOverallProgress(progress);
          });
        } catch (error) {
          if (cancelled) return;
          setUploadError(getScanVideoErrorMessage(error));
          await advanceScanProgressRef.current(scanId, UPLOAD_PROGRESS_MAX, 'processing');
          setOverallProgress(UPLOAD_PROGRESS_MAX);
        }
      } else {
        await advanceScanProgressRef.current(scanId, UPLOAD_PROGRESS_MAX, 'processing');
        setOverallProgress(UPLOAD_PROGRESS_MAX);
      }

      if (cancelled) return;
      setCurrentStep(1);

      let analysisResult: ScanAnalysisResult | undefined;

      if (isAnalysisApiConfigured) {
        try {
          const result = await analyzeScanRef.current(scanId, (analysisPercent) => {
            if (cancelled) return;
            setCurrentStep(mapAnalysisProgressToStep(analysisPercent));
            const overall = mapAnalysisPercentToOverall(analysisPercent);
            setOverallProgress(overall);
          });
          analysisResult = result?.analysis;
        } catch (error) {
          if (cancelled) return;
          setAnalysisError(getScanAnalysisErrorMessage(error));
          return;
        }
      } else {
        await runMockAnalysis(scanId);
      }

      if (cancelled) return;
      setCurrentStep(STEPS.length - 1);
      setOverallProgress(98);
      await completeScanRef.current(scanId, analysisResult);
      setOverallProgress(100);
      setDone(true);
    }

    void runPipeline();

    return () => {
      cancelled = true;
    };
  }, [selectedScanId, isAnalysisApiConfigured]);

  useEffect(() => {
    const t = setInterval(() => setScanLine((s) => (s + 1) % 100), 20);
    return () => clearInterval(t);
  }, []);

  const progress = done ? 100 : overallProgress;
  const blocked = Boolean(analysisError);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={[colors.primary, colors.success]} style={styles.iconBox}>
          <Ionicons name="leaf" size={36} color={colors.white} />
          <View style={[styles.scanLine, { top: `${scanLine}%` }]} />
        </LinearGradient>
        <Text style={styles.title}>
          {isFirstScan ? 'Analyzing Your First Scan' : 'Generating Field Report'}
        </Text>
        <Text style={styles.subtitle}>
          {currentStep === 0 && !done
            ? 'Uploading your field video to the cloud...'
            : isFirstScan
              ? 'Thera is checking the scan for weeds, crop stress, and potential treatment areas.'
              : 'AI is analyzing your crop scan'}
        </Text>
        {uploadError && (
          <Text style={styles.uploadWarning}>
            Upload skipped: {uploadError} Analysis will continue with the local scan.
          </Text>
        )}
        {analysisError && (
          <Text style={styles.analysisError}>
            Analysis failed: {analysisError}
          </Text>
        )}
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
          const active = i === currentStep && !done && !blocked;
          return (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepDot, completed && styles.stepDotDone, active && styles.stepDotActive]}>
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
                <Text style={[styles.stepLabel, completed && styles.stepLabelDone, active && styles.stepLabelActive]}>
                  {step}
                </Text>
                {active && (
                  <Text style={styles.stepProcessing}>
                    {i === 0 ? 'Uploading video...' : 'Processing...'}
                  </Text>
                )}
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
        ) : blocked ? (
          <View style={styles.waitCard}>
            <Text style={styles.waitText}>
              Check that the analysis server is running and EXPO_PUBLIC_ANALYSIS_API_URL points to your machine&apos;s LAN IP.
            </Text>
          </View>
        ) : (
          <View style={styles.waitCard}>
            <Text style={styles.waitText}>
              You can leave this screen. We will notify you when the report is ready.
            </Text>
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
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  title: { fontSize: 20, fontWeight: '900', color: colors.gray900, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.gray400, textAlign: 'center', paddingHorizontal: 12 },
  uploadWarning: {
    marginTop: 10,
    fontSize: 12,
    color: colors.warningText,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  analysisError: {
    marginTop: 10,
    fontSize: 12,
    color: colors.destructive,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, width: '100%' },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.gray100, overflow: 'hidden' },
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
  waitCard: { backgroundColor: colors.background, borderRadius: 16, padding: 16, alignItems: 'center' },
  waitText: { fontSize: 14, color: colors.gray500, textAlign: 'center' },
});
