import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ScreenProps } from '../types/navigation';
import { useAppData } from '../context/AppDataContext';
import { useFieldScanner } from '../hooks/useFieldScanner';
import { useScanVideoImport } from '../hooks/useScanVideoImport';
import { WebScanCamera } from '../components/WebScanCamera';
import { WebVideoFileInput } from '../components/WebVideoFileInput';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

const CameraView = Platform.OS !== 'web' ? require('expo-camera').CameraView : null;

const WEB_SCAN_TIPS = [
  'Upload a field walk video from your computer or phone',
  'Or record live with your webcam in the browser',
  'Walk slowly between rows with the camera 2–3 feet above the crop',
  'Allow location in your browser for GPS mapping (optional)',
];

const NATIVE_SCAN_TIPS = [
  'Hold phone 2–3 feet above the crop',
  'Walk slowly between rows',
  'Keep crop rows aligned in frame',
  'Allow location access for GPS tracking',
];

export function ScanScreen({ onNavigate, onBack }: ScreenProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { selectedFieldId, setSelectedFieldId, startScan, hasCompletedScans, getFieldsForSelectedFarm } = useAppData();
  const fields = getFieldsForSelectedFarm();

  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    selectedFieldId ?? (fields.length === 1 ? fields[0]?.id ?? null : null),
  );
  const [confirmed, setConfirmed] = useState(fields.length === 1 && Platform.OS !== 'web');
  const [showTutorial, setShowTutorial] = useState(!hasCompletedScans);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [savingScan, setSavingScan] = useState(false);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);

  const videoImport = useScanVideoImport();
  const {
    busy: importingVideo,
    error: importError,
    setError: setImportError,
    importFromLibrary,
    fileInputRef,
    onFileSelected,
    importFromCamera,
  } = videoImport;

  const {
    isWeb,
    cameraRef,
    videoRef,
    cameraReady,
    markCameraReady,
    permissionsGranted,
    permissionsLoading,
    permissionStatus,
    permissionMessage,
    requestPermissions,
    requestLocationOnly,
    openAppSettings,
    isRecording,
    isStarting,
    isPaused,
    seconds,
    gpsQuality,
    error: scannerError,
    startRecording,
    pauseRecording,
    stopRecording,
    resetScanner,
  } = useFieldScanner();

  const activeField = activeFieldId ? fields.find((f) => f.id === activeFieldId) : undefined;

  // Native single-field flow pre-requests permissions; web shows upload/record choices first.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!confirmed || permissionsLoading || permissionStatus.canScan) return;
    void requestPermissions();
  }, [confirmed, permissionsLoading, permissionStatus.canScan, requestPermissions]);

  const handleOpenCamera = async () => {
    setOpeningCamera(true);
    try {
      const ok = await requestPermissions();
      if (ok) setConfirmed(true);
    } finally {
      setOpeningCamera(false);
    }
  };

  const handleStop = async () => {
    if (!activeFieldId || savingScan) return;

    setSavingScan(true);
    try {
      const capture = await stopRecording();
      if (!capture) return;

      await startScan(activeFieldId, capture);
      setSelectedFieldId(activeFieldId);
      onNavigate('processing');
    } finally {
      setSavingScan(false);
    }
  };

  const handleImportedVideo = async (capture: Awaited<ReturnType<typeof importFromLibrary>>) => {
    if (!activeFieldId || !capture) return;

    setSavingScan(true);
    try {
      await startScan(activeFieldId, capture);
      setSelectedFieldId(activeFieldId);
      onNavigate('processing');
    } finally {
      setSavingScan(false);
    }
  };

  const handleImportFromLibrary = async () => {
    setImportError(null);
    const capture = await importFromLibrary();
    await handleImportedVideo(capture);
  };

  const handleImportFromCamera = async () => {
    if (!importFromCamera) return;
    setImportError(null);
    const capture = await importFromCamera();
    await handleImportedVideo(capture);
  };

  const scanTips = isWeb ? WEB_SCAN_TIPS : NATIVE_SCAN_TIPS;

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
        {isWeb && fileInputRef && onFileSelected && (
          <WebVideoFileInput inputRef={fileInputRef} onFileSelected={onFileSelected} />
        )}
        <View style={styles.selectorHeader}>
          <TouchableOpacity
            style={styles.backBtnDark}
            onPress={() => (fields.length > 1 ? setActiveFieldId(null) : onBack())}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.selectorTitle}>{isWeb ? 'Add Field Video' : 'Confirm Field'}</Text>
        </View>
        <View style={styles.confirmBody}>
          <Text style={styles.confirmName}>{activeField.name}</Text>
          <Text style={styles.confirmMeta}>{activeField.cropType} · {activeField.acreage} acres</Text>
          {showTutorial && (
            <View style={styles.tutorialCard}>
              <Text style={styles.tutorialTitle}>{isWeb ? 'How scanning works' : 'First scan tips'}</Text>
              {scanTips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
          {scannerError && <Text style={styles.errorText}>{scannerError}</Text>}
          {importError && <Text style={styles.errorText}>{importError}</Text>}

          {isWeb ? (
            <>
              <TouchableOpacity
                onPress={() => void handleImportFromLibrary()}
                disabled={openingCamera || importingVideo || savingScan}
              >
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.confirmBtn}>
                  {importingVideo || savingScan ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.white} />
                      <Text style={styles.confirmBtnText}>Upload Video File</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.importDividerText}>or record in your browser</Text>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleOpenCamera}
                disabled={openingCamera || importingVideo || savingScan}
              >
                {openingCamera ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                    <Text style={styles.secondaryBtnText}>Record with Webcam</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleOpenCamera} disabled={openingCamera || importingVideo || savingScan}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.confirmBtn}>
                  {openingCamera ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={18} color={colors.white} />
                      <Text style={styles.confirmBtnText}>Scan with Live Camera</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.importDividerText}>or import an existing video</Text>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleImportFromLibrary()}
                disabled={openingCamera || importingVideo || savingScan}
              >
                {importingVideo || savingScan ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={18} color={colors.primary} />
                    <Text style={styles.secondaryBtnText}>Choose from Photos</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleImportFromCamera()}
                disabled={openingCamera || importingVideo || savingScan}
              >
                <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Record with Camera App</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.importHint}>
            {isWeb
              ? 'Videos are converted to MP4 on our servers and saved to your account for download and analysis.'
              : 'Imported and recorded scans are saved as MP4 in your account and can be downloaded from cloud storage.'}
          </Text>
        </View>
      </View>
    );
  }

  if (permissionsLoading || !permissionsGranted) {
    return (
      <View style={styles.selectorContainer}>
        <View style={styles.confirmBody}>
          <Text style={styles.confirmName}>
            {isWeb ? 'Allow camera access' : 'Permissions needed'}
          </Text>
          <Text style={styles.confirmMeta}>
            {isWeb
              ? 'Your browser needs camera permission to record a live field scan. Click Allow when prompted, or go back to upload a video file instead.'
              : 'Thera needs camera access to record scans. Location is recommended for GPS field mapping.'}
          </Text>

          <View style={styles.permissionList}>
            <View style={styles.permissionRow}>
              <Ionicons
                name={permissionStatus.camera ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={permissionStatus.camera ? colors.success : colors.destructive}
              />
              <Text style={styles.permissionLabel}>Camera {permissionStatus.camera ? 'allowed' : 'required'}</Text>
            </View>
            <View style={styles.permissionRow}>
              <Ionicons
                name={permissionStatus.location ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={permissionStatus.location ? colors.success : colors.warning}
              />
              <Text style={styles.permissionLabel}>
                Location {permissionStatus.location ? 'allowed' : 'recommended'}
              </Text>
            </View>
          </View>

          {(scannerError || permissionMessage) && (
            <Text style={styles.errorText}>{scannerError ?? permissionMessage}</Text>
          )}

          <TouchableOpacity onPress={handleOpenCamera} disabled={openingCamera}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.confirmBtn}>
              {openingCamera ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {permissionStatus.camera ? 'Allow Location' : 'Allow Camera & Location'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {permissionStatus.camera && !permissionStatus.location ? (
            <TouchableOpacity onPress={() => void requestLocationOnly()} disabled={openingCamera}>
              <Text style={styles.linkText}>Request location only</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={() => void openAppSettings()}>
            <Text style={styles.linkText}>
              {isWeb ? 'Browser site settings help' : 'Open iPhone Settings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setConfirmed(false)}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progress = Math.min(100, Math.round(seconds * 1.6));
  const currentRow = Math.min(5, Math.floor(seconds / 12) + 1);

  const indicators = [
    {
      label: 'GPS',
      value:
        gpsQuality === 'good'
          ? 'Good'
          : gpsQuality === 'weak'
            ? 'Weak'
            : gpsQuality === 'denied'
              ? 'Off'
              : 'Acquiring',
      ok: gpsQuality === 'good' || gpsQuality === 'weak',
      icon: 'location' as const,
    },
    {
      label: 'Camera',
      value: cameraReady ? 'Ready' : 'Starting',
      ok: cameraReady,
      icon: 'camera' as const,
    },
    {
      label: 'Crop Rows',
      value: isRecording ? 'Visible' : 'Ready',
      ok: true,
      icon: 'menu' as const,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          width: windowWidth,
          height: windowHeight,
          overflow: 'hidden',
        },
      ]}
    >
      <View style={styles.cameraLayer}>
        {isWeb ? (
          <WebScanCamera videoRef={videoRef} style={StyleSheet.absoluteFill} />
        ) : (
          CameraView && (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="video"
              mute
              videoQuality="720p"
              active
              responsiveOrientationWhenOrientationLocked
              onCameraReady={markCameraReady}
              onMountError={({ message }: { message: string }) => {
                setCameraMountError(message);
                if (__DEV__) console.warn('[scan] camera mount error', message);
              }}
            />
          )
        )}
      </View>

      <LinearGradient
        colors={['rgba(4,12,6,0.72)', 'transparent', 'rgba(5,13,7,0.85)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {Array.from({ length: 14 }).map((_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.rowLine,
            {
              left: `${((i + 0.5) / 14) * 100}%`,
              width: i % 2 === 0 ? 2 : 1,
              opacity: i % 2 === 0 ? 0.18 : 0.08,
            },
          ]}
        />
      ))}

      {isRecording && (
        <View style={styles.recordingBanner} pointerEvents="none">
          <View style={styles.recordingDot} />
          <Text style={styles.recordingBannerText}>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')} · {isPaused ? 'PAUSED' : 'RECORDING'}
          </Text>
        </View>
      )}

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtnLight}
            onPress={() => {
              if (isRecording) return;
              resetScanner();
              setConfirmed(false);
            }}
            disabled={isRecording || savingScan}
          >
            <Ionicons name="chevron-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Scan {activeField?.name ?? 'Field'}</Text>
            {isRecording && (
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                  {String(seconds % 60).padStart(2, '0')} {isPaused ? 'PAUSED' : 'RECORDING'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {!isRecording && (
          <View style={styles.instructions}>
            {(isWeb
              ? [
                  'Allow camera when your browser prompts you',
                  'Walk slowly between rows',
                  'Keep camera 2–3 feet above crop',
                ]
              : [
                  'Walk slowly between rows',
                  'Keep camera 2–3 feet above crop',
                  'Move in a straight line',
                ]
            ).map((t) => (
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

      {isRecording && (
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

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {scannerError && <Text style={styles.errorBanner}>{scannerError}</Text>}
        {!permissionStatus.location && !isRecording ? (
          <TouchableOpacity onPress={() => void requestLocationOnly()} style={styles.locationPrompt}>
            <Text style={styles.locationPromptText}>
              {isWeb ? 'Tap to allow browser location for this scan' : 'Tap to enable GPS for this scan'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {cameraMountError && !scannerError && (
          <Text style={styles.errorBanner}>Camera error: {cameraMountError}</Text>
        )}
        <Text style={styles.hint}>
          {savingScan
            ? 'Saving scan video...'
            : isStarting
              ? 'Starting recording...'
              : !cameraReady
                ? 'Starting camera...'
                : isRecording
                  ? isPaused
                    ? 'Paused — tap to resume'
                    : seconds < 3
                      ? 'Recording… keep walking for a few seconds'
                      : 'Keep going · Walk slowly'
                  : isWeb
                    ? 'Tap to start recording, or use the upload button to choose a file'
                    : 'Tap the button to start scanning, or go back to import a video'}
        </Text>
        <View style={styles.controlRow}>
          {isRecording && (
            <TouchableOpacity style={styles.sideBtn} onPress={pauseRecording} disabled={savingScan}>
              <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.mainBtn,
              {
                backgroundColor: isRecording ? colors.destructive : colors.success,
                opacity: savingScan || isStarting ? 0.7 : 1,
              },
            ]}
            disabled={savingScan || isStarting}
            onPress={async () => {
              if (isRecording) {
                await handleStop();
                return;
              }
              setShowTutorial(false);
              await startRecording();
            }}
          >
            {savingScan || isStarting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ionicons name={isRecording ? 'stop' : 'play'} size={28} color={colors.white} />
            )}
          </TouchableOpacity>
        {!isRecording && (
          <TouchableOpacity
            style={styles.sideBtn}
            disabled={savingScan}
            onPress={() => {
              resetScanner();
              setConfirmed(false);
            }}
          >
            <Ionicons name={isWeb ? 'cloud-upload-outline' : 'location'} size={20} color={colors.white} />
          </TouchableOpacity>
        )}
        </View>
      </View>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.scanDark },
  cameraLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: colors.scanDark,
  },
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
    minHeight: 52,
  },
  confirmBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  importDividerText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.gray400,
    marginTop: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  importHint: { fontSize: 11, color: colors.gray400, lineHeight: 16, textAlign: 'center' },
  errorText: { color: colors.destructive, fontSize: 13 },
  permissionList: { gap: 8, marginTop: 4 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  permissionLabel: { fontSize: 13, color: colors.gray700 },
  linkText: { textAlign: 'center', color: colors.primary, fontWeight: '600', fontSize: 14 },
  backBtnLight: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  backBtnDark: { padding: 6, borderRadius: 12, backgroundColor: colors.background },
  rowLine: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#4ADE80' },
  recordingBanner: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  recordingBannerText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  header: { paddingHorizontal: 20, zIndex: 10 },
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
  controls: { paddingHorizontal: 20, zIndex: 10 },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 24 },
  errorBanner: {
    textAlign: 'center',
    color: '#FCA5A5',
    fontSize: 12,
    marginBottom: 12,
  },
  locationPrompt: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.25)',
  },
  locationPromptText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
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
