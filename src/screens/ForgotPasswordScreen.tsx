import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthLogo } from '../components/AuthLogo';
import { FloatingInput } from '../components/FloatingInput';
import {
  getAuthErrorMessage,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from '../services/auth';
import type { Screen } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

interface ForgotPasswordScreenProps {
  onNavigate: (s: Screen) => void;
}

type Step = 'email' | 'reset';

export function ForgotPasswordScreen({ onNavigate }: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setDevOtpHint(null);

    try {
      const result = await requestPasswordResetOtp(email);
      setStep('reset');
      setCode(result.otp ?? '');
      setPassword('');
      setConfirmPassword('');
      if (result.otp) {
        setDevOtpHint(result.otp);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resetPasswordWithOtp(email, code, password);
      onNavigate('login');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await requestPasswordResetOtp(email);
      setError(null);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'reset' ? setStep('email') : onNavigate('login'))}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <AuthLogo />

          {step === 'email' ? (
            <>
              <Text style={styles.title}>
                Forgot{'\n'}
                <Text style={styles.titleAccent}>Password?</Text>
              </Text>
              <Text style={styles.subtitle}>
                Enter your email and we will send a 6-digit code. Enter the code in the app to set
                a new password.
              </Text>

              <FloatingInput
                label="Email Address"
                value={email}
                onChange={setEmail}
                placeholder="mail@mail.com"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleSendCode}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.primaryBtn}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.footer}>
                Remember your password?{' '}
                <Text style={styles.link} onPress={() => onNavigate('login')}>
                  Login
                </Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>
                Reset{'\n'}
                <Text style={styles.titleAccent}>Password</Text>
              </Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>
              </Text>

              {devOtpHint ? (
                <View style={styles.devOtpBox}>
                  <Text style={styles.devOtpLabel}>Development code (email not configured)</Text>
                  <Text style={styles.devOtpCode}>{devOtpHint}</Text>
                </View>
              ) : null}

              <FloatingInput
                label="Verification code"
                value={code}
                onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
              />
              <FloatingInput
                label="New password"
                value={password}
                onChange={setPassword}
                placeholder="Enter new password"
                secureTextEntry={!showPw}
                right={
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showPw ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.gray400}
                    />
                  </TouchableOpacity>
                }
              />
              <FloatingInput
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter new password"
                secureTextEntry={!showConfirmPw}
                right={
                  <TouchableOpacity onPress={() => setShowConfirmPw((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showConfirmPw ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.gray400}
                    />
                  </TouchableOpacity>
                }
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleResetPassword}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.primaryBtn}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResendCode}
                disabled={submitting}
                style={styles.resendWrap}
              >
                <Text style={styles.resend}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.gray900,
    lineHeight: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  titleAccent: { color: colors.primary },
  subtitle: {
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.gray700,
  },
  devOtpBox: {
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  devOtpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 4,
  },
  devOtpCode: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gray900,
    textAlign: 'center',
    letterSpacing: 4,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  resendWrap: { alignItems: 'center', marginBottom: 8 },
  resend: { fontSize: 14, fontWeight: '600', color: colors.primary },
  footer: { textAlign: 'center', fontSize: 14, color: colors.gray400 },
  link: { fontWeight: '700', color: colors.primary },
});
